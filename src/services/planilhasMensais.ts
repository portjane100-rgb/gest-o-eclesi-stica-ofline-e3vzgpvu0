import pb from '@/lib/pocketbase/client'
import type { PlanilhaMensalRecord } from '@/types/adtc'

export function gerarChavePeriodo(ano: number, mes: number, congregacao: string): string {
  const mesFormatado = String(mes).padStart(2, '0')
  const congSlug = (congregacao || 'Sede')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
  return `${ano}-${mesFormatado}_${congSlug}`
}

/**
 * Obtém os parâmetros do mês imediatamente anterior.
 */
export function getMesAnterior(ano: number, mes: number): { ano: number; mes: number } {
  if (mes === 1) {
    return { ano: ano - 1, mes: 12 }
  }
  return { ano, mes: mes - 1 }
}

/**
 * Busca uma planilha específica por ano, mês e congregação.
 */
export async function buscarPlanilhaPorPeriodo(
  ano: number,
  mes: number,
  congregacao: string,
): Promise<PlanilhaMensalRecord | null> {
  const chave = gerarChavePeriodo(ano, mes, congregacao)
  try {
    const record = await pb
      .collection('planilhas_mensais')
      .getFirstListItem<PlanilhaMensalRecord>(`chave_periodo = "${chave}"`)
    return record
  } catch {
    return null
  }
}

/**
 * Busca o saldo do mês anterior para a congregação informada.
 * Puxa automaticamente o "saldo_congregacao" da planilha do mês anterior.
 */
export async function buscarSaldoMesAnterior(
  ano: number,
  mes: number,
  congregacao: string,
): Promise<number> {
  const anterior = getMesAnterior(ano, mes)
  const chaveAnterior = gerarChavePeriodo(anterior.ano, anterior.mes, congregacao)
  try {
    const record = await pb
      .collection('planilhas_mensais')
      .getFirstListItem<PlanilhaMensalRecord>(`chave_periodo = "${chaveAnterior}"`)
    return typeof record.saldo_congregacao === 'number' ? record.saldo_congregacao : 0
  } catch {
    return 0
  }
}

/**
 * Lista o histórico de todas as planilhas criadas, ordenadas das mais recentes para as mais antigas.
 */
export async function listarHistoricoPlanilhas(
  congregacao?: string,
): Promise<PlanilhaMensalRecord[]> {
  try {
    const filter = congregacao && congregacao !== 'todas' ? `congregacao = "${congregacao}"` : ''
    const records = await pb.collection('planilhas_mensais').getFullList<PlanilhaMensalRecord>({
      filter: filter || undefined,
      sort: '-ano,-mes,-created',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar histórico de planilhas:', err)
    return []
  }
}

/**
 * Salva ou atualiza uma planilha mensal no banco de dados.
 */
export async function salvarPlanilhaMensal(
  dados: Partial<PlanilhaMensalRecord> & {
    ano: number
    mes: number
    congregacao: string
  },
): Promise<PlanilhaMensalRecord> {
  const chave = gerarChavePeriodo(dados.ano, dados.mes, dados.congregacao)
  const payload = {
    ...dados,
    chave_periodo: chave,
  }

  // Tenta encontrar existente pelo id ou pela chave
  let existenteId = dados.id
  if (!existenteId) {
    try {
      const encontrada = await pb
        .collection('planilhas_mensais')
        .getFirstListItem<PlanilhaMensalRecord>(`chave_periodo = "${chave}"`)
      existenteId = encontrada.id
    } catch {
      // não existe ainda
    }
  }

  if (existenteId) {
    return await pb
      .collection('planilhas_mensais')
      .update<PlanilhaMensalRecord>(existenteId, payload)
  }

  return await pb.collection('planilhas_mensais').create<PlanilhaMensalRecord>(payload)
}

/**
 * Exclui uma planilha do histórico.
 */
export async function excluirPlanilhaMensal(id: string): Promise<boolean> {
  try {
    await pb.collection('planilhas_mensais').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir planilha mensal:', err)
    return false
  }
}
