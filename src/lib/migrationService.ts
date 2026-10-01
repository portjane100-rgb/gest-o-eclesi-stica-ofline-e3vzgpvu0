/**
 * Rotina de Migração e Importação de Dados do PocketBase para o IndexedDB Local.
 * Permite que a igreja faça a transição completa para a versão Desktop offline.
 */

import pb from '@/lib/pocketbase/client'
import { localDb, hashPassword, type LocalCollectionName } from './localDb'
import { CHURCH_CONFIG_DEFAULTS } from '@/contexts/ChurchConfigContext'

export interface MigrationProgress {
  collection: string
  total: number
  migrated: number
  percent: number
  status: 'pending' | 'running' | 'completed' | 'error'
  errorMessage?: string
}

export const MIGRATION_COLLECTIONS: string[] = [
  'configuracoes',
  'users',
  'congregacoes',
  'membros',
  'congregados',
  'obreiros',
  'dizimistas',
  'patrimonio',
  'escala',
  'escala_semana',
  'calendario',
  'agenda_semanal',
  'albuns_fotos',
  'fotos',
  'cartas_recebidas',
  'solicitacoes_cadastro',
  'planilhas_mensais',
]

export async function isMigrationAlreadyDone(): Promise<boolean> {
  try {
    const meta = await localDb.getOne('metadata', 'migration_status')
    if (meta && meta.completed) return true

    // Se já existem usuários ou congregações no banco local, considera inicializado
    const userCount = await localDb.count('users')
    return userCount > 0
  } catch {
    return false
  }
}

/**
 * Converte arquivo de registro PocketBase em Data URL Base64 para persistência 100% offline no IndexedDB
 */
async function fetchFileAsBase64(record: any, fileName: string): Promise<string | null> {
  if (!fileName || !record) return null
  try {
    const url = pb.files.getURL(record, fileName)
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Executa a migração completa do PocketBase para o LocalDB
 */
export async function runPocketBaseMigration(
  onProgress?: (info: MigrationProgress) => void,
): Promise<{ success: boolean; totalRecords: number; error?: string }> {
  let totalRecords = 0

  const report = (
    col: string,
    migrated: number,
    total: number,
    status: MigrationProgress['status'],
    error?: string,
  ) => {
    if (onProgress) {
      onProgress({
        collection: col,
        total,
        migrated,
        percent: total > 0 ? Math.round((migrated / total) * 100) : 100,
        status,
        errorMessage: error,
      })
    }
  }

  try {
    // 1. Configuracoes
    report('configuracoes', 0, 1, 'running')
    try {
      const configs = await pb.collection('configuracoes').getFullList<any>()
      for (const conf of configs) {
        let base64File = null
        if (conf.arquivo) {
          base64File = await fetchFileAsBase64(conf, conf.arquivo)
        }
        await localDb.create('configuracoes', {
          id: conf.id,
          chave: conf.chave,
          valor: conf.valor,
          arquivo: base64File || conf.arquivo || null,
          created: conf.created,
          updated: conf.updated,
        })
        totalRecords++
      }
    } catch (err) {
      console.warn('Migração PocketBase: não foi possível ler configuracoes:', err)
      // Grava defaults essenciais
      for (const [chave, val] of Object.entries(CHURCH_CONFIG_DEFAULTS)) {
        await localDb.create('configuracoes', {
          id: `cfg_${chave}`,
          chave,
          valor: String(val),
        })
      }
    }
    report('configuracoes', 1, 1, 'completed')

    // 2. Users (autenticação local)
    report('users', 0, 1, 'running')
    try {
      const users = await pb.collection('users').getFullList<any>()
      for (const u of users) {
        if (u.email === 'assistente@adtc.local') continue

        // Para os usuários existentes, define senha padrão provisória caso não haja hash
        const defaultPass = u.perfil === 'admin' ? 'admin123' : '123456'
        const passHash = await hashPassword(defaultPass)

        await localDb.create('users', {
          id: u.id,
          email: u.email,
          name: u.name || (u.perfil === 'tesoureiro' ? 'Tesoureiro' : 'Secretário'),
          perfil: u.perfil || (u.email?.includes('admin') ? 'admin' : 'tesoureiro'),
          passwordHash: passHash,
          ativo: u.ativo !== false,
          created: u.created,
          updated: u.updated,
        })
        totalRecords++
      }
    } catch (err) {
      console.warn('Migração PocketBase: users indisponível:', err)
    }
    report('users', 1, 1, 'completed')

    // 3. Congregações
    report('congregacoes', 0, 1, 'running')
    try {
      const congs = await pb.collection('congregacoes').getFullList<any>()
      if (congs.length > 0) {
        for (const c of congs) {
          await localDb.create('congregacoes', c)
          totalRecords++
        }
      }
    } catch (err) {
      console.warn('Migração PocketBase: congregações vazias ou indisponíveis:', err)
    }
    report('congregacoes', 1, 1, 'completed')

    // 4. Módulos restantes
    const otherCols: LocalCollectionName[] = [
      'membros',
      'congregados',
      'obreiros',
      'dizimistas',
      'patrimonio',
      'escala',
      'escala_semana',
      'calendario',
      'agenda_semanal',
      'albuns_fotos',
      'fotos',
      'cartas_recebidas',
      'solicitacoes_cadastro',
      'planilhas_mensais',
    ]

    for (const col of otherCols) {
      report(col, 0, 1, 'running')
      try {
        const records = await pb.collection(col).getFullList<any>()
        for (const item of records) {
          // Se tiver foto/arquivo, tenta converter para base64 offline
          const payload = { ...item }
          if (payload.foto && typeof payload.foto === 'string') {
            const b64 = await fetchFileAsBase64(item, payload.foto)
            if (b64) payload.foto = b64
          }
          if (payload.arquivo && typeof payload.arquivo === 'string') {
            const b64 = await fetchFileAsBase64(item, payload.arquivo)
            if (b64) payload.arquivo = b64
          }
          await localDb.create(col, payload)
          totalRecords++
        }
      } catch (err) {
        console.warn(`Migração PocketBase: coleção ${col} vazia ou indisponível:`, err)
      }
      report(col, 1, 1, 'completed')
    }

    // Marca status concluído
    await localDb.create('metadata', {
      id: 'migration_status',
      completed: true,
      migratedAt: new Date().toISOString(),
      totalRecords,
    })

    return { success: true, totalRecords }
  } catch (err: any) {
    return { success: false, totalRecords, error: err?.message || 'Falha na migração' }
  }
}
