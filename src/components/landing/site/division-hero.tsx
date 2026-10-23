import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Container, Eyebrow, HashLink } from './primitives'
import { divisionStyles, type DivisionTheme } from './theme'

interface HeroFeature {
  icon: LucideIcon
  label: string
}

interface DivisionHeroProps {
  theme: DivisionTheme
  eyebrow: string
  title: ReactNode
  description: string
  imageDesktop: string
  imageMobile: string
  imageAlt: string
  imagePosition?: string
  features: HeroFeature[]
}

export function DivisionHero({
  theme,
  eyebrow,
  title,
  description,
  imageDesktop,
  imageMobile,
  imageAlt,
  imagePosition = 'object-center',
  features,
}: DivisionHeroProps) {
  const styles = divisionStyles[theme]

  return (
    <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
      <div className="absolute inset-0">
        <picture>
          <source media="(min-width: 1024px)" srcSet={imageDesktop} />
          <img
            src={imageMobile}
            alt={imageAlt}
            width="1600"
            height="1067"
            className={`h-full w-full object-cover ${imagePosition}`}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#030B1B_0%,rgba(3,11,27,0.94)_38%,rgba(3,11,27,0.5)_72%,rgba(3,11,27,0.2)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,11,27,0.45)_0%,rgba(3,11,27,0.72)_54%,#030B1B_100%)] lg:bg-[linear-gradient(180deg,rgba(3,11,27,0.18)_0%,rgba(3,11,27,0.05)_54%,#030B1B_100%)]" aria-hidden="true" />
      </div>

      <div className={`pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full blur-[100px] ${styles.glow}`} aria-hidden="true" />

      <Container className="relative pb-10 pt-12 sm:pb-12 sm:pt-16 lg:pb-14 lg:pt-20">
        <div className="max-w-[640px]">
          <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[30px] font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-[42px] lg:text-[52px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[590px] text-[15px] leading-7 text-cc-muted sm:text-[16px] sm:leading-8">
            {description}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/prueba-gratis" className={styles.primaryButton}>
              Probar gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <HashLink id="funcionalidades" className={styles.secondaryButton}>
              Ver funcionalidades
            </HashLink>
          </div>
        </div>

        <div id="funcionalidades" className="mt-10 scroll-mt-28 sm:mt-12 lg:mt-16">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
            {features.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className={`group flex min-h-[82px] flex-col justify-between rounded-xl border border-white/10 bg-cc-bg/60 p-3 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-cc-card/80 ${styles.cardHover} ${styles.cardGlow}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${styles.iconTile}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="mt-2 text-[11px] font-medium leading-tight text-slate-200 sm:text-[12.5px]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
