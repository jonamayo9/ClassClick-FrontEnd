import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export const WHATSAPP_BASE = 'https://wa.me/5491140733436'

export function whatsappLink(message: string): string {
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`
}

export const primaryButtonClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] border border-white/10 bg-[linear-gradient(120deg,#0B6FD6_0%,#0077CC_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_34px_-12px_rgba(22,139,255,0.7)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg'

export const secondaryButtonClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] border border-landing-border bg-white/[0.03] px-5 py-3 text-sm font-semibold text-landing-text transition duration-200 hover:-translate-y-0.5 hover:border-landing-blue/60 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg'

export function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

export function SectionLink({
  id,
  children,
  className,
  onNavigate,
}: {
  id: string
  children: ReactNode
  className?: string
  onNavigate?: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onNavigate?.()

    if (location.pathname === '/') {
      scrollToSection(id)
      window.history.replaceState(null, '', `#${id}`)
      return
    }

    navigate(`/#${id}`)
  }

  return (
    <a href={`/#${id}`} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-landing-border bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.17em] text-landing-cyan ${className}`}
    >
      {children}
    </span>
  )
}

export function Section({
  id,
  children,
  className = '',
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
}: {
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  action?: ReactNode
}) {
  const centered = align === 'center'

  return (
    <div
      className={`flex flex-col gap-6 ${
        centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'
      }`}
    >
      <div className={centered ? 'max-w-3xl' : 'max-w-2xl'}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[28px] font-bold leading-[1.12] tracking-[-0.03em] text-landing-text sm:text-[34px] lg:text-[40px]">
          {title}
        </h2>
        {description ? (
          <p className={`mt-4 text-[15px] leading-7 text-landing-muted sm:text-base ${centered ? 'mx-auto' : ''}`}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function GradientText({ children }: { children: ReactNode }) {
  return <span className="landing-text-gradient">{children}</span>
}

export function CheckPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-landing-border bg-landing-surface/70 px-3 py-2 text-[11px] font-medium text-slate-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-landing-blue/15 text-landing-cyan">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M4 10.5l3.5 3.5L16 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </span>
  )
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-sm font-semibold text-landing-cyan transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
    >
      {children}
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}
