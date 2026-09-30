/**
 * Serviço de Backup e Restauração de Dados - Versão Local Desktop
 * Exporta todo o banco local para arquivo .adtcbackup (JSON) para guardar em pendrive/pasta
 * e restaura os dados mediante confirmação explícita.
 */

import { localDb } from './localDb'

export interface BackupMetadata {
  version: string
  appName: string
  exportDate: string
  churchName?: string
  totalRecords: number
  collections: Record<string, number>
}

export interface BackupFileContent {
  metadata: BackupMetadata
  data: Record<string, any[]>
}

const LAST_BACKUP_STORAGE_KEY = 'adtc_last_backup_date'

export function getUltimaDataBackup(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_BACKUP_STORAGE_KEY)
}

export function registrarDataBackup(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_BACKUP_STORAGE_KEY, new Date().toISOString())
}

/**
 * Verifica se o lembrete de backup deve ser exibido (padrão: 7 dias sem backup)
 */
export function deveExibirLembreteBackup(diasIntervalo: number = 7): {
  deveLembrar: boolean
  diasSemBackup: number
  ultimoBackup: Date | null
} {
  const dataIso = getUltimaDataBackup()
  if (!dataIso) {
    return { deveLembrar: true, diasSemBackup: 999, ultimoBackup: null }
  }

  const ultima = new Date(dataIso)
  const agora = new Date()
  const diffMs = agora.getTime() - ultima.getTime()
  const diasSemBackup = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return {
    deveLembrar: diasSemBackup >= diasIntervalo,
    diasSemBackup,
    ultimoBackup: ultima,
  }
}

/**
 * Gera e dispara o download do arquivo de backup (.json ou .adtcbackup)
 */
export async function exportarBackupCompleto(nomeIgreja?: string): Promise<{
  filename: string
  totalRecords: number
}> {
  const allData = await localDb.exportAllData()
  const collectionsSummary: Record<string, number> = {}
  let total = 0

  for (const [col, list] of Object.entries(allData)) {
    collectionsSummary[col] = list.length
    total += list.length
  }

  const cleanName = (nomeIgreja || 'Igreja')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `backup_${cleanName}_${dateStr}.adtcbackup`

  const payload: BackupFileContent = {
    metadata: {
      version: '1.0',
      appName: 'Gestao Eclesiastica Desktop',
      exportDate: new Date().toISOString(),
      churchName: nomeIgreja || 'ADTC Campanário',
      totalRecords: total,
      collections: collectionsSummary,
    },
    data: allData,
  }

  const jsonStr = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  registrarDataBackup()

  return { filename, totalRecords: total }
}

/**
 * Lê e valida um arquivo de backup antes de restaurar
 */
export async function validarArquivoBackup(file: File): Promise<{
  valido: boolean
  metadata?: BackupMetadata
  rawContent?: BackupFileContent
  error?: string
}> {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as BackupFileContent

    if (!parsed || !parsed.data || typeof parsed.data !== 'object') {
      return {
        valido: false,
        error: 'O arquivo informado não contém uma estrutura de dados de backup válida.',
      }
    }

    return {
      valido: true,
      metadata: parsed.metadata || {
        version: '1.0',
        appName: 'Gestao Eclesiastica',
        exportDate: new Date().toISOString(),
        totalRecords: Object.values(parsed.data).reduce((acc, cur) => acc + (cur?.length || 0), 0),
        collections: {},
      },
      rawContent: parsed,
    }
  } catch (err: any) {
    return { valido: false, error: err?.message || 'Arquivo corrompido ou formato inválido.' }
  }
}

/**
 * Restaura todos os dados a partir do conteúdo validado
 */
export async function restaurarBackup(
  backupContent: BackupFileContent,
): Promise<{ totalRestaurado: number }> {
  if (!backupContent || !backupContent.data) {
    throw new Error('Conteúdo do backup vazio ou inválido.')
  }

  const res = await localDb.importAllData(backupContent.data)
  registrarDataBackup()
  return { totalRestaurado: res.total }
}
