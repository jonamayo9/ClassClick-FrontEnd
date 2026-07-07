import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/stores/auth'
import { useBiometric } from '@/hooks/useBiometric'
import { isInstalledApp } from '@/lib/pwa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function BiometricAppLock() {
  const { token, user, login } = useAuth()
  const biometric = useBiometric()
  const authenticate = biometric.authenticate
  const [locked, setLocked] = useState(true)
  const [passwordMode, setPasswordMode] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const ceremonyActive = useRef(false)
  const authenticating = useRef(false)

  const enabled = !!token && !!user && isInstalledApp() && biometric.isEnabled

  const unlock = useCallback(async () => {
    if (!enabled || authenticating.current) return
    authenticating.current = true
    try {
      if (await authenticate()) {
        setLocked(false)
        setPasswordMode(false)
      }
    } finally {
      authenticating.current = false
    }
  }, [authenticate, enabled])

  useEffect(() => {
    const ceremonyHandler = (event: Event) => {
      ceremonyActive.current = !!(event as CustomEvent<{ active: boolean }>).detail?.active
    }
    const unlockedHandler = () => setLocked(false)
    const visibilityHandler = () => {
      if (!enabled || ceremonyActive.current) return
      if (document.visibilityState === 'visible') {
        setLocked(true)
        setPasswordMode(false)
      }
    }
    window.addEventListener('classclick-biometric-ceremony', ceremonyHandler)
    window.addEventListener('classclick-biometric-unlocked', unlockedHandler)
    document.addEventListener('visibilitychange', visibilityHandler)
    return () => {
      window.removeEventListener('classclick-biometric-ceremony', ceremonyHandler)
      window.removeEventListener('classclick-biometric-unlocked', unlockedHandler)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled && locked && !passwordMode) void unlock()
  }, [enabled, locked, passwordMode, unlock])

  if (!enabled || !locked) return null

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user?.email || !password) return
    setPasswordLoading(true)
    setPasswordError('')
    try {
      await login(user.email, password)
      setLocked(false)
      setPassword('')
      setPasswordMode(false)
    } catch {
      setPasswordError('La contraseña no es correcta.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-slate-950 px-5 text-white">
      <div className="w-full max-w-sm text-center">
        <img src="/icons/icon-192.png" alt="ClassClick" className="mx-auto h-20 w-20 rounded-2xl bg-white p-1 shadow-2xl" />
        <h1 className="mt-6 text-2xl font-black">ClassClick bloqueado</h1>
        <p className="mt-2 text-sm text-slate-300">
          Confirmá tu identidad para continuar.
        </p>

        {!passwordMode ? (
          <div className="mt-7 space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={biometric.isAuthenticating}
              onClick={() => { void unlock() }}
            >
              Usar huella o rostro
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-slate-600 text-white"
              onClick={() => setPasswordMode(true)}
            >
              Usar contraseña
            </Button>
            {biometric.error && <p className="text-sm text-red-300">{biometric.error}</p>}
          </div>
        ) : (
          <form className="mt-7 space-y-3 text-left" onSubmit={submitPassword}>
            <label className="block text-sm font-semibold text-slate-200">Contraseña</label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
            {passwordError && <p className="text-sm text-red-300">{passwordError}</p>}
            <Button variant="primary" size="lg" className="w-full" loading={passwordLoading}>
              Desbloquear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full text-slate-200"
              onClick={() => setPasswordMode(false)}
            >
              Volver
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
