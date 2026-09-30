import { useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { CongregacaoRegistro } from '@/types/adtc'
import { UNIDADES } from '@/types/adtc'

export interface CongregacaoItem {
  id?: string
  nome: string
  titulo: string
  subtitulo: string
  endereco: string
  diasCulto: string
  dirigenteGeral: string
  ordem?: number
  ativa?: boolean
}

export const CONGREGACOES_FALLBACK: CongregacaoItem[] = [
  {
    nome: 'Sede',
    titulo: 'Templo Sede ADTC',
    subtitulo: 'Centro de Adoração e Sede Administrativa',
    endereco: 'Rua Alberto Batista Fontenele, nº 141, Campanário',
    diasCulto: 'Quinta-feira e Domingo (19h00) • Escola Bíblica aos Domingos (09h00)',
    dirigenteGeral: 'Liderança Geral do Pastor Presidente',
    ordem: 1,
    ativa: true,
  },
  {
    nome: 'Congregação das Casinhas',
    titulo: 'Congregação das Casinhas',
    subtitulo: 'Filial 1 • Bairro Novo Campanário',
    endereco: 'Conjunto Habitacional Novo Campanário (Casinhas)',
    diasCulto: 'Segunda, Quarta, Sexta e Domingo',
    dirigenteGeral: 'Presbítero Responsável',
    ordem: 2,
    ativa: true,
  },
  {
    nome: 'Congregação do Alto',
    titulo: 'Congregação do Alto',
    subtitulo: 'Filial 2 • Comunidade do Alto',
    endereco: 'Bairro do Alto, Campanário',
    diasCulto: 'Sexta (19h00) e Domingo (09h00 e 19h00)',
    dirigenteGeral: 'Presbítero Responsável',
    ordem: 3,
    ativa: true,
  },
  {
    nome: 'Congregação da Vila dos Pescadores',
    titulo: 'Vila dos Pescadores',
    subtitulo: 'Filial 3 • Comunidade Pesqueira',
    endereco: 'Comunidade da Vila dos Pescadores',
    diasCulto: 'Segunda (19h00) e Sexta (18h30)',
    dirigenteGeral: 'Evangelista Responsável',
    ordem: 4,
    ativa: true,
  },
]

/**
 * Ordena lista de congregações garantindo que a "Sede" seja sempre a primeira,
 * seguida pela ordem numérica e data de criação.
 */
export function ordenarCongregacoes<T extends { nome: string; ordem?: number }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    const isASede = a.nome.trim().toLowerCase() === 'sede'
    const isBSede = b.nome.trim().toLowerCase() === 'sede'
    if (isASede && !isBSede) return -1
    if (!isASede && isBSede) return 1

    const ordemA = typeof a.ordem === 'number' ? a.ordem : 999
    const ordemB = typeof b.ordem === 'number' ? b.ordem : 999
    if (ordemA !== ordemB) return ordemA - ordemB

    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

// Cache em memória para renderização imediata sem flicker em trocas de rota
let cachedCongregacoes: CongregacaoItem[] = CONGREGACOES_FALLBACK
let listeners: Array<() => void> = []

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      /* ignore */
    }
  })
}

export async function fetchCongregacoesFromDb(): Promise<CongregacaoItem[]> {
  try {
    const records = await pb.collection('congregacoes').getFullList<CongregacaoRegistro>({
      sort: 'ordem,created',
    })

    if (records && records.length > 0) {
      // Filtrar ativas se o campo existir, ou considerar true se indefinido/null
      const ativas = records.filter((r) => r.ativa !== false)
      const mapped: CongregacaoItem[] = ativas.map((c) => ({
        id: c.id,
        nome: c.nome,
        titulo: c.titulo || c.nome,
        subtitulo: c.subtitulo || `Congregação ADTC`,
        endereco: c.endereco || 'Endereço a definir',
        diasCulto: c.dias_culto || 'Cultos regulares',
        dirigenteGeral: c.dirigente_geral || 'Liderança local responsável',
        ordem: c.ordem,
        ativa: c.ativa !== false,
      }))

      const ordenadas = ordenarCongregacoes(mapped)
      cachedCongregacoes = ordenadas
      notifyListeners()
      return ordenadas
    }
  } catch (err) {
    console.warn('Erro ao carregar congregações do banco, usando fallback:', err)
  }

  return cachedCongregacoes
}

/**
 * Hook central para congregações da ADTC.
 * Consulta o banco, aplica cache em memória, escuta eventos em tempo real
 * e expõe a lista de congregações ativas ordenadas (Sede primeiro).
 */
export function useCongregacoes() {
  const [congregacoes, setCongregacoes] = useState<CongregacaoItem[]>(cachedCongregacoes)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCongregacoesFromDb()
      setCongregacoes(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleUpdate = () => {
      setCongregacoes([...cachedCongregacoes])
    }

    listeners.push(handleUpdate)

    // Disparar carga do banco
    reload()

    // Subscrição em tempo real na coleção congregacoes
    let unsub: (() => void) | undefined
    pb.collection('congregacoes')
      .subscribe('*', () => {
        reload()
      })
      .then((fn) => {
        unsub = fn
      })
      .catch(() => {})

    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate)
      if (unsub) unsub()
    }
  }, [reload])

  const nomes = congregacoes.map((c) => c.nome)
  const total = congregacoes.length
  const textoTotalUnidades = `${total} ${total === 1 ? 'Unidade' : 'Unidades'}`

  return {
    congregacoes,
    nomes: nomes.length > 0 ? nomes : (UNIDADES as unknown as string[]),
    total,
    textoTotalUnidades,
    loading,
    reload,
  }
}

export default useCongregacoes
