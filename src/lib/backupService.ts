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
      churchName: nomeIgreja || 'Gestão Eclesiástica',
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
  collectionsCount?: Record<string, number>
  error?: string
}> {
  try {
    const rawText = await file.text()
    const text = rawText.trim()
    if (!text) {
      return {
        valido: false,
        error: 'O arquivo selecionado está vazio.',
      }
    }

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch (parseErr: any) {
      return {
        valido: false,
        error: `Formato de arquivo inválido. Certifique-se de selecionar um arquivo .adtcbackup ou .json gerado pelo sistema (${parseErr?.message || 'JSON inválido'}).`,
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        valido: false,
        error: 'O arquivo não contém um objeto JSON válido.',
      }
    }

    // Normalizar a estrutura: suportar tanto formato com envelope { metadata, data } quanto objeto direto { membros: [...], ... }
    let dataMap: Record<string, any[]> | null = null
    let metadata: BackupMetadata | undefined = undefined

    if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
      dataMap = parsed.data
      if (parsed.metadata && typeof parsed.metadata === 'object') {
        metadata = parsed.metadata
      }
    } else if (!parsed.data && !parsed.metadata) {
      // Formato plano direto: { membros: [...], congregados: [...] }
      const hasArrays = Object.values(parsed).some((v) => Array.isArray(v))
      if (hasArrays) {
        dataMap = parsed as Record<string, any[]>
      }
    }

    if (!dataMap || typeof dataMap !== 'object') {
      return {
        valido: false,
        error: 'O arquivo informado não contém coleções de dados reconhecíveis.',
      }
    }

    // Contabilizar coleções e registros
    const collectionsCount: Record<string, number> = {}
    let totalRecords = 0

    for (const [col, items] of Object.entries(dataMap)) {
      if (Array.isArray(items)) {
        collectionsCount[col] = items.length
        totalRecords += items.length
      }
    }

    if (!metadata) {
      metadata = {
        version: '1.0',
        appName: 'Gestao Eclesiastica Desktop',
        exportDate: new Date().toISOString(),
        churchName: 'ADTC',
        totalRecords,
        collections: collectionsCount,
      }
    } else {
      metadata.totalRecords = totalRecords
      metadata.collections = collectionsCount
    }

    const normalizedContent: BackupFileContent = {
      metadata,
      data: dataMap,
    }

    return {
      valido: true,
      metadata,
      rawContent: normalizedContent,
      collectionsCount,
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
): Promise<{ totalRestaurado: number; collections: Record<string, number> }> {
  if (!backupContent || !backupContent.data) {
    throw new Error('Conteúdo do backup vazio ou inválido.')
  }

  const res = await localDb.importAllData(backupContent.data)
  registrarDataBackup()
  return { totalRestaurado: res.total, collections: res.collections }
}
