import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { HashLink } from './primitives'
import { WHATSAPP_BASE } from './landing-utils'
import type { DivisionTheme } from './theme'

type HeaderVariant = 'home' | 'division'

const divisionNav = [
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'precios', label: 'Precios' },
  { id: 'recursos', label: 'Recursos' },
]

const homeNav = [
  { id: 'sobre-classclick', label: 'Conocé ClassClick' },
  { id: 'beneficios', label: 'Por qué elegir' },
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'tecnologia', label: 'Tecnología' },
]

const contactHref = `${WHATSAPP_BASE}?text=${encodeURIComponent('Hola, quiero hablar con el equipo de ClassClick.')}`

const navLinkClass =
  'rounded-lg px-3 py-2 text-[13px] font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg'

const mobileLinkClass =
  'rounded-xl px-4 py-3 text-[15px] font-medium text-slate-200 transition hover:bg-white/[0.05] hover:text-white'

const loginLinkClass =
  'inline-flex min-h-10 items-center justify-center rounded-[9px] border border-cc-border bg-white/[0.02] px-4 text-[13px] font-semibold text-white transition hover:border-cc-blue/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg'

const trialLinkClass =
  'inline-flex min-h-10 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#0069D9_0%,#00A8FF_100%)] px-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_-14px_rgba(0,140,255,0.8)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg'

function BrandLogo() {
  return (
    <Link
      to="/"
      aria-label="ClassClick, ir al inicio"
      className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
    >
      <img
        src="/icons/icon-512.png"
        srcSet="/icons/icon-192.png 1x, /icons/icon-512.png 2x"
        width="36"
        height="36"
        alt=""
        className="h-9 w-9 shrink-0 rounded-[10px] bg-white object-contain p-1 shadow-lg sm:h-10 sm:w-10"
        decoding="async"
      />
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-[16px] font-semibold tracking-[-0.02em] text-white">ClassClick</span>
        <span className="block truncate text-[10.5px] font-medium text-slate-400">Tu institución, más simple</span>
      </span>
      <span className="truncate text-[16px] font-semibold tracking-[-0.02em] text-white sm:hidden">ClassClick</span>
    </Link>
  )
}

export function LandingHeader({
  variant = 'home',
  activeDivision,
}: {
  variant?: HeaderVariant
  activeDivision?: DivisionTheme
}) {
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

  const isHome = variant === 'home'
  const navItems = isHome ? homeNav : divisionNav

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-cc-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
          {navItems.map((item) => (
            <HashLink key={item.id} id={item.id} className={navLinkClass}>
              {item.label}
            </HashLink>
          ))}
          <a href={contactHref} target="_blank" rel="noopener noreferrer" className={navLinkClass}>
            Contacto
          </a>
        </nav>

        <div className="hidden items-center gap-2 lg:flex lg:gap-3">
          <Link to="/login" className={loginLinkClass}>
            Ingresar
          </Link>
          <Link to="/prueba-gratis" className={trialLinkClass}>
            Probar gratis
          </Link>
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-cc-border bg-white/[0.03] text-white transition hover:border-cc-blue/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg lg:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div
          id="landing-mobile-menu"
          ref={menuRef}
          className="max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-white/[0.06] bg-cc-bg px-4 pb-6 pt-3 lg:hidden"
        >
          <nav className="mx-auto flex max-w-[1200px] flex-col gap-1" aria-label="Navegación móvil">
            <Link to="/" onClick={() => setOpen(false)} className={mobileLinkClass}>
              Inicio
            </Link>

            {navItems.map((item) => (
              <HashLink key={item.id} id={item.id} onNavigate={() => setOpen(false)} className={mobileLinkClass}>
                {item.label}
              </HashLink>
            ))}
            <a href={contactHref} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={mobileLinkClass}>
              Contacto
            </a>

            <div className="my-2 border-t border-white/[0.07]" />

            <Link
              to="/educativa"
              onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-3 text-[15px] font-medium transition hover:bg-white/[0.05] ${
                activeDivision === 'educativa' ? 'text-cc-blue-light' : 'text-slate-200 hover:text-white'
              }`}
            >
              ClassClick Educativa
            </Link>
            <Link
              to="/deportiva"
              onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-3 text-[15px] font-medium transition hover:bg-white/[0.05] ${
                activeDivision === 'deportiva' ? 'text-cc-green-bright' : 'text-slate-200 hover:text-white'
              }`}
            >
              ClassClick Deportiva
            </Link>
          </nav>

          <div className="mx-auto mt-4 flex max-w-[1200px] flex-col gap-2 border-t border-white/[0.07] pt-4">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-cc-border bg-white/[0.03] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              Ingresar
            </Link>
            <Link
              to="/prueba-gratis"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#0069D9_0%,#00A8FF_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-16px_rgba(0,140,255,0.8)] transition hover:brightness-110"
            >
              Probar gratis
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
