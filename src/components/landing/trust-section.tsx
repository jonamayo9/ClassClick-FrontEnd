import { useEffect, useState } from 'react'
import { Lock, MessageCircle, ShieldCheck, Smartphone } from 'lucide-react'
import { apiService } from '@/lib/api'
import { Section, SectionHeader, SectionLink, TextLink } from './landing-ui'

interface CompanyLogo {
  logoUrl: string
}

const trustBenefits = [
  {
    icon: ShieldCheck,
    title: 'Roles y permisos',
    description: 'Administradores, docentes, alumnos, delegados y operadores con accesos definidos.',
  },
  {
    icon: Smartphone,
    title: 'Web + PWA',
    description: 'Acceso desde el navegador e instalación en el dispositivo, sin tiendas de aplicaciones.',
  },
  {
    icon: Lock,
    title: 'Documentación y datos',
    description: 'Legajos, comprobantes y permisos organizados por institución.',
  },
  {
    icon: MessageCircle,
    title: 'Acompañamiento',
    description: 'Soporte y configuración inicial para que el flujo quede funcionando.',
  },
]

export function TrustSection() {
  const [logos, setLogos] = useState<CompanyLogo[]>([])

  useEffect(() => {
    let active = true
    apiService
      .get<CompanyLogo[]>('/api/public/companies/logos')
      .then((data) => {
        if (active && Array.isArray(data)) setLogos(data.filter((item) => item?.logoUrl))
      })
      .catch(() => {
        if (active) setLogos([])
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <Section id="recursos" className="relative border-y border-white/[0.06] bg-landing-surface/35 py-14 sm:py-16 lg:py-20">
      <SectionHeader
        eyebrow="Confianza verificable"
        title="Una plataforma para el trabajo real"
        description="Sin métricas infladas ni testimonios inventados. Estas son capacidades concretas que podés verificar en ClassClick."
        action={<SectionLink id="faq" className="inline-flex items-center gap-2 text-sm font-semibold text-landing-cyan transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg">Ver preguntas frecuentes</SectionLink>}
      />

      {logos.length > 0 ? (
        <div className="mt-8 rounded-2xl border border-landing-border bg-landing-card/40 px-5 py-6 sm:px-7">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.17em] text-slate-500">
            Instituciones que gestionan su día a día con ClassClick
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            {logos.map((item, index) => (
              <img
                key={`${item.logoUrl}-${index}`}
                src={item.logoUrl}
                alt="Logo de institución que utiliza ClassClick"
                className="h-10 w-auto max-w-[130px] object-contain opacity-65 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-12"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {trustBenefits.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl border border-landing-border bg-landing-card/55 p-5 transition duration-200 hover:border-landing-blue/40 hover:bg-landing-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-landing-blue/15 bg-landing-blue/10 text-landing-cyan">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-landing-text">{title}</h3>
            <p className="mt-2 text-[12px] leading-5 text-landing-muted">{description}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-landing-border bg-landing-bg/45 p-5 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-xs leading-5 text-slate-400">
          ¿Querés ver cómo se adapta a tu institución? Podés solicitar una prueba guiada o hablar con el equipo.
        </p>
        <TextLink to="/prueba-gratis">Solicitar prueba</TextLink>
      </div>
    </Section>
  )
}
