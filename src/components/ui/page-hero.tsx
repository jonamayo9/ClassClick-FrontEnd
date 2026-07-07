import { cn } from '@/lib/utils'

interface StatTile {
  label: string
  value: string | number
}

interface PageHeroProps {
  label?: string
  title: string
  description?: string
  stats?: StatTile[]
  className?: string
}

export function PageHero({ label, title, description, stats, className }: PageHeroProps) {
  return (
    <section className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8', className)}>
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-fuchsia-400/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {label && <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">{label}</p>}
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-fuchsia-200 sm:text-base">{description}</p>}
        </div>
        {stats && stats.length > 0 && (
          <div className={`grid grid-cols-${Math.min(stats.length, 4)} gap-2 sm:gap-3`}>
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">{s.label}</p>
                <p className="mt-0.5 text-xl font-bold sm:text-2xl">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
