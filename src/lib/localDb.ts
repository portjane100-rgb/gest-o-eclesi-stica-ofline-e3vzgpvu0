/**
 * Banco de Dados Local IndexedDB - Versão Local (Desktop) 100% Offline
 * Armazena todos os registros das coleções no computador da igreja.
 */

export interface LocalRecord {
  id: string
  created?: string
  updated?: string
  [key: string]: any
}

export interface LocalUser {
  id: string
  email: string
  name: string
  perfil: 'admin' | 'tesoureiro' | 'secretario1' | 'secretario2'
  passwordHash: string
  ativo: boolean
  created: string
  updated: string
}

const DB_NAME = 'adtc_local_db'
const DB_VERSION = 1

export const LOCAL_COLLECTIONS = [
  'users',
  'membros',
  'congregados',
  'obreiros',
  'dizimistas',
  'patrimonio',
  'escala',
  'calendario',
  'agenda_semanal',
  'configuracoes',
  'albuns_fotos',
  'fotos',
  'escala_semana',
  'cartas_recebidas',
  'solicitacoes_cadastro',
  'congregacoes',
  'financeiro_congregacoes',
  'planilhas_mensais',
  'modelos_documentos',
  'metadata',
] as const

export type LocalCollectionName = (typeof LOCAL_COLLECTIONS)[number]

type EventListener = (
  collection: string,
  action: 'create' | 'update' | 'delete',
  record: any,
) => void

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null
  private listeners: Set<EventListener> = new Set()

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não suportado neste ambiente'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result
        for (const col of LOCAL_COLLECTIONS) {
          if (!db.objectStoreNames.contains(col)) {
            const store = db.createObjectStore(col, { keyPath: 'id' })
            if (col === 'configuracoes') {
              store.createIndex('idx_chave', 'chave', { unique: true })
            } else if (col === 'users') {
              store.createIndex('idx_email', 'email', { unique: false })
            }
          }
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })

    return this.dbPromise
  }

  public subscribe(fn: EventListener): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private notify(collection: string, action: 'create' | 'update' | 'delete', record: any) {
    for (const listener of this.listeners) {
      try {
        listener(collection, action, record)
      } catch (err) {
        console.warn('Erro em listener do banco local:', err)
      }
    }
  }

  public generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = ''
    for (let i = 0; i < 15; i++) {
      id += chars[Math.floor(Math.random() * chars.length)]
    }
    return id
  }

  public async getFullList<T = any>(
    collection: LocalCollectionName | string,
    options?: {
      sort?: string
      filter?: (item: T) => boolean
    },
  ): Promise<T[]> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(collection)) {
        resolve([])
        return
      }

      const tx = db.transaction(collection, 'readonly')
      const store = tx.objectStore(collection)
      const req = store.getAll()

      req.onsuccess = () => {
        let results = (req.result || []) as T[]

        if (options?.filter) {
          results = results.filter(options.filter)
        }

        if (options?.sort) {
          const sortFields = options.sort.split(',').map((s) => s.trim())
          results.sort((a: any, b: any) => {
            for (const sf of sortFields) {
              const desc = sf.startsWith('-')
              const field = desc ? sf.slice(1) : sf
              const valA = a[field] ?? ''
              const valB = b[field] ?? ''
              if (valA < valB) return desc ? 1 : -1
              if (valA > valB) return desc ? -1 : 1
            }
            return 0
          })
        }

        resolve(results)
      }

      req.onerror = () => reject(req.error)
    })
  }

  public async getOne<T = any>(
    collection: LocalCollectionName | string,
    id: string,
  ): Promise<T | null> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(collection)) {
        resolve(null)
        return
      }
      const tx = db.transaction(collection, 'readonly')
      const store = tx.objectStore(collection)
      const req = store.get(id)

      req.onsuccess = () => {
        resolve((req.result as T) || null)
      }
      req.onerror = () => reject(req.error)
    })
  }

  public async findFirst<T = any>(
    collection: LocalCollectionName | string,
    predicate: (item: T) => boolean,
  ): Promise<T | null> {
    const all = await this.getFullList<T>(collection)
    return all.find(predicate) || null
  }

  public async create<T extends { id?: string }>(
    collection: LocalCollectionName | string,
    data: T,
  ): Promise<T & { id: string; created: string; updated: string }> {
    const db = await this.open()
    const now = new Date().toISOString()
    const id = data.id || this.generateId()
    const record = {
      ...data,
      id,
      created: (data as any).created || now,
      updated: (data as any).updated || now,
    } as any

    return new Promise((resolve, reject) => {
      const tx = db.transaction(collection, 'readwrite')
      const store = tx.objectStore(collection)
      const req = store.put(record)

      req.onsuccess = () => {
        this.notify(collection, 'create', record)
        resolve(record)
      }
      req.onerror = () => reject(req.error)
    })
  }

  public async update<T = any>(
    collection: LocalCollectionName | string,
    id: string,
    data: Partial<T>,
  ): Promise<T> {
    const db = await this.open()
    const existing = await this.getOne<any>(collection, id)
    if (!existing) {
      throw new Error(`Registro com ID ${id} não encontrado na coleção ${collection}`)
    }

    const updated = {
      ...existing,
      ...data,
      id,
      updated: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(collection, 'readwrite')
      const store = tx.objectStore(collection)
      const req = store.put(updated)

      req.onsuccess = () => {
        this.notify(collection, 'update', updated)
        resolve(updated)
      }
      req.onerror = () => reject(req.error)
    })
  }

  public async delete(collection: LocalCollectionName | string, id: string): Promise<boolean> {
    const db = await this.open()
    const existing = await this.getOne<any>(collection, id)
    return new Promise((resolve, reject) => {
      const tx = db.transaction(collection, 'readwrite')
      const store = tx.objectStore(collection)
      const req = store.delete(id)

      req.onsuccess = () => {
        this.notify(collection, 'delete', existing || { id })
        resolve(true)
      }
      req.onerror = () => reject(req.error)
    })
  }

  public async clearCollection(collection: LocalCollectionName | string): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(collection)) {
        resolve()
        return
      }
      const tx = db.transaction(collection, 'readwrite')
      const store = tx.objectStore(collection)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  public async exportAllData(): Promise<Record<string, any[]>> {
    const exportObj: Record<string, any[]> = {}
    for (const col of LOCAL_COLLECTIONS) {
      exportObj[col] = await this.getFullList(col)
    }
    return exportObj
  }

  public async importAllData(data: Record<string, any[]>): Promise<{ total: number }> {
    const db = await this.open()
    let total = 0

    for (const col of LOCAL_COLLECTIONS) {
      if (!db.objectStoreNames.contains(col)) continue
      const items = data[col] || []

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(col, 'readwrite')
        const store = tx.objectStore(col)
        store.clear()

        for (const item of items) {
          if (item && item.id) {
            store.put(item)
            total++
          }
        }

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      this.notify(col, 'update', { bulk: true })
    }

    return { total }
  }

  public async count(collection: LocalCollectionName | string): Promise<number> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(collection)) {
        resolve(0)
        return
      }
      const tx = db.transaction(collection, 'readonly')
      const store = tx.objectStore(collection)
      const req = store.count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
}

export const localDb = new LocalDatabase()

/**
 * Hash SHA-256 no browser com Web Crypto API (100% offline, seguro, padrão nativo)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(`adtc_salt_${plainPassword.trim()}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(plainPassword)
  return computed === hash
}
