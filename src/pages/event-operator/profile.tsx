import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/stores/auth'

export default function OperatorProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const name = user?.name || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Operador'
  const initials = name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'OP'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 shadow-md dark:bg-slate-800">
          <span className="text-lg font-bold text-slate-500 dark:text-slate-300">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-900 dark:text-white">{name}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">Operador de eventos</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={handleLogout}>Cerrar sesión</Button>
    </div>
  )
}
