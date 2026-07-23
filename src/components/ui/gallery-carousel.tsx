import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface GalleryCarouselProps {
  images: Array<{ imageUrl: string; altText?: string | null; caption?: string | null }>
  autoPlayInterval?: number
  className?: string
}

export function GalleryCarousel({ images, autoPlayInterval = 5000, className }: GalleryCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const touchStart = useRef(0)
  const touchEnd = useRef(0)

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
    setPaused(true)
  }, [])

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length)
    setPaused(true)
  }, [images.length])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length)
    setPaused(true)
  }, [images.length])

  useEffect(() => {
    if (images.length <= 1 || paused) return
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length)
    }, autoPlayInterval)
    return () => clearInterval(timerRef.current)
  }, [images.length, autoPlayInterval, paused])

  useEffect(() => {
    const timer = setTimeout(() => setPaused(false), autoPlayInterval)
    return () => clearTimeout(timer)
  }, [paused, autoPlayInterval])

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    touchEnd.current = e.changedTouches[0].clientX
    const diff = touchStart.current - touchEnd.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
  }

  if (!images || images.length === 0) return null

  return (
    <div className={cn('relative w-full overflow-hidden rounded-xl', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {images.map((img, i) => (
          <div key={i}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: i === current ? 1 : 0 }}>
            <img src={img.imageUrl} alt={img.altText ?? ''} className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-8">
                <p className="text-sm text-white">{img.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button onClick={prev} aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow transition hover:bg-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={next} aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow transition hover:bg-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Imagen ${i + 1}`}
                className={`h-2 rounded-full transition ${i === current ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
