// Service Worker para PWA Offline — Versão Desktop Local ADTC
const CACHE_NAME = 'adtc-desktop-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache
        .addAll(['/', '/index.html', '/manifest.json', '/logo-oficial.png'])
        .catch((err) => {
          console.warn('Erro ao precachear no service worker:', err)
        })
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Apenas métodos GET são cacheados
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Ignora chamadas ao backend se houver e esquemas não http
  if (!url.protocol.startsWith('http')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Busca versão mais nova em background (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
          })
          .catch(() => {})
        return cached
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse
          }
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return networkResponse
        })
        .catch(() => {
          // Fallback para SPA ao navegar offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
    }),
  )
})
