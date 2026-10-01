/**
 * Camada de acesso a dados unificada (Online PocketBase  ↔  Offline IndexedDB).
 *
 * Em modo Offline Only (isOfflineOnly() — file:// ou flag __ADTC_OFFLINE_ONLY__),
 * TODAS as operações são roteadas para o banco local (localDb / IndexedDB), sem
 * nenhuma chamada de rede. Arquivos (foto, logo, PDF de carta) são convertidos
 * em Base64 dataURL antes de gravar, pois IndexedDB não guarda File API igual
 * ao FormData do PocketBase.
 *
 * Online, repassa direto para pb.collection(...) exatamente como antes.
 */
import pb from '@/lib/pocketbase/client'
import { isOfflineOnly } from '@/lib/offlineMode'
import { localDb } from '@/lib/localDb'

/** Converte um File/Blob em Base64 dataURL via FileReader (funciona em file://). */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string)
      } else {
        reject(new Error('Falha ao converter arquivo em Base64.'))
      }
    }
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Retorna a URL de um arquivo armazenado.
 * Se for Base64 (data:) ou URL externa, retorna diretamente;
 * se for nome de arquivo do PocketBase, usa pb.files.getURL.
 */
export function getFileUrl(record: any, filename?: string): string {
  if (!filename) return ''
  if (
    filename.startsWith('data:') ||
    filename.startsWith('blob:') ||
    filename.startsWith('http://') ||
    filename.startsWith('https://')
  ) {
    return filename
  }
  try {
    return pb.files.getURL(record, filename)
  } catch {
    return filename
  }
}

/** Extrai o primeiro File de um FormData (sincrono, por chave). */
function getFormDataFiles(formData: FormData): Array<{ key: string; file: File }> {
  const result: Array<{ key: string; file: File }> = []
  formData.forEach((value, key) => {
    if (value instanceof File) {
      result.push({ key, file: value })
    }
  })
  return result
}

/** Converte FormData em objeto plano (campos texto), ignorando Files. */
function formDataToPlain(formData: FormData): Record<string, any> {
  const result: Record<string, any> = {}
  formData.forEach((value, key) => {
    if (!(value instanceof File)) {
      result[key] = value
    }
  })
  return result
}

/** Converte FormData em objeto plano para o localDb, transformando cada File em dataURL. */
async function formDataToLocal(formData: FormData): Promise<Record<string, any>> {
  const result = formDataToPlain(formData)
  for (const { key, file } of getFormDataFiles(formData)) {
    try {
      result[key] = await fileToDataUrl(file)
    } catch (err) {
      console.warn(`dataClient: falha ao converter arquivo do campo ${key}:`, err)
    }
  }
  return result
}

/** Lista registros de uma coleção, online no PocketBase, offline no IndexedDB. */
export async function getItems<T = any>(
  collection: string,
  options?: { sort?: string; filter?: string; [key: string]: any },
): Promise<T[]> {
  if (isOfflineOnly()) {
    // No localDb não existe filter SQL: aplica filtro de status/congregacao em memória
    // cobrindo os padrões usados no sistema ("status='Ativo'", etc).
    let items = await localDb.getFullList<T>(collection, { sort: options?.sort })
    if (options?.filter) {
      const matches = parseFilter(options.filter)
      if (matches) {
        items = items.filter((item: any) => matches(item))
      }
    }
    return items
  }
  return pb.collection(collection).getFullList<T>(options)
}

/** Conta registros (usado para stats de Dashboard). */
export async function countItems(
  collection: string,
  options?: { filter?: string },
): Promise<number> {
  if (isOfflineOnly()) {
    const items = await getItems(collection, options)
    return items.length
  }
  const res = await pb.collection(collection).getList(1, 1, options)
  return res.totalItems
}

/** Cria um registro; arquivos opcionais viram Base64 no modo offline. */
export async function createItem(
  collection: string,
  data: FormData | Record<string, any>,
  files?: Record<string, File | Blob>,
): Promise<any> {
  if (isOfflineOnly()) {
    let payload: Record<string, any>
    if (data instanceof FormData) {
      payload = await formDataToLocal(data)
    } else {
      payload = { ...data }
      for (const [key, file] of Object.entries(files || {})) {
        payload[key] = await fileToDataUrl(file)
      }
    }
    payload.id = localDb.generateId()
    return localDb.create(collection, payload)
  }

  let body: FormData | Record<string, any> = data
  if (files && Object.keys(files).length > 0) {
    const formData =
      data instanceof FormData
        ? data
        : Object.entries(data).reduce((fd, [k, v]) => {
            fd.append(k, v as any)
            return fd
          }, new FormData())
    for (const [key, file] of Object.entries(files)) {
      formData.append(key, file)
    }
    body = formData
  }
  return pb.collection(collection).create(body as any)
}

/** Atualiza um registro; arquivos opcionais viram Base64 no modo offline. */
export async function updateItem(
  collection: string,
  id: string,
  data: FormData | Record<string, any>,
  files?: Record<string, File | Blob>,
): Promise<any> {
  if (isOfflineOnly()) {
    let payload: Record<string, any>
    if (data instanceof FormData) {
      payload = await formDataToLocal(data)
    } else {
      payload = { ...data }
      for (const [key, file] of Object.entries(files || {})) {
        payload[key] = await fileToDataUrl(file)
      }
    }
    // Campos de arquivo que o usuário quer apagar (string vazia ou null)
    for (const key of Object.keys(payload)) {
      if (payload[key] === '' || payload[key] === null) {
        delete payload[key]
      }
    }
    return localDb.update(collection, id, payload)
  }

  let body: FormData | Record<string, any> = data
  if (files && Object.keys(files).length > 0) {
    const formData =
      data instanceof FormData
        ? data
        : Object.entries(data).reduce((fd, [k, v]) => {
            fd.append(k, v as any)
            return fd
          }, new FormData())
    for (const [key, file] of Object.entries(files)) {
      formData.append(key, file)
    }
    body = formData
  }
  return pb.collection(collection).update(id, body as any)
}

/** Remove um registro. */
export async function deleteItem(collection: string, id: string): Promise<boolean> {
  if (isOfflineOnly()) {
    return localDb.delete(collection, id)
  }
  return pb.collection(collection).delete(id)
}

/**
 * Interpreta um filter PocketBase simples de igualdade (ex: "status='Ativo' && cargo='Pastor'").
 * Retorna uma função predicate para filtrar em memória no modo offline.
 */
function parseFilter(filter: string): ((item: any) => boolean) | null {
  try {
    const cleaned = filter.trim()
    if (!cleaned) return null
    // Suporta apenas "&&" de igualdades simples (o padrão usado no app)
    const clauses = cleaned.split('&&').map((c) => c.trim())
    const predicates: Array<(item: any) => boolean> = []
    for (const clause of clauses) {
      const match = clause.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/)
      if (!match) return null
      const [, field, rawValue] = match
      const value = rawValue.replace(/^['"]|['"]$/g, '')
      predicates.push((item) => {
        const current = item?.[field]
        if (typeof current === 'boolean') {
          return String(current) === value || current === (value === 'true')
        }
        return String(current) === value
      })
    }
    return (item) => predicates.every((p) => p(item))
  } catch {
    return null
  }
}
