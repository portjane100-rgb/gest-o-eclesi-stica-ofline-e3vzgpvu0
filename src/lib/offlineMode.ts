/**
 * Utilitário central de detecção de modo Offline / Local PC.
 * Garante que a versão desktop / empacotada (.zip, file:// ou flag injetada)
 * opere de forma 100% cega à nuvem remota, sem emitir requisições de rede
 * ao backend PocketBase, sem WebSockets/SSE e sem tentativas de sincronização.
 */

export function isOfflineOnly(): boolean {
  if (typeof window === 'undefined') return false

  // 1. Flag global explícita injetada no index.html do pacote PC
  if (window.__ADTC_OFFLINE_ONLY__ === true) {
    return true
  }

  // 2. Execução direta em arquivo local (file://)
  if (window.location.protocol === 'file:') {
    return true
  }

  // 3. Flag opcional no localStorage para forçar modo offline em testes
  try {
    if (localStorage.getItem('ADTC_OFFLINE_MODE') === 'true') {
      return true
    }
  } catch {
    // ignore
  }

  return false
}

export default isOfflineOnly
