import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageCircle,
  Rocket,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import {
  Container,
  PlanCards,
  Section,
  SectionHeading,
} from './primitives'
import { whatsappLink } from './landing-utils'
import { divisionStyles, type DivisionTheme } from './theme'

interface BenefitItem {
  icon: LucideIcon
  title: string
  description: string
}

export function BenefitsGrid({
  theme,
  eyebrow,
  title,
  description,
  benefits,
}: {
  theme: DivisionTheme
  eyebrow: string
  title: ReactNode
  description: string
  benefits: BenefitItem[]
}) {
  const styles = divisionStyles[theme]

  return (
    <Section className="relative border-b border-white/[0.06] py-14 sm:py-16 lg:py-20">
      <div className={`pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full blur-[100px] ${styles.glow}`} aria-hidden="true" />
      <SectionHeading theme={theme} eyebrow={eyebrow} title={title} description={description} align="center" />

      <div className="mt-9 grid gap-4 sm:grid-cols-3 lg:gap-5">
        {benefits.map(({ icon: Icon, title: benefitTitle, description: benefitDescription }) => (
          <article
            key={benefitTitle}
            className={`relative rounded-[14px] border border-cc-border bg-cc-card/65 p-6 transition duration-200 hover:-translate-y-0.5 ${styles.cardHover} ${styles.cardGlow}`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${styles.iconTile}`}>
              <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-[20px] font-bold tracking-[-0.02em] text-white">{benefitTitle}</h3>
            <p className="mt-2.5 text-[14px] leading-6 text-cc-muted">{benefitDescription}</p>
          </article>
        ))}
      </div>
    </Section>
  )
}

interface DetailItem {
  icon: LucideIcon
  title: string
  description: string
  tags: string[]
}

export function DetailsSection({
  theme,
  eyebrow,
  title,
  description,
  items,
}: {
  theme: DivisionTheme
  eyebrow: string
  title: ReactNode
  description: string
  items: DetailItem[]
}) {
  const styles = divisionStyles[theme]

  return (
    <Section className="border-b border-white/[0.06] py-14 sm:py-16 lg:py-20">
      <SectionHeading theme={theme} eyebrow={eyebrow} title={title} description={description} />

      <div className="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {items.map(({ icon: Icon, title: itemTitle, description: itemDescription, tags }) => (
          <article
            key={itemTitle}
            className={`group rounded-[14px] border border-cc-border bg-cc-card/55 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-cc-card/80 ${styles.cardHover} ${styles.cardGlow}`}
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${styles.iconTile}`}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-[17px] font-bold tracking-[-0.015em] text-white">{itemTitle}</h3>
            <p className="mt-2 text-[13px] leading-6 text-cc-muted">{itemDescription}</p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10.5px] font-medium text-slate-300"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}

const conditions = [
  { title: 'Prueba', text: '7 días sin cargo con alta guiada. No se solicita tarjeta para pedir la prueba.' },
  { title: 'Activación', text: 'La suscripción comienza únicamente cuando confirmás el plan.' },
  { title: 'Facturación', text: 'Mensual, según cantidad de alumnos o socios, sedes y módulos contratados.' },
  { title: 'Acompañamiento', text: 'Soporte durante la configuración inicial y canales de contacto disponibles.' },
]

export function PlansSection({ theme }: { theme: DivisionTheme }) {
  const styles = divisionStyles[theme]

  return (
    <Section id="precios" className="border-b border-white/[0.06] py-14 sm:py-16 lg:py-20">
      <SectionHeading
        theme={theme}
        eyebrow="Precios"
        title="Planes simples, según el momento de tu institución"
        description="Siete días sin cargo. Después elegís una configuración mensual acorde a la cantidad de alumnos o socios, sedes y módulos que necesitás."
        align="center"
      />

      <PlanCards theme={theme} />

      <div className="mt-6 grid gap-px overflow-hidden rounded-[14px] border border-cc-border bg-cc-border sm:grid-cols-2 lg:grid-cols-4">
        {conditions.map((condition) => (
          <div key={condition.title} className="bg-cc-surface p-5">
            <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${styles.accentLightText}`}>
              {condition.title}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-cc-muted">{condition.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">
        El alcance final, los importes y cualquier servicio adicional se informan antes de activar la suscripción.
      </p>
    </Section>
  )
}

interface FaqItem {
  question: string
  answer: string
}

const resourceCards = [
  {
    icon: Rocket,
    title: 'Empezá en pocos pasos',
    description: 'Solicitá la prueba, definí la estructura inicial y cargá tu institución con acompañamiento.',
  },
  {
    icon: Smartphone,
    title: 'ClassClick es una PWA',
    description: 'Se usa desde el navegador. Podés instalarla en tu dispositivo sin pasar por una tienda de aplicaciones.',
  },
  {
    icon: MessageCircle,
    title: 'Soporte cercano',
    description: 'Coordinamos la configuración inicial y respondemos consultas por WhatsApp.',
  },
]

export function ResourcesSection({
  theme,
  eyebrow,
  title,
  description,
  faqs,
}: {
  theme: DivisionTheme
  eyebrow: string
  title: ReactNode
  description: string
  faqs: FaqItem[]
}) {
  const styles = divisionStyles[theme]

  return (
    <Section id="recursos" className="border-b border-white/[0.06] py-14 sm:py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-14">
        <div>
          <SectionHeading theme={theme} eyebrow={eyebrow} title={title} description={description} />
          <a
            href={whatsappLink('Hola, tengo una consulta sobre ClassClick.')}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-6 inline-flex text-sm font-semibold transition hover:text-white ${styles.accentLightText}`}
          >
            Hacer una consulta por WhatsApp
          </a>

          <div className="mt-7 space-y-3">
            {resourceCards.map(({ icon: Icon, title: cardTitle, description: cardDescription }) => (
              <div
                key={cardTitle}
                className="flex gap-3 rounded-xl border border-cc-border bg-cc-card/45 p-4"
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${styles.iconTile}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[13px] font-semibold text-white">{cardTitle}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-cc-muted">{cardDescription}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-[14px] font-semibold leading-6 text-white sm:text-[15px]">
                  {faq.question}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cc-border bg-white/[0.03] text-slate-400 transition group-open:rotate-180 group-open:border-white/20 group-open:text-white">
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </summary>
              <div className="pb-5 pr-10 text-[13px] leading-6 text-cc-muted">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}

export function FinalCta({
  theme,
  title,
  description,
}: {
  theme: DivisionTheme
  title: string
  description: string
}) {
  const styles = divisionStyles[theme]

  return (
    <section id="contacto" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20">
      <div className={`pointer-events-none absolute left-1/2 top-0 h-64 w-[34rem] -translate-x-1/2 rounded-full blur-[110px] ${styles.glow}`} aria-hidden="true" />
      <Container className="relative text-center">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.17em] ${styles.softBadge}`}>
          <Check className="h-3 w-3" aria-hidden="true" />
          Empezá por una conversación
        </span>
        <h2 className="mx-auto mt-5 max-w-[760px] text-[28px] font-bold leading-[1.1] tracking-[-0.04em] text-white sm:text-[38px] lg:text-[46px]">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-cc-muted sm:text-base">{description}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/prueba-gratis" className={styles.primaryButton}>
            Probar gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={whatsappLink('Hola, quiero hablar con el equipo de ClassClick.')}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryButton}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Hablar por WhatsApp
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          También podés conversar con el equipo desde el botón de contacto del encabezado.
        </p>
      </Container>
    </section>
  )
}
