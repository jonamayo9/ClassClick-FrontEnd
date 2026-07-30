import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

declare const __APP_VERSION__: string
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

if (import.meta.env.PROD) {
  console.log('ClassClick version:', APP_VERSION)

  // Clean circuit breaker param on first load, before any SW interaction
  const cleanUrl = new URL(window.location.href)
  if (cleanUrl.searchParams.has('sw-updated')) {
    cleanUrl.searchParams.delete('sw-updated')
    window.history.replaceState({}, '', cleanUrl.toString())
  }

  let reloadInProgress = false

  const hasCircuitBreaker = () =>
    new URL(window.location.href).searchParams.has('sw-updated')

  const reloadWithCircuitBreaker = () => {
    if (reloadInProgress) return
    if (hasCircuitBreaker()) return
    reloadInProgress = true
    const url = new URL(window.location.href)
    url.searchParams.set('sw-updated', '1')
    window.location.href = url.toString()
  }

  if ('serviceWorker' in navigator) {
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          updateViaCache: 'none',
        })
        console.log('SW registered')

        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
              reloadWithCircuitBreaker()
            }
          })
        })

        const polling = setInterval(() => {
          reg.update().catch(() => {})
        }, 3600000)
        window.addEventListener('beforeunload', () => clearInterval(polling))
      } catch (e) {
        console.warn('SW registration failed:', e)
      }
    }

    try {
      navigator.serviceWorker.addEventListener('message', (event) => {
        try {
          if (
            event.data?.type === 'VERSION' &&
            typeof event.data.version === 'string' &&
            event.data.version.length > 0 &&
            event.data.version !== APP_VERSION
          ) {
            reloadWithCircuitBreaker()
          }
        } catch { /* ignore handler errors */ }
      })
    } catch { /* ignore listener registration errors */ }

    try {
      window.addEventListener('load', registerSW)
    } catch { /* ignore */ }
  }
}

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((r) => r.unregister())),
  )
  if ('caches' in window) {
    void caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('classclick-') || key === 'images')
          .map((key) => caches.delete(key)),
      ),
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
