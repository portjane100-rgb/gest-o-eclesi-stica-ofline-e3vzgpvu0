import type { Membro, Congregado } from '@/types/adtc'
import { formatarDataBr } from '@/lib/utils'

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export function exportarMembrosParaCsv(
  membros: Membro[],
  nomeArquivo = 'membros_adtc_campanario.csv',
) {
  const headers = [
    'Nº Ficha',
    'Nº Registro',
    'Nome Completo',
    'Congregação',
    'Situação/Status',
    'Telefone',
    'Filiação (Pais)',
    'Naturalidade',
    'Estado Civil',
    'RG',
    'CPF',
    'Endereço',
    'Data Nascimento',
    'Data Batismo',
    'Data Conversão',
    'Observação',
  ]

  const rows = membros.map((m) => [
    m.numero_ficha || '',
    m.numero_registro || '',
    m.nome || '',
    m.congregacao || '',
    m.status || 'Ativo',
    m.telefone || '',
    m.filiacao || '',
    m.naturalidade || '',
    m.estado_civil || '',
    m.rg || '',
    m.cpf || '',
    m.endereco || '',
    m.data_nascimento ? formatarDataBr(m.data_nascimento) : m.data_nascimento_texto || '',
    m.data_batismo ? formatarDataBr(m.data_batismo) : m.data_batismo_texto || '',
    m.data_conversao ? formatarDataBr(m.data_conversao) : m.data_conversao_texto || '',
    m.observacao || '',
  ])

  // \uFEFF adiciona BOM UTF-8 para o Excel abrir sem problemas de acentuação
  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCsvField).join(';'),
      ...rows.map((row) => row.map(escapeCsvField).join(';')),
    ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportarCongregadosParaCsv(
  congregados: Congregado[],
  nomeArquivo = 'congregados_adtc_campanario.csv',
) {
  const headers = [
    'Nome Completo',
    'Congregação',
    'Telefone',
    'Data de Nascimento',
    'Situação/Status',
  ]

  const rows = congregados.map((c) => [
    c.nome || '',
    c.congregacao || '',
    c.telefone || '',
    c.data_nascimento ? formatarDataBr(c.data_nascimento) : '',
    c.status || 'Ativo',
  ])

  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCsvField).join(';'),
      ...rows.map((row) => row.map(escapeCsvField).join(';')),
    ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
