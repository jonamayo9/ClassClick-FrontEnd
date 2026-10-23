import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { divisionStyles, plans, type DivisionTheme } from './theme'
import { scrollToId } from './landing-utils'

export function HashLink({
  id,
  path,
  children,
  className,
  onNavigate,
}: {
  id: string
  path?: string
  children: ReactNode
  className?: string
  onNavigate?: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const targetPath = path ?? location.pathname

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onNavigate?.()

    if (location.pathname === targetPath) {
      scrollToId(id)
      window.history.replaceState(null, '', `${targetPath}#${id}`)
      return
    }

    navigate(`${targetPath}#${id}`)
  }

  return (
    <a href={`${targetPath}#${id}`} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}

export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
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
      <Container>{children}</Container>
    </section>
  )
}

export function Eyebrow({
  theme,
  children,
  className = '',
}: {
  theme?: DivisionTheme
  children: ReactNode
  className?: string
}) {
  const badgeClass = theme
    ? divisionStyles[theme].eyebrow
    : 'border-white/10 bg-white/[0.04] text-cc-blue-light'

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClass} ${className}`}
    >
      {children}
    </span>
  )
}

export function SectionHeading({
  theme,
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  theme?: DivisionTheme
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
}) {
  const centered = align === 'center'

  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
      <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-white sm:text-[32px] lg:text-[38px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[15px] leading-7 text-cc-muted sm:text-base">{description}</p>
      ) : null}
    </div>
  )
}

export function PlanCards({ theme }: { theme: DivisionTheme }) {
  const styles = divisionStyles[theme]

  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:gap-5">
      {plans.map((plan) => {
        const price = import.meta.env[plan.envKey] as string | undefined
        const displayPrice = price?.trim() ? `${price.trim()} / mes` : plan.fallback

        return (
          <article
            key={plan.name}
            className={`relative flex h-full flex-col rounded-[14px] border bg-cc-card/80 p-6 transition duration-200 hover:-translate-y-0.5 ${
              plan.featured
                ? `${styles.cardBorder} ${styles.cardGlow} ring-1 ring-white/[0.04]`
                : 'border-cc-border hover:border-white/20'
            }`}
          >
            {plan.featured ? (
              <span
                className={`absolute right-5 top-5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${styles.softBadge}`}
              >
                Recomendado
              </span>
            ) : null}
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="mt-4 text-2xl font-bold tracking-[-0.03em] text-white sm:text-[27px]">{displayPrice}</p>
            <p className="mt-2 text-[13px] leading-6 text-cc-muted">{plan.description}</p>
            <ul className="mt-6 space-y-3 border-t border-white/[0.07] pt-5">
              {plan.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-5 text-slate-300">
                  <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${styles.check}`}>
                    <Check className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-7">
              <Link
                to="/prueba-gratis"
                className={`${plan.featured ? styles.primaryButton : styles.secondaryButton} w-full`}
              >
                Solicitar prueba
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
