import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Church,
  Calendar,
  Users,
  Clock,
  Heart,
  QrCode,
  ArrowRight,
  MapPin,
  Sparkles,
  ChevronRight,
  BookOpen,
  Award,
  Edit2,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Cake,
  Quote,
  Share2,
  Check,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import type { Obreiro, AgendaSemanalItem, Configuracao, Membro, Congregado } from '@/types/adtc'
import { UNIDADES, DIAS_SEMANA } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { InlineText } from '@/components/InlineText'

import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'
import { getVersiculoDoDiaARC, BIBLIA_ARC_DESTAQUES, type BibleVerseARC } from '@/lib/bibleArc'
import { ADTC_LOGO_URL } from '@/components/AdtcLogo'
import { formatarPeriodoEvento, isEventoFuturo } from '@/lib/utils'
import {
  ModalFelicitarAniversariante,
  type AniversarianteFelicitarData,
} from '@/components/ModalFelicitarAniversariante'

interface AniversarianteItem {
  id: string
  nome: string
  tipo: 'membro' | 'congregado'
  congregacao?: string
  whatsapp?: string
  telefone?: string
  foto?: string
}

interface ProximoEventoInfo {
  id: string
  titulo: string
  dataInicio: string
  dataFim?: string
  diasFaltando: number
  unidade?: string
  categoria?: string
}

interface SalmoDoDiaItem {
  id: string
  numero: number
  titulo: string
  referencia: string
  versiculo_chave?: string
  audio_url?: string
}

export const Index: React.FC = () => {
  const { isAdmin } = useAuth()
  const { config } = useChurchConfig()
  const { toast } = useToast()
  const {
    congregacoes = [],
    nomes: nomesUnidadesRaw,
    total: totalUnidades = 0,
    textoTotalUnidades = '0 Unidades Eclesiásticas',
  } = useCongregacoes()
  const nomesUnidades = nomesUnidadesRaw || []

  const [obreiros, setObreiros] = useState<Obreiro[]>([])
  const [pastorPresidente, setPastorPresidente] = useState<Obreiro | null>(null)
  const [agendaHoje, setAgendaHoje] = useState<AgendaSemanalItem[]>([])
  const [chavePix, setChavePix] = useState('')
  const [loading, setLoading] = useState(true)

  // Contador vivo do PocketBase
  const [totalMembrosAtivos, setTotalMembrosAtivos] = useState<number>(0)
  const [totalCongregadosAtivos, setTotalCongregadosAtivos] = useState<number>(0)
  const [totalObreirosAtivos, setTotalObreirosAtivos] = useState<number>(0)

  // Próximo evento do Calendário
  const [proximoEvento, setProximoEvento] = useState<ProximoEventoInfo | null>(null)

  // Versículo rotativo no Hero com transição suave
  const [heroVerseIndex, setHeroVerseIndex] = useState<number>(0)
  const [heroVerseFade, setHeroVerseFade] = useState<boolean>(true)

  // Estado para Aniversariantes do Dia
  const [aniversariantesHoje, setAniversariantesHoje] = useState<AniversarianteItem[]>([])
  const [loadingAniversariantes, setLoadingAniversariantes] = useState(true)
  const [felicitarModalOpen, setFelicitarModalOpen] = useState(false)
  const [aniversarianteSelecionado, setAniversarianteSelecionado] =
    useState<AniversarianteFelicitarData | null>(null)

  // Estado para Reflexão Diária (ARC)
  const [versiculoDia, setVersiculoDia] = useState<BibleVerseARC>(getVersiculoDoDiaARC())
  const [versiculoCopiado, setVersiculoCopiado] = useState(false)

  // Configurações personalizáveis da Home
  const [heroBadge, setHeroBadge] = useState(
    config.homeHeroBadge || 'Igreja Evangélica Assembleia de Deus',
  )
  const [heroTitle, setHeroTitle] = useState(config.homeHeroTitle || 'ADTC Campanário')
  const [heroSubtitle, setHeroSubtitle] = useState(
    config.homeHeroSubtitle ||
      'Um lugar de adoração, comunhão fraternal e proclamação da genuína Palavra de Deus para toda a família.',
  )
  const [heroEndereco, setHeroEndereco] = useState(
    config.homeHeroEndereco || 'Sede: Rua Alberto Batista Fontenele, nº 141, Campanário',
  )
  const [pixBannerVerso, setPixBannerVerso] = useState(
    '"Cada um dê conforme determinou em seu coração, não com tristeza ou por obrigação, pois Deus ama quem dá com alegria." (2 Co 9:7).',
  )

  // Títulos e Textos configuráveis das seções
  const [tituloAniversariantes, setTituloAniversariantes] = useState('Aniversariantes do Dia')
  const [subtituloAniversariantes, setSubtituloAniversariantes] = useState(
    'A família ADTC Campanário se alegra e rende graças ao Senhor por mais um ano de vida concedido!',
  )
  const [tituloReflexao, setTituloReflexao] = useState('Palavra e Edificação Diária')
  const [badgeReflexao, setBadgeReflexao] = useState('📖 Reflexão do Dia')
  const [tituloObreiros, setTituloObreiros] = useState('Corpo de Obreiros')
  const [tagObreiros, setTagObreiros] = useState('Liderança Eclesiástica')
  const [tituloAgendaHoje, setTituloAgendaHoje] = useState('Cultos e Atividades de Hoje')
  const [subtituloAgendaHoje, setSubtituloAgendaHoje] = useState('Programação litúrgica do dia')
  const [tituloCampos, setTituloCampos] = useState(
    `Nossas ${totalUnidades} ${totalUnidades === 1 ? 'Unidade Eclesiástica' : 'Unidades Eclesiásticas'}`,
  )
  const [customTituloCampos, setCustomTituloCampos] = useState<boolean>(false)
  const [tagCampos, setTagCampos] = useState('Campos de Atuação')
  const [descCampos, setDescCampos] = useState(
    'A ADTC Campanário atua através do Templo Sede e suas congregações ativas na proclamação do Evangelho.',
  )
  const [tituloPix, setTituloPix] = useState('Dízimos e Ofertas para a Obra do Senhor')
  const [tagPix, setTagPix] = useState('Contribuição Voluntária')
  const [tituloSalmos, setTituloSalmos] = useState('Salmos Musicados')
  const [subtituloSalmos, setSubtituloSalmos] = useState(
    'Ouça os louvores e cânticos de salmos da igreja',
  )

  // Modais de Edição Admin da Home
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false)
  const [isSavingHero, setIsSavingHero] = useState(false)
  const [heroForm, setHeroForm] = useState({
    badge: '',
    title: '',
    subtitle: '',
    endereco: '',
  })

  // Modal para adicionar/editar item na agenda de hoje
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false)
  const [editingAgendaItem, setEditingAgendaItem] = useState<AgendaSemanalItem | null>(null)
  const [agendaForm, setAgendaForm] = useState({
    unidade: 'Sede',
    dia_semana: 'Domingo',
    horario: '19h00',
    evento: '',
    observacao: '',
  })
  const [isSavingAgenda, setIsSavingAgenda] = useState(false)

  // Modal para exclusão de agenda
  const [deleteAgendaId, setDeleteAgendaId] = useState<string | null>(null)

  // Modal para editar chave PIX e texto
  const [isPixModalOpen, setIsPixModalOpen] = useState(false)
  const [pixFormKey, setPixFormKey] = useState('')
  const [pixFormVerso, setPixFormVerso] = useState('')
  const [isSavingPix, setIsSavingPix] = useState(false)

  const diasSemanaArray = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const hojeNome = diasSemanaArray[new Date().getDay()]

  // Parser robusto e tolerante para datas de nascimento (membros e congregados)
  const ehAniversarianteDeHoje = (
    dataNascimento?: string,
    dataNascimentoTexto?: string,
  ): boolean => {
    const hoje = new Date()
    const diaHoje = hoje.getDate()
    const mesHoje = hoje.getMonth() + 1 // 1-12

    // 1. Tenta data_nascimento (geralmente YYYY-MM-DD ou ISO)
    if (dataNascimento) {
      try {
        const isoMatch = dataNascimento.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (isoMatch) {
          const mes = parseInt(isoMatch[2], 10)
          const dia = parseInt(isoMatch[3], 10)
          if (dia === diaHoje && mes === mesHoje) return true
        } else {
          const d = new Date(dataNascimento)
          if (!isNaN(d.getTime())) {
            if (d.getUTCMonth() + 1 === mesHoje && d.getUTCDate() === diaHoje) return true
            if (d.getMonth() + 1 === mesHoje && d.getDate() === diaHoje) return true
          }
        }
      } catch {
        /* ignore */
      }
    }

    // 2. Tenta data_nascimento_texto ou tolerância textual (ex: DD/MM/AAAA ou DD/MM)
    const texto =
      dataNascimentoTexto || (dataNascimento && dataNascimento.includes('/') ? dataNascimento : '')
    if (texto) {
      const limpo = texto.trim().toLowerCase()
      if (
        limpo.includes('não') ||
        limpo.includes('nao') ||
        limpo.includes('lembra') ||
        limpo.includes('desconhecid') ||
        limpo.includes('ignorado')
      ) {
        return false
      }
      const match = limpo.match(/^(\d{1,2})[/.-](\d{1,2})/)
      if (match) {
        const dia = parseInt(match[1], 10)
        const mes = parseInt(match[2], 10)
        if (dia === diaHoje && mes === mesHoje) return true
      }
    }

    return false
  }

  const [mensagemAniversarioConfig, setMensagemAniversarioConfig] = useState(
    'A paz do Senhor, {nome}! A Assembleia de Deus — Templo Central de Campanário deseja a você muitas felicidades e que Deus abençoe seu novo ano de vida! 🎉',
  )

  const handleAbrirFelicitarModal = (item: AniversarianteItem) => {
    setAniversarianteSelecionado({
      nome: item.nome,
      whatsapp: item.whatsapp,
      telefone: item.telefone,
      tipo: item.tipo,
      congregacao: item.congregacao,
    })
    setFelicitarModalOpen(true)
  }

  const loadAniversariantes = async () => {
    setLoadingAniversariantes(true)
    try {
      // Buscar membros ativos e congregados ativos em paralelo
      const [membrosList, congregadosList] = await Promise.all([
        pb.collection('membros').getFullList<Membro>({
          filter: "status='Ativo'",
          fields:
            'id,nome,data_nascimento,data_nascimento_texto,congregacao,whatsapp,telefone,foto',
          sort: 'nome',
        }),
        pb.collection('congregados').getFullList<Congregado>({
          fields: 'id,nome,data_nascimento,congregacao,status,whatsapp,telefone',
          sort: 'nome',
        }),
      ])

      const aniversariantes: AniversarianteItem[] = []

      // Membros ativos
      for (const m of membrosList) {
        const s = (m.status || 'Ativo').toLowerCase()
        const isAtivo = s.includes('ativo') && !s.includes('inativo')
        if (isAtivo && ehAniversarianteDeHoje(m.data_nascimento, m.data_nascimento_texto)) {
          aniversariantes.push({
            id: `membro-${m.id}`,
            nome: m.nome,
            tipo: 'membro',
            congregacao: m.congregacao,
            whatsapp: m.whatsapp,
            telefone: m.telefone,
            foto: m.foto ? pb.files.getURL(m, m.foto) : undefined,
          })
        }
      }

      // Congregados ativos (excluindo inativos e falecidos)
      for (const c of congregadosList) {
        const s = ((c as any).situacao || c.status || 'Ativo').toLowerCase()
        const isAtivo = s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
        if (
          isAtivo &&
          ehAniversarianteDeHoje(c.data_nascimento, (c as any).data_nascimento_texto)
        ) {
          aniversariantes.push({
            id: `congregado-${c.id}`,
            nome: c.nome,
            tipo: 'congregado',
            congregacao: c.congregacao,
            whatsapp: c.whatsapp,
            telefone: c.telefone,
          })
        }
      }

      aniversariantes.sort((a, b) => a.nome.localeCompare(b.nome))
      setAniversariantesHoje(aniversariantes)
    } catch (err) {
      console.error('Erro ao verificar aniversariantes do dia:', err)
    } finally {
      setLoadingAniversariantes(false)
    }
  }

  const fetchData = async () => {
    try {
      // 1. Contador vivo PocketBase: membros ativos, congregados ativos e obreiros
      try {
        const [membrosCountRes, congregadosCountRes] = await Promise.all([
          pb.collection('membros').getList(1, 1, {
            filter: "status='Ativo'",
          }),
          pb.collection('congregados').getList(1, 1, {
            filter: "status='Ativo'",
          }),
        ])
        setTotalMembrosAtivos(membrosCountRes.totalItems)
        setTotalCongregadosAtivos(congregadosCountRes.totalItems)
      } catch (err) {
        console.warn('Erro ao contar membros/congregados:', err)
      }

      // 2. Carrega obreiros
      const obreirosRes = await pb.collection('obreiros').getList<Obreiro>(1, 50, {
        filter: "status='Ativo'",
        sort: 'ordem,created',
      })
      setTotalObreirosAtivos(obreirosRes.totalItems)
      const pp = obreirosRes.items.find((o) => o.cargo === 'Pastor Presidente') || null
      setPastorPresidente(pp)
      setObreiros(obreirosRes.items.filter((o) => o.cargo !== 'Pastor Presidente').slice(0, 6))

      // 3. Carrega agenda do dia de hoje
      const agendaRes = await pb.collection('agenda_semanal').getList<AgendaSemanalItem>(1, 12, {
        filter: `dia_semana='${hojeNome}'`,
        sort: 'unidade,horario',
      })
      setAgendaHoje(agendaRes.items)

      // 4. Próximo evento em destaque (Calendário de Festas)
      try {
        const agora = new Date()
        const hojeYmd = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
        const calRes = await pb.collection('calendario').getList<any>(1, 20, {
          sort: 'data_inicio',
        })
        const eventosFuturos = calRes.items.filter((ev) =>
          isEventoFuturo(ev.data_fim || ev.data_inicio),
        )
        if (eventosFuturos.length > 0) {
          const prox = eventosFuturos[0]
          const inicioYmd = (prox.data_inicio || '').slice(0, 10)
          const dataProx = new Date(`${inicioYmd}T12:00:00`)
          const dataHoje = new Date(`${hojeYmd}T12:00:00`)
          const diffMs = dataProx.getTime() - dataHoje.getTime()
          const diasFaltando = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
          setProximoEvento({
            id: prox.id,
            titulo: prox.titulo,
            dataInicio: prox.data_inicio,
            dataFim: prox.data_fim,
            diasFaltando,
            unidade: prox.unidade,
            categoria: prox.categoria,
          })
        }
      } catch (err) {
        console.warn('Erro ao carregar próximo evento:', err)
      }

      // Carrega configurações da coleção
      try {
        const configs = await pb.collection('configuracoes').getFullList<Configuracao>()
        configs.forEach((cfg) => {
          if (cfg.chave === 'pix_chave_copia_e_cola' && cfg.valor) setChavePix(cfg.valor)
          if (cfg.chave === 'home_hero_badge' && cfg.valor) setHeroBadge(cfg.valor)
          if (cfg.chave === 'home_hero_title' && cfg.valor) setHeroTitle(cfg.valor)
          if (cfg.chave === 'home_hero_subtitle' && cfg.valor) setHeroSubtitle(cfg.valor)
          if (cfg.chave === 'home_hero_endereco' && cfg.valor) setHeroEndereco(cfg.valor)
          if (cfg.chave === 'home_pix_verso' && cfg.valor) setPixBannerVerso(cfg.valor)
          if (cfg.chave === 'home_titulo_aniversariantes' && cfg.valor)
            setTituloAniversariantes(cfg.valor)
          if (cfg.chave === 'mensagem_aniversario' && cfg.valor)
            setMensagemAniversarioConfig(cfg.valor)
          if (cfg.chave === 'home_subtitulo_aniversariantes' && cfg.valor)
            setSubtituloAniversariantes(cfg.valor)
          if (cfg.chave === 'home_titulo_reflexao' && cfg.valor) setTituloReflexao(cfg.valor)
          if (cfg.chave === 'home_badge_reflexao' && cfg.valor) setBadgeReflexao(cfg.valor)
          if (cfg.chave === 'home_titulo_obreiros' && cfg.valor) setTituloObreiros(cfg.valor)
          if (cfg.chave === 'home_tag_obreiros' && cfg.valor) setTagObreiros(cfg.valor)
          if (cfg.chave === 'home_titulo_agenda_hoje' && cfg.valor) setTituloAgendaHoje(cfg.valor)
          if (cfg.chave === 'home_subtitulo_agenda_hoje' && cfg.valor)
            setSubtituloAgendaHoje(cfg.valor)
          if (cfg.chave === 'home_titulo_campos' && cfg.valor) {
            setTituloCampos(cfg.valor)
            setCustomTituloCampos(true)
          }
          if (cfg.chave === 'home_tag_campos' && cfg.valor) setTagCampos(cfg.valor)
          if (cfg.chave === 'home_desc_campos' && cfg.valor) setDescCampos(cfg.valor)
          if (cfg.chave === 'home_titulo_pix' && cfg.valor) setTituloPix(cfg.valor)
          if (cfg.chave === 'home_tag_pix' && cfg.valor) setTagPix(cfg.valor)
          if (cfg.chave === 'home_titulo_salmos' && cfg.valor) setTituloSalmos(cfg.valor)
          if (cfg.chave === 'home_subtitulo_salmos' && cfg.valor) setSubtituloSalmos(cfg.valor)
        })
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Erro ao carregar dados da página inicial:', err)
    } finally {
      setLoading(false)
    }
  }

  // Recarga em tempo real de membros e congregados
  useRealtime<Membro>('membros', () => {
    fetchData()
    loadAniversariantes()
  })
  useRealtime<Congregado>('congregados', () => {
    fetchData()
    loadAniversariantes()
  })

  useEffect(() => {
    if (!customTituloCampos) {
      setTituloCampos(
        `Nossas ${totalUnidades} ${totalUnidades === 1 ? 'Unidade Eclesiástica' : 'Unidades Eclesiásticas'}`,
      )
    }
  }, [totalUnidades, customTituloCampos])

  useEffect(() => {
    fetchData()
    loadAniversariantes()
    setVersiculoDia(getVersiculoDoDiaARC())

    // Escolhe aleatoriamente um versículo inicial para o Hero
    const initialIndex = Math.floor(Math.random() * BIBLIA_ARC_DESTAQUES.length)
    setHeroVerseIndex(initialIndex)

    // Rotação suave a cada 12 segundos com fade
    const timer = setInterval(() => {
      setHeroVerseFade(false)
      setTimeout(() => {
        setHeroVerseIndex((prev) => (prev + 1) % BIBLIA_ARC_DESTAQUES.length)
        setHeroVerseFade(true)
      }, 400)
    }, 12000)

    return () => clearInterval(timer)
  }, [hojeNome])

  const handleCopyVersiculo = () => {
    const texto = `📖 Reflexão Diária — ADTC Campanário\n\n"${versiculoDia.texto}"\n— ${versiculoDia.livro} ${versiculoDia.capitulo}:${versiculoDia.versiculo} (Almeida Revista e Corrigida - ARC)\n\n${versiculoDia.reflexao || ''}`
    navigator.clipboard.writeText(texto)
    setVersiculoCopiado(true)
    toast({
      title: 'Versículo copiado!',
      description: 'Texto bíblico na versão ARC copiado para a área de transferência.',
    })
    setTimeout(() => setVersiculoCopiado(false), 3000)
  }

  const copyPix = () => {
    navigator.clipboard.writeText(chavePix)
    toast({
      title: 'Chave PIX copiada!',
      description: 'Chave copiada com sucesso para a área de transferência.',
    })
  }

  // Auxiliar para salvar configuração
  const saveConfigKey = async (chave: string, valor: string) => {
    try {
      const existing = await pb
        .collection('configuracoes')
        .getFirstListItem<Configuracao>(`chave='${chave}'`)
      await pb.collection('configuracoes').update(existing.id, { valor })
    } catch {
      await pb.collection('configuracoes').create({ chave, valor })
    }
  }

  // Salvar Hero
  const handleOpenHeroModal = () => {
    setHeroForm({
      badge: heroBadge,
      title: heroTitle,
      subtitle: heroSubtitle,
      endereco: heroEndereco,
    })
    setIsHeroModalOpen(true)
  }

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingHero(true)
    try {
      await Promise.all([
        saveConfigKey('home_hero_badge', heroForm.badge),
        saveConfigKey('home_hero_title', heroForm.title),
        saveConfigKey('home_hero_subtitle', heroForm.subtitle),
        saveConfigKey('home_hero_endereco', heroForm.endereco),
      ])
      setHeroBadge(heroForm.badge)
      setHeroTitle(heroForm.title)
      setHeroSubtitle(heroForm.subtitle)
      setHeroEndereco(heroForm.endereco)
      toast({ title: 'Cabeçalho da Home atualizado com sucesso!' })
      setIsHeroModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar textos da home',
        description: err?.message,
      })
    } finally {
      setIsSavingHero(false)
    }
  }

  // Salvar PIX Modal
  const handleOpenPixModal = () => {
    setPixFormKey(chavePix)
    setPixFormVerso(pixBannerVerso)
    setIsPixModalOpen(true)
  }

  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingPix(true)
    try {
      await Promise.all([
        saveConfigKey('pix_chave_copia_e_cola', pixFormKey.trim()),
        saveConfigKey('home_pix_verso', pixFormVerso.trim()),
      ])
      setChavePix(pixFormKey.trim())
      setPixBannerVerso(pixFormVerso.trim())
      toast({ title: 'Configurações de PIX salvas com sucesso!' })
      setIsPixModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar dados do PIX',
        description: err?.message,
      })
    } finally {
      setIsSavingPix(false)
    }
  }

  // Agenda de Hoje - Adicionar / Editar
  const handleOpenAddAgenda = () => {
    setEditingAgendaItem(null)
    setAgendaForm({
      unidade: 'Sede',
      dia_semana: hojeNome,
      horario: '19h00',
      evento: '',
      observacao: '',
    })
    setIsAgendaModalOpen(true)
  }

  const handleOpenEditAgenda = (item: AgendaSemanalItem) => {
    setEditingAgendaItem(item)
    setAgendaForm({
      unidade: item.unidade,
      dia_semana: item.dia_semana,
      horario: item.horario || '19h00',
      evento: item.evento || '',
      observacao: item.observacao || '',
    })
    setIsAgendaModalOpen(true)
  }

  const handleSaveAgenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agendaForm.evento.trim()) {
      toast({ variant: 'destructive', title: 'Informe o título do culto/atividade.' })
      return
    }
    setIsSavingAgenda(true)
    try {
      const payload = {
        unidade: agendaForm.unidade,
        dia_semana: agendaForm.dia_semana,
        horario: agendaForm.horario.trim(),
        evento: agendaForm.evento.trim(),
        observacao: agendaForm.observacao.trim(),
      }
      if (editingAgendaItem) {
        await pb.collection('agenda_semanal').update(editingAgendaItem.id, payload)
        toast({ title: 'Culto/evento atualizado com sucesso!' })
      } else {
        await pb.collection('agenda_semanal').create(payload)
        toast({ title: 'Novo culto/evento adicionado à agenda!' })
      }
      setIsAgendaModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar evento da agenda',
        description: err?.message,
      })
    } finally {
      setIsSavingAgenda(false)
    }
  }

  const handleDeleteAgendaConfirm = async () => {
    if (!deleteAgendaId) return
    try {
      await pb.collection('agenda_semanal').delete(deleteAgendaId)
      toast({ title: 'Item removido da agenda com sucesso.' })
      setDeleteAgendaId(null)
      fetchData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover item',
        description: err?.message,
      })
    }
  }

  const currentHeroVerse = BIBLIA_ARC_DESTAQUES[heroVerseIndex] || BIBLIA_ARC_DESTAQUES[0]

  return (
    <div className="space-y-0 pb-16 bg-[#07172C] w-full max-w-full overflow-hidden">
      {/* 1. HERO SECTION COM AZUL MARINHO PROFUNDO, LOGO 3D COM BRILHO DOURADO E VERSÍCULO ROTATIVO */}
      <section className="relative w-full max-w-full overflow-hidden bg-gradient-to-b from-[#051329] via-[#072348] to-[#0A2E5C] text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 border-b-4 border-[#C9A227]">
        {/* Textura sutil de luz e partículas douradas e halos confinados */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none w-full max-w-full">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F3CA52_1px,transparent_1px)] [background-size:28px_28px]" />
          {/* Brilhos / halos dourados e azuis profundos */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] max-w-[90vw] h-[360px] bg-gradient-to-b from-[#C9A227]/20 via-[#F3CA52]/10 to-transparent rounded-full blur-3xl overflow-hidden" />
          <div className="absolute -top-20 -right-20 w-80 max-w-[60vw] h-80 bg-[#C9A227]/15 rounded-full blur-3xl overflow-hidden" />
          <div className="absolute -bottom-24 -left-20 w-80 max-w-[60vw] h-80 bg-blue-500/15 rounded-full blur-3xl overflow-hidden" />
        </div>

        {/* Botão Admin para Editar Hero */}
        {isAdmin && (
          <div className="absolute top-4 right-4 z-30">
            <Button
              onClick={handleOpenHeroModal}
              size="sm"
              className="bg-gradient-to-r from-[#C9A227] to-[#E6BA30] hover:from-[#B08E1E] hover:to-[#C9A227] text-[#072348] font-bold shadow-lg border border-amber-200/50 flex items-center gap-1.5 text-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar Textos da Home
            </Button>
          </div>
        )}

        <div className="relative max-w-5xl mx-auto text-center space-y-6 animate-fade-in-up">
          {/* Logo Oficial 3D Centralizada com Anel e Brilho Dourado */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="relative group">
              {/* Anel de brilho pulsante */}
              <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-[#C9A227] via-[#FCE99B] to-[#C9A227] opacity-80 blur-md group-hover:opacity-100 group-hover:blur-lg transition duration-700 animate-pulse" />
              <div className="relative p-1 rounded-full bg-gradient-to-b from-[#FAF8F5] via-[#C9A227] to-[#8C6D15] shadow-2xl">
                <img
                  src={ADTC_LOGO_URL}
                  alt="Assembleia de Deus Templo Central de Campanário"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-[#072348] shadow-2xl bg-[#072348] transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/logo-oficial.png'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center justify-center">
            <Badge className="bg-[#C9A227]/25 text-[#F6D878] border border-[#C9A227]/60 px-4 py-1.5 text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1.5 shadow-md backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#F3CA52]" />
              <InlineText
                configKey="home_hero_badge"
                defaultText={heroBadge}
                isAdmin={isAdmin}
                tag="span"
                label="Tag Superior da Home"
                onSave={setHeroBadge}
              />
            </Badge>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
            <InlineText
              configKey="home_hero_title"
              defaultText={heroTitle}
              isAdmin={isAdmin}
              tag="span"
              label="Título Principal da Home"
              onSave={setHeroTitle}
            />
          </h1>

          <div className="text-base sm:text-xl text-slate-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-xs">
            <InlineText
              configKey="home_hero_subtitle"
              defaultText={heroSubtitle}
              isAdmin={isAdmin}
              isTextarea
              rows={2}
              tag="p"
              label="Subtítulo da Home"
              onSave={setHeroSubtitle}
            />
          </div>

          {/* Endereço e Redes Sociais */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 bg-[#051329]/70 backdrop-blur-md px-4 py-2 rounded-full text-xs sm:text-sm text-slate-100 border border-[#C9A227]/40 shadow-sm">
              <MapPin className="w-4 h-4 text-[#F3CA52] flex-shrink-0" />
              <InlineText
                configKey="home_hero_endereco"
                defaultText={heroEndereco}
                isAdmin={isAdmin}
                tag="span"
                label="Endereço no Topo"
                onSave={setHeroEndereco}
              />
            </div>

            {/* Instagram Oficial da Igreja */}
            <a
              href="https://www.instagram.com/adtccampanario?stkn=ODNndm02a25xN25r"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition shadow-sm border border-white/20"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span>Instagram @adtccampanario</span>
            </a>
          </div>

          {/* Versículo Rotativo no Hero com transição suave fade */}
          <div className="max-w-2xl mx-auto pt-2 pb-1">
            <div
              className={`transition-opacity duration-500 rounded-xl bg-black/35 backdrop-blur-md p-3.5 border border-[#C9A227]/40 shadow-inner ${
                heroVerseFade ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <p className="font-serif italic text-xs sm:text-sm text-amber-100 leading-relaxed">
                &ldquo;{currentHeroVerse.texto}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-[#F3CA52] font-semibold">
                <span>
                  {currentHeroVerse.livro} {currentHeroVerse.capitulo}:{currentHeroVerse.versiculo}{' '}
                  (ARC)
                </span>
                {currentHeroVerse.tema && (
                  <span className="text-slate-300 font-normal">• {currentHeroVerse.tema}</span>
                )}
              </div>
            </div>
          </div>

          {/* CTAs Reposicionados em Dourado / Âmbar */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-[#C9A227] via-[#F3CA52] to-[#C9A227] hover:brightness-110 text-[#072348] font-bold shadow-xl border border-amber-300 transition-transform hover:scale-105 active:scale-95"
            >
              <Link to="/obreiros" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Conheça Nossos Obreiros
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-[#072348]/70 border border-[#C9A227]/70 text-[#FCE99B] hover:bg-[#C9A227] hover:text-[#072348] font-semibold shadow-md transition-all"
            >
              <Link to="/agenda-semanal" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F3CA52]" />
                Agenda Semanal
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-medium"
            >
              <Link to="/salmos" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#F3CA52]" />
                Salmos Musicados
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* BARRA DE CONTADOR VIVO & PRÓXIMO EVENTO (PocketBase ao vivo) */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contador Vivo de Membros */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0F325E] to-[#072348] border-2 border-[#C9A227] p-4 sm:p-5 shadow-2xl text-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227]/20 border border-[#C9A227] flex items-center justify-center text-[#F3CA52]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#F3CA52]">
                  Membros em Comunhão
                </p>
                <h3 className="font-serif text-2xl font-bold text-white">
                  {totalMembrosAtivos > 0 ? `${totalMembrosAtivos} Membros` : 'Comunhão Viva'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {totalObreirosAtivos > 0
                    ? `${totalObreirosAtivos} obreiros consagrados`
                    : 'Comunhão fraternal'}
                </p>
                <p className="text-[11px] text-amber-200 font-medium mt-0.5">
                  {totalCongregadosAtivos}{' '}
                  {totalCongregadosAtivos === 1 ? 'congregado ativo' : 'congregados ativos'}
                </p>
              </div>
            </div>
            <Badge className="bg-[#C9A227] text-[#072348] font-bold text-xs uppercase">
              Ao Vivo
            </Badge>
          </div>

          {/* Unidades Eclesiásticas */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0F325E] to-[#072348] border-2 border-[#C9A227] p-4 sm:p-5 shadow-2xl text-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227]/20 border border-[#C9A227] flex items-center justify-center text-[#F3CA52]">
                <Church className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#F3CA52]">
                  Presença nos Bairros
                </p>
                <h3 className="font-serif text-2xl font-bold text-white">{textoTotalUnidades}</h3>
                <p className="text-[11px] text-slate-300">
                  {congregacoes
                    .map((c) => c.nome.replace(/^Congregação d[ao]s?\s+/i, ''))
                    .join(', ')}
                </p>
              </div>
            </div>
            <Link
              to="/congregacoes"
              className="text-xs font-semibold text-[#F3CA52] hover:underline"
            >
              Ver unidades →
            </Link>
          </div>

          {/* Próximo Evento do Calendário */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0F325E] to-[#072348] border-2 border-[#C9A227] p-4 sm:p-5 shadow-2xl text-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227]/20 border border-[#C9A227] flex items-center justify-center text-[#F3CA52]">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#F3CA52]">
                  Próximo Evento Oficial
                </p>
                {proximoEvento ? (
                  <>
                    <h3
                      className="font-serif text-base sm:text-lg font-bold text-white truncate"
                      title={proximoEvento.titulo}
                    >
                      {proximoEvento.titulo}
                    </h3>
                    <p className="text-[11px] text-amber-200">
                      {proximoEvento.diasFaltando === 0
                        ? '🔥 É HOJE!'
                        : proximoEvento.diasFaltando === 1
                          ? '⏳ Falta 1 dia'
                          : `⏳ Faltam ${proximoEvento.diasFaltando} dias`}{' '}
                      • {formatarPeriodoEvento(proximoEvento.dataInicio, proximoEvento.dataFim)}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-serif text-base font-bold text-white">Cultos Regulares</h3>
                    <p className="text-[11px] text-slate-300">Consulte o calendário oficial</p>
                  </>
                )}
              </div>
            </div>
            <Link
              to="/calendario"
              className="text-xs font-semibold text-[#F3CA52] hover:underline flex-shrink-0"
            >
              Agenda →
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SESSÃO BRANCO-CREME / DOURADO: ANIVERSARIANTES E REFLEXÃO */}
      <section className="bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#F5EFE6] py-14 border-y-2 border-[#C9A227]/30 text-slate-900 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Aniversariantes do Dia */}
          <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 rounded-2xl border-2 border-[#C9A227] p-5 sm:p-6 shadow-xl transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6E2D8] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#072348] border border-[#C9A227] flex items-center justify-center text-[#F3CA52] shadow-sm">
                  <Cake className="w-5 h-5 text-[#F3CA52]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#072348] text-[#F3CA52] border border-[#C9A227]/40 font-bold text-[10px] uppercase tracking-wider">
                      🎂 Parabéns!
                    </Badge>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                  </div>
                  <InlineText
                    configKey="home_titulo_aniversariantes"
                    defaultText={tituloAniversariantes}
                    isAdmin={isAdmin}
                    tag="h2"
                    label="Título Aniversariantes"
                    className="font-serif text-lg sm:text-xl font-bold text-[#0F325E] mt-0.5"
                    onSave={setTituloAniversariantes}
                  />
                </div>
              </div>

              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-[#0F325E] text-[#0F325E] hover:bg-[#0F325E] hover:text-white text-xs"
                >
                  <Link to="/admin/membros">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Gerenciar Membros
                  </Link>
                </Button>
              )}
            </div>

            <div className="pt-4">
              {loadingAniversariantes ? (
                <div className="flex items-center justify-center py-4 text-xs text-[#5A5A5A] gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                  <span>Identificando aniversariantes de hoje...</span>
                </div>
              ) : aniversariantesHoje.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <InlineText
                      configKey="home_subtitulo_aniversariantes"
                      defaultText={subtituloAniversariantes}
                      isAdmin={isAdmin}
                      isTextarea
                      tag="p"
                      label="Mensagem de Parabéns aos Aniversariantes"
                      onSave={setSubtituloAniversariantes}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {aniversariantesHoje.map((m) => {
                      return (
                        <div
                          key={m.id}
                          className="bg-white p-3.5 rounded-xl border border-[#C9A227]/50 shadow-md flex items-center justify-between gap-3 transition hover:shadow-lg"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-[#072348] text-[#F3CA52] border border-[#C9A227]/60 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden shadow-xs">
                              {m.foto ? (
                                <img
                                  src={m.foto}
                                  alt={m.nome}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{m.nome.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4
                                  className="font-serif font-bold text-sm text-[#0F325E] truncate"
                                  title={m.nome}
                                >
                                  {m.nome}
                                </h4>
                                {m.tipo === 'membro' ? (
                                  <Badge className="bg-[#1E3A5F] hover:bg-[#16304F] text-white font-semibold text-[9px] px-1.5 py-0.2 shrink-0">
                                    Membro
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 border border-amber-600 shrink-0">
                                    Congregado
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {m.congregacao || 'ADTC Campanário'}
                              </p>
                            </div>
                          </div>

                          {/* O botão Felicitar só aparece para o administrador autenticado */}
                          {isAdmin && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAbrirFelicitarModal(m)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shrink-0 h-8 px-2.5"
                              title={`Felicitar ${m.nome} via WhatsApp`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" />
                              Felicitar
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-slate-500 italic text-center sm:text-left pt-1">
                    "O SENHOR te abençoe e te guarde; o SENHOR faça resplandecer o seu rosto sobre
                    ti e tenha misericórdia de ti." (Números 6:24-25, ARC)
                  </p>
                </div>
              ) : (
                <div className="py-2 text-center sm:text-left text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span>
                    Hoje não temos aniversariantes registrados — volte amanhã para celebrar conosco
                    os irmãos da igreja!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reflexão Diária (ARC) */}
          <div className="bg-white rounded-2xl border border-[#E6E2D8] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A227]/10 rounded-bl-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6E2D8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#072348] text-[#F3CA52] border border-[#C9A227] flex items-center justify-center shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-[#C9A227] text-[#8C6D15] uppercase font-bold"
                    >
                      <InlineText
                        configKey="home_badge_reflexao"
                        defaultText={badgeReflexao}
                        isAdmin={isAdmin}
                        tag="span"
                        label="Badge Reflexão Diária"
                        onSave={setBadgeReflexao}
                      />
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Almeida Revista e Corrigida (ARC)
                    </span>
                  </div>
                  <InlineText
                    configKey="home_titulo_reflexao"
                    defaultText={tituloReflexao}
                    isAdmin={isAdmin}
                    tag="h2"
                    label="Título Reflexão Diária"
                    className="font-serif text-xl sm:text-2xl font-bold text-[#0F325E] mt-0.5"
                    onSave={setTituloReflexao}
                  />
                </div>
              </div>

              <Button
                onClick={handleCopyVersiculo}
                variant="outline"
                size="sm"
                className="border-[#0F325E]/40 text-[#0F325E] hover:bg-[#0F325E] hover:text-white text-xs gap-1.5 self-start sm:self-auto"
              >
                {versiculoCopiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    Compartilhar Versículo
                  </>
                )}
              </Button>
            </div>

            <div className="pt-6 space-y-4">
              <div className="bg-[#F7F5F0] rounded-xl p-5 sm:p-6 border-l-4 border-[#C9A227] space-y-3 relative shadow-xs">
                <Quote className="w-8 h-8 text-[#C9A227]/30 absolute top-3 right-4 pointer-events-none" />
                <blockquote className="font-serif text-base sm:text-lg text-[#0F325E] font-semibold leading-relaxed">
                  "{versiculoDia.texto}"
                </blockquote>
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#E6E2D8]">
                  <span className="text-xs sm:text-sm font-bold text-[#8C6D15]">
                    — {versiculoDia.livro} {versiculoDia.capitulo}:{versiculoDia.versiculo} (ARC)
                  </span>
                  {versiculoDia.tema && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-white text-[#0F325E] border border-[#E6E2D8]"
                    >
                      Tema: {versiculoDia.tema}
                    </Badge>
                  )}
                </div>
              </div>

              {versiculoDia.reflexao && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-1">
                  <strong className="text-[#0F325E]">Meditação Pastoral:</strong>{' '}
                  {versiculoDia.reflexao}
                </p>
              )}
            </div>
          </div>

          {/* Cards Rápidos de Informação com profundidade e bordas douradas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
            <Link to="/congregacoes" className="group">
              <Card className="h-full border border-[#C9A227]/40 bg-white shadow-lg hover:shadow-2xl hover:border-[#C9A227] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center space-y-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#072348] text-[#F3CA52] border border-[#C9A227]/40 flex items-center justify-center group-hover:bg-[#C9A227] group-hover:text-[#072348] transition-colors duration-300 shadow-md">
                    <Church className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#0F325E]">
                    {textoTotalUnidades}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">Sede e congregações</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/agenda-semanal" className="group">
              <Card className="h-full border border-[#C9A227]/40 bg-white shadow-lg hover:shadow-2xl hover:border-[#C9A227] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center space-y-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#072348] text-[#F3CA52] border border-[#C9A227]/40 flex items-center justify-center group-hover:bg-[#C9A227] group-hover:text-[#072348] transition-colors duration-300 shadow-md">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#0F325E]">
                    Cultos Semanais
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">Doutrina e família</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/escala" className="group">
              <Card className="h-full border border-[#C9A227]/40 bg-white shadow-lg hover:shadow-2xl hover:border-[#C9A227] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center space-y-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#072348] text-[#F3CA52] border border-[#C9A227]/40 flex items-center justify-center group-hover:bg-[#C9A227] group-hover:text-[#072348] transition-colors duration-300 shadow-md">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#0F325E]">
                    Escala da Semana
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">Dirigentes e pregadores</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/carteirinha" className="group">
              <Card className="h-full border-2 border-[#C9A227] bg-gradient-to-b from-amber-50/50 to-white shadow-lg hover:shadow-2xl hover:border-[#8C6D15] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-2 min-h-[140px]">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#C9A227] text-[#072348] border border-amber-400 flex items-center justify-center group-hover:bg-[#072348] group-hover:text-[#F3CA52] transition-colors duration-300 shadow-md">
                    <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#0F325E] leading-snug">
                    Retire sua carteira digital
                  </h3>
                </CardContent>
              </Card>
            </Link>

            <Link to="/doacoes" className="group col-span-2 md:col-span-1">
              <Card className="h-full border border-[#C9A227]/40 bg-white shadow-lg hover:shadow-2xl hover:border-[#C9A227] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center space-y-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#072348] text-[#F3CA52] border border-[#C9A227]/40 flex items-center justify-center group-hover:bg-[#C9A227] group-hover:text-[#072348] transition-colors duration-300 shadow-md">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#0F325E]">
                    Doações via PIX
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">Dízimos e ofertas</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO AZUL-ESCURO / MARINHO PROFUNDO: CORPO DE OBREIROS */}
      <section className="bg-gradient-to-b from-[#072348] via-[#092B57] to-[#0B356B] py-16 text-white relative overflow-hidden border-b-2 border-[#C9A227]/30">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F3CA52_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-[#C9A227]/30 pb-4">
            <div>
              <InlineText
                configKey="home_tag_obreiros"
                defaultText={tagObreiros}
                isAdmin={isAdmin}
                tag="span"
                label="Tag Obreiros"
                className="text-xs font-semibold uppercase tracking-widest text-[#F3CA52] block"
                onSave={setTagObreiros}
              />
              <InlineText
                configKey="home_titulo_obreiros"
                defaultText={tituloObreiros}
                isAdmin={isAdmin}
                tag="h2"
                label="Título Corpo de Obreiros"
                className="font-serif text-2xl sm:text-3xl font-bold text-white drop-shadow-sm"
                onSave={setTituloObreiros}
              />
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#072348] font-bold text-xs"
                >
                  <Link to="/obreiros" className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Gerenciar Obreiros
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant="ghost"
                className="text-amber-200 hover:text-white hover:bg-white/10 text-xs sm:text-sm"
              >
                <Link to="/obreiros" className="flex items-center gap-1 font-semibold">
                  Ver todos os obreiros
                  <ChevronRight className="w-4 h-4 text-[#F3CA52]" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Pastor Presidente em destaque solene */}
          {pastorPresidente && (
            <Card className="overflow-hidden border-2 border-[#C9A227] bg-gradient-to-r from-[#051833] via-[#092B57] to-[#0D3870] shadow-2xl text-white">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                  {/* Foto ou Monograma */}
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[#C9A227] p-1 bg-[#051833] shadow-xl flex items-center justify-center overflow-hidden">
                      {pastorPresidente.foto ? (
                        <img
                          src={pb.files.getURL(pastorPresidente, pastorPresidente.foto)}
                          alt={pastorPresidente.nome}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-[#072348] text-[#F3CA52] flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold">
                          {pastorPresidente.nome
                            .split(' ')
                            .filter((p) => !['Pr.', 'Pr', 'de', 'da', 'do'].includes(p))
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')}
                        </div>
                      )}
                    </div>
                    <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#C9A227] text-[#072348] font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 shadow-md whitespace-nowrap">
                      Pastor Presidente
                    </Badge>
                  </div>

                  {/* Conteúdo e Mensagem Pastoral */}
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-white drop-shadow-xs">
                        {pastorPresidente.nome}
                      </h3>
                      <p className="text-xs text-[#F3CA52] font-semibold tracking-wide uppercase mt-0.5">
                        Liderança Pastoral Geral • Sede ADTC Campanário
                      </p>
                    </div>

                    {pastorPresidente.mensagem_pastoral && (
                      <blockquote className="italic text-xs sm:text-sm text-slate-200 border-l-0 md:border-l-3 md:border-[#C9A227] md:pl-4 py-1 leading-relaxed bg-black/25 p-3 rounded-r-lg">
                        "{pastorPresidente.mensagem_pastoral}"
                      </blockquote>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Demais Obreiros em Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {obreiros.map((ob) => (
              <Card
                key={ob.id}
                className="border border-[#C9A227]/40 bg-[#051833]/80 shadow-md hover:shadow-xl hover:border-[#C9A227] transition text-center p-3 sm:p-4 flex flex-col items-center justify-between text-white rounded-xl"
              >
                <div className="w-16 h-16 rounded-full bg-[#072348] border-2 border-[#C9A227]/50 flex items-center justify-center text-[#F3CA52] font-serif font-bold text-sm mb-2 overflow-hidden shadow-xs">
                  {ob.foto ? (
                    <img
                      src={pb.files.getURL(ob, ob.foto)}
                      alt={ob.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {ob.nome
                        .split(' ')
                        .filter((p) => !['Ev.', 'Pb.', 'Dc.', 'Aux.', 'de', 'da'].includes(p))
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  )}
                </div>
                <div className="w-full">
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase tracking-wider text-[#F3CA52] border-[#C9A227]/50 mb-1"
                  >
                    {ob.cargo}
                  </Badge>
                  <h4
                    className="font-serif font-semibold text-xs text-white line-clamp-1"
                    title={ob.nome}
                  >
                    {ob.nome}
                  </h4>
                  <p className="text-[10px] text-slate-300 truncate mt-0.5">{ob.congregacao}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO BRANCO-CREME / DOURADO: AGENDA DO DIA E SALMO DO DIA */}
      <section className="bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#F5EFE6] py-14 text-slate-900 border-y-2 border-[#C9A227]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Agenda de Hoje */}
          <div className="bg-white rounded-2xl border border-[#E6E2D8] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6E2D8] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#072348] text-[#F3CA52] font-bold text-xs uppercase tracking-wider border border-[#C9A227]/40">
                    Hoje • {hojeNome}
                  </Badge>
                  <InlineText
                    configKey="home_subtitulo_agenda_hoje"
                    defaultText={subtituloAgendaHoje}
                    isAdmin={isAdmin}
                    tag="span"
                    label="Subtítulo Agenda de Hoje"
                    className="text-xs text-slate-500 font-medium"
                    onSave={setSubtituloAgendaHoje}
                  />
                </div>
                <InlineText
                  configKey="home_titulo_agenda_hoje"
                  defaultText={tituloAgendaHoje}
                  isAdmin={isAdmin}
                  tag="h2"
                  label="Título Cultos e Atividades de Hoje"
                  className="font-serif text-xl sm:text-2xl font-bold text-[#0F325E] mt-1"
                  onSave={setTituloAgendaHoje}
                />
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    onClick={handleOpenAddAgenda}
                    size="sm"
                    className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#072348] font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Culto Hoje
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-[#0F325E] text-[#0F325E] hover:bg-[#0F325E] hover:text-white"
                >
                  <Link to="/agenda-semanal" className="flex items-center gap-1.5">
                    Ver agenda da semana completa
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {agendaHoje.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agendaHoje.map((item) => (
                  <div
                    key={item.id}
                    className="relative p-4 rounded-xl border border-[#C9A227]/30 bg-[#FAF8F5] hover:bg-[#F3EEDB] transition space-y-2 group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-[#0F325E]/40 text-[#0F325E] font-semibold"
                      >
                        {item.unidade}
                      </Badge>
                      <span className="text-xs font-bold text-[#8C6D15] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.horario || '19h00'}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-sm text-[#0F325E]">{item.evento}</h4>
                    {item.observacao && (
                      <p className="text-xs text-slate-600 italic">{item.observacao}</p>
                    )}

                    {/* Ações de Edição Admin Inline */}
                    {isAdmin && (
                      <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-[#E6E2D8]/60">
                        <button
                          onClick={() => handleOpenEditAgenda(item)}
                          className="p-1 rounded text-[#0F325E] hover:bg-[#0F325E]/10 transition text-xs flex items-center gap-1"
                          title="Editar evento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Editar</span>
                        </button>
                        <button
                          onClick={() => setDeleteAgendaId(item.id)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 transition text-xs flex items-center gap-1"
                          title="Excluir evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-500 space-y-2">
                <p>Nenhuma atividade litúrgica cadastrada para este dia em específico.</p>
                <Button asChild variant="link" className="text-[#8C6D15] font-semibold">
                  <Link to="/agenda-semanal">
                    Consulte a rotina semanal completa das {totalUnidades}{' '}
                    {totalUnidades === 1 ? 'unidade' : 'unidades'} →
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. SEÇÃO BRANCO-CREME: CONGREGAÇÕES E CAMPOS DE ATUAÇÃO */}
      <section className="bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#F5EFE6] py-14 text-slate-900 border-b-2 border-[#C9A227]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <InlineText
              configKey="home_tag_campos"
              defaultText={tagCampos}
              isAdmin={isAdmin}
              tag="span"
              label="Tag Congregações"
              className="text-xs font-semibold uppercase tracking-widest text-[#8C6D15] block"
              onSave={setTagCampos}
            />
            <InlineText
              configKey="home_titulo_campos"
              defaultText={tituloCampos}
              isAdmin={isAdmin}
              tag="h2"
              label="Título Congregações"
              className="font-serif text-2xl sm:text-3xl font-bold text-[#0F325E]"
              onSave={setTituloCampos}
            />
            <InlineText
              configKey="home_desc_campos"
              defaultText={descCampos}
              isAdmin={isAdmin}
              isTextarea
              tag="p"
              label="Descrição Congregações"
              className="text-xs sm:text-sm text-slate-600"
              onSave={setDescCampos}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {congregacoes.map((item, idx) => {
              const isSede = item.nome.trim().toLowerCase() === 'sede'
              return (
                <Card
                  key={item.id || item.nome || idx}
                  className="border border-[#C9A227]/40 bg-white shadow-lg hover:shadow-xl hover:border-[#C9A227] transition rounded-2xl flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-2">
                    {isSede ? (
                      <Badge className="bg-[#072348] text-[#F3CA52] text-[10px] uppercase font-bold border border-[#C9A227]/40">
                        Sede
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-[#C9A227] text-[#8C6D15] text-[10px] uppercase font-bold"
                      >
                        Filial {idx}
                      </Badge>
                    )}
                    <h3 className="font-serif font-bold italic text-base sm:text-lg text-[#0F325E] tracking-wide">
                      {item.nome}
                    </h3>
                    <p className="text-xs text-slate-600">{item.endereco}</p>
                    <p className="text-xs text-slate-500 pt-1">Cultos: {item.diasCulto}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="text-center pt-2">
            <Button
              asChild
              className="bg-[#072348] hover:bg-[#0F325E] text-[#F3CA52] border border-[#C9A227]/50 font-semibold shadow-md"
            >
              <Link to="/congregacoes">
                Ver Relação Nominal de Membros por Congregação
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 7. SEÇÃO AZUL-ESCURO / DOURADO: BANNER DE DOAÇÕES PIX */}
      <section className="bg-gradient-to-b from-[#072348] via-[#0B356B] to-[#07172C] py-16 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#051833] via-[#092B57] to-[#0F325E] text-white p-6 sm:p-10 border-2 border-[#C9A227] shadow-2xl relative overflow-hidden">
            {isAdmin && (
              <div className="absolute top-4 right-4 z-20">
                <Button
                  onClick={handleOpenPixModal}
                  size="sm"
                  className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#072348] font-bold text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Editar PIX & Texto
                </Button>
              </div>
            )}

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
              <div className="space-y-3 text-center md:text-left max-w-xl">
                <Badge className="bg-[#C9A227] text-[#072348] font-bold text-xs uppercase tracking-wider">
                  <InlineText
                    configKey="home_tag_pix"
                    defaultText={tagPix}
                    isAdmin={isAdmin}
                    tag="span"
                    label="Tag PIX"
                    onSave={setTagPix}
                  />
                </Badge>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  <InlineText
                    configKey="home_titulo_pix"
                    defaultText={tituloPix}
                    isAdmin={isAdmin}
                    tag="span"
                    label="Título Dízimos & PIX"
                    onSave={setTituloPix}
                  />
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {pixBannerVerso}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <Button
                    onClick={copyPix}
                    disabled={!chavePix}
                    className="bg-gradient-to-r from-[#C9A227] to-[#E6BA30] hover:from-[#B08E1E] hover:to-[#C9A227] text-[#072348] font-bold text-xs sm:text-sm shadow-md border border-amber-300 disabled:opacity-50"
                  >
                    {chavePix ? 'Copiar Chave PIX' : 'Chave PIX não configurada'}
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm"
                  >
                    <Link to="/doacoes">Ver Instruções e QR Code</Link>
                  </Button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl text-center shadow-xl border-2 border-[#C9A227] flex-shrink-0">
                <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center text-[#0F325E] mx-auto p-2 border border-slate-200 overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      chavePix,
                    )}`}
                    alt="QR Code PIX ADTC Campanário"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] font-semibold text-[#0F325E] mt-2">PIX Oficial ADTC</p>
                <p className="text-[9px] text-slate-600 max-w-[140px] truncate" title={chavePix}>
                  {chavePix}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Admin: Editar Hero */}
      <Dialog open={isHeroModalOpen} onOpenChange={setIsHeroModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              Editar Textos de Boas-Vindas da Home
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Atualize as informações do cabeçalho principal visto por todos os visitantes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHero} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Tag de Destaque</label>
              <Input
                value={heroForm.badge}
                onChange={(e) => setHeroForm({ ...heroForm, badge: e.target.value })}
                placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Título Principal</label>
              <Input
                value={heroForm.title}
                onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                placeholder="Ex: ADTC Campanário"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Mensagem / Subtítulo</label>
              <Textarea
                value={heroForm.subtitle}
                onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                rows={3}
                placeholder="Mensagem de acolhimento e compromisso bíblico..."
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Endereço em Destaque</label>
              <Input
                value={heroForm.endereco}
                onChange={(e) => setHeroForm({ ...heroForm, endereco: e.target.value })}
                placeholder="Ex: Sede: Rua Alberto Batista Fontenele, nº 141, Campanário"
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsHeroModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingHero} className="bg-[#1E3A5F] text-white">
                {isSavingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Admin: Editar PIX da Home */}
      <Dialog open={isPixModalOpen} onOpenChange={setIsPixModalOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              Editar PIX e Mensagem de Contribuição
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              A chave PIX será atualizada em todo o site e o QR Code será recalculado dinamicamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePix} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Chave PIX Copia e Cola</label>
              <Input
                value={pixFormKey}
                onChange={(e) => setPixFormKey(e.target.value)}
                placeholder="Ex: 14.037.658/0001-82"
                className="text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Versículo / Mensagem</label>
              <Textarea
                value={pixFormVerso}
                onChange={(e) => setPixFormVerso(e.target.value)}
                rows={3}
                placeholder="Ex: Cada um dê conforme determinou em seu coração..."
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsPixModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingPix} className="bg-[#1E3A5F] text-white">
                {isSavingPix ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar PIX'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Admin: Adicionar/Editar Agenda Hoje */}
      <Dialog open={isAgendaModalOpen} onOpenChange={setIsAgendaModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingAgendaItem ? 'Editar Culto/Evento' : 'Adicionar à Programação de Hoje'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Dia selecionado: <strong>{hojeNome}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAgenda} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Unidade / Congregação</label>
              <select
                value={agendaForm.unidade}
                onChange={(e) => setAgendaForm({ ...agendaForm, unidade: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
              >
                {(nomesUnidades || []).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Dia da Semana</label>
                <select
                  value={agendaForm.dia_semana}
                  onChange={(e) => setAgendaForm({ ...agendaForm, dia_semana: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
                >
                  {DIAS_SEMANA.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Horário</label>
                <Input
                  value={agendaForm.horario}
                  onChange={(e) => setAgendaForm({ ...agendaForm, horario: e.target.value })}
                  placeholder="Ex: 19h00"
                  className="text-xs sm:text-sm h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome do Culto / Evento <span className="text-red-500">*</span>
              </label>
              <Input
                value={agendaForm.evento}
                onChange={(e) => setAgendaForm({ ...agendaForm, evento: e.target.value })}
                placeholder="Ex: Culto de Doutrina e Ensino"
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Observação</label>
              <Input
                value={agendaForm.observacao}
                onChange={(e) => setAgendaForm({ ...agendaForm, observacao: e.target.value })}
                placeholder="Ex: Estudo bíblico para toda a igreja"
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsAgendaModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingAgenda} className="bg-[#1E3A5F] text-white">
                {isSavingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Culto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão Agenda */}
      <Dialog open={!!deleteAgendaId} onOpenChange={(open) => !open && setDeleteAgendaId(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir da Agenda
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Tem certeza que deseja remover este evento da agenda?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAgendaId(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteAgendaConfirm} className="bg-rose-600 text-white flex-1">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Felicitação Editável de Aniversariante (Apenas Admin) */}
      <ModalFelicitarAniversariante
        open={felicitarModalOpen}
        onOpenChange={setFelicitarModalOpen}
        aniversariante={aniversarianteSelecionado}
        mensagemPadrao={mensagemAniversarioConfig}
      />
    </div>
  )
}

export default Index
