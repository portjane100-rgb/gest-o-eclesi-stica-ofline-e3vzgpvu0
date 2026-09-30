import { localDb } from '@/lib/localDb'
import type { PlanilhaMensal } from '@/types/adtc'

export function gerarChavePeriodo(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

export function getMesAnterior(ano: number, mes: number): { ano: number; mes: number } {
  if (mes === 1) {
    return { ano: ano - 1, mes: 12 }
  }
  return { ano, mes: mes - 1 }
}

export async function buscarPlanilhaPorPeriodo(
  ano: number,
  mes: number,
  congregacao?: string,
): Promise<PlanilhaMensal | null> {
  const chave = gerarChavePeriodo(ano, mes)
  const cong = (congregacao || 'Sede').trim().toLowerCase()

  try {
    const list = await localDb.getFullList<PlanilhaMensal>('planilhas_mensais')
    const item = list.find((p) => {
      const pChave = p.periodo_chave || `${p.ano}-${String(p.mes).padStart(2, '0')}`
      const pCong = (p.congregacao || 'Sede').trim().toLowerCase()
      return pChave === chave && pCong === cong
    })
    return item || null
  } catch (err) {
    console.warn('Erro ao buscar planilha local:', err)
    return null
  }
}

export async function buscarSaldoMesAnterior(
  ano: number,
  mes: number,
  congregacao?: string,
): Promise<number | null> {
  const { ano: anoAnt, mes: mesAnt } = getMesAnterior(ano, mes)
  const planilhaAnt = await buscarPlanilhaPorPeriodo(anoAnt, mesAnt, congregacao)
  if (!planilhaAnt) return null
  return typeof planilhaAnt.saldo_final === 'number' ? planilhaAnt.saldo_final : null
}

export async function listarHistoricoPlanilhas(
  congregacao?: string,
  limit: number = 24,
): Promise<PlanilhaMensal[]> {
  try {
    const list = await localDb.getFullList<PlanilhaMensal>('planilhas_mensais', {
      sort: '-ano,-mes',
    })

    let filtered = list
    if (congregacao) {
      const target = congregacao.trim().toLowerCase()
      filtered = filtered.filter((p) => (p.congregacao || 'Sede').trim().toLowerCase() === target)
    }

    return filtered.slice(0, limit)
  } catch (err) {
    console.warn('Erro ao listar historico planilhas locais:', err)
    return []
  }
}

export async function salvarPlanilhaMensal(
  dados: Partial<PlanilhaMensal> & { ano: number; mes: number },
): Promise<PlanilhaMensal> {
  const chave = dados.periodo_chave || gerarChavePeriodo(dados.ano, dados.mes)
  const cong = dados.congregacao || 'Sede'

  const existente = await buscarPlanilhaPorPeriodo(dados.ano, dados.mes, cong)

  const payload = {
    ...dados,
    periodo_chave: chave,
    congregacao: cong,
  }

  if (existente && existente.id) {
    return await localDb.update<PlanilhaMensal>('planilhas_mensais', existente.id, payload)
  } else {
    return await localDb.create<PlanilhaMensal>('planilhas_mensais', payload)
  }
}

export async function excluirPlanilhaMensal(id: string): Promise<boolean> {
  try {
    return await localDb.delete('planilhas_mensais', id)
  } catch {
    return false
  }
}
