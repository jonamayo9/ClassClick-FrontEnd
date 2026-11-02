import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth'
import { apiService, getApiError } from '@/lib/api'
import { resolveHomePath } from '@/lib/auth-route'
import { Seo } from '@/components/seo'
import { Button } from '@/components/ui/button'
import type { LegalStatus } from '@/types/legal'

function formatLegalDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

export default function LegalAcceptPage() {
  const { token, user, companies, activeCompanySlug, logout, setLegalStatus } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const redirectParam = searchParams.get('redirect') ?? ''
  const safeRedirect = useMemo(() => {
    if (redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      return redirectParam
    }
    return resolveHomePath()
  }, [redirectParam])

  const activeCompany = (companies ?? []).find(
    (company) => (company.slug ?? company.companySlug) === activeCompanySlug,
  )

  const statusQuery = useQuery({
    queryKey: ['legal-status'],
    queryFn: () => apiService.get<LegalStatus>('/api/legal/status'),
    enabled: !!token,
    retry: false,
    staleTime: 0,
  })

  const current = statusQuery.data?.current ?? []
  const privacy = current.find((document) => document.type === 'PrivacyPolicy')
  const terms = current.find((document) => document.type === 'TermsOfUse')
  const canAccept = Boolean(privacy && terms && privacyChecked && termsChecked)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    if (statusQuery.data && !statusQuery.data.requiresAcceptance) {
      navigate(safeRedirect, { replace: true })
    }
  }, [navigate, safeRedirect, statusQuery.data, token])

  useEffect(() => {
    if (statusQuery.data?.requiresAcceptance) {
      setLegalStatus(true, statusQuery.data.pending)
    }
  }, [setLegalStatus, statusQuery.data])

  async function handleAccept() {
    if (!canAccept || !privacy || !terms) return

    setSubmitting(true)
    setError('')

    try {
      const status = await apiService.post<LegalStatus>('/api/legal/accept', {
        privacyVersion: privacy.version,
        termsVersion: terms.version,
        source: isStandalonePwa() ? 'pwa' : 'web',
        companyId: activeCompany?.id ?? activeCompany?.companyId ?? null,
      })

      setLegalStatus(false, [])
      queryClient.setQueryData(['legal-status'], status)
      queryClient.invalidateQueries({ queryKey: ['legal-status'] })
      navigate(safeRedirect, { replace: true })
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!token || !user) return null

  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cc-bg px-4 text-cc-text">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src="/icons/icon-512.png"
            alt="ClassClick"
            className="h-16 w-16 rounded-2xl border border-cc-border bg-white p-1 shadow-2xl"
          />
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-cc-border border-t-cc-blue" />
          <p className="text-sm font-semibold text-cc-muted">Verificando documentos legales...</p>
        </div>
      </div>
    )
  }

  if (statusQuery.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cc-bg px-4 py-10 text-cc-text">
        <Seo title="Aceptación legal" noindex canonical="https://classclick.com.ar/legal/accept" />
        <div className="w-full max-w-lg rounded-3xl border border-cc-border bg-cc-card p-6 text-center shadow-2xl sm:p-8">
          <img
            src="/icons/icon-512.png"
            alt="ClassClick"
            className="mx-auto h-16 w-16 rounded-2xl border border-cc-border bg-white p-1 shadow-xl"
          />
          <h1 className="mt-5 text-xl font-black">No pudimos verificar los documentos legales</h1>
          <p className="mt-2 text-sm leading-6 text-cc-muted">
            Revisá tu conexión y volvé a intentarlo. No podés continuar hasta completar la aceptación.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" variant="primary" onClick={() => statusQuery.refetch()}>
              Reintentar
            </Button>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!privacy || !terms) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cc-bg px-4 py-10 text-cc-text">
        <Seo title="Aceptación legal" noindex canonical="https://classclick.com.ar/legal/accept" />
        <div className="w-full max-w-lg rounded-3xl border border-cc-border bg-cc-card p-6 text-center shadow-2xl sm:p-8">
          <img
            src="/icons/icon-512.png"
            alt="ClassClick"
            className="mx-auto h-16 w-16 rounded-2xl border border-cc-border bg-white p-1 shadow-xl"
          />
          <h1 className="mt-5 text-xl font-black">Documentos legales no disponibles</h1>
          <p className="mt-2 text-sm leading-6 text-cc-muted">
            No hay documentos legales vigentes publicados. Contactá al soporte de ClassClick.
          </p>
          <div className="mt-6 flex justify-center">
            <Button type="button" variant="secondary" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (statusQuery.data && !statusQuery.data.requiresAcceptance) {
    return null
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cc-bg px-4 py-8 text-cc-text sm:px-6 sm:py-12">
      <Seo
        title="Aceptación de documentos legales"
        description="Aceptación obligatoria de la Política de Privacidad y los Términos y Condiciones de ClassClick."
        noindex
        canonical="https://classclick.com.ar/legal/accept"
      />

      <div className="pointer-events-none absolute inset-0 landing-grid opacity-40" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-cc-border bg-cc-card/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-9">
          <div className="flex items-center gap-3">
            <img
              src="/icons/icon-512.png"
              alt="ClassClick"
              className="h-12 w-12 rounded-2xl border border-cc-border bg-white p-1 shadow-lg sm:h-14 sm:w-14"
            />
            <div>
              <p className="text-lg font-black tracking-tight">ClassClick</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cc-muted">
                Documentos legales
              </p>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cc-blue-light">
              Acceso pendiente
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Necesitamos tu aceptación para continuar
            </h1>
            <p className="mt-3 text-sm leading-6 text-cc-muted sm:text-base">
              Para usar ClassClick tenés que aceptar la versión vigente de la Política de Privacidad y de los
              Términos y Condiciones de Uso. La aceptación queda registrada con fecha, hora, versión y datos
              técnicos mínimos.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DocumentVersion label="Política de Privacidad" version={privacy.version} date={privacy.publishedAtUtc} />
            <DocumentVersion label="Términos y Condiciones" version={terms.version} date={terms.publishedAtUtc} />
          </div>

          <div className="mt-6 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cc-border bg-cc-surface/70 p-4 transition hover:border-cc-blue/60">
              <input
                type="checkbox"
                checked={privacyChecked}
                onChange={(event) => setPrivacyChecked(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-cc-blue"
              />
              <span className="text-sm leading-6 text-cc-muted">
                Acepto la{' '}
                <span className="font-bold text-cc-text">Política de Privacidad</span> vigente.{' '}
                <Link
                  to="/privacidad"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-cc-blue-light underline-offset-2 hover:underline"
                >
                  Leer el documento completo
                </Link>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cc-border bg-cc-surface/70 p-4 transition hover:border-cc-blue/60">
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(event) => setTermsChecked(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-cc-blue"
              />
              <span className="text-sm leading-6 text-cc-muted">
                Acepto los{' '}
                <span className="font-bold text-cc-text">Términos y Condiciones de Uso</span> vigentes.{' '}
                <Link
                  to="/terminos"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-cc-blue-light underline-offset-2 hover:underline"
                >
                  Leer el documento completo
                </Link>
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              disabled={!canAccept}
              loading={submitting}
              onClick={handleAccept}
            >
              Aceptar y continuar
            </Button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-semibold text-cc-muted underline-offset-2 transition hover:text-cc-text hover:underline"
            >
              Cerrar sesión
            </button>
          </div>

          <p className="mt-5 text-xs leading-5 text-cc-faint">
            Si no aceptás, no podés acceder al home, dashboard, cursos, pagos, documentos, perfil ni a las demás
            funcionalidades protegidas. Podés leer los documentos completos en las pestañas que se abren desde
            cada enlace.
          </p>
        </div>
      </div>
    </div>
  )
}

function DocumentVersion({ label, version, date }: { label: string; version: string; date: string }) {
  return (
    <div className="rounded-2xl border border-cc-border bg-cc-surface/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cc-faint">{label}</p>
      <p className="mt-1 text-sm font-black text-cc-text">Versión {version}</p>
      <p className="mt-0.5 text-xs text-cc-muted">Publicada el {formatLegalDate(date)}</p>
    </div>
  )
}
