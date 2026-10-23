import { Award, BookOpen, CalendarDays, CreditCard, Layers, Shirt, Users, Wallet } from 'lucide-react'
import { VerticalCard } from './vertical-card'

export function VerticalsSection() {
  return (
    <section className="relative py-14 sm:py-16 lg:py-20" aria-label="Soluciones para instituciones deportivas y educativas">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landing-border to-transparent" />
      <div className="mx-auto grid w-full max-w-[1280px] gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8">
        <VerticalCard
          vertical="deportiva"
          label="Deportiva"
          title="Para clubes y organizaciones deportivas"
          description="Gestioná alumnos, disciplinas, profesores, cuotas, eventos, indumentaria y más."
          imageSrc="/landing/deportiva-stadium.webp"
          imageAlt="Cancha de fútbol iluminada de noche"
          icons={[
            { icon: Users, label: 'Alumnos' },
            { icon: Layers, label: 'Disciplinas' },
            { icon: Wallet, label: 'Cuotas' },
            { icon: CalendarDays, label: 'Eventos' },
            { icon: Shirt, label: 'Indumentaria' },
          ]}
          detailId="deportiva-detalle"
        />

        <VerticalCard
          vertical="educativa"
          label="Educativa"
          title="Para institutos y centros de formación"
          description="Gestioná cursos, comisiones, docentes, certificaciones, cuotas y toda tu institución."
          imageSrc="/landing/educativa-visual.svg"
          imageAlt="Ilustración abstracta de formación educativa"
          imageType="illustration"
          icons={[
            { icon: Users, label: 'Alumnos' },
            { icon: BookOpen, label: 'Cursos' },
            { icon: Layers, label: 'Comisiones' },
            { icon: Award, label: 'Certificaciones' },
            { icon: CreditCard, label: 'Pagos' },
          ]}
          detailId="educativa-detalle"
        />
      </div>
    </section>
  )
}
