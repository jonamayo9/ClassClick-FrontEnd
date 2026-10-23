import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Section, SectionHeader, primaryButtonClass, secondaryButtonClass, whatsappLink } from './landing-ui'

function publicPrice(value: string | undefined, fallback: string) {
  return value?.trim() ? `${value.trim()} / mes` : fallback
}

const plans = [
  {
    name: 'Inicial',
    price: publicPrice(import.meta.env.VITE_PRICE_INITIAL, 'Consultar'),
    description: 'Para escuelitas o academias que quieren ordenar alumnos, cursos y pagos.',
    items: ['Alumnos y cursos', 'Cuotas y comprobantes', 'Carnet digital', 'Soporte de arranque'],
  },
  {
    name: 'Pro',
    price: publicPrice(import.meta.env.VITE_PRICE_PRO, 'Consultar'),
    description: 'Para instituciones que necesitan módulos avanzados y más automatización.',
    items: ['Todo lo del Inicial', 'Documentos y legajos', 'Novedades y sponsors', 'Indumentaria'],
    featured: true,
  },
  {
    name: 'Institucional',
    price: publicPrice(import.meta.env.VITE_PRICE_INSTITUTIONAL, 'A medida'),
    description: 'Para organizaciones con varias sedes, volumen alto o necesidades especiales.',
    items: ['Multiempresa', 'Configuración personalizada', 'Acompañamiento prioritario', 'Roadmap por necesidades'],
  },
]

const conditions = [
  { title: 'Prueba', text: '7 días sin cargo con alta guiada. No se solicita tarjeta para pedir la prueba.' },
  { title: 'Activación', text: 'La suscripción comienza únicamente cuando confirmás el plan.' },
  { title: 'Facturación', text: 'Mensual, según cantidad de alumnos, sedes y módulos contratados.' },
  { title: 'Acompañamiento', text: 'Soporte durante la configuración inicial y canales de contacto disponibles.' },
]

export function PricingSection() {
  return (
    <Section id="precios" className="relative py-14 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(22,139,255,0.1),transparent_38%)]" />
      <SectionHeader
        align="center"
        eyebrow="Precios"
        title="Planes simples, según el momento de tu institución"
        description="Siete días sin cargo. Después elegís una configuración mensual acorde a la cantidad de alumnos, sedes y módulos que necesitás."
      />

      <div className="relative mt-9 grid gap-4 lg:grid-cols-3 lg:gap-5">
        {plans.map((plan) => (
          <article
            key={plan.name}
            data-plan={plan.name}
            className={`relative flex h-full flex-col rounded-2xl border p-6 transition duration-200 hover:-translate-y-0.5 ${
              plan.featured
                ? 'border-landing-blue/60 bg-[linear-gradient(160deg,rgba(12,29,56,1),rgba(7,19,38,0.96))] shadow-[0_28px_90px_-42px_rgba(22,139,255,0.7)] ring-1 ring-landing-blue/20'
                : 'border-landing-border bg-landing-card/55 hover:border-landing-blue/40'
            }`}
          >
            {plan.featured ? (
              <span className="absolute right-5 top-5 rounded-full border border-landing-cyan/30 bg-landing-cyan/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-landing-cyan">
                Recomendado
              </span>
            ) : null}

            <h3 className="text-xl font-semibold text-landing-text">{plan.name}</h3>
            <p className="mt-4 min-h-[42px] text-2xl font-bold tracking-[-0.03em] text-landing-text sm:text-[28px]">
              {plan.price}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-landing-muted">{plan.description}</p>

            <ul className="mt-6 space-y-3 border-t border-white/[0.07] pt-5">
              {plan.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-5 text-slate-300">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-landing-blue/15 text-landing-cyan">
                    <Check className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-7">
              <Link
                to="/prueba-gratis"
                className={`${plan.featured ? primaryButtonClass : secondaryButtonClass} w-full`}
              >
                Solicitar prueba
              </Link>
              <a
                href={whatsappLink(`Hola, quiero consultar el plan ${plan.name} de ClassClick.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center text-xs font-medium text-slate-400 transition hover:text-landing-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
              >
                Consultar este plan
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-landing-border bg-landing-border sm:grid-cols-2 lg:grid-cols-4">
        {conditions.map((condition) => (
          <div key={condition.title} className="bg-landing-surface p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-landing-cyan">{condition.title}</p>
            <p className="mt-2 text-[12px] leading-5 text-landing-muted">{condition.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">
        El alcance final, los importes y cualquier servicio adicional se informan antes de activar la suscripción.
      </p>
    </Section>
  )
}
