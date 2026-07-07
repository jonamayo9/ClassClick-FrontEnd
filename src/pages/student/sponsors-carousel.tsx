import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface Sponsor {
  id: string
  name: string
  imageUrl: string
  overlayText?: string
  description?: string
  displayOrder: number
  isActive: boolean
  websiteUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  whatsApp?: string
}

function useStudentSponsors() {
  const slug = useAuth((s) => s.activeCompanySlug)
  return useQuery({
    queryKey: ['student-sponsors', slug],
    queryFn: () => apiService.get<Sponsor[]>(`/api/student/${slug}/sponsors`),
    enabled: !!slug,
    select: (data) => {
      const arr = Array.isArray(data) ? data : []
      return arr
        .filter((s) => s.isActive)
        .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
    },
  })
}

export function SponsorsCarousel() {
  const { data: sponsors = [] } = useStudentSponsors()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<Sponsor | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const restoring = useRef(false)

  const items = sponsors

  useEffect(() => {
    setCurrentIndex(0)
  }, [sponsors.length])

  function scrollToIndex(index: number) {
    const carousel = carouselRef.current
    if (!carousel) return
    const card = carousel.querySelector<HTMLDivElement>(`[data-sponsor-index="${index}"]`)
    if (card) {
      restoring.current = true
      card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
      setTimeout(() => { restoring.current = false }, 400)
    }
    setCurrentIndex(index)
  }

  function handlePrev() { scrollToIndex(Math.max(0, currentIndex - 1)) }
  function handleNext() { scrollToIndex(Math.min(items.length - 1, currentIndex + 1)) }

  const handleScroll = useCallback(() => {
    if (restoring.current) return
    const carousel = carouselRef.current
    if (!carousel) return
    const cards = [...carousel.querySelectorAll<HTMLDivElement>('[data-sponsor-index]')]
    if (!cards.length) return
    const center = carousel.scrollLeft + carousel.clientWidth / 2
    let closest = 0
    let minDist = Infinity
    cards.forEach((card) => {
      const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
      if (dist < minDist) { minDist = dist; closest = Number(card.dataset.sponsorIndex) }
    })
    setCurrentIndex(closest)
  }, [])

  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sponsors</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{items.length} sponsors</p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={handlePrev} disabled={currentIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={handleNext} disabled={currentIndex === items.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div ref={carouselRef} onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((sponsor, index) => (
          <button key={sponsor.id} type="button" data-sponsor-index={index}
            onClick={() => setSelected(sponsor)}
            className="group relative h-32 w-[calc(100vw-2rem)] max-w-xs shrink-0 snap-start snap-always overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-36 dark:border-slate-700 dark:bg-slate-800/50">
            <img src={sponsor.imageUrl} alt={sponsor.name}
              className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {sponsor.overlayText && (
              <div className="absolute left-3 right-3 top-3">
                <span className="inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-slate-900 backdrop-blur-sm dark:bg-slate-900/90 dark:text-white">
                  {sponsor.overlayText}
                </span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-sm font-bold text-white drop-shadow-md">{sponsor.name}</p>
            </div>
          </button>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {items.map((_, index) => (
            <button key={index} type="button" onClick={() => scrollToIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex ? 'w-6 bg-violet-600' : 'w-2 bg-slate-300 dark:bg-slate-600'
              }`} />
          ))}
        </div>
      )}

      {selected && (
        <SponsorDetailModal sponsor={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  )
}

function SponsorDetailModal({ sponsor, onClose }: { sponsor: Sponsor; onClose: () => void }) {
  const whatsApp = sponsor.whatsApp || (sponsor as any).whatsapp || (sponsor as any).whatsAppNumber || (sponsor as any).whatsappNumber || ''

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="relative h-48 shrink-0 overflow-hidden sm:h-56 sm:rounded-t-2xl">
          <img src={sponsor.imageUrl} alt={sponsor.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {sponsor.overlayText && (
            <div className="absolute left-4 right-4 top-4">
              <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur-sm dark:bg-slate-900/90 dark:text-white">
                {sponsor.overlayText}
              </span>
            </div>
          )}
          <button onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm hover:bg-black/60">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{sponsor.name}</h3>
            {sponsor.description && (
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">{sponsor.description}</p>
            )}
          </div>

          {(sponsor.websiteUrl || sponsor.instagramUrl || sponsor.facebookUrl || whatsApp) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Contacto</p>
              <div className="space-y-2">
                {sponsor.websiteUrl && (
                  <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    <svg className="h-4 w-4 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    <span className="truncate">{sponsor.websiteUrl}</span>
                  </a>
                )}
                {sponsor.instagramUrl && (
                  <a href={sponsor.instagramUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    <svg className="h-4 w-4 shrink-0 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm0 2h10a1 1 0 011 1v10a1 1 0 01-1 1H7a1 1 0 01-1-1V7a1 1 0 011-1zm5 3a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" /></svg>
                    <span className="truncate">{sponsor.instagramUrl}</span>
                  </a>
                )}
                {sponsor.facebookUrl && (
                  <a href={sponsor.facebookUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    <svg className="h-4 w-4 shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    <span className="truncate">{sponsor.facebookUrl}</span>
                  </a>
                )}
                {whatsApp && (
                  <a href={`https://wa.me/${whatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    <span className="truncate">{whatsApp}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}

function Button({ variant, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-50 disabled:pointer-events-none px-5 py-2.5 text-sm'
  const outline = 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
  return <button className={`${base} ${variant === 'outline' ? outline : ''} ${className || ''}`} {...props} />
}
