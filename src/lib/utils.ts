/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MESES_PT_BR_ABREV = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'maio',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
]

const MESES_PT_BR_LONGO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * Converte qualquer valor de data (YYYY-MM-DD, ISO UTC string, etc.) para a porção YYYY-MM-DD
 * sem deslocamento por conversão de timezone local.
 */
export function extrairYmd(dataStr?: string | null): string {
  if (!dataStr) return ''
  const trimmed = dataStr.trim()
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return ''
}

/**
 * Formata data no formato DD/MM/YYYY com segurança máxima contra fuso horário.
 * Se a string já tiver formato DD/MM/YYYY, preserva.
 */
export function formatarDataBr(dataStr?: string | null): string {
  if (!dataStr) return ''
  const trimmed = dataStr.trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed

  const ymd = extrairYmd(trimmed)
  if (ymd) {
    const [y, m, d] = ymd.split('-')
    return `${d}/${m}/${y}`
  }
  return trimmed
}

/**
 * Formata data no formato "DD de [mês abrev.] de YYYY" (ex: "12 de dez. de 2026")
 * de forma puramente determinística sem conversão de fuso horário.
 */
export function formatarDataExtenso(
  dataStr?: string | null,
  options?: { formato?: 'abrev' | 'longo' },
): string {
  if (!dataStr) return ''
  const ymd = extrairYmd(dataStr)
  if (!ymd) return dataStr

  const [yStr, mStr, dStr] = ymd.split('-')
  const mesIndex = parseInt(mStr, 10) - 1
  if (mesIndex < 0 || mesIndex > 11) return dataStr

  const dia = dStr.padStart(2, '0')
  const mesNome =
    options?.formato === 'longo' ? MESES_PT_BR_LONGO[mesIndex] : MESES_PT_BR_ABREV[mesIndex]

  return `${dia} de ${mesNome} de ${yStr}`
}

/**
 * Formata período seguro para calendário de festas:
 * Se mesmo dia ou sem fim: "12 de dez. de 2026"
 * Se dias diferentes: "12 de dez. de 2026 até 14 de dez. de 2026"
 */
export function formatarPeriodoEvento(
  inicioStr?: string | null,
  fimStr?: string | null,
  options?: { formato?: 'abrev' | 'longo' },
): string {
  if (!inicioStr) return ''
  const inicioFmt = formatarDataExtenso(inicioStr, options)
  const ymdInicio = extrairYmd(inicioStr)
  const ymdFim = extrairYmd(fimStr)

  if (!ymdFim || ymdFim === ymdInicio) {
    return inicioFmt
  }

  const fimFmt = formatarDataExtenso(fimStr, options)
  return `${inicioFmt} até ${fimFmt}`
}

/**
 * Prepara string de data para envio ao PocketBase mantendo o fuso UTC neutro (12:00:00 UTC)
 * para evitar qualquer recuo para o dia anterior no horário de Brasília (UTC-3).
 */
export function toUtcMiddayIso(ymdDate: string): string {
  if (!ymdDate) return ''
  const ymd = extrairYmd(ymdDate)
  if (!ymd) return ''
  return `${ymd} 12:00:00.000Z`
}

/**
 * Compara se uma data de evento é futura/hoje em relação à data atual do Brasil
 */
export function isEventoFuturo(dataEventoYmdOrIso: string): boolean {
  const ymd = extrairYmd(dataEventoYmdOrIso)
  if (!ymd) return false

  // Data atual local YYYY-MM-DD
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const dia = String(now.getDate()).padStart(2, '0')
  const hojeYmd = `${ano}-${mes}-${dia}`

  return ymd >= hojeYmd
}
