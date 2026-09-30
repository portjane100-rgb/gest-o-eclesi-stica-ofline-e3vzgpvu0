/**
 * Adaptador do PocketBase Client para a Versão Local Desktop 100% Offline.
 * Mapeia as chamadas `pb.collection('...')` diretamente para o IndexedDB local (`localDb`),
 * garantindo compatibilidade total com o código dos formulários, relatórios, cadastros e buscas
 * sem precisar reescrever milhares de linhas em dezenas de páginas.
 *
 * Também permite leitura da instância PocketBase remota quando explicitamente necessário (ex: migração).
 */

import PocketBase from 'pocketbase'
import { localDb, type LocalCollectionName } from '@/lib/localDb'

// Cria instância remota para tarefas de importação / migração se a rede existir
const pocketbaseUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_POCKETBASE_URL) ||
  'https://adtc.cloud'

export const pbRemote = new PocketBase(pocketbaseUrl)

// Helper para converter filtros no formato pocketbase básico em predicados JS
function buildFilterPredicate(filterStr?: string): ((item: any) => boolean) | undefined {
  if (!filterStr || !filterStr.trim()) return undefined

  const raw = filterStr.trim()

  return (item: any) => {
    // Tratamento de regras comuns como ativo = true / status != '...'
    try {
      if (raw.includes('ativo = true') || raw.includes('ativo=true')) {
        if (item.ativo === false) return false
      }
      if (raw.includes('ativo = false') || raw.includes('ativo=false')) {
        if (item.ativo !== false) return false
      }

      // Filtro por chave em configuracoes: chave = 'xyz'
      const chaveMatch = raw.match(/chave\s*=\s*['"]([^'"]+)['"]/)
      if (chaveMatch) {
        if (item.chave !== chaveMatch[1]) return false
      }

      // Filtro por categoria
      const catMatch = raw.match(/categoria\s*=\s*['"]([^'"]+)['"]/)
      if (catMatch) {
        if (item.categoria !== catMatch[1]) return false
      }

      // Filtro por ano/mes
      const anoMatch = raw.match(/ano\s*=\s*(\d+)/)
      if (anoMatch) {
        if (String(item.ano) !== anoMatch[1]) return false
      }
      const mesMatch = raw.match(/mes\s*=\s*(\d+)/)
      if (mesMatch) {
        if (String(item.mes) !== mesMatch[1]) return false
      }

      // Filtro por congregacao
      const congMatch = raw.match(/congregacao\s*=\s*['"]([^'"]+)['"]/)
      if (congMatch) {
        if ((item.congregacao || '').trim().toLowerCase() !== congMatch[1].trim().toLowerCase()) {
          return false
        }
      }

      // Filtro por status
      const statusMatch = raw.match(/status\s*=\s*['"]([^'"]+)['"]/)
      if (statusMatch) {
        if (item.status !== statusMatch[1]) return false
      }

      const notStatusMatch = raw.match(/status\s*!=\s*['"]([^'"]+)['"]/)
      if (notStatusMatch) {
        if (item.status === notStatusMatch[1]) return false
      }

      return true
    } catch {
      return true
    }
  }
}

/**
 * Converte FormData em objeto simples com suporte a data URL para arquivos/fotos
 */
async function formDataToObject(data: any): Promise<Record<string, any>> {
  if (!(data instanceof FormData)) {
    return { ...data }
  }

  const obj: Record<string, any> = {}
  for (const [key, val] of data.entries()) {
    if (val instanceof File) {
      if (val.size > 0) {
        // Converte arquivo para Base64 Data URL para salvar 100% offline no IndexedDB
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(val)
        })
        obj[key] = base64
      }
    } else {
      obj[key] = val
    }
  }
  return obj
}

class LocalCollectionAdapter {
  constructor(private collectionName: LocalCollectionName | string) {}

  async getFullList<T = any>(options?: {
    sort?: string
    filter?: string
    fields?: string
    batch?: number
  }): Promise<T[]> {
    const filterFn = buildFilterPredicate(options?.filter)
    return await localDb.getFullList<T>(this.collectionName, {
      sort: options?.sort,
      filter: filterFn,
    })
  }

  async getList<T = any>(
    page = 1,
    perPage = 50,
    options?: { sort?: string; filter?: string },
  ): Promise<{
    page: number
    perPage: number
    totalItems: number
    totalPages: number
    items: T[]
  }> {
    const full = await this.getFullList<T>(options)
    const totalItems = full.length
    const totalPages = Math.ceil(totalItems / perPage) || 1
    const start = (page - 1) * perPage
    const items = full.slice(start, start + perPage)
    return {
      page,
      perPage,
      totalItems,
      totalPages,
      items,
    }
  }

  async getOne<T = any>(id: string): Promise<T> {
    const record = await localDb.getOne<T>(this.collectionName, id)
    if (!record) {
      const err: any = new Error(`Item ${id} não encontrado em ${this.collectionName}`)
      err.status = 404
      throw err
    }
    return record
  }

  async getFirstListItem<T = any>(filter: string): Promise<T> {
    const filterFn = buildFilterPredicate(filter)
    const list = await localDb.getFullList<T>(this.collectionName, { filter: filterFn })
    if (list.length === 0) {
      const err: any = new Error(
        `Nenhum item encontrado em ${this.collectionName} com o filtro especificado`,
      )
      err.status = 404
      throw err
    }
    return list[0]
  }

  async create<T = any>(data: any): Promise<T> {
    const obj = await formDataToObject(data)
    return (await localDb.create(this.collectionName, obj)) as unknown as T
  }

  async update<T = any>(id: string, data: any): Promise<T> {
    const obj = await formDataToObject(data)
    return (await localDb.update(this.collectionName, id, obj)) as unknown as T
  }

  async delete(id: string): Promise<boolean> {
    return await localDb.delete(this.collectionName, id)
  }

  subscribe(topic: string, callback: (e: any) => void): () => void {
    return localDb.subscribe((collection, action, record) => {
      if (collection === this.collectionName || this.collectionName === '*') {
        callback({
          action,
          record,
        })
      }
    })
  }

  unsubscribe(topic?: string): void {
    // noop no adaptador local
  }
}

// Adaptador compatível que substitui o pb original sem quebrar nenhuma página
export const pb = {
  collection(name: string) {
    return new LocalCollectionAdapter(name)
  },

  files: {
    getURL(record: any, fileName: string, options?: any): string {
      if (!fileName && (!record || (!record.foto && !record.arquivo))) return ''
      // Se já for data URL base64, blob ou http, retorna diretamente
      const target = fileName || record.foto || record.arquivo
      if (typeof target === 'string') {
        if (
          target.startsWith('data:') ||
          target.startsWith('http://') ||
          target.startsWith('https://') ||
          target.startsWith('/')
        ) {
          return target
        }
      }
      // Se o próprio registro já tiver a URL/DataURI
      if (record && typeof record.foto === 'string' && record.foto.startsWith('data:')) {
        return record.foto
      }
      if (record && typeof record.arquivo === 'string' && record.arquivo.startsWith('data:')) {
        return record.arquivo
      }

      // Fallback para PocketBase online se o arquivo ainda não foi baixado
      try {
        return pbRemote.files.getURL(record, fileName, options)
      } catch {
        return ''
      }
    },
  },

  authStore: {
    get isValid() {
      if (typeof window === 'undefined') return false
      return Boolean(localStorage.getItem('adtc_current_user_id'))
    },
    get model() {
      return null
    },
    clear() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adtc_current_user_id')
      }
    },
  },

  send(path: string, options: any) {
    // Para chamadas que antes iam para hooks do PocketBase (ex: redefinição por e-mail desativada)
    console.warn('pb.send interceptado no modo local offline:', path, options)
    return Promise.resolve({ ok: true, offline: true })
  },
}

export default pb
