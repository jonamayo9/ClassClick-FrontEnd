import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/seo'
import privacyPolicyHtml from '@/content/privacy-policy.html?raw'
import privacyPolicyMeta from '@/content/privacy-policy-meta.json'
import termsOfUseHtml from '@/content/terms-of-use.html?raw'
import termsOfUseMeta from '@/content/terms-of-use-meta.json'
import type { LegalDocument } from '@/types/legal'

const privacyIntro =
  'Cómo ClassClick trata la información necesaria para operar la plataforma y qué derechos tenés sobre tus datos.'
const termsIntro =
  'Condiciones generales para usar ClassClick, las responsabilidades de cada rol y el alcance de los servicios.'

const privacyPolicyDocument: LegalDocument = {
  id: 'privacy-policy-static',
  type: 'PrivacyPolicy',
  version: privacyPolicyMeta.version,
  title: privacyPolicyMeta.title,
  contentHtml: privacyPolicyHtml,
  contentHash: 'static',
  publishedAtUtc: privacyPolicyMeta.updatedAt,
  requiresAcceptance: true,
}

const termsOfUseDocument: LegalDocument = {
  id: 'terms-of-use-static',
  type: 'TermsOfUse',
  version: termsOfUseMeta.version,
  title: termsOfUseMeta.title,
  contentHtml: termsOfUseHtml,
  contentHash: 'static',
  publishedAtUtc: termsOfUseMeta.updatedAt,
  requiresAcceptance: true,
}

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

export function PrivacyPage() {
  return (
    <LegalPage
      document={privacyPolicyDocument}
      intro={privacyIntro}
      canonical="https://classclick.com.ar/privacidad"
      otherPath="/terminos"
      otherLabel="Términos y Condiciones"
    />
  )
}

export function TermsPage() {
  return (
    <LegalPage
      document={termsOfUseDocument}
      intro={termsIntro}
      canonical="https://classclick.com.ar/terminos"
      otherPath="/privacidad"
      otherLabel="Política de Privacidad"
    />
  )
}

function LegalPage({
  document,
  intro,
  canonical,
  otherPath,
  otherLabel,
}: {
  document: LegalDocument
  intro: string
  canonical: string
  otherPath: string
  otherLabel: string
}) {
  const toc = useMemo(() => {
    const parsed = new DOMParser().parseFromString(document.contentHtml, 'text/html')

    return Array.from(parsed.querySelectorAll('h2[id]')).map((heading) => ({
      id: heading.id,
      title: (heading.textContent ?? '').replace(/^\d+\.\s*/, '').trim(),
    }))
  }, [document])

  const titleParts = document.title.split(' ')
  const highlightedTitle = titleParts.pop()

  return (
    <section className="relative overflow-hidden bg-cc-bg px-4 py-10 text-cc-text sm:px-6 sm:py-14">
      <Seo
        title={document.title}
        description={intro}
        canonical={canonical}
        image="https://classclick.com.ar/landing/og-classclick.png"
      />

      <div className="pointer-events-none absolute inset-0 landing-grid opacity-35" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-cc-border bg-cc-surface/60 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <img
              src="/icons/icon-512.png"
              alt="ClassClick"
              className="h-12 w-12 rounded-2xl border border-cc-border bg-white p-1 shadow-lg sm:h-14 sm:w-14"
            />
            <div>
              <p className="text-lg font-black tracking-tight">ClassClick</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cc-muted">
                Documentos legales
              </p>
            </div>
            <span className="ml-auto rounded-full border border-cc-border bg-cc-card px-3 py-1 text-[11px] font-bold text-cc-muted">
              Versión {document.version}
            </span>
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-cc-blue-light">
            ClassClick Original
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
            {titleParts.join(' ')}{' '}
            <span className="text-cc-blue-light">{highlightedTitle}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-cc-muted sm:text-lg">{intro}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-cc-muted">
            <span className="rounded-full border border-cc-border bg-cc-card px-3 py-1 font-semibold">
              Última actualización: {formatLegalDate(document.publishedAtUtc)}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              to={otherPath}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cc-border px-4 text-sm font-bold text-cc-text transition hover:bg-white/5"
            >
              Ver {otherLabel}
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cc-border px-4 text-sm font-bold text-cc-text transition hover:bg-white/5"
            >
              Ingresar
            </Link>
            <Link
              to="/prueba-gratis"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-cc-blue px-4 text-sm font-black text-white transition hover:bg-cc-blue-bright"
            >
              Probar gratis
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-cc-muted transition hover:text-cc-text"
            >
              Volver al inicio
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-cc-border bg-cc-card/80 p-4 shadow-xl backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cc-faint">Contenido</p>
              <nav className="mt-3 flex flex-col gap-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold leading-5 text-cc-muted transition hover:bg-white/5 hover:text-cc-text"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="rounded-3xl border border-cc-border bg-cc-card/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-10">
            <details className="mb-6 rounded-2xl border border-cc-border bg-cc-surface/70 p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-black text-cc-text">Índice de contenidos</summary>
              <nav className="mt-3 flex flex-col gap-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold leading-5 text-cc-muted transition hover:bg-white/5 hover:text-cc-text"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </details>

            <div
              className="legal-prose"
              dangerouslySetInnerHTML={{ __html: document.contentHtml }}
            />

            <div className="mt-10 border-t border-cc-border pt-6 text-xs leading-6 text-cc-faint">
              <p>
                Versión {document.version} · Última actualización:{' '}
                {formatLegalDate(document.publishedAtUtc)}.
              </p>
              <p className="mt-3">
                Consultas: <a className="font-bold text-cc-blue-light hover:underline" href="mailto:soporte@classclick.com.ar">soporte@classclick.com.ar</a>
                {' · '}
                <Link className="font-bold text-cc-blue-light hover:underline" to="/privacidad">Privacidad</Link>
                {' · '}
                <Link className="font-bold text-cc-blue-light hover:underline" to="/terminos">Términos</Link>
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
