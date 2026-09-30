import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Configuracao } from '@/types/adtc'
import logoOficial from '@/assets/design-sem-nome-3-82164.png'

export interface ChurchConfig {
  // Identidade Geral
  nomeIgreja: string
  subtituloIgreja: string
  denominacao: string
  siglaIgreja: string
  enderecoSede: string
  enderecoIgreja: string // alias para compatibilidade com DocChurchIdentity
  cidadeEstado: string
  cidadeUf: string // alias para compatibilidade com DocChurchIdentity
  telefoneContato: string
  emailContato: string
  instagramUrl: string
  logoUrl: string // Custom uploaded logo or default fallback
  logoRecordId?: string
  nomePastor?: string // pastor presidente vindo de configuracoes

  // Cores do Tema (hex)
  corPrimaria: string // Default #1E3A5F (Deep Blue)
  corDestaque: string // Default #C9A227 (Gold)

  // Textos Institucionais
  homeHeroBadge: string
  homeHeroTitle: string
  homeHeroSubtitle: string
  homeHeroEndereco: string
  textoRodape: string
  mensagemAniversario: string

  // Rótulos / Labels
  labelMembros: string
  labelCongregados: string
  labelObreiros: string
  labelDizimistas: string
  labelUnidades: string
  labelEscala: string
  labelCalendario: string
  labelSalmos: string
  labelMuralFotos: string

  // Financeiro / PIX
  pixChave: string
  pixTitular: string
  pixBanco: string
  pixCnpj: string
  pixMensagem: string
  pixVersiculo: string
}

export const CHURCH_CONFIG_DEFAULTS: ChurchConfig = {
  nomeIgreja: 'ADTC Campanário',
  subtituloIgreja: 'Assembleia de Deus • Templo Central',
  denominacao: 'Igreja Evangélica Assembleia de Deus Templo Central',
  siglaIgreja: 'ADTC',
  enderecoSede: 'Rua Alberto Batista Fontenele, nº 141, Campanário',
  enderecoIgreja: 'Rua Alberto Batista Fontenele, nº 141, Campanário',
  cidadeEstado: 'Uruoca / Campanário - CE',
  cidadeUf: 'Uruoca / Campanário - CE',
  telefoneContato: '(88) 99368-2458',
  emailContato: 'adtccampanario@gmail.com',
  instagramUrl: 'https://www.instagram.com/adtccampanario?stkn=ODNndm02a25xN25r',
  logoUrl: logoOficial,
  nomePastor: 'Pr. José Francisco Portela Fontenele',

  corPrimaria: '#1E3A5F',
  corDestaque: '#C9A227',

  homeHeroBadge: 'Assembleia de Deus Templo Central',
  homeHeroTitle: 'ADTC Campanário',
  homeHeroSubtitle:
    'Um lugar de adoração, comunhão fraternal e proclamação da genuína Palavra de Deus para toda a família.',
  homeHeroEndereco: 'Sede: Rua Alberto Batista Fontenele, nº 141, Campanário',
  textoRodape:
    'Igreja Evangélica Assembleia de Deus Templo Central. Uma igreja acolhedora, comprometida com a pregação bíblica, comunhão fraternal e a glória de Deus.',
  mensagemAniversario:
    'A paz do Senhor, {nome}! A nossa igreja deseja a você muitas felicidades e que Deus abençoe seu novo ano de vida! Jeremias 29:11',

  labelMembros: 'Membros',
  labelCongregados: 'Congregados',
  labelObreiros: 'Corpo de Obreiros',
  labelDizimistas: 'Dizimistas & Ofertas',
  labelUnidades: 'Congregações',
  labelEscala: 'Escala de Trabalho',
  labelCalendario: 'Calendário de Festas',
  labelSalmos: 'Salmos Musicados',
  labelMuralFotos: 'Mural de Fotos',

  pixChave: '14.037.658/0001-82',
  pixTitular: 'José Francisco Portela',
  pixBanco: 'Nubank / Caixa',
  pixCnpj: '14.037.658/0001-82',
  pixMensagem:
    'Cada um dê conforme determinou em seu coração, não com tristeza ou por obrigação, pois Deus ama quem dá com alegria.',
  pixVersiculo: '2 Coríntios 9:7',
}

interface ChurchConfigContextType {
  config: ChurchConfig
  loading: boolean
  reloadConfig: () => Promise<void>
  updateConfigKeys: (keys: Record<string, string>) => Promise<void>
}

const ChurchConfigContext = createContext<ChurchConfigContextType | undefined>(undefined)

/**
 * Converte cor Hex (#1E3A5F) para HSL string no formato aceito pelo Tailwind CSS variables:
 * Ex: "215 52% 25%"
 */
export function hexToHslString(hex: string): string | null {
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6 && clean.length !== 3) return null

  let r = 0,
    g = 0,
    b = 0
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255
    g = parseInt(clean[1] + clean[1], 16) / 255
    b = parseInt(clean[2] + clean[2], 16) / 255
  } else {
    r = parseInt(clean.substring(0, 2), 16) / 255
    g = parseInt(clean.substring(2, 4), 16) / 255
    b = parseInt(clean.substring(4, 6), 16) / 255
  }

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  const hDeg = Math.round(h * 360)
  const sPct = Math.round(s * 100)
  const lPct = Math.round(l * 100)

  return `${hDeg} ${sPct}% ${lPct}%`
}

/**
 * Aplica as cores dinâmicas no elemento :root
 */
export function applyThemeColors(corPrimaria?: string, corDestaque?: string) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (corPrimaria) {
    const hsl = hexToHslString(corPrimaria)
    if (hsl) {
      root.style.setProperty('--primary', hsl)
      root.style.setProperty('--sidebar-background', hsl)
      root.style.setProperty('--church-primary', corPrimaria)
    }
  }

  if (corDestaque) {
    const hsl = hexToHslString(corDestaque)
    if (hsl) {
      root.style.setProperty('--accent', hsl)
      root.style.setProperty('--ring', hsl)
      root.style.setProperty('--church-accent', corDestaque)
    }
  }
}

export const ChurchConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ChurchConfig>(CHURCH_CONFIG_DEFAULTS)
  const [loading, setLoading] = useState(false)

  const reloadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const records = await pb.collection('configuracoes').getFullList<Configuracao>()
      const map: Record<
        string,
        { valor?: string; arquivo?: string; id: string; record: Configuracao }
      > = {}
      for (const r of records) {
        map[r.chave] = { valor: r.valor, arquivo: r.arquivo, id: r.id, record: r }
      }

      const merged: ChurchConfig = {
        nomeIgreja:
          map['igreja_nome']?.valor?.trim() ||
          map['home_hero_title']?.valor?.trim() ||
          CHURCH_CONFIG_DEFAULTS.nomeIgreja,
        subtituloIgreja:
          map['igreja_subtitulo']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.subtituloIgreja,
        denominacao: map['igreja_denominacao']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.denominacao,
        siglaIgreja: map['igreja_sigla']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.siglaIgreja,
        enderecoSede:
          map['igreja_endereco']?.valor?.trim() ||
          map['home_hero_endereco']?.valor?.trim() ||
          CHURCH_CONFIG_DEFAULTS.enderecoSede,
        enderecoIgreja:
          map['igreja_endereco']?.valor?.trim() ||
          map['home_hero_endereco']?.valor?.trim() ||
          CHURCH_CONFIG_DEFAULTS.enderecoIgreja,
        cidadeEstado:
          map['igreja_cidade_estado']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.cidadeEstado,
        cidadeUf: map['igreja_cidade_estado']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.cidadeUf,
        telefoneContato:
          map['igreja_telefone']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.telefoneContato,
        emailContato: map['igreja_email']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.emailContato,
        instagramUrl: map['igreja_instagram']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.instagramUrl,
        nomePastor:
          map['lideranca_nome_pastor']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.nomePastor,

        logoUrl: map['igreja_logo']?.arquivo
          ? pb.files.getURL(map['igreja_logo'].record, map['igreja_logo'].arquivo)
          : map['igreja_logo']?.valor || CHURCH_CONFIG_DEFAULTS.logoUrl,
        logoRecordId: map['igreja_logo']?.id,

        corPrimaria: map['tema_cor_primaria']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.corPrimaria,
        corDestaque: map['tema_cor_destaque']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.corDestaque,

        homeHeroBadge:
          map['home_hero_badge']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.homeHeroBadge,
        homeHeroTitle:
          map['home_hero_title']?.valor?.trim() ||
          map['igreja_nome']?.valor?.trim() ||
          CHURCH_CONFIG_DEFAULTS.homeHeroTitle,
        homeHeroSubtitle:
          map['home_hero_subtitle']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.homeHeroSubtitle,
        homeHeroEndereco:
          map['home_hero_endereco']?.valor?.trim() ||
          map['igreja_endereco']?.valor?.trim() ||
          CHURCH_CONFIG_DEFAULTS.homeHeroEndereco,
        textoRodape: map['igreja_rodape']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.textoRodape,
        mensagemAniversario:
          map['mensagem_aniversario']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.mensagemAniversario,

        labelMembros: map['rotulo_membros']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelMembros,
        labelCongregados:
          map['rotulo_congregados']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelCongregados,
        labelObreiros:
          map['rotulo_obreiros']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelObreiros,
        labelDizimistas:
          map['rotulo_dizimistas']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelDizimistas,
        labelUnidades:
          map['rotulo_unidades']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelUnidades,
        labelEscala: map['rotulo_escala']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelEscala,
        labelCalendario:
          map['rotulo_calendario']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelCalendario,
        labelSalmos: map['rotulo_salmos']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelSalmos,
        labelMuralFotos:
          map['rotulo_mural_fotos']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.labelMuralFotos,

        pixChave: map['pix_chave_copia_e_cola']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.pixChave,
        pixTitular: map['pix_titular']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.pixTitular,
        pixBanco: map['pix_banco']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.pixBanco,
        pixCnpj: map['pix_cnpj']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.pixCnpj,
        pixMensagem: map['pix_mensagem']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.pixMensagem,
        pixVersiculo: map['pix_versiculo']?.valor?.trim() || CHURCH_CONFIG_DEFAULTS.pixVersiculo,
      }

      setConfig(merged)
      applyThemeColors(merged.corPrimaria, merged.corDestaque)
    } catch (err) {
      console.warn('Erro ao carregar configurações da igreja do PocketBase:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateConfigKeys = useCallback(
    async (keys: Record<string, string>) => {
      // 1. Carrega todos os registros atuais de uma vez para mapear os IDs existentes com segurança
      const currentList = await pb.collection('configuracoes').getFullList<Configuracao>()
      const existingMap = new Map<string, string>()
      for (const item of currentList) {
        existingMap.set(item.chave, item.id)
      }

      // 2. Atualiza os existentes por ID direto ou cria apenas se realmente novo
      for (const [chave, valor] of Object.entries(keys)) {
        const existingId = existingMap.get(chave)
        if (existingId) {
          await pb.collection('configuracoes').update(existingId, { valor })
        } else {
          try {
            const created = await pb.collection('configuracoes').create({ chave, valor })
            existingMap.set(chave, created.id)
          } catch (createErr) {
            // Em caso de condição de corrida (já existente), busca e atualiza
            try {
              const fallback = await pb
                .collection('configuracoes')
                .getFirstListItem<Configuracao>(`chave='${chave}'`)
              await pb.collection('configuracoes').update(fallback.id, { valor })
            } catch {
              console.warn(`Não foi possível salvar a chave ${chave}:`, createErr)
            }
          }
        }
      }
      await reloadConfig()
    },
    [reloadConfig],
  )

  useEffect(() => {
    reloadConfig()

    let unsub: (() => void) | undefined
    pb.collection('configuracoes')
      .subscribe('*', () => {
        reloadConfig()
      })
      .then((fn) => {
        unsub = fn
      })
      .catch(() => {})

    return () => {
      if (unsub) unsub()
    }
  }, [reloadConfig])

  // Sincroniza dinamicamente o título da aba do navegador (document.title) com o nome da igreja configurada
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const nome = config.nomeIgreja?.trim() || 'Gestão Eclesiástica'
      const sigla = config.siglaIgreja?.trim()
      const title =
        sigla && !nome.includes(sigla) ? `${sigla} — ${nome}` : `${nome} — Gestão Eclesiástica`
      document.title = title
    }
  }, [config.nomeIgreja, config.siglaIgreja])

  const contextValue = useMemo(
    () => ({
      config,
      loading,
      reloadConfig,
      updateConfigKeys,
    }),
    [config, loading, reloadConfig, updateConfigKeys],
  )

  return (
    <ChurchConfigContext.Provider value={contextValue}>{children}</ChurchConfigContext.Provider>
  )
}

export function useChurchConfig() {
  const ctx = useContext(ChurchConfigContext)
  if (!ctx) {
    return {
      config: CHURCH_CONFIG_DEFAULTS,
      loading: false,
      reloadConfig: async () => {},
      updateConfigKeys: async () => {},
    }
  }
  return ctx
}

export default useChurchConfig
