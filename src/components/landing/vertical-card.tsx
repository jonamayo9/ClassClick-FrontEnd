import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { SectionLink } from './landing-ui'

type Vertical = 'deportiva' | 'educativa'

interface VerticalIcon {
  icon: LucideIcon
  label: string
}

interface VerticalCardProps {
  vertical: Vertical
  label: string
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  imageType?: 'photo' | 'illustration'
  icons: VerticalIcon[]
  detailId: string
}

const accent = {
  deportiva: {
    label: 'text-cyan-300',
    border: 'hover:border-cyan-400/45',
    icon: 'border-cyan-400/15 bg-cyan-400/10 text-cyan-300',
    glow: 'bg-cyan-400/10',
    link: 'text-cyan-300 group-hover:text-white',
    line: 'via-cyan-400/40',
  },
  educativa: {
    label: 'text-violet-300',
    border: 'hover:border-violet-400/45',
    icon: 'border-violet-400/15 bg-violet-400/10 text-violet-300',
    glow: 'bg-violet-500/10',
    link: 'text-violet-300 group-hover:text-white',
    line: 'via-violet-400/40',
  },
} satisfies Record<Vertical, Record<string, string>>

export function VerticalCard({
  vertical,
  label,
  title,
  description,
  imageSrc,
  imageAlt,
  imageType = 'photo',
  icons,
  detailId,
}: VerticalCardProps) {
  const styles = accent[vertical]
  const isPhoto = imageType === 'photo'

  return (
    <article
      id={vertical}
      className={`group relative scroll-mt-24 overflow-hidden rounded-2xl border border-landing-border bg-landing-surface shadow-[0_24px_80px_-50px_rgba(22,139,255,0.7)] transition duration-200 ${styles.border} hover:-translate-y-0.5 hover:shadow-[0_30px_90px_-45px_rgba(22,139,255,0.55)]`}
    >
      <div className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-[80px] ${styles.glow}`} />

      <div className="grid sm:grid-cols-[0.86fr_1.14fr]">
        <div className="relative h-44 overflow-hidden border-b border-landing-border sm:h-auto sm:min-h-[320px] sm:border-b-0 sm:border-r">
          {isPhoto ? (
            <picture>
              <source srcSet="/landing/deportiva-stadium.avif" type="image/avif" />
              <source srcSet="/landing/deportiva-stadium.webp" type="image/webp" />
              <img
                src="/landing/deportiva-stadium.webp"
                alt={imageAlt}
                width="1200"
                height="687"
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
                loading="lazy"
                decoding="async"
              />
            </picture>
          ) : (
            <img
              src={imageSrc}
              alt={imageAlt}
              width="800"
              height="600"
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-landing-surface/30 to-landing-surface sm:bg-gradient-to-r" />
          <div className="absolute inset-0 bg-gradient-to-t from-landing-surface via-transparent to-transparent sm:hidden" />
          <div className={`absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent ${styles.line}`} />
        </div>

        <div className="flex flex-col p-5 sm:p-7 lg:p-8">
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${styles.label}`}>{label}</span>
          <h2 className="mt-3 text-[24px] font-bold leading-[1.15] tracking-[-0.03em] text-landing-text sm:text-[27px]">
            {title}
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-landing-muted sm:text-[15px] sm:leading-7">{description}</p>

          <div className="mt-5">
            <SectionLink
              id={detailId}
              className={`inline-flex items-center gap-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-surface ${styles.link}`}
            >
              Conocer más
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </SectionLink>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-x-2 gap-y-3 border-t border-white/[0.07] pt-5 sm:grid-cols-5">
            {icons.map(({ icon: Icon, label: iconLabel }) => (
              <div key={iconLabel} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${styles.icon}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[10px] font-medium leading-tight text-slate-400 sm:text-[11px]">{iconLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
