import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { DivisionTheme } from './theme'

interface InstitutionCardProps {
  theme: DivisionTheme
  title: string
  description: string
  imageSrc: string
  imageSrcSet?: string
  imageSizes?: string
  imageAlt: string
  to: string
  icon: LucideIcon
}

const themeStyles = {
  educativa: {
    border: 'border-cc-blue/45 hover:border-cc-blue-light',
    shadow: 'hover:shadow-[0_30px_90px_-46px_rgba(0,140,255,0.85)]',
    icon: 'border-cc-blue/35 bg-cc-blue/15 text-cc-blue-light',
    arrow: 'bg-[linear-gradient(135deg,#0069D9_0%,#00A8FF_100%)] text-white',
    overlay: 'bg-gradient-to-r from-[#04101f]/95 via-[#04101f]/70 to-[#04101f]/25',
    glow: 'bg-[radial-gradient(circle,rgba(0,140,255,0.22),transparent_70%)]',
  },
  deportiva: {
    border: 'border-cc-green/45 hover:border-cc-green-bright',
    shadow: 'hover:shadow-[0_30px_90px_-46px_rgba(0,207,165,0.7)]',
    icon: 'border-cc-green/35 bg-cc-green/15 text-cc-green-bright',
    arrow: 'bg-[linear-gradient(135deg,#009E88_0%,#00D7B2_100%)] text-[#02231e]',
    overlay: 'bg-gradient-to-r from-[#031512]/95 via-[#031512]/72 to-[#031512]/22',
    glow: 'bg-[radial-gradient(circle,rgba(0,207,165,0.18),transparent_70%)]',
  },
} satisfies Record<DivisionTheme, Record<string, string>>

export function InstitutionCard({
  theme,
  title,
  description,
  imageSrc,
  imageSrcSet,
  imageSizes,
  imageAlt,
  to,
  icon: Icon,
}: InstitutionCardProps) {
  const styles = themeStyles[theme]

  return (
    <Link
      to={to}
      aria-label={`Conocer ClassClick ${title}`}
      className={`group relative flex min-h-[196px] overflow-hidden rounded-[14px] border ${styles.border} ${styles.shadow} p-5 transition duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg sm:min-h-[224px] sm:p-6 lg:min-h-[330px] lg:p-8`}
    >
      <img
        src={imageSrc}
        srcSet={imageSrcSet}
        sizes={imageSizes}
        alt={imageAlt}
        width="1600"
        height="1067"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
        loading="eager"
        decoding="async"
      />

      <div className={`absolute inset-0 ${styles.overlay}`} aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020b18]/90 via-transparent to-[#020b18]/15" aria-hidden="true" />
      <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-[70px] ${styles.glow}`} aria-hidden="true" />

      <div className="relative flex w-full flex-col justify-between gap-8">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${styles.icon} backdrop-blur-sm`}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />
        </span>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[27px] font-extrabold leading-none tracking-[-0.035em] text-white sm:text-[30px] lg:text-[34px]">
              {title}
            </h2>
            <p className="mt-2.5 max-w-[300px] text-[13px] leading-5 text-slate-200/90 sm:text-sm sm:leading-6">
              {description}
            </p>
          </div>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.arrow} shadow-[0_12px_26px_-12px_rgba(0,0,0,0.8)] transition duration-200 group-hover:translate-x-0.5 group-hover:brightness-110`}
            aria-hidden="true"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  )
}
