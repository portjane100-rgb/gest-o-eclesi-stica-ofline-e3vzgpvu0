import { useEffect, useState, useCallback } from 'react'
import { localDb } from '@/lib/localDb'
import { isOfflineOnly } from '@/lib/offlineMode'
import pb from '@/lib/pocketbase/client'

export interface CongregacaoItem {
  id: string
  nome: string
  bairro?: string
  cidade?: string
  endereco?: string
  dirigenteGeral?: string
  dirigente_geral?: string
  dirigentePercentual?: number
  dirigente_percentual?: number
  diasCulto?: string
  dias_culto?: string
  ordem?: number
  ativo?: boolean
}

// Fallback vazio: congregações devem vir 100% do banco local (IndexedDB)
export const CONGREGACOES_FALLBACK: CongregacaoItem[] = []

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
    let records: any[] = []
    if (isOfflineOnly()) {
      records = await localDb.getFullList<any>('congregacoes')
    } else {
      try {
        records = await pb.collection('congregacoes').getFullList({ sort: 'ordem,nome' })
      } catch (pbErr) {
        // Fallback para localDb em caso de falha de conexão
        records = await localDb.getFullList<any>('congregacoes')
      }
    }

    if (records.length > 0) {
      const mapeadas: CongregacaoItem[] = records.map((r) => ({
        id: r.id,
        nome: r.nome,
        bairro: r.bairro || '',
        cidade: r.cidade || '',
        endereco: r.endereco || '',
        dirigenteGeral: r.dirigente_geral || r.dirigenteGeral || '',
        dirigentePercentual:
          typeof r.dirigentePercentual === 'number'
            ? r.dirigentePercentual
            : typeof r.dirigente_percentual === 'number'
              ? r.dirigente_percentual
              : undefined,
        dirigente_percentual:
          typeof r.dirigente_percentual === 'number'
            ? r.dirigente_percentual
            : typeof r.dirigentePercentual === 'number'
              ? r.dirigentePercentual
              : undefined,
        diasCulto: r.dias_culto || r.diasCulto || '',
        ordem: typeof r.ordem === 'number' ? r.ordem : 999,
        ativo: r.ativo !== false,
      }))
      return ordenarCongregacoes(mapeadas.filter((c) => c.ativo !== false))
    }
  } catch (err) {
    console.warn('Erro ao carregar congregacoes:', err)
  }
  return []
}

export function useCongregacoes() {
  const [congregacoes, setCongregacoes] = useState<CongregacaoItem[]>([])
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
