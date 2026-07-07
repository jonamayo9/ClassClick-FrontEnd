import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/stores/theme'
import { useState, useEffect, useMemo } from 'react'
import type { ThemeMode } from '@/types/auth'
import { imgUrl } from '@/lib/media'
import { NotificationsBell } from '@/components/notifications-bell'
import { StudentCarnetModal } from '@/pages/student/student-carnet'
import { hasModule } from '@/hooks/useModule'

interface NavItem { label: string; path: string; icon: string; module?: string }
interface NavGroup { name: string; key: string; items: NavItem[] }

const adminGroups: NavGroup[] = [
  { name: 'Inicio', key: 'home', items: [{ label: 'Dashboard', path: '/admin', icon: '📊' }] },
  { name: 'Alumnos', key: 'students', items: [
    { label: 'Alumnos', path: '/admin/students', icon: '👥' },
    { label: 'Legajos', path: '/admin/records', icon: '📄', module: 'documents' },
  ]},
  { name: 'Académico', key: 'academic', items: [
    { label: 'Cursos', path: '/admin/courses', icon: '📚' },
    { label: 'Profesores', path: '/admin/teachers', icon: '👨‍🏫' },
    { label: 'Clases', path: '/admin/classes', icon: '📅' },
    { label: 'Asistencia', path: '/admin/attendance', icon: '✅' },
  ]},
  { name: 'Financiero', key: 'financial', items: [
    { label: 'Pagos', path: '/admin/payments', icon: '💳', module: 'payments' },
    { label: 'Hermanos', path: '/admin/siblings', icon: '👫', module: 'payments' },
    { label: 'Config. pagos', path: '/admin/pricing', icon: '⚙️', module: 'payments' },
    { label: 'Config. cuotas', path: '/admin/charge-settings', icon: '📋', module: 'payments' },
  ]},
  { name: 'Deportes', key: 'sports', items: [
    { label: 'Partidos', path: '/admin/matches', icon: '⚽', module: 'matches' },
    { label: 'Torneos', path: '/admin/tournaments', icon: '🏆', module: 'tournaments' },
    { label: 'Equipos', path: '/admin/teams', icon: '👕', module: 'tournaments' },
  ]},
  { name: 'Extras', key: 'extras', items: [
    { label: 'Indumentaria', path: '/admin/clothing', icon: '🧥', module: 'clothing' },
    { label: 'Novedades', path: '/admin/announcements', icon: '📢', module: 'news' },
    { label: 'Sponsors', path: '/admin/sponsors', icon: '🤝', module: 'sponsors' },
  ]},
  { name: 'Configuración', key: 'settings', items: [
    { label: 'Mi empresa', path: '/admin/company', icon: '🏢' },
    { label: 'Mi perfil', path: '/admin/profile', icon: '👤' },
  ]},
]

const superadminNav: NavItem[] = [
  { label: 'Dashboard', path: '/superadmin', icon: '📊' },
  { label: 'Empresas', path: '/superadmin/companies', icon: '🏢' },
  { label: 'Admins', path: '/superadmin/admins', icon: '👤' },
  { label: 'Tipos doc.', path: '/superadmin/document-types', icon: '📄' },
  { label: 'Facturación', path: '/superadmin/billing', icon: '💰' },
]

const teacherNav: NavItem[] = [
  { label: 'Inicio', path: '/teacher', icon: '🏠' },
  { label: 'Mis cursos', path: '/teacher/courses', icon: '📚' },
  { label: 'Asistencia', path: '/teacher/attendance', icon: '✅' },
  { label: 'Perfil', path: '/teacher/profile', icon: '👤' },
]

const studentNav: NavItem[] = [
  { label: 'Inicio', path: '/student', icon: '🏠' },
  { label: 'Cursos', path: '/student/courses', icon: '📚' },
  { label: 'Pagos', path: '/student/payments', icon: '💳', module: 'payments' },
  { label: 'Perfil', path: '/student/profile', icon: '👤' },
  { label: 'Hermanos', path: '/student/siblings', icon: '👫', module: 'payments' },
  { label: 'Documentos', path: '/student/documents', icon: '📄', module: 'documents' },
  { label: 'Indumentaria', path: '/student/clothing', icon: '🧥', module: 'clothing' },
  { label: 'Partidos', path: '/student/matches', icon: '⚽', module: 'matches' },
]

const bottomPrimary: NavItem[] = [
  { label: 'Inicio', path: '/admin', icon: '📊' },
  { label: 'Alumnos', path: '/admin/students', icon: '👥' },
  { label: 'Cursos', path: '/admin/courses', icon: '📚' },
  { label: 'Pagos', path: '/admin/payments', icon: '💳' },
]

function getFilteredGroups(): NavGroup[] {
  return adminGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.module || hasModule(i.module)) }))
    .filter((g) => g.items.length > 0)
}

const themeIcons: Record<ThemeMode, string> = { light: '☀️', dark: '🌙', system: '💻' }
const themeNext: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }

export function AppLayout() {
  const { token, user, companies, activeRole, activeCompanySlug, switchCompany, logout, fetchCompanies } = useAuth()
  const { mode, setMode } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [carnetOpen, setCarnetOpen] = useState(false)

  const companyList = useMemo(
    () => ((companies ?? []).length > 0 ? (companies ?? []) : (user?.companies ?? [])),
    [companies, user?.companies],
  )
  const activeCompany = useMemo(() => {
    if (!companyList.length || !activeCompanySlug) return null
    return companyList.find(
      (c) => (c.slug ?? c.companySlug) === activeCompanySlug
    ) ?? null
  }, [companyList, activeCompanySlug])

  function companyDisplayName(c: { name?: string; slug?: string; companySlug?: string }): string {
    return c.name?.trim() || c.slug || c.companySlug || 'Empresa'
  }
  function companyInitial(c: { name?: string; slug?: string; companySlug?: string }): string {
    const name = companyDisplayName(c)
    return name.charAt(0).toUpperCase()
  }
  const companyName = companyDisplayName(activeCompany ?? { name: activeCompanySlug ?? '' }) || activeCompanySlug || 'ClassClick'
  const companyLogo = activeCompany?.logoUrl || activeCompany?.LogoUrl || ''
  const moduleEnabled = (moduleCode?: string) => {
    if (!moduleCode) return true
    const modules = activeCompany?.modules as Record<string, boolean> | undefined
    if (modules && moduleCode in modules) return modules[moduleCode] === true
    return hasModule(moduleCode)
  }

  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '') as string
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher'
  const isSuperAdmin = role === 'superadmin'
  const groups = isAdmin ? getFilteredGroups() : []
  const studentItems = isAdmin ? [] : studentNav.filter((item) => moduleEnabled(item.module))
  const teacherItems = isTeacher ? teacherNav : []
  const superadminItems = isSuperAdmin ? superadminNav : []
  const allItems = isSuperAdmin ? superadminItems : isAdmin ? groups.flatMap((g) => g.items) : isTeacher ? teacherItems : studentItems
  const primaryItems = isAdmin
    ? bottomPrimary.filter((p) => allItems.some((i) => i.path === p.path))
    : allItems
  const showStudentPayments = !isAdmin && !isTeacher && !isSuperAdmin && moduleEnabled('payments')

  useEffect(() => {
    if (!token || !user) navigate('/login', { replace: true })
  }, [token, user, navigate])

  useEffect(() => {
    if (token) fetchCompanies()
  }, [token, fetchCompanies])

  useEffect(() => { setDrawerOpen(false); setMoreOpen(false); setCompanyOpen(false) }, [location.pathname])

  if (!token || !user) return null

  const handleLogout = async () => { await logout(); navigate('/login') }

  const navLink = (item: NavItem, cls: string) => {
    const active = location.pathname === item.path
    return (
      <Link key={item.path} to={item.path}
        className={`${cls} ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
        <span className="text-base">{item.icon}</span>
        {item.label}
      </Link>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:h-16">
        <div className="flex w-full items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Menú">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {companyList.length > 1 ? (
              <div className="relative min-w-0">
                <button onClick={() => setCompanyOpen(!companyOpen)}
                  className="flex items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                  <LogoOrFallback src={imgUrl(companyLogo)} alt={companyName} />
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="truncate text-base font-black tracking-tight sm:text-lg">{companyName}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {companyOpen && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setCompanyOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Cambiar empresa</p>
                      {companyList.map((c) => {
                        const slug = c.slug ?? c.companySlug ?? ''
                        const isActive = slug === activeCompanySlug
                        return (
                          <button key={slug} onClick={() => { switchCompany(c); setCompanyOpen(false) }}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">
                              {companyInitial(c)}
                            </div>
                            <span className="truncate">{companyDisplayName(c)}</span>
                            {isActive && <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/" className="flex items-center gap-2 min-w-0">
                <LogoOrFallback src={imgUrl(companyLogo)} alt={companyName} />
                <span className="truncate text-base font-black tracking-tight sm:text-lg">{companyName}</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <NotificationsBell />
            <button onClick={() => setMode(themeNext[mode])}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 sm:h-9 sm:w-9 sm:text-sm"
              title={`Tema: ${mode}`}>{themeIcons[mode]}</button>
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{user.name ?? user.email}</span>
            <button type="button" onClick={handleLogout}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-9 sm:px-3.5 sm:text-sm">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pb-[68px] lg:pb-0">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
          <nav className="flex flex-col gap-4 p-3 pb-8">
            {isSuperAdmin ? superadminItems.map((item) => navLink(item,
              'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition'))
            : isAdmin ? groups.map((group) => (
              <div key={group.key}>
                <h3 className="mb-1 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group.name}
                </h3>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => navLink(item,
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition'))}
                </div>
              </div>
            )) : isTeacher ? teacherItems.map((item) => navLink(item,
              'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition'))
            : studentItems.map((item) => navLink(item,
              'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition'))}
          </nav>
        </aside>

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setDrawerOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 mt-14 flex w-72 flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:hidden">
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {isAdmin ? groups.map((group) => (
                  <div key={group.key} className="mb-4">
                    <h3 className="mb-1 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {group.name}
                    </h3>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => navLink(item,
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition'))}
                    </div>
                  </div>
                )) : isSuperAdmin ? superadminItems.map((item) => navLink(item,
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition'))
                : isTeacher ? teacherItems.map((item) => navLink(item,
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition'))
                : studentItems.map((item) => navLink(item,
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition'))}
              </nav>
              <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/50">
                  <span className="text-base">🚪</span>
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main */}
        <main className="flex-1 overflow-x-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

        {/* Mobile bottom nav */}
        {isSuperAdmin ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {superadminItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition sm:text-xs ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <span className="text-lg sm:text-xl">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      ) : isAdmin ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {primaryItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition sm:text-xs ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <span className="text-lg sm:text-xl">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
          {allItems.length > primaryItems.length && (
            <button onClick={() => setMoreOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300 sm:text-xs">
              <span className="text-lg sm:text-xl">⋯</span>
              Más
            </button>
          )}
        </nav>
      ) : isTeacher ? (
        /* Floating pill nav for teacher */
        <>
          <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden pointer-events-none">
            <div className="pointer-events-auto mx-auto w-full max-w-md rounded-[30px] border border-slate-200 bg-white/95 backdrop-blur-xl px-3 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900/95">
              <div className="grid grid-cols-4 items-end gap-1">
                {teacherItems.map((item) => {
                  const active = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path}
                      className={`flex flex-col items-center justify-center py-1 rounded-2xl transition ${
                        active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>
        </>
      ) : (
        /* Floating pill nav for students */
        <>
          <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden pointer-events-none">
            <div className="pointer-events-auto mx-auto w-full max-w-md rounded-[30px] border border-slate-200 bg-white/95 backdrop-blur-xl px-3 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900/95">
              <div className={`grid ${showStudentPayments ? 'grid-cols-5 items-end' : 'grid-cols-4 items-center'} gap-1`}>
                <Link to="/student"
                  className={`flex flex-col items-center justify-center py-1 rounded-2xl transition ${location.pathname === '/student' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <span className="text-[10px] font-medium mt-0.5">Inicio</span>
                </Link>
                <Link to="/student/courses"
                  className={`flex flex-col items-center justify-center py-1 rounded-2xl transition ${location.pathname.startsWith('/student/courses') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <span className="text-[10px] font-medium mt-0.5">Cursos</span>
                </Link>
                <button onClick={() => setCarnetOpen(true)}
                  className={showStudentPayments
                    ? 'flex flex-col items-center justify-center'
                    : 'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}>
                  <span className={showStudentPayments
                    ? '-mt-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)] dark:border-slate-950 dark:bg-slate-100 dark:text-slate-950'
                    : 'flex h-7 w-7 items-center justify-center'}>
                    <svg className={showStudentPayments ? 'h-8 w-8' : 'h-5 w-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
                  </span>
                  <span className={showStudentPayments ? 'text-[10px] font-semibold text-slate-900 dark:text-white -mt-0.5' : 'text-[10px] font-medium mt-0.5'}>Carnet</span>
                </button>
                {showStudentPayments && (
                  <Link to="/student/payments"
                    className={`flex flex-col items-center justify-center py-1 rounded-2xl transition ${location.pathname.startsWith('/student/payments') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-[10px] font-medium mt-0.5">Pagos</span>
                  </Link>
                )}
                <Link to="/student/profile"
                  className={`flex flex-col items-center justify-center py-1 rounded-2xl transition ${location.pathname === '/student/profile' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span className="text-[10px] font-medium mt-0.5">Perfil</span>
                </Link>
              </div>
            </div>
          </nav>
          <StudentCarnetModal open={carnetOpen} onClose={() => setCarnetOpen(false)} />
        </>
      )}

      {/* "Más" overlay - full screen grid */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl dark:bg-slate-900"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black">Todos los módulos</h2>
              <button onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {groups.map((group) => {
              // Skip group if all items are already in bottom bar
              if (group.items.every((i) => primaryItems.some((p) => p.path === i.path))) return null
              return (
                <div key={group.key} className="mb-4">
                  <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {group.items.map((item) => {
                      if (primaryItems.some((p) => p.path === item.path)) return null
                      const active = location.pathname === item.path
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                          className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center transition ${
                            active ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                          <span className="text-2xl">{item.icon}</span>
                          <span className="text-[10px] font-semibold leading-tight sm:text-xs">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {companyList.length > 1 && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-slate-400">Cambiar empresa</p>
                <div className="grid grid-cols-1 gap-1">
                  {companyList.map((c) => {
                    const slug = c.slug ?? c.companySlug ?? ''
                    const isActive = slug === activeCompanySlug
                    return (
                      <button key={slug} onClick={() => { switchCompany(c); setMoreOpen(false) }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">
                          {companyInitial(c)}
                        </div>
                        <span className="truncate">{companyDisplayName(c)}</span>
                        {isActive && <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="mt-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button onClick={() => { setMoreOpen(false); handleLogout() }}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/50">
                <span>🚪</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LogoOrFallback({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white sm:h-8 sm:w-8">
        {alt.charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-7 w-7 rounded-lg bg-white object-cover p-0.5 sm:h-8 sm:w-8"
    />
  )
}
