import { useEffect, useState, useCallback } from 'react'
import { localDb } from '@/lib/localDb'

export interface CongregacaoItem {
  id: string
  nome: string
  bairro?: string
  cidade?: string
  endereco?: string
  dirigenteGeral?: string
  dirigente_geral?: string
  diasCulto?: string
  dias_culto?: string
  ordem?: number
  ativo?: boolean
}

export const CONGREGACOES_FALLBACK: CongregacaoItem[] = [
  {
    id: '1',
    nome: 'Sede',
    bairro: 'Centro',
    cidade: 'Campanário',
    dirigenteGeral: 'Pr. José Francisco Portela',
    diasCulto: 'Terça e Domingo',
    ordem: 1,
    ativo: true,
  },
  {
    id: '2',
    nome: 'Sub-Sede',
    bairro: '',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: 'Quinta e Domingo',
    ordem: 2,
    ativo: true,
  },
  {
    id: '3',
    nome: 'Boa Vista',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 3,
    ativo: true,
  },
  {
    id: '4',
    nome: 'Carnaúba',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 4,
    ativo: true,
  },
  {
    id: '5',
    nome: 'Baliza',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 5,
    ativo: true,
  },
  {
    id: '6',
    nome: 'Sítio dos Fernandes',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 6,
    ativo: true,
  },
  {
    id: '7',
    nome: 'Pau D’Arco',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 7,
    ativo: true,
  },
  {
    id: '8',
    nome: 'Canto dos Coqueiros',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 8,
    ativo: true,
  },
  {
    id: '9',
    nome: 'Candeias',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 9,
    ativo: true,
  },
  {
    id: '10',
    nome: 'Almas',
    bairro: 'Zona Rural',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 10,
    ativo: true,
  },
  {
    id: '11',
    nome: 'Morada Nova',
    bairro: '',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 11,
    ativo: true,
  },
  {
    id: '12',
    nome: 'Curupati',
    bairro: '',
    cidade: 'Campanário',
    dirigenteGeral: '',
    diasCulto: '',
    ordem: 12,
    ativo: true,
  },
]

export function ordenarCongregacoes(lista: CongregacaoItem[]): CongregacaoItem[] {
  return [...lista].sort((a, b) => {
    const isSedeA = a.nome.trim().toLowerCase() === 'sede'
    const isSedeB = b.nome.trim().toLowerCase() === 'sede'
    if (isSedeA && !isSedeB) return -1
    if (!isSedeA && isSedeB) return 1

    const isSubA = a.nome.trim().toLowerCase().startsWith('sub')
    const isSubB = b.nome.trim().toLowerCase().startsWith('sub')
    if (isSubA && !isSubB) return -1
    if (!isSubA && isSubB) return 1

    const ordA = a.ordem ?? 999
    const ordB = b.ordem ?? 999
    if (ordA !== ordB) return ordA - ordB

    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

export async function fetchCongregacoesFromDb(): Promise<CongregacaoItem[]> {
  try {
    const records = await localDb.getFullList<any>('congregacoes')
    if (records.length > 0) {
      const mapeadas: CongregacaoItem[] = records.map((r) => ({
        id: r.id,
        nome: r.nome,
        bairro: r.bairro || '',
        cidade: r.cidade || '',
        endereco: r.endereco || '',
        dirigenteGeral: r.dirigente_geral || r.dirigenteGeral || '',
        diasCulto: r.dias_culto || r.diasCulto || '',
        ordem: typeof r.ordem === 'number' ? r.ordem : 999,
        ativo: r.ativo !== false,
      }))
      return ordenarCongregacoes(mapeadas.filter((c) => c.ativo !== false))
    }
  } catch (err) {
    console.warn('Erro ao carregar congregacoes do banco local:', err)
  }
  return ordenarCongregacoes(CONGREGACOES_FALLBACK)
}

export function useCongregacoes() {
  const [congregacoes, setCongregacoes] = useState<CongregacaoItem[]>(CONGREGACOES_FALLBACK)
  const [loading, setLoading] = useState<boolean>(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await fetchCongregacoesFromDb()
    setCongregacoes(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()

    const unsub = localDb.subscribe((collection) => {
      if (collection === 'congregacoes') {
        reload()
      }
    })

    return () => unsub()
  }, [reload])

  const nomes = (congregacoes || []).map((c) => (c?.nome || '').trim()).filter(Boolean)
  const total = nomes.length
  const textoTotalUnidades = `${total} ${total === 1 ? 'Unidade Eclesiástica' : 'Unidades Eclesiásticas'}`

  return { congregacoes, nomes, total, textoTotalUnidades, loading, reload }
}

export default useCongregacoes
