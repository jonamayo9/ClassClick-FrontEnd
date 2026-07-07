import { useState } from 'react'
import { useAuth } from '@/stores/auth'
import { imgUrl } from '@/lib/media'
import { useStudentProfile, useProfilePhotoUrl } from './student.hooks'

function AvatarPhoto({ src, initials }: { src: string | null; initials: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <span className="text-2xl font-bold text-slate-400">{initials}</span>
  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
}

export function StudentCarnetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: profile } = useStudentProfile()
  const { data: photoView } = useProfilePhotoUrl()
  const user = useAuth((s) => s.user)
  const companies = useAuth((s) => s.companies)
  const slug = useAuth((s) => s.activeCompanySlug)
  const company = companies.find((c) => (c.slug ?? c.companySlug) === slug)

  const name = profile?.fullName || `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || user?.name || 'Alumno'
  const initials = name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'AL'
  const photoUrl = imgUrl(photoView?.url || profile?.profileImageUrl)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-slide-up rounded-[28px] bg-white p-0 shadow-2xl dark:bg-slate-900">
        <button onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Card header */}
        <div className="rounded-t-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 pb-14 pt-6 overflow-hidden">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/5 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-md">
              {company?.logoUrl || company?.LogoUrl ? (
                <img src={imgUrl(company?.logoUrl || company?.LogoUrl || '') ?? ''} alt="" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span className="text-base font-bold text-slate-900">{company?.name?.charAt(0)?.toUpperCase() ?? 'C'}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white truncate">{company?.name ?? 'ClassClick'}</p>
              <p className="text-[11px] text-slate-400">Carnet digital</p>
            </div>
          </div>
        </div>

        {/* Avatar overlapping */}
        <div className="flex justify-center -mt-10">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-lg dark:border-slate-900 dark:bg-slate-900">
            <AvatarPhoto src={photoUrl} initials={initials} />
          </div>
        </div>

        {/* Student info */}
        <div className="px-6 pt-3 pb-4 text-center border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{name}</h3>
          {profile?.dni && <p className="text-sm text-slate-500">DNI {profile.dni}</p>}
        </div>

        {/* Info boxes */}
        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">N° Afiliado</p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{profile?.memberNumber || '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Rol</p>
            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">Alumno</p>
          </div>
        </div>

        <p className="pb-5 text-center text-[10px] text-slate-400">Presentar este carnet cuando la institución lo solicite</p>
      </div>
    </div>
  )
}
