import { useEffect } from 'react'
import { localDb } from '@/lib/localDb'

/**
 * useRealtime adaptado para o banco local IndexedDB
 * Permite que múltiplos componentes na mesma janela ou abas reajam a inserções,
 * edições e exclusões instantaneamente sem depender de WebSocket de servidor remoto.
 */
export function useRealtime<T = any>(
  collectionName: string,
  callbacks?: {
    onCreate?: (record: T) => void
    onUpdate?: (record: T) => void
    onDelete?: (record: T) => void
    onChange?: (action: 'create' | 'update' | 'delete', record: T) => void
  },
  _filter?: string,
) {
  useEffect(() => {
    if (!callbacks) return

    const unsub = localDb.subscribe((collection, action, record) => {
      if (collection !== collectionName && collection !== '*') return

      if (callbacks.onChange) {
        callbacks.onChange(action, record)
      }
      if (action === 'create' && callbacks.onCreate) {
        callbacks.onCreate(record)
      } else if (action === 'update' && callbacks.onUpdate) {
        callbacks.onUpdate(record)
      } else if (action === 'delete' && callbacks.onDelete) {
        callbacks.onDelete(record)
      }
    })

    return () => unsub()
  }, [collectionName, callbacks])
}

export default useRealtime
