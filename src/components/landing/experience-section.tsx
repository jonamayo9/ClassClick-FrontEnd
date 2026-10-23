import { Check } from 'lucide-react'
import { HeroMockups } from './product-mockups'
import { Section, SectionHeader, SectionLink, secondaryButtonClass } from './landing-ui'

const benefits = [
  'Fácil de usar.',
  'Rápida implementación.',
  'Adaptada a cada tipo de institución.',
  'En constante evolución.',
]

export function ExperienceSection() {
  return (
    <Section id="experiencia" className="relative overflow-hidden py-14 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_50%,rgba(22,139,255,0.1),transparent_42%)]" />
      <div className="relative grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-10">
        <div>
          <SectionHeader
            eyebrow="Una experiencia moderna"
            title="Diseñado para el día a día de tu institución"
            description="Una interfaz intuitiva y completa, para que puedas enfocarte en lo más importante."
          />

          <ul className="mt-7 space-y-3.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[14px] leading-6 text-slate-300 sm:text-[15px]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-landing-blue/25 bg-landing-blue/10 text-landing-cyan">
                  <Check className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <SectionLink id="producto" className={secondaryButtonClass}>
              Conocé la plataforma
            </SectionLink>
          </div>

          <p className="mt-4 max-w-md text-xs leading-5 text-slate-500">
            Capturas de demostración. No se muestran datos personales ni marcas de terceros.
          </p>
        </div>

        <HeroMockups className="lg:justify-self-end" />
      </div>
    </Section>
  )
}
