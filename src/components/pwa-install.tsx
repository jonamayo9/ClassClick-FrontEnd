import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { isInstalledApp, isMobileBrowser } from '@/lib/pwa'

const STORAGE_KEY = 'pwa_prompt_last_shown_at'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function canShowAgain(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return true
    const elapsed = Date.now() - parseInt(stored, 10)
    return elapsed >= 24 * 60 * 60 * 1000
  } catch { return true }
}

function markDismissed() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* */ }
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const installed = useRef(isInstalledApp())

  useEffect(() => {
    if (installed.current || !isMobileBrowser() || !canShowAgain()) return
    const handler = (e: Event) => {
      e.preventDefault()
      if (isInstalledApp() || !canShowAgain()) return
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
      markDismissed()
    }
    const installedHandler = () => {
      installed.current = true
      setShow(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  if (!show || !deferredPrompt || installed.current || isInstalledApp()) return null

  const handleInstall = async () => {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      installed.current = true
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    markDismissed()
    setShow(false)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="flex-1">
          <div className="text-sm font-bold">Instalá ClassClick</div>
          <div className="text-xs text-slate-500">App instalable, sin descargas</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" size="sm" className="flex-1" onClick={handleInstall}>
          Instalar
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Ahora no
        </Button>
      </div>
    </div>
  )
}
