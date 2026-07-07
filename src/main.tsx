import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js')
      console.log('SW registered:', reg.scope)
    } catch (e) {
      console.warn('SW registration failed:', e)
    }
  })
}

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
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
