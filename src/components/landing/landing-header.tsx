import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { primaryButtonClass, SectionLink } from './landing-ui'

const navItems = [
  { id: 'producto', label: 'Producto' },
  { id: 'educativa', label: 'Educativa' },
  { id: 'deportiva', label: 'Deportiva' },
  { id: 'precios', label: 'Precios' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'contacto', label: 'Contacto' },
]

const linkClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg'

export function LandingHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    }, 30)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-landing-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="ClassClick, ir al inicio"
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg sm:gap-3"
        >
          <img
            src="/icons/icon-512.png"
            srcSet="/icons/icon-192.png 1x, /icons/icon-512.png 2x"
            width="40"
            height="40"
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-[#0A1730] object-contain p-0.5"
            decoding="async"
          />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-[17px] font-semibold tracking-[-0.02em] text-white">ClassClick</span>
            <span className="block truncate text-[11px] font-medium text-landing-muted">Tu institución, más simple</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
          {navItems.map((item) => (
            <SectionLink key={item.id} id={item.id} className={linkClass}>
              {item.label}
            </SectionLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-landing-border bg-white/[0.02] px-4 text-sm font-semibold text-slate-200 transition hover:border-landing-blue/50 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
          >
            Ingresar
          </Link>
          <Link to="/prueba-gratis" className={`${primaryButtonClass} min-h-10 px-4 py-2`}>
            Probar gratis
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/prueba-gratis"
            className={`${primaryButtonClass} min-h-10 px-3 py-2 text-xs sm:text-sm`}
          >
            Probar gratis
          </Link>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-landing-border bg-white/[0.03] text-slate-200 transition hover:border-landing-blue/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="landing-mobile-menu"
          ref={menuRef}
          className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-white/[0.07] bg-landing-bg px-4 pb-6 pt-3 lg:hidden"
        >
          <nav className="mx-auto flex max-w-[1280px] flex-col gap-1" aria-label="Navegación móvil">
            {navItems.map((item) => (
              <SectionLink
                key={item.id}
                id={item.id}
                onNavigate={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-200 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
              >
                {item.label}
              </SectionLink>
            ))}
          </nav>
          <div className="mx-auto mt-4 flex max-w-[1280px] flex-col gap-2 border-t border-white/[0.07] pt-4">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-[11px] border border-landing-border bg-white/[0.03] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
            >
              Ingresar
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
