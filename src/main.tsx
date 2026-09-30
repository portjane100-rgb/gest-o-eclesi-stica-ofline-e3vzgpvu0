/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Registro do Service Worker apenas quando servido via HTTP/HTTPS (evita exceção em file://)
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.location.protocol.startsWith('http')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('ADTC Desktop: PWA offline ativo com escopo', reg.scope)
      })
      .catch((err) => {
        console.warn('ADTC Desktop: Service worker não pôde ser registrado:', err)
      })
  })
}
// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
