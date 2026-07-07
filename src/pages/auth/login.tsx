import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/stores/theme'
import { subscribeToPush } from '@/lib/push'
import { config } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ThemeMode } from '@/types/auth'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const themeIcons: Record<ThemeMode, string> = { light: '☀️', dark: '🌙', system: '💻' }
const themeNext: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }

function navigateByRole(navigate: ReturnType<typeof useNavigate>) {
  const user = useAuth.getState().user
  const role = user?.systemRole?.toLowerCase() ?? ''
  if (role === 'superadmin') navigate('/superadmin')
  else if (role === 'admin') navigate('/admin')
  else if (role === 'teacher') navigate('/teacher')
  else if (role === 'student') navigate('/home')
  else navigate('/login')
}

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const { mode, setMode } = useTheme()
  const navigate = useNavigate()
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Subscribe to push on mount if already logged in
  useEffect(() => {
    const token = useAuth.getState().token
    if (token) subscribeToPush(token).catch(() => {})
  }, [])

  useEffect(() => {
    if (!config.googleClientId || !googleButtonRef.current) return

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return

      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async (response) => {
          if (!response.credential) return
          setError('')
          setGoogleLoading(true)
          try {
            await loginWithGoogle(response.credential)
            const token = useAuth.getState().token
            if (token) subscribeToPush(token).catch(() => {})
            navigateByRole(navigate)
          } catch (err) {
            let msg = 'No se pudo ingresar con Google.'
            const d = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
            if (d && typeof d.message === 'string') msg = d.message
            else if (err instanceof Error) msg = err.message
            setError(msg)
          } finally {
            setGoogleLoading(false)
          }
        },
      })

      const buttonWidth = Math.min(358, googleButtonRef.current.parentElement?.clientWidth ?? 320)
      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: mode === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: buttonWidth,
        locale: 'es',
      })
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      renderGoogleButton()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = renderGoogleButton
    document.body.appendChild(script)
  }, [loginWithGoogle, mode, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      const token = useAuth.getState().token
      if (token) subscribeToPush(token).catch(() => {})
      navigateByRole(navigate)
    } catch (err) {
      let msg = 'Error al iniciar sesión'
      try {
        const d = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
        if (d && typeof d.message === 'string') msg = d.message
        else if (err instanceof Error) msg = err.message
      } catch { /* ignore */ }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <button
        onClick={() => setMode(themeNext[mode])}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        title={`Tema: ${mode}`}
      >
        {themeIcons[mode]}
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/icons/icon-512.png"
            alt=""
            className="mx-auto h-14 w-14 rounded-2xl bg-white p-1 shadow-lg sm:h-16 sm:w-16"
          />
          <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">ClassClick</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Iniciá sesión para continuar</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        {config.googleClientId && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span>o</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className={`flex justify-center ${googleLoading ? 'pointer-events-none opacity-60' : ''}`}>
              <div ref={googleButtonRef} />
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿No tenés cuenta?{' '}
          <a
            href="https://wa.me/5491140733436?text=Hola%2C%20quiero%20información%20sobre%20ClassClick"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-blue-600 hover:text-blue-500"
          >
            Contactanos
          </a>
        </p>

        <p className="mt-4 text-center">
          <a href="/" className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:hover:text-slate-300">
            Volver al inicio
          </a>
        </p>
      </div>
    </div>
  )
}
