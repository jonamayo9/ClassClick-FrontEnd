import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface Announcement {
  id: string
  title?: string
  text?: string
  imageUrl?: string
  createdAtUtc?: string
}

function useStudentAnnouncements() {
  const slug = useAuth((s) => s.activeCompanySlug)
  return useQuery({
    queryKey: ['student-announcements', slug],
    queryFn: () => apiService.get<Announcement[]>(`/api/student/${slug}/announcements`),
    enabled: !!slug,
    select: (data) => {
      const arr = Array.isArray(data) ? data : []
      return arr.sort((a, b) => new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime())
    },
  })
}

export function AnnouncementsSection() {
  const { data: announcements = [] } = useStudentAnnouncements()
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)

  if (announcements.length === 0) return null

  const latest = announcements[0]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Novedades</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Últimas novedades de la institución</p>
        </div>
        {announcements.length > 1 && (
          <button type="button" onClick={() => setShowAll(true)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            Ver todas ({announcements.length})
          </button>
        )}
      </div>

      <button type="button" onClick={() => setSelected(latest)}
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
        <div className="flex gap-4">
          {latest.imageUrl && (
            <img src={latest.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700 sm:h-24 sm:w-24" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {latest.createdAtUtc ? new Date(latest.createdAtUtc).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : ''}
            </p>
            <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{latest.title || 'Novedad'}</p>
            {latest.text && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{latest.text}</p>
            )}
            {!latest.text && !latest.imageUrl && (
              <p className="mt-1 text-sm text-slate-400">Abrir para ver detalle</p>
            )}
          </div>
        </div>
      </button>

      {/* Detail modal */}
      {selected && (
        <AnnouncementDetailModal announcement={selected} onClose={() => setSelected(null)} />
      )}

      {/* All announcements modal */}
      {showAll && (
        <AllAnnouncementsModal announcements={announcements} onSelect={(a) => { setSelected(a); setShowAll(false) }} onClose={() => setShowAll(false)} />
      )}
    </section>
  )
}

function AnnouncementDetailModal({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl dark:bg-slate-900">
        {announcement.imageUrl && (
          <div className="relative h-48 shrink-0 overflow-hidden sm:h-56 sm:rounded-t-2xl">
            <img src={announcement.imageUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <button onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm hover:bg-black/60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
          {!announcement.imageUrl && (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{announcement.title || 'Novedad'}</h3>
                {announcement.createdAtUtc && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(announcement.createdAtUtc).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <button onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {announcement.imageUrl && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{announcement.title || 'Novedad'}</h3>
              {announcement.createdAtUtc && (
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {new Date(announcement.createdAtUtc).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
          {announcement.text ? (
            <p className="whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">{announcement.text}</p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Esta novedad no tiene texto.</p>
          )}
        </div>
        <div className="border-t border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}

function AllAnnouncementsModal({ announcements, onSelect, onClose }: {
  announcements: Announcement[]; onSelect: (a: Announcement) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Historial de novedades</h2>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Todas las novedades publicadas.</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-3">
          {announcements.map((a) => (
            <button key={a.id} type="button" onClick={() => onSelect(a)}
              className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
              {a.imageUrl && (
                <img src={a.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title || 'Sin título'}</p>
                <p className="line-clamp-1 text-xs text-slate-400">{a.text || 'Sin texto'}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {a.createdAtUtc ? new Date(a.createdAtUtc).toLocaleDateString('es-AR') : ''}
                </p>
              </div>
            </button>
          ))}
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
