import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { LandingFooter } from './landing-footer'
import { LandingHeader } from './landing-header'
import type { DivisionTheme } from './theme'

type HeaderVariant = 'home' | 'division'

export function LandingLayout({
  variant,
  division,
  children,
}: {
  variant: HeaderVariant
  division?: DivisionTheme
  children: ReactNode
}) {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1)
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 40)
      return () => window.clearTimeout(timer)
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <div className="classclick-landing landing-root min-h-screen overflow-x-hidden bg-cc-bg font-landing text-cc-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Saltar al contenido
      </a>

      <LandingHeader variant={variant} activeDivision={division} />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>

      <LandingFooter division={division} />
    </div>
  )
}
