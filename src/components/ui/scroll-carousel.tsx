import { useState, useRef, useCallback, useEffect, Children, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScrollCarouselProps {
  children: ReactNode
  className?: string
  itemClass?: string
}

export function ScrollCarousel({ children, className, itemClass }: ScrollCarouselProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [maxIndex, setMaxIndex] = useState(0)
  const items = Children.toArray(children)

  const refresh = useCallback(() => {
    const el = ref.current
    if (!el) return
    const overflow = Math.max(0, el.scrollWidth - el.clientWidth)
    const max = overflow > 0 ? Math.ceil(overflow / 24) : 0
    setMaxIndex(max)
    const idx = Math.max(0, Math.min(max, Math.round(el.scrollLeft / 24)))
    setCurrent(idx)
  }, [])

  useEffect(() => {
    refresh()
  }, [items.length, refresh])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(() => refresh())
    observer.observe(el)
    return () => observer.disconnect()
  }, [refresh])

  function scrollBy(direction: number) {
    const el = ref.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.8, 200)
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={ref}
        onScroll={refresh}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-hide"
      >
        {items.map((child, i) => (
          <div key={i} className={cn('shrink-0 snap-start', itemClass)}>
            {child}
          </div>
        ))}
      </div>

      {maxIndex > 0 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollBy(-1)}
            disabled={current === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => scrollBy(1)}
            disabled={current >= maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  )
}
