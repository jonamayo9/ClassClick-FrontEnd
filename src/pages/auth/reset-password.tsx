import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/50">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-xl font-bold">Token inválido</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">El enlace que usaste no es válido o está incompleto.</p>
          <a href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500">Solicitar nuevo restablecimiento</a>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 4) { setError('La contraseña debe tener al menos 4 caracteres.'); return }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    setError('')
    try {
      await apiService.post('/api/auth/reset-password', { token, newPassword })
      setDone(true)
    } catch (err) {
      let msg = 'Error al restablecer la contraseña.'
      try {
        const d = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
        if (d && typeof d.message === 'string') msg = d.message
      } catch { /* ignore */ }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Elegí una contraseña nueva para tu cuenta.</p>
        </div>

        <Card className="p-6">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Contraseña actualizada correctamente.</p>
              <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/login')}>Iniciar sesión</Button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Nueva contraseña</label>
                  <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus autoComplete="new-password" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Confirmar contraseña</label>
                  <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
                </div>
                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="mt-6 text-center">
          <a href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">← Volver a iniciar sesión</a>
        </p>
      </div>
    </div>
  )
}
