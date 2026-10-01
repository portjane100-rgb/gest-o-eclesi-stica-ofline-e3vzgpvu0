import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

/**
 * Guarda global de proteção para a Versão PC 100% Offline:
 * Se a aplicação estiver em modo offline (flag window.__ADTC_OFFLINE_ONLY__ = true,
 * protocolo file:// ou localStorage), intercepta e blinda chamadas remotas de coleção
 * para que nenhuma requisição ou erro de rede/CORS polua o console ou trave a interface.
 */
function isOfflineEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  if (window.__ADTC_OFFLINE_ONLY__ === true) return true
  if (window.location.protocol === 'file:') return true
  try {
    if (localStorage.getItem('ADTC_OFFLINE_MODE') === 'true') return true
  } catch {
    // ignore
  }
  return false
}

const originalCollection = pb.collection.bind(pb)
pb.collection = function (idOrName: string): any {
  if (isOfflineEnvironment()) {
    // Retorna stub seguro e não-operante para modo 100% local (sem requisição remota)
    return {
      getFullList: async () => [],
      getList: async () => ({ items: [], page: 1, perPage: 30, totalItems: 0, totalPages: 0 }),
      getOne: async () => {
        throw new Error('Modo offline: PocketBase remoto desativado.')
      },
      getFirstListItem: async () => {
        throw new Error('Modo offline: PocketBase remoto desativado.')
      },
      create: async (data: any) => ({ id: 'local_' + Date.now(), ...data }),
      update: async (id: string, data: any) => ({ id, ...data }),
      delete: async () => true,
      subscribe: async () => () => {},
      unsubscribe: async () => {},
    }
  }
  return originalCollection(idOrName)
} as any

export default pb
