import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 *
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    // Se desativado explicitamente ou se estiver rodando em ambiente offline-only
    // (pacote PC, protocolo file:// ou flag window.__ADTC_OFFLINE_ONLY__),
    // aborta imediatamente qualquer tentativa de abrir SSE/WebSocket com servidor remoto.
    if (!enabled) return
    if (typeof window !== 'undefined') {
      if (window.__ADTC_OFFLINE_ONLY__ || window.location.protocol === 'file:') {
        return
      }
    }

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    try {
      pb.collection<TRecord>(collectionName)
        .subscribe('*', (e) => {
          callbackRef.current(e)
        })
        .then((fn) => {
          if (cancelled) {
            fn().catch(() => {})
          } else {
            unsubscribeFn = fn
          }
        })
        .catch(() => {})
    } catch {
      // noop em caso de falha de conexão no cliente
    }

    return () => {
      cancelled = true
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
