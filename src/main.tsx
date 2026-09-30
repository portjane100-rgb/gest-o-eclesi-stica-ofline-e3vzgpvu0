/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Registro do Service Worker para suporte PWA 100% Offline
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('ADTC Desktop: PWA offline ativo com escopo', reg.scope)
      })
      .catch((err) => {
        console.warn('ADTC Desktop: Falha ao registrar Service Worker:', err)
      })
  })
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
