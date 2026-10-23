import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/stores/theme'
import { resolveHomePath } from '@/lib/auth-route'
import type { ThemeMode } from '@/types/auth'

const themeIcons: Record<ThemeMode, string> = {
  light: '🌙',
  dark: '☀️',
  system: '💻',
}

const themeNext: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const publicNav = [
  { label: 'Inicio', href: '/' },
  { label: 'Educativa', href: '/educativa' },
  { label: 'Deportiva', href: '/deportiva' },
  { label: 'Precios', href: '/educativa#precios' },
  { label: 'Contacto', href: 'https://wa.me/5491140733436' },
]

export function RootLayout() {
  const { token, user } = useAuth()
  const { mode, setMode } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!token || !user || location.pathname !== '/') return
    navigate(resolveHomePath(), { replace: true })
  }, [token, user, navigate, location.pathname])

  useEffect(() => {
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 0px)')
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)')
  }, [])

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.slice(1)
      requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView())
      return
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            aria-label="ClassClick, ir al inicio"
            className="flex shrink-0 items-center gap-2.5 sm:gap-3"
          >
            <img
              src="/icons/icon-512.png"
              srcSet="/icons/icon-192.png 1x, /icons/icon-512.png 2x"
              width="48"
              height="48"
              alt=""
              className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow-lg sm:h-12 sm:w-12 sm:rounded-2xl"
              decoding="async"
            />
            <div className="hidden sm:block">
              <div className="text-base font-black tracking-tight sm:text-lg">ClassClick</div>
              <div className="text-[11px] text-slate-400">Tu institución, más simple</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex">
            {publicNav.map((item) =>
              item.href.startsWith('http') ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} to={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMode(themeNext[mode])}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-sm transition hover:bg-white/20 sm:h-10 sm:w-10"
              title={mode === 'light' ? 'Cambiar a tema oscuro' : mode === 'dark' ? 'Usar tema del sistema' : 'Cambiar a tema claro'}
            >
              {themeIcons[mode]}
            </button>

            {token ? (
              <Link
                to={
                  user?.systemRole === 'admin'
                    ? '/admin'
                    : user?.systemRole === 'superadmin'
                      ? '/superadmin'
                      : user?.systemRole === 'delegate'
                        ? '/delegate'
                        : '/student'
                }
                className="inline-flex h-9 items-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-400 sm:h-10 sm:px-5"
              >
                Ir al panel
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-xl bg-white px-4 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-slate-200 sm:h-10 sm:px-5"
              >
                Ingresar
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 md:hidden"
              aria-label="Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-slate-950 px-4 pb-6 pt-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {publicNav.map((item) =>
                item.href.startsWith('http') ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="min-h-[calc(100dvh-4rem)]">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-slate-950 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
          <div>© {new Date().getFullYear()} ClassClick. Todos los derechos reservados.</div>
          <div className="flex gap-4">
            <Link to="/privacidad" className="transition hover:text-white">Privacidad</Link>
            <Link to="/terminos" className="transition hover:text-white">Términos</Link>
            <Link to="/login" className="transition hover:text-white">Ingresar</Link>
            <Link to="/educativa#precios" className="transition hover:text-white">Precios</Link>
            <a
              href="https://wa.me/5491140733436"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
