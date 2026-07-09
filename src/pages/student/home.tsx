import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'
import { apiService } from '@/lib/api'
import { hasModule } from '@/hooks/useModule'
import { useBiometric } from '@/hooks/useBiometric'
import { StudentCarnetModal } from './student-carnet'
import {
  useStudentProfile, useStudentBilling, useStudentAnnouncements,
  useStudentSponsors, useStudentCourses, useProfilePhotoUrl
} from './student.hooks'
// import type { StudentMatch } from './student.hooks'

const _fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const ARS = (n: number) => _fmt.format(n)

function formatDate(v: string | null | undefined) {
  if (!v) return ''
  return new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatTime(v: string | null | undefined) {
  if (!v) return ''
  return new Date(v).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function StudentHome() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const slug = useAuth((s) => s.activeCompanySlug)
  const [carnetOpen, setCarnetOpen] = useState(false)

  // Only a successful status response can send the student to registration.
  const { data: regStatus } = useQuery({
    queryKey: ['home-reg-status', slug],
    queryFn: () => apiService.get<{ registrationCompleted?: boolean }>(`/api/student/${slug}/registration/status`),
    enabled: !!slug,
    retry: false,
  })
  useEffect(() => {
    if (regStatus && regStatus.registrationCompleted === false) navigate('/register', { replace: true })
  }, [regStatus, navigate])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<{ title?: string; text?: string; imageUrl?: string; createdAtUtc?: string } | null>(null)
  const [showAllNews, setShowAllNews] = useState(false)
  const [selectedSponsor, setSelectedSponsor] = useState<{ id: string; name: string; imageUrl?: string; overlayText?: string; description?: string; websiteUrl?: string; instagramUrl?: string; facebookUrl?: string; whatsApp?: string } | null>(null)
  const [sponsorIndex, setSponsorIndex] = useState(0)
  // const [selectedMatch, setSelectedMatch] = useState<StudentMatch | null>(null)
  // const [matchesModalOpen, setMatchesModalOpen] = useState(false)
  const { isAvailable: bioAvailable, isEnabled: bioEnabled, register: bioRegister, isRegistering } = useBiometric()
  const [bioDismissed, setBioDismissed] = useState(() => sessionStorage.getItem('bio_prompt_dismissed') === 'true')
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_payment_alerts') || '[]') } catch { return [] }
  })

  const hasPayments = hasModule('payments')
  const hasNews = hasModule('news')
  const hasSponsors = hasModule('sponsors')
  // const hasMatchesModule = false

  const { data: profile, isLoading } = useStudentProfile()
  const { data: billingRaw } = useStudentBilling()
  const { data: announcementsRaw } = useStudentAnnouncements()
  const { data: sponsorsRaw } = useStudentSponsors()
  const { data: courses = [] } = useStudentCourses()
  const { data: photoView } = useProfilePhotoUrl()

  const billing = useMemo(() => hasPayments ? billingRaw ?? [] : [], [hasPayments, billingRaw])
  const announcements = useMemo(() => hasNews ? announcementsRaw ?? [] : [], [hasNews, announcementsRaw])
  const sponsors = useMemo(() => hasSponsors ? sponsorsRaw ?? [] : [], [hasSponsors, sponsorsRaw])
  // const matches = useMemo<StudentMatch[]>(() => [], [])
  const companies = useAuth((s) => s.companies)
  const activeSlug = useAuth((s) => s.activeCompanySlug)
  const activeCompany = companies.find((c) => (c.slug ?? c.companySlug) === activeSlug)
  const companyLogo = activeCompany?.logoUrl || activeCompany?.LogoUrl || ''
  const companyName = activeCompany?.name || 'Local'

  const pendingPayments = useMemo(() => billing
    .filter((c) => {
      const s = String(c.chargeStatus ?? '').toLowerCase().trim()
      return s === '1' || s === 'pending' || s === 'overdue' || s === '3'
    })
    .sort((a, b) => new Date(a.dueDateUtc).getTime() - new Date(b.dueDateUtc).getTime())
    .slice(0, 3), [billing])

  const overdue = pendingPayments.filter((c) => {
    const s = String(c.chargeStatus ?? '').toLowerCase().trim()
    return s === '3' || s === 'overdue'
  })
  const upcoming = pendingPayments.filter((c) => {
    const s = String(c.chargeStatus ?? '').toLowerCase().trim()
    return s !== '3' && s !== 'overdue'
  })

  const latestAnnouncement = useMemo(() => {
    if (announcements.length === 0) return null
    const sorted = [...announcements].sort((a, b) => {
      const da = a.createdAtUtc ? new Date(a.createdAtUtc).getTime() : 0
      const db = b.createdAtUtc ? new Date(b.createdAtUtc).getTime() : 0
      return db - da
    })
    const l = sorted[0]
    if (!l.createdAtUtc) return l
    const created = new Date(l.createdAtUtc)
    const now = new Date()
    // Same calendar day? Show as latest. Otherwise go to historical.
    if (created.toDateString() === now.toDateString()) return l
    return null
  }, [announcements])

  const historicalAnnouncements = useMemo(() => {
    if (announcements.length === 0) return []
    const sorted = [...announcements].sort((a, b) => new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime())
    return latestAnnouncement ? sorted.filter((a) => a.id !== latestAnnouncement.id) : sorted
  }, [announcements, latestAnnouncement])

  const activeCourses = courses.filter((c) => c.isActive !== false)
  // const upcomingMatches = matches.filter((m: StudentMatch) => m.matchDateUtc ? new Date(m.matchDateUtc) >= new Date() : true).sort((a, b) => { if (!a.matchDateUtc) return 1; if (!b.matchDateUtc) return -1; return new Date(a.matchDateUtc).getTime() - new Date(b.matchDateUtc).getTime() })
  // const pastMatches = matches.filter((m: StudentMatch) => m.matchDateUtc ? new Date(m.matchDateUtc) < new Date() : false).sort((a, b) => { if (!b.matchDateUtc) return 1; if (!a.matchDateUtc) return -1; return new Date(b.matchDateUtc).getTime() - new Date(a.matchDateUtc).getTime() })
  const userDisplayName = profile?.fullName || profile?.firstName || user?.name || user?.email || 'Alumno'
  const initials = userDisplayName.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'AL'
  const photoUrl = imgUrl(photoView?.url || profile?.profileImageUrl)

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Profile card ─── */}
      <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 shadow-md dark:bg-slate-800">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-slate-500 dark:text-slate-300">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userDisplayName}</p>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {profile?.memberNumber && <Badge variant="violet">N° {profile.memberNumber}</Badge>}
            {profile?.dni && <Badge variant="default">DNI {profile.dni}</Badge>}
          </div>
          {activeCourses.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {activeCourses.map((c) => <span key={c.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.name}</span>)}
            </div>
          )}
        </div>
        <button onClick={() => setCarnetOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
        </button>
      </section>

      {/* ─── Biometric prompt ─── */}
      {bioAvailable && !bioEnabled && !bioDismissed && (
        <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 shadow-sm dark:border-violet-900/50 dark:from-violet-950/30 dark:to-fuchsia-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg dark:bg-violet-900/40">🔒</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Activá la biometría</p>
                <p className="text-xs text-violet-600 dark:text-violet-400">Iniciá sesión con tu huella o rostro, más rápido y seguro.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" loading={isRegistering} onClick={async () => { const ok = await bioRegister(); if (ok) setBioDismissed(true) }} className="bg-violet-600 text-white hover:bg-violet-700 whitespace-nowrap">Activar</Button>
              <button onClick={() => { setBioDismissed(true); sessionStorage.setItem('bio_prompt_dismissed', 'true') }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 text-violet-400 hover:bg-violet-100 dark:border-violet-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Pending payments alert ─── */}
      {pendingPayments.length > 0 && (
        <section>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none">
            {overdue.filter((c) => !dismissedAlerts.includes(c.chargeId)).map((c) => (
              <div key={c.chargeId} className="relative shrink-0 snap-start pt-2 pr-2">
                <button onClick={() => navigate('/student/payments')}
                  className="flex w-[85vw] items-center gap-3 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-4 shadow-sm transition hover:shadow-md sm:w-[45vw] lg:w-[35vw] dark:border-red-900/50 dark:from-red-950/30 dark:to-rose-950/20">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-base dark:bg-red-900/40">🔴</span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-black text-red-800 dark:text-red-200">¡Cuota vencida!</p>
                    <p className="text-[10px] text-red-600 dark:text-red-400">
                      {c.studentFullName ? `${c.studentFullName} · ` : ""}{c.courseName} · {ARS(c.finalAmount)}
                    </p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); const n = [...dismissedAlerts, c.chargeId]; setDismissedAlerts(n); sessionStorage.setItem('dismissed_payment_alerts', JSON.stringify(n)) }}
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {upcoming.filter((c) => !dismissedAlerts.includes(c.chargeId)).map((c) => (
              <div key={c.chargeId} className="relative shrink-0 snap-start pt-2 pr-2">
                <button onClick={() => navigate('/student/payments')}
                  className="flex w-[85vw] items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 shadow-sm transition hover:shadow-md sm:w-[45vw] lg:w-[35vw] dark:border-amber-900/50 dark:from-amber-950/30 dark:to-yellow-950/20">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-base dark:bg-amber-900/40">🟡</span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-black text-amber-800 dark:text-amber-200">Próximo vencimiento</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      {c.studentFullName ? `${c.studentFullName} · ` : ""}{c.courseName} · {ARS(c.finalAmount)}
                    </p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); const n = [...dismissedAlerts, c.chargeId]; setDismissedAlerts(n); sessionStorage.setItem('dismissed_payment_alerts', JSON.stringify(n)) }}
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Matches with VS layout ─── */}
      {/* hasModule('matches') && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Partidos</h2>
            <button onClick={() => setMatchesModalOpen(true)} className="text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">Ver todos</button>
          </div>
          {upcomingMatches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingMatches.slice(0, 2).map((m: StudentMatch) => {
              return (
                <button key={m.id} onClick={() => setSelectedMatch(m)}
                  className="w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-center gap-5 sm:gap-8">
                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        {companyLogo ? <img src={imgUrl(companyLogo) ?? ''} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">🏠</span>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{companyName}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">VS</div>
                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        {m.opponentLogoUrl ? <img src={imgUrl(m.opponentLogoUrl) ?? ''} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">⚽</span>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{m.opponentName || 'Rival'}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-sm">
                    {m.matchDateUtc && <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(m.matchDateUtc)} · {formatTime(m.matchDateUtc)}</p>}
                    {m.locationName && <p className="text-slate-500 dark:text-slate-400">{m.locationName}</p>}
                    {m.hasTicketSale && m.ticketPrice ? <p className="pt-1 font-semibold text-amber-700">Entrada: ${Number(m.ticketPrice).toLocaleString('es-AR')}</p> : null}
                  </div>
                </button>
              )
            })}
          </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              Todavía no hay partidos próximos para mostrar.
            </div>
          )}
        </section>
      ) */}

      {/* ─── Announcements ─── */}
      {(latestAnnouncement || historicalAnnouncements.length > 0) && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Novedades</h2>
            {historicalAnnouncements.length > 0 && <button onClick={() => setShowAllNews(true)} className="text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">Ver todas</button>}
          </div>
          {latestAnnouncement ? (
            <button onClick={() => setSelectedAnnouncement(latestAnnouncement)}
              className="flex w-full gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
              {latestAnnouncement.imageUrl && <img src={imgUrl(latestAnnouncement.imageUrl) ?? ''} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{latestAnnouncement.createdAtUtc ? formatDate(latestAnnouncement.createdAtUtc) : ''}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{latestAnnouncement.title}</p>
                {latestAnnouncement.text && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{latestAnnouncement.text}</p>}
              </div>
            </button>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              No hay novedades recientes. Las anteriores están disponibles en el historial.
            </div>
          )}
        </section>
      )}

      {/* ─── Sponsors (full-width cards) ─── */}
      {sponsors.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Sponsors</h2>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none"
            onScroll={(e) => {
              const el = e.currentTarget
              const idx = Math.round(el.scrollLeft / (el.scrollWidth / sponsors.length) || 0)
              if (idx !== sponsorIndex && idx >= 0 && idx < sponsors.length) setSponsorIndex(idx)
            }}>
            {sponsors.map((s) => (
              <button key={s.id} onClick={() => setSelectedSponsor(s)}
                className="group relative flex h-40 w-full shrink-0 snap-start snap-always overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[calc(100vw-10rem)] lg:w-[calc(100vw-16rem)] dark:border-slate-700 dark:bg-slate-800/50">
                {s.imageUrl ? (
                  <>
                    <img src={imgUrl(s.imageUrl) ?? ''} alt={s.name} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    {s.overlayText && <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur-sm dark:bg-slate-900/90 dark:text-white">{s.overlayText}</span>}
                    <div className="absolute bottom-4 left-4 right-4"><p className="text-lg font-bold text-white drop-shadow-md">{s.name}</p></div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-6">
                    <p className="text-lg font-bold text-slate-500 dark:text-slate-400">{s.name}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
          {sponsors.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {sponsors.map((_, i) => (
                <button key={i} type="button" onClick={() => {
                  setSponsorIndex(i)
                  const container = document.querySelector('.scrollbar-none')
                  if (container) {
                    const cards = container.querySelectorAll('button')
                    cards[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
                  }
                }}
                  className={`h-2 rounded-full transition-all ${i === sponsorIndex ? 'w-6 bg-violet-600' : 'w-2 bg-slate-300 dark:bg-slate-600'}`} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Carnet Modal ─── */}
      <StudentCarnetModal open={carnetOpen} onClose={() => setCarnetOpen(false)} />

      {/* ─── All matches modal ─── */}
      {/* ─── All matches modal ─── */}
      {/* matchesModalOpen && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60" onClick={() => setMatchesModalOpen(false)} />
            <div className="relative z-10 w-full max-w-4xl animate-slide-up rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Partidos</p>
                </div>
                <button onClick={() => setMatchesModalOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-6">
                <MatchesSection title="Próximos" matches={upcomingMatches} emptyText="No hay próximos partidos." companyLogo={companyLogo} companyName={companyName} onSelect={(m) => { setSelectedMatch(m); setMatchesModalOpen(false) }} formatDate={formatDate} formatTime={formatTime} />
                <MatchesSection title="Historial" matches={pastMatches} emptyText="Sin partidos jugados." companyLogo={companyLogo} companyName={companyName} onSelect={(m) => { setSelectedMatch(m); setMatchesModalOpen(false) }} formatDate={formatDate} formatTime={formatTime} historical />
              </div>
            </div>
          </div>
      ) */}

      {/* ─── Match detail modal ─── */}
      {/* selectedMatch && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setSelectedMatch(null)} />
          <div className="relative z-10 w-full max-w-2xl animate-slide-up rounded-[28px] bg-white p-5 shadow-2xl dark:bg-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Partido</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{companyName} vs {selectedMatch.opponentName || 'Rival'}</h3>
              </div>
              <button onClick={() => setSelectedMatch(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-5 flex items-start justify-center gap-5 sm:gap-8">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  {companyLogo ? <img src={imgUrl(companyLogo) ?? ''} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">🏠</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{companyName}</p>
              </div>
              <div className="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">VS</div>
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  {selectedMatch.opponentLogoUrl ? <img src={imgUrl(selectedMatch.opponentLogoUrl) ?? ''} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">⚽</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{selectedMatch.opponentName || 'Rival'}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fecha y lugar</p>
                {selectedMatch.matchDateUtc && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{formatDate(selectedMatch.matchDateUtc)} · {formatTime(selectedMatch.matchDateUtc)}</p>}
                {selectedMatch.locationName && <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{selectedMatch.locationName}</p>}
                {selectedMatch.address && <p className="mt-1 text-sm text-slate-500">{selectedMatch.address}</p>}
              </div>

              {selectedMatch.hasTicketSale && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Entrada</p>
                  <p className="mt-1 text-base font-bold text-amber-700 dark:text-amber-300">${Number(selectedMatch.ticketPrice || 0).toLocaleString('es-AR')}</p>
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Alcance</p>
                <p className="mt-1 text-base font-bold text-slate-700 dark:text-slate-200">
                  {selectedMatch.isGlobal ? 'Global' : (selectedMatch.courseNames || []).join(', ') || 'Por curso'}
                </p>
              </div>

              {selectedMatch.ticketInfo && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Información de entrada</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{selectedMatch.ticketInfo}</p>
                </div>
              )}

              {selectedMatch.notes && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notas</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 whitespace-pre-line">{selectedMatch.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {selectedMatch.googleMapsUrl && (
                <a href={selectedMatch.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Abrir Maps
                </a>
              )}
              <button onClick={() => setSelectedMatch(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) */}

      {/* ─── Announcement detail modal ─── */}
      {selectedAnnouncement && (
        <Modal open={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} title="Novedad" className="sm:max-w-lg">
          {selectedAnnouncement.imageUrl && (
            <div className="relative h-48 overflow-hidden sm:h-56 sm:rounded-t-2xl">
              <img src={imgUrl(selectedAnnouncement.imageUrl) ?? ''} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAnnouncement.title || 'Novedad'}</h3>
              {selectedAnnouncement.createdAtUtc && <p className="mt-0.5 text-xs text-slate-400">{formatDate(selectedAnnouncement.createdAtUtc)}</p>}
            </div>
            {selectedAnnouncement.text && <p className="whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">{selectedAnnouncement.text}</p>}
          </div>
        </Modal>
      )}

      {/* ─── All news history modal ─── */}
      {showAllNews && (
        <Modal open={showAllNews} onClose={() => setShowAllNews(false)} title="Historial de novedades">
          <div className="space-y-3 p-5">
            {historicalAnnouncements.map((a) => (
              <button key={a.id} onClick={() => { setSelectedAnnouncement(a); setShowAllNews(false) }}
                className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                {a.imageUrl && <img src={imgUrl(a.imageUrl) ?? ''} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title || 'Sin título'}</p>
                  <p className="line-clamp-1 text-xs text-slate-400">{a.text || 'Sin texto'}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{a.createdAtUtc ? formatDate(a.createdAtUtc) : ''}</p>
                </div>
              </button>
            ))}
            {historicalAnnouncements.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Sin novedades históricas.</p>}
          </div>
        </Modal>
      )}

      {/* ─── Sponsor detail modal (redesigned) ─── */}
      {selectedSponsor && (
        <Modal open={!!selectedSponsor} onClose={() => setSelectedSponsor(null)} title={selectedSponsor.name || 'Sponsor'} className="sm:max-w-lg">
          <div className="relative h-48 shrink-0 overflow-hidden sm:h-56 sm:rounded-t-2xl">
            {selectedSponsor.imageUrl ? (
              <img src={imgUrl(selectedSponsor.imageUrl) ?? ''} alt={selectedSponsor.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100 text-6xl dark:from-violet-900 dark:to-fuchsia-900">🤝</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {selectedSponsor.overlayText && (
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur-sm dark:bg-slate-900/90 dark:text-white">{selectedSponsor.overlayText}</span>
            )}
            <button onClick={() => setSelectedSponsor(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm hover:bg-black/60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSponsor.name}</h3>
            {selectedSponsor.description && (
              <p className="whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">{selectedSponsor.description}</p>
            )}
            {(selectedSponsor.websiteUrl || selectedSponsor.instagramUrl || selectedSponsor.facebookUrl || selectedSponsor.whatsApp) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Contacto</p>
                <div className="space-y-2">
                  {selectedSponsor.websiteUrl && (
                    <a href={selectedSponsor.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">🌐</span>
                      <span className="truncate">{selectedSponsor.websiteUrl}</span>
                    </a>
                  )}
                  {selectedSponsor.instagramUrl && (
                    <a href={selectedSponsor.instagramUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-300">📸</span>
                      <span className="truncate">{selectedSponsor.instagramUrl}</span>
                    </a>
                  )}
                  {selectedSponsor.facebookUrl && (
                    <a href={selectedSponsor.facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">👍</span>
                      <span className="truncate">{selectedSponsor.facebookUrl}</span>
                    </a>
                  )}
                  {selectedSponsor.whatsApp && (
                    <a href={`https://wa.me/${selectedSponsor.whatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">💬</span>
                      <span className="truncate">{selectedSponsor.whatsApp}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─── MatchesSection (commented out) ─── */
/*
function MatchesSection({ title, matches, emptyText, companyLogo, companyName, onSelect, formatDate, formatTime, historical }: {
  title: string; matches: StudentMatch[]; emptyText: string; companyLogo: string; companyName: string;
  onSelect: (m: StudentMatch) => void; formatDate: (v: string | null | undefined) => string;
  formatTime: (v: string | null | undefined) => string; historical?: boolean
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
      {matches.length > 0 ? matches.map((m) => (
        <button key={m.id} onClick={() => onSelect(m)}
          className={`w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${historical ? 'opacity-70 hover:opacity-100' : ''}`}>
          <div className="flex items-start justify-center gap-5 sm:gap-8">
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {companyLogo ? <img src={imgUrl(companyLogo) ?? ''} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">🏠</span>}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{companyName}</p>
            </div>
            <div className="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">VS</div>
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {m.opponentLogoUrl ? <img src={imgUrl(m.opponentLogoUrl) ?? ''} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">⚽</span>}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{m.opponentName || 'Rival'}</p>
            </div>
          </div>
          <div className="mt-4 text-sm">
            {m.matchDateUtc && <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(m.matchDateUtc)} · {formatTime(m.matchDateUtc)}</p>}
            {m.locationName && <p className="text-slate-500">{m.locationName}</p>}
          </div>
        </button>
      )) : (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">{emptyText}</div>
      )}
    </section>
  )
}
*/
