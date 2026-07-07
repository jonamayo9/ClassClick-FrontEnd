import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { isInstalledApp } from '@/lib/pwa'

const STORAGE_KEY = 'pwa_prompt_last_shown_at'

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

export function IosPwaPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isInstalledApp() || !canShowAgain()) return
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isSafari && isIos) {
      const timer = setTimeout(() => {
        if (isInstalledApp() || !canShowAgain()) return
        markDismissed()
        setShow(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!show || isInstalledApp()) return null

  const handleDismiss = () => {
    markDismissed()
    setShow(false)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      <div className="mb-3 flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="text-sm font-bold">Instalá ClassClick</div>
      </div>
      <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <li className="flex gap-2">
          <span className="font-bold text-blue-600">1.</span>
          Tocá <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold dark:bg-slate-800">Compartir <span className="text-sm">⎙</span></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-blue-600">2.</span>
          Desplazá y tocá <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold dark:bg-slate-800">Agregar a Inicio</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-blue-600">3.</span>
          Confirmá con <span className="font-semibold">Agregar</span>
        </li>
      </ol>
      <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={handleDismiss}>
        Entendido
      </Button>
    </div>
  )
}
