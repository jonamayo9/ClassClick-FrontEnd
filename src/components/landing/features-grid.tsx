import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  FileText,
  Megaphone,
  QrCode,
  ReceiptText,
  Shirt,
  Users,
  Wallet,
} from 'lucide-react'
import { Section, SectionHeader } from './landing-ui'

type Accent = 'blue' | 'cyan' | 'purple' | 'emerald' | 'amber'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  accent: Accent
}

const accentClasses: Record<Accent, string> = {
  blue: 'border-landing-blue/15 bg-landing-blue/10 text-landing-blue',
  cyan: 'border-cyan-400/15 bg-cyan-400/10 text-cyan-300',
  purple: 'border-violet-400/15 bg-violet-400/10 text-violet-300',
  emerald: 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/15 bg-amber-400/10 text-amber-300',
}

const features: Feature[] = [
  {
    icon: Users,
    title: 'Gestión de alumnos',
    description: 'Altas, perfiles, importación y legajos.',
    accent: 'blue',
  },
  {
    icon: BookOpen,
    title: 'Cursos y comisiones',
    description: 'Formaciones, horarios, docentes e inscripciones.',
    accent: 'purple',
  },
  {
    icon: Wallet,
    title: 'Cuotas y pagos',
    description: 'Precios, vencimientos, becas y cobranza.',
    accent: 'cyan',
  },
  {
    icon: ReceiptText,
    title: 'Comprobantes',
    description: 'Revisión y trazabilidad de cada pago.',
    accent: 'emerald',
  },
  {
    icon: FileText,
    title: 'Documentos',
    description: 'Solicitudes, aprobaciones y vencimientos.',
    accent: 'amber',
  },
  {
    icon: QrCode,
    title: 'Eventos con QR',
    description: 'Entradas, pagos y control de acceso.',
    accent: 'cyan',
  },
  {
    icon: Shirt,
    title: 'Indumentaria',
    description: 'Catálogo, stock, pedidos y entregas.',
    accent: 'purple',
  },
  {
    icon: Megaphone,
    title: 'Comunicación y novedades',
    description: 'Anuncios, muro de curso y sponsors.',
    accent: 'blue',
  },
  {
    icon: BadgeCheck,
    title: 'Carnet digital',
    description: 'Identificación con QR y biometría.',
    accent: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    description: 'Exportación de cobranza y asistencias.',
    accent: 'amber',
  },
]

export function FeatureCard({ icon: Icon, title, description, accent }: Feature) {
  return (
    <article className="group flex min-h-[150px] flex-col rounded-[14px] border border-landing-border bg-landing-card/60 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-landing-blue/50 hover:bg-landing-card sm:min-h-[162px] sm:p-5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${accentClasses[accent]}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[14px] font-semibold leading-tight text-landing-text sm:text-[15px]">{title}</h3>
      <p className="mt-2 text-[12px] leading-5 text-landing-muted sm:text-[13px]">{description}</p>
    </article>
  )
}

export function FeaturesGrid() {
  return (
    <Section id="producto" className="relative py-14 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landing-border to-transparent" />
      <SectionHeader
        eyebrow="Todo lo que necesitás"
        title="Una plataforma, todas las herramientas"
        description="Modular, flexible y pensada para el crecimiento de tu institución."
      />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </Section>
  )
}
