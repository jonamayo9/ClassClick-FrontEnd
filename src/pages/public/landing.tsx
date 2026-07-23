import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import PhoneInput, { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import * as Flags from 'react-phone-number-input/flags'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { GalleryCarousel } from '@/components/ui/gallery-carousel'
import { useLanding } from '@/hooks/usePublicPage'
import { apiService } from '@/lib/api'
import type { ContactFormConfig } from '@/types/public-page'

const PRESET_COLORS: Record<string, Record<string, string>> = {
  blue: { primary: '#1e40af', secondary: '#3b82f6', accent: '#60a5fa', bg: '#eff6ff', text: '#1e293b' },
  purple: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#c4b5fd', bg: '#f5f3ff', text: '#1e293b' },
  green: { primary: '#059669', secondary: '#34d399', accent: '#6ee7b7', bg: '#ecfdf5', text: '#1e293b' },
  red: { primary: '#dc2626', secondary: '#f87171', accent: '#fca5a5', bg: '#fef2f2', text: '#1e293b' },
  orange: { primary: '#ea580c', secondary: '#fb923c', accent: '#fdba74', bg: '#fff7ed', text: '#1e293b' },
  dark: { primary: '#1e293b', secondary: '#475569', accent: '#94a3b8', bg: '#0f172a', text: '#f1f5f9' },
}

const LOGO_SIZE_MAP: Record<string, number> = { small: 64, medium: 96, large: 136 }

function FlagIcon({ country, className }: { country: string; className?: string }) {
  const FlagComponent = (Flags as any)[country]
  if (FlagComponent) return <FlagComponent className={className || 'h-4 w-5 rounded-sm object-cover'} title={country} />
  return <span className="text-sm">{country}</span>
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina', BR: 'Brasil', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica',
  CU: 'Cuba', DO: 'Rep. Dominicana', EC: 'Ecuador', ES: 'España', GT: 'Guatemala',
  HN: 'Honduras', MX: 'México', NI: 'Nicaragua', PA: 'Panamá', PE: 'Perú',
  PR: 'Puerto Rico', PY: 'Paraguay', SV: 'El Salvador', UY: 'Uruguay', US: 'Estados Unidos',
  VE: 'Venezuela', DE: 'Alemania', FR: 'Francia', GB: 'Reino Unido', IT: 'Italia',
  PT: 'Portugal', JP: 'Japón', CN: 'China', IN: 'India', RU: 'Rusia',
}

function CountrySelect({
  value, onChange, options, disabled, readOnly, ...rest
}: {
  value?: string; onChange?: (value?: string) => void; options?: { value?: string; label: string; divider?: boolean }[]
  disabled?: boolean; readOnly?: boolean; [key: string]: any
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = (options || []).filter((o) => {
    if (!o.value || o.divider) return false
    const code = o.value
    const name = COUNTRY_NAMES[code] || o.label || ''
    const prefix = (() => { try { return getCountryCallingCode(code as any) } catch { return '' } })()
    const q = search.toLowerCase()
    return code.toLowerCase().includes(q) || name.toLowerCase().includes(q) || `+${prefix}`.includes(q)
  })

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) { document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick) }
  }, [open])

  if (disabled || readOnly) return null

  return (
    <div ref={ref} className="relative" style={{ zIndex: 100 }}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700">
        {value ? (
          <><FlagIcon country={value} /><span className="text-slate-600 dark:text-slate-300">+{getCountryCallingCode(value as any)}</span></>
        ) : (
          <span className="text-slate-400 px-1">+</span>
        )}
        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800" style={{ maxHeight: 280, zIndex: 200 }}>
          <div className="sticky top-0 border-b border-slate-200 p-2 dark:border-slate-600">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" placeholder="Buscar país..." />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {filtered.map((o) => {
              const code = o.value!
              const name = COUNTRY_NAMES[code] || o.label
              const prefix = getCountryCallingCode(code as any)
              return (
                <button key={code} type="button" onClick={() => { onChange?.(code === 'ZZ' ? undefined : code); setOpen(false); setSearch('') }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${code === value ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                  <FlagIcon country={code} />
                  <span className="flex-1 truncate">{name}</span>
                  <span className="text-slate-400">+{prefix}</span>
                </button>
              )
            })}
            {filtered.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">Sin resultados</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const { data: landing, isLoading, error } = useLanding(companySlug ?? '')
  const [modalActivity, setModalActivity] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    )
  }

  if (error || !landing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: '#f8fafc' }}>
        <h1 className="text-2xl font-black text-slate-800">Página no encontrada</h1>
        <p className="text-sm text-slate-500">Esta página no está disponible o no existe.</p>
      </div>
    )
  }

  const c = landing.company
  const colors = PRESET_COLORS[c.colorPreset] ?? PRESET_COLORS.blue
  const isClassic = c.visualStyle === 'classic'
  const isSport = c.visualStyle === 'sport'
  const align = c.heroTextAlignment ?? 'center'
  const logoPx = LOGO_SIZE_MAP[c.logoSize] ?? 96
  const gallery = landing.gallery ?? []

  // Form config
  const formConfig: ContactFormConfig = (() => {
    try { return landing.contactFormConfig ? JSON.parse(landing.contactFormConfig) : [] }
    catch { return [] }
  })()
  const enabledFields = formConfig.filter((f) => f.enabled).sort((a, b) => a.order - b.order)
  const hasForm = !!c.contact?.whatsApp

  function handleFormChange(name: string, value: string) {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: false }))
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, boolean> = {}

    // Always validate WhatsApp - must be valid E.164
    const e164 = formValues['whatsapp_e164'] || ''
    if (!e164 || !isValidPhoneNumber(e164)) errors['whatsapp'] = true

    // Validate custom fields
    enabledFields.forEach((f) => {
      if (f.required && !formValues[f.name]?.trim()) errors[f.name] = true
    })
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const responses: Record<string, string> = {}

      // Always store stable WhatsApp fields
      const whatsappE164 = formValues['whatsapp_e164'] || ''
      if (whatsappE164) {
        responses['whatsappE164'] = whatsappE164
        const parsed = parsePhoneNumber(whatsappE164)
        if (parsed) {
          responses['whatsappCountryIso'] = parsed.country || ''
          responses['whatsappCountryCode'] = String(parsed.countryCallingCode)
          responses['whatsappNumber'] = whatsappE164.replace(/\D/g, '')
        }
      }

      enabledFields.forEach((f) => {
        if (formValues[f.name]?.trim()) responses[f.label || f.name] = formValues[f.name].trim()
      })
      await apiService.post(`/api/public/companies/${c.companySlugLanding}/inquiries`, {
        responsesJson: JSON.stringify(responses),
      })
    } catch { /* silently fail, still open WhatsApp */ }

    const parts: string[] = []
    if (formValues['whatsapp_e164']) parts.push(`WhatsApp: ${formValues['whatsapp_e164']}`)
    enabledFields.forEach((f) => {
      if (formValues[f.name]?.trim()) parts.push(`${f.label}: ${formValues[f.name].trim()}`)
    })
    const msg = encodeURIComponent(`Hola, quiero recibir información sobre las actividades de ${c.name}.\n\n${parts.join('\n')}`)
    window.open(`https://wa.me/${c.contact!.whatsApp!.replace(/\D/g, '')}?text=${msg}`, '_blank')
    setSubmitting(false)
    setShowForm(false)
    setFormValues({})
  }

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Hero with banner */}
      <div className="relative overflow-hidden" style={{ minHeight: c.bannerImageUrl ? 320 : undefined }}>
        {c.bannerImageUrl ? (
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${c.bannerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: `${c.bannerFocalPointX ?? 50}% ${c.bannerFocalPointY ?? 50}%`,
          }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.2),rgba(0,0,0,0.45))' }} />
          </div>
        ) : null}
        <div className="relative px-6 py-16 sm:px-10 sm:py-24" style={{ background: c.bannerImageUrl ? undefined : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
          {c.logoUrl && (
            <img src={c.logoUrl} alt={c.name} className="absolute rounded-2xl border-2 border-white/20 object-cover shadow-lg"
              style={{
                left: `${c.logoPositionX ?? 50}%`,
                top: `${c.logoPositionY ?? 50}%`,
                transform: 'translate(-50%, -50%)',
                width: logoPx, height: logoPx,
              }} />
          )}
          <div className="mx-auto max-w-3xl" style={{ textAlign: align as any }}>
            <h1 className={`text-white font-black ${isSport ? 'text-4xl sm:text-5xl uppercase tracking-tight' : isClassic ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}
              style={{ fontFamily: isClassic ? 'serif' : undefined }}>
              {c.headline || c.name}
            </h1>
            {c.description && <p className={`mt-4 text-white/80 max-w-xl mx-auto ${c.visualStyle === 'minimal' ? 'text-sm' : 'text-base'}`}
              style={{ textAlign: align as any, marginLeft: align === 'center' ? 'auto' : undefined, marginRight: align === 'center' ? 'auto' : undefined }}>{c.description}</p>}
            {hasForm ? (
              <button onClick={() => setShowForm(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: colors.accent }}>
                Consultar
              </button>
            ) : c.contact?.whatsApp ? (
              <a href={`https://wa.me/${c.contact.whatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero recibir información sobre las actividades de ${c.name}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: colors.accent }}>
                Consultar por WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Inquiry Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Consultar">
        <form onSubmit={handleFormSubmit} className="space-y-4 p-5 sm:p-6">
          {/* Fixed WhatsApp field - always rendered */}
          {(() => {
            const wh = formConfig.find((f: any) => f.name === 'whatsapp')
            const whLabel = wh?.label ?? 'WhatsApp'
            const e164 = formValues['whatsapp_e164'] || ''
            const phoneValid = e164 ? isValidPhoneNumber(e164) : false
            const showPhoneError = formErrors['whatsapp'] || (e164 && !phoneValid)
            return (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {whLabel} <span className="text-red-500 ml-0.5">*</span>
              </label>
            <PhoneInput
              international
              countrySelectComponent={CountrySelect}
              countryCallingCodeEditable={false}
              defaultCountry="AR"
              value={e164}
              onChange={(value) => {
                handleFormChange('whatsapp_e164', value || '')
                if (value && isValidPhoneNumber(value)) {
                  setFormErrors((prev) => ({ ...prev, whatsapp: false }))
                }
              }}
              className={`${showPhoneError ? '[&_.PhoneInputInput]:border-red-400' : ''} [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-xl [&_.PhoneInputInput]:border [&_.PhoneInputInput]:px-3 [&_.PhoneInputInput]:py-2 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:border-slate-200 dark:[&_.PhoneInputInput]:border-slate-700 dark:[&_.PhoneInputInput]:bg-slate-800 dark:[&_.PhoneInputInput]:text-white`}
            />
            {showPhoneError && <p className="mt-0.5 text-xs text-red-500">Ingresá un número de WhatsApp válido.</p>}
          </div>
            )
          })()}

          {/* Custom fields from config */}
          {enabledFields.map((f) => {
            const fieldId = `field_${f.name}`
            const baseClass = `w-full rounded-xl border px-3 py-2 text-sm ${formErrors[f.name] ? 'border-red-400' : 'border-slate-200'} dark:border-slate-700 dark:bg-slate-800 dark:text-white`
            const errorEl = formErrors[f.name] ? <p className="mt-0.5 text-xs text-red-500">Este campo es obligatorio.</p> : null

            if (f.type === 'checkbox') {
              return (
                <div key={f.name} className="flex items-start gap-2">
                  <input type="checkbox" id={fieldId} checked={!!formValues[f.name]} onChange={(e) => handleFormChange(f.name, e.target.checked ? 'Sí' : '')}
                    className="mt-0.5 rounded border-slate-300" />
                  <label htmlFor={fieldId} className="text-sm text-slate-700 dark:text-slate-300">
                    {f.label}{f.required ? <span className="text-red-500 ml-0.5">*</span> : null}
                  </label>
                  {errorEl}
                </div>
              )
            }

            if (f.type === 'select') {
              return (
                <div key={f.name}>
                  <label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-slate-600">{f.label}{f.required ? <span className="text-red-500 ml-0.5">*</span> : null}</label>
                  <select id={fieldId} value={formValues[f.name] ?? ''} onChange={(e) => handleFormChange(f.name, e.target.value)}
                    className={baseClass}>
                    <option value="">Seleccionar...</option>
                    {(f.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {errorEl}
                </div>
              )
            }

            if (f.type === 'textarea') {
              return (
                <div key={f.name}>
                  <label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-slate-600">{f.label}{f.required ? <span className="text-red-500 ml-0.5">*</span> : null}</label>
                  <textarea id={fieldId} value={formValues[f.name] ?? ''} onChange={(e) => handleFormChange(f.name, e.target.value)}
                    className={baseClass} rows={3} placeholder={f.placeholder || f.label} />
                  {errorEl}
                </div>
              )
            }

            const inputType = f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text'
            return (
              <div key={f.name}>
                <label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-slate-600">{f.label}{f.required ? <span className="text-red-500 ml-0.5">*</span> : null}</label>
                <input id={fieldId} type={inputType} value={formValues[f.name] ?? ''} onChange={(e) => handleFormChange(f.name, e.target.value)}
                  className={baseClass} placeholder={f.placeholder || f.label} />
                {errorEl}
              </div>
            )
          })}
          <Button type="submit" loading={submitting} disabled={!formValues['whatsapp_e164'] || !isValidPhoneNumber(formValues['whatsapp_e164'])} className="w-full bg-emerald-600 text-white disabled:opacity-50">Enviar consulta por WhatsApp</Button>
        </form>
      </Modal>

      {/* Activities */}
      {landing.activities?.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
          <h2 className="text-lg font-bold text-center mb-8" style={{ color: colors.text }}>Actividades</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landing.activities.map((act: any) => (
              <button key={act.id} onClick={() => setModalActivity(act)}
                className="rounded-xl border p-5 text-center transition hover:shadow-md"
                style={{ borderColor: `${colors.primary}20`, backgroundColor: `${colors.primary}08` }}>
                <h3 className="text-base font-bold" style={{ color: colors.text }}>{act.name}</h3>
                {act.description && <p className="mt-1 text-sm" style={{ color: `${colors.text}99` }}>{act.description}</p>}
                {act.teacherName && <p className="mt-2 text-xs" style={{ color: `${colors.text}80` }}>{act.teacherName}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity Modal */}
      <Modal open={!!modalActivity} onClose={() => setModalActivity(null)} title={modalActivity?.name}>
        {modalActivity && (
          <div className="space-y-4 p-5 sm:p-6">
            {modalActivity.description && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{modalActivity.description}</p>
              </div>
            )}
            {modalActivity.teacherName && (
              <div className="flex items-center gap-3">
                {modalActivity.teacherPhoto ? (
                  <img src={modalActivity.teacherPhoto} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">{modalActivity.teacherName.charAt(0)}</div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Profesor</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{modalActivity.teacherName}</p>
                </div>
              </div>
            )}
            {modalActivity.schedule && modalActivity.schedule.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horarios</h3>
                <div className="mt-1 space-y-1">
                  {modalActivity.schedule.map((s: any, i: number) => (
                    <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
                      {s.day === 'Monday' ? 'Lunes' : s.day === 'Tuesday' ? 'Martes' : s.day === 'Wednesday' ? 'Miércoles' : s.day === 'Thursday' ? 'Jueves' : s.day === 'Friday' ? 'Viernes' : s.day === 'Saturday' ? 'Sábado' : 'Domingo'}
                      {' '}{s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Gallery - Carousel */}
      {gallery.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-lg font-bold text-center mb-6" style={{ color: colors.text }}>Galería</h2>
          <GalleryCarousel images={gallery} />
        </div>
      )}

      {/* Consultanos */}
      {hasForm && (
        <div className="mx-auto max-w-xl px-6 py-12 text-center">
          <h2 className="text-lg font-bold mb-3" style={{ color: colors.text }}>Consultanos</h2>
          <p className="text-sm mb-6" style={{ color: `${colors.text}99` }}>Completá el formulario y te responderemos a la brevedad.</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: colors.accent }}>
            Consultar ahora
          </button>
        </div>
      )}

      {/* Contact icons */}
      {c.contact && (c.contact.whatsApp || c.contact.instagram || c.contact.facebook || c.contact.email || c.contact.phone) && (
        <div className="mx-auto px-6 py-10">
          <div className="flex items-center justify-center gap-4">
            {c.contact.whatsApp && (
              <a href={`https://wa.me/${c.contact.whatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp" title="WhatsApp"
                className="flex h-12 w-12 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#25D366', color: '#fff' }}>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
            {c.contact.instagram && (
              <a href={c.contact.instagram.startsWith('http') ? c.contact.instagram : `https://instagram.com/${c.contact.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir Instagram" title="Instagram"
                className="flex h-12 w-12 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#E4405F', color: '#fff' }}>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {c.contact.facebook && (
              <a href={c.contact.facebook.startsWith('http') ? c.contact.facebook : `https://facebook.com/${c.contact.facebook}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir Facebook" title="Facebook"
                className="flex h-12 w-12 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#1877F2', color: '#fff' }}>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {c.contact.email && (
              <a href={`mailto:${c.contact.email}`} aria-label="Enviar email" title="Email"
                className="flex h-12 w-12 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#EA4335', color: '#fff' }}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </a>
            )}
            {c.contact.phone && (
              <a href={`tel:${c.contact.phone.replace(/\D/g, '')}`} aria-label="Llamar por teléfono" title="Teléfono"
                className="flex h-12 w-12 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#34A853', color: '#fff' }}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center" style={{ borderColor: `${colors.primary}20` }}>
        <p className="text-xs" style={{ color: `${colors.text}60` }}>Gestionado con ClassClick</p>
      </footer>
    </div>
  )
}
