import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { imgUrl } from '@/lib/media'

/** Layout operativo simplificado para operadores de eventos (sin acceso al resto de ClassClick). */
export function OperatorLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, user, companies, activeCompanySlug, logout, fetchCompanies } = useAuth()

  const company = companies.find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
  const companyName = company?.name || 'ClassClick'
  const companyLogo = company?.logoUrl || company?.LogoUrl || ''

  useEffect(() => {
    if (!token || !user) navigate('/login', { replace: true })
  }, [token, user, navigate])

  useEffect(() => {
    if (token) fetchCompanies()
  }, [token, fetchCompanies])

  if (!token || !user) return null

  const handleLogout = async () => { await logout(); navigate('/login') }

  const navItem = (path: string, label: string, icon: string) => {
    const active = location.pathname === path
    return (
      <Link to={path}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
        <span className="text-xl">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:h-16">
        <div className="flex w-full items-center justify-between px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {companyLogo ? (
              <img src={imgUrl(companyLogo) ?? ''} alt={companyName} className="h-8 w-8 rounded-lg bg-white object-cover p-0.5" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{companyName.charAt(0)}</span>
            )}
            <span className="truncate text-base font-black tracking-tight">{companyName}</span>
          </div>
          <button type="button" onClick={handleLogout}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="grid w-full grid-cols-2 items-end">
          {navItem('/event-operator', 'Eventos', '🎪')}
          {navItem('/event-operator/profile', 'Perfil', '👤')}
        </div>
      </nav>
    </div>
  )
}
