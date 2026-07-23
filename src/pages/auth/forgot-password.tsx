import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await apiService.post<{ message?: string; code?: string }>('/api/auth/forgot-password', { email: email.trim() })
      if (res?.code === 'PASSWORD_RESET_DAILY_LIMIT_REACHED') {
        setError(res.message || 'Ya solicitaste un restablecimiento de contraseña durante el día de hoy.')
        setLoading(false)
        return
      }
      if (res?.message && !res.message.includes('Si el correo')) {
        setError(res.message)
        setLoading(false)
        return
      }
      setSent(true)
    } catch {
      setError('Error al procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">¿Olvidaste tu contraseña?</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ingresá tu email y te enviaremos instrucciones para restablecerla.</p>
        </div>

        <Card className="p-6">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/login')}>Volver a iniciar sesión</Button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                  <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  {loading ? 'Enviando...' : 'Enviar instrucciones'}
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
