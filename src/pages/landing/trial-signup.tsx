import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const WHATSAPP_NUMBER = '5491140733436'
const trialEndpoint = import.meta.env.VITE_TRIAL_SIGNUP_ENDPOINT as string | undefined

interface TrialForm {
  contactName: string
  institutionName: string
  email: string
  whatsApp: string
  estimatedStudents: string
}

type TrialFormErrors = Partial<Record<keyof TrialForm, string>>

const initialForm: TrialForm = {
  contactName: '',
  institutionName: '',
  email: '',
  whatsApp: '',
  estimatedStudents: '',
}

export function TrialSignupPage() {
  const [form, setForm] = useState(initialForm)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<TrialFormErrors>({})
  const [sent, setSent] = useState(false)

  function update<K extends keyof TrialForm>(key: K, value: TrialForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
    setError('')
  }

  function validateForm() {
    const errors: TrialFormErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const whatsAppDigits = form.whatsApp.replace(/\D/g, '')

    if (form.contactName.trim().length < 2) errors.contactName = 'Ingresá tu nombre.'
    if (form.institutionName.trim().length < 2) errors.institutionName = 'Ingresá el nombre de tu club o institución.'
    if (!emailPattern.test(form.email.trim())) errors.email = 'Ingresá un email válido.'
    if (whatsAppDigits.length < 8) errors.whatsApp = 'Ingresá un número de WhatsApp válido, con código de área.'

    const students = Number(form.estimatedStudents)
    if (!Number.isInteger(students) || students < 1) {
      errors.estimatedStudents = 'Ingresá una cantidad de alumnos mayor a cero.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSent(false)
    if (!validateForm()) return
    if (!accepted) {
      setError('Tenés que aceptar los términos y la política de privacidad.')
      return
    }

    setSubmitting(true)
    try {
      if (trialEndpoint) {
        const response = await fetch(trialEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            estimatedStudents: Number(form.estimatedStudents),
            source: 'landing',
          }),
        })
        if (!response.ok) throw new Error('No pudimos enviar la solicitud.')
        setSent(true)
        setForm(initialForm)
        setAccepted(false)
      } else {
        const message = [
          'Hola, quiero solicitar la prueba gratis de ClassClick.',
          `Responsable: ${form.contactName}`,
          `Institución: ${form.institutionName}`,
          `Email: ${form.email}`,
          `WhatsApp: ${form.whatsApp}`,
          `Alumnos aproximados: ${form.estimatedStudents}`,
        ].join('\n')
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        setSent(true)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos enviar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-slate-100 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">Prueba gratis</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Empecemos por tu club.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Completá los datos básicos y coordinamos el alta de tu empresa. Tenés 7 días para probar ClassClick con acompañamiento y datos reales.
          </p>

          <div className="mt-8 space-y-4 border-l-2 border-blue-500 pl-5">
            <Step number="1" text="Creamos la empresa, el acceso administrador y su identidad visual." />
            <Step number="2" text="Configurás cursos, alumnos, docentes, cuotas y medios de pago." />
            <Step number="3" text="Probás el circuito completo antes de elegir la suscripción mensual." />
          </div>

          <a
            href="https://wa.me/5491140733436?text=Hola%2C%20necesito%20ayuda%20para%20probar%20ClassClick."
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex text-sm font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
          >
            ¿Tenés dudas? Hablemos por WhatsApp
          </a>
        </div>

        <form noValidate onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tu nombre" value={form.contactName} error={fieldErrors.contactName} onChange={(value) => update('contactName', value)} autoComplete="name" />
            <Field label="Nombre del club o institución" value={form.institutionName} error={fieldErrors.institutionName} onChange={(value) => update('institutionName', value)} />
            <Field label="Email de contacto" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => update('email', value)} autoComplete="email" inputMode="email" />
            <Field label="WhatsApp" type="tel" value={form.whatsApp} error={fieldErrors.whatsApp} onChange={(value) => update('whatsApp', value)} autoComplete="tel" inputMode="tel" placeholder="Ej. +54 9 11 4073 3436" />
            <Field label="Cantidad aproximada de alumnos" type="number" value={form.estimatedStudents} error={fieldErrors.estimatedStudents} onChange={(value) => update('estimatedStudents', value)} min="1" inputMode="numeric" />
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
            />
            <span>
              Acepto los <Link to="/terminos" className="font-bold text-blue-700 hover:underline dark:text-blue-300">términos de uso</Link> y la{' '}
              <Link to="/privacidad" className="font-bold text-blue-700 hover:underline dark:text-blue-300">política de privacidad</Link>.
            </span>
          </label>

          {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {sent && <p role="status" className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Solicitud preparada. Te vamos a acompañar con los próximos pasos.</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Enviando...' : 'Solicitar prueba gratis'}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">No necesitás ingresar una tarjeta para solicitar la prueba.</p>
        </form>
      </div>
    </section>
  )
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-black text-blue-600 dark:text-blue-300">{number}.</span>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', ...props }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  autoComplete?: string
  min?: string
  inputMode?: 'email' | 'tel' | 'numeric'
  placeholder?: string
}) {
  const { error, ...inputProps } = props

  return (
    <label className="block sm:last:col-span-2">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none transition focus:ring-2 dark:bg-slate-950 dark:text-white ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700'
        }`}
        {...inputProps}
      />
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600 dark:text-red-300">{error}</span>}
    </label>
  )
}
