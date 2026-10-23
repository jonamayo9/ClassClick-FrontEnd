import { Link } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CreditCard,
  Globe2,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Section,
  SectionHeader,
  TextLink,
  primaryButtonClass,
  secondaryButtonClass,
  whatsappLink,
} from './landing-ui'

const collectionFeatures = [
  'Precios por curso y frecuencia semanal.',
  'Tipos de cuota con conceptos y montos propios.',
  'Vencimientos y mora calculados en la fecha correcta.',
  'Becas, promociones y descuentos por hermanos.',
  'Comprobantes sujetos a revisión y trazabilidad del pago.',
  'Resumen de cobranza, filtros y exportación de reportes.',
]

const flowSteps = [
  {
    icon: Wallet,
    title: 'Precio y cuota',
    description: 'El curso y la frecuencia definen el importe.',
  },
  {
    icon: CalendarDays,
    title: 'Vencimiento',
    description: 'Se calcula según la configuración de la institución.',
  },
  {
    icon: ReceiptText,
    title: 'Pago y comprobante',
    description: 'Transferencia, Mercado Pago o comprobante a revisión.',
  },
  {
    icon: BarChart3,
    title: 'Reporte',
    description: 'Estado, filtros y trazabilidad de la cobranza.',
  },
]

export function CollectionsSection() {
  return (
    <Section id="cobranza" className="relative border-y border-white/[0.06] bg-landing-surface/35 py-14 sm:py-16 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
        <div>
          <SectionHeader
            eyebrow="Cobranza conectada"
            title="Desde el precio del curso hasta el pago confirmado"
            description="ClassClick genera, explica y sigue cada cuota. El administrador ve el detalle completo y el alumno entiende qué está pagando desde la misma plataforma."
          />

          <div className="mt-7 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {collectionFeatures.map((feature, index) => (
              <div key={feature} className="flex gap-4 py-3.5">
                <span className="text-xs font-semibold text-landing-cyan">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-[13px] leading-6 text-slate-300 sm:text-sm">{feature}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/prueba-gratis" className={primaryButtonClass}>
              Probar la cobranza
            </Link>
            <Link to="/login" className={secondaryButtonClass}>
              Ya soy cliente
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-landing-border bg-landing-card/70 p-5 shadow-[0_28px_90px_-50px_rgba(22,139,255,0.7)] sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-landing-blue/15 blur-[70px]" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-landing-cyan">Flujo de cobranza</p>
              <h3 className="mt-2 text-lg font-semibold text-landing-text">Una misma historia por alumno</h3>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-landing-blue/20 bg-landing-blue/10 text-landing-cyan">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="relative mt-7 space-y-1">
            <div className="absolute bottom-5 left-[19px] top-5 w-px bg-gradient-to-b from-landing-blue/50 via-landing-border to-transparent" aria-hidden="true" />
            {flowSteps.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="relative flex gap-4 rounded-xl p-2.5 transition hover:bg-white/[0.025]">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-landing-border bg-landing-bg text-landing-cyan shadow-[0_0_0_5px_rgba(3,8,23,1)]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-landing-text">{title}</h4>
                    <span className="text-[10px] font-medium text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-landing-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="relative mt-5 rounded-xl border border-landing-border bg-landing-bg/50 px-4 py-3 text-[11px] leading-5 text-slate-400">
            La institución define precios, vencimientos y medios de pago. ClassClick registra y da seguimiento.
          </p>
        </div>
      </div>
    </Section>
  )
}

const educativaCapabilities = [
  { icon: BookOpen, title: 'Formaciones y comisiones', description: 'Estructura académica, horarios y cupos.' },
  { icon: Users, title: 'Inscripciones y asistencias', description: 'Alumnos, docentes y cursada diaria.' },
  { icon: Award, title: 'Certificaciones y graduados', description: 'Solicitudes, estados y emisión.' },
  { icon: CreditCard, title: 'Pagos y comprobantes', description: 'Cuotas, revisión y seguimiento.' },
  { icon: ShieldCheck, title: 'Permisos por rol', description: 'Cada usuario accede a lo que necesita.' },
]

function EducativaVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-landing-border bg-landing-card/70 p-2 shadow-[0_28px_90px_-50px_rgba(129,60,255,0.7)]">
      <div className="relative overflow-hidden rounded-xl">
        <img
          src="/landing/educativa-visual.svg"
          alt="Ilustración abstracta de formación educativa"
          width="800"
          height="600"
          className="h-auto w-full"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-landing-card via-landing-card/40 to-transparent" />
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-400/20 bg-landing-bg/80 px-3 py-1 text-[10px] font-semibold text-violet-200 backdrop-blur">Formaciones</span>
          <span className="rounded-full border border-violet-400/20 bg-landing-bg/80 px-3 py-1 text-[10px] font-semibold text-violet-200 backdrop-blur">Certificaciones</span>
        </div>
      </div>
    </div>
  )
}

export function EducativaSection() {
  return (
    <Section id="educativa-detalle" className="relative overflow-hidden py-14 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(129,60,255,0.13),transparent_38%)]" />
      <div className="relative grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14">
        <div>
          <SectionHeader
            eyebrow="Educativa"
            title="De la inscripción al certificado"
            description="Una estructura pensada para institutos y centros de formación que necesitan ordenar formaciones, comisiones, docentes y certificaciones."
          />

          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {educativaCapabilities.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-landing-border bg-landing-card/50 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/10 text-violet-300">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[13px] font-semibold leading-tight text-landing-text">{title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-landing-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <a
              href={whatsappLink('Hola, quiero conocer ClassClick para una institución educativa.')}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButtonClass}
            >
              Solicitar demo educativa
            </a>
          </div>
        </div>

        <EducativaVisual />
      </div>
    </Section>
  )
}

const deportivaCapabilities = [
  { icon: Users, title: 'Alumnos y disciplinas', description: 'Perfiles, cursos y profesores.' },
  { icon: QrCode, title: 'Asistencia QR', description: 'Registro ágil desde el celular.' },
  { icon: Wallet, title: 'Cuotas y cobranza', description: 'Vencimientos, becas y comprobantes.' },
  { icon: Ticket, title: 'Eventos e indumentaria', description: 'Entradas, pedidos, stock y entregas.' },
]

function DeportivaVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-landing-border bg-landing-card/70 p-2 shadow-[0_28px_90px_-50px_rgba(0,200,255,0.6)]">
      <div className="relative overflow-hidden rounded-xl">
        <picture>
          <source srcSet="/landing/deportiva-stadium.avif" type="image/avif" />
          <source srcSet="/landing/deportiva-stadium.webp" type="image/webp" />
          <img
            src="/landing/deportiva-stadium.webp"
            alt="Cancha de fútbol iluminada de noche"
            width="1200"
            height="687"
            className="h-auto w-full opacity-85"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-landing-card via-landing-card/10 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
          {[
            { icon: QrCode, label: 'Asistencia QR' },
            { icon: CreditCard, label: 'Carnet digital' },
            { icon: Ticket, label: 'Eventos' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-landing-bg/75 px-2 py-2.5 text-center backdrop-blur">
              <Icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <span className="text-[9px] font-semibold leading-tight text-slate-200">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DeportivaSection() {
  return (
    <Section id="deportiva-detalle" className="relative overflow-hidden border-y border-white/[0.06] bg-landing-surface/35 py-14 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(0,200,255,0.1),transparent_40%)]" />
      <div className="relative grid gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:gap-14">
        <div className="order-2 lg:order-1">
          <DeportivaVisual />
        </div>

        <div className="order-1 lg:order-2">
          <SectionHeader
            eyebrow="Deportiva"
            title="Del aula al carnet, sin planillas sueltas"
            description="Herramientas para clubes, escuelitas y academias que necesitan ordenar la gestión diaria y acompañar a las familias."
          />

          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {deportivaCapabilities.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-landing-border bg-landing-card/50 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[13px] font-semibold leading-tight text-landing-text">{title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-landing-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <a
              href={whatsappLink('Hola, quiero conocer ClassClick para un club o institución deportiva.')}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButtonClass}
            >
              Solicitar demo deportiva
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}

const ecosystemItems = [
  {
    icon: Ticket,
    eyebrow: 'Eventos',
    title: 'Entradas, pagos y control de acceso',
    description: 'Publicá eventos, vendé entradas y validá el ingreso con códigos QR.',
    items: ['Venta de entradas', 'Pago y comprobante', 'QR y check-in'],
    accent: 'border-cyan-400/15 bg-cyan-400/10 text-cyan-300',
  },
  {
    icon: Globe2,
    eyebrow: 'Página pública',
    title: 'La vidriera digital de tu institución',
    description: 'Cada institución puede publicar su propia página con actividades, galería y contacto.',
    items: ['Logo y colores', 'Actividades y galería', 'Formulario de consulta'],
    accent: 'border-violet-400/15 bg-violet-400/10 text-violet-300',
  },
  {
    icon: Smartphone,
    eyebrow: 'PWA',
    title: 'Accedé desde tu navegador e instalá ClassClick',
    description: 'ClassClick es una PWA. Se usa desde el navegador y se puede instalar en el dispositivo.',
    items: ['Instalación desde el navegador', 'Notificaciones push', 'Carnet digital'],
    accent: 'border-landing-blue/20 bg-landing-blue/10 text-landing-cyan',
  },
]

export function EcosystemSection() {
  return (
    <Section id="eventos" className="relative py-14 sm:py-16 lg:py-20">
      <SectionHeader
        eyebrow="Un ecosistema conectado"
        title="Tu institución, también fuera del panel"
        description="Eventos, página pública y una aplicación instalable para acompañar a alumnos, familias y docentes."
      />

      <div className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-3">
        {ecosystemItems.map(({ icon: Icon, eyebrow, title, description, items, accent }) => (
          <article key={eyebrow} className="group flex h-full flex-col rounded-2xl border border-landing-border bg-landing-card/60 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-landing-blue/45 hover:bg-landing-card sm:p-6">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accent}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-landing-cyan">{eyebrow}</p>
            <h3 className="mt-2 text-lg font-semibold leading-snug text-landing-text">{title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-landing-muted">{description}</p>
            <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-slate-300">
                  <Check className="h-3.5 w-3.5 shrink-0 text-landing-cyan" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-landing-border bg-landing-surface/60 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-landing-blue/20 bg-landing-blue/10 text-landing-cyan">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-landing-text">No es una app nativa</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-landing-muted">
              ClassClick se instala desde el navegador. No se descarga desde App Store ni Google Play.
            </p>
          </div>
        </div>
        <TextLink to="/prueba-gratis">Probar ClassClick</TextLink>
      </div>
    </Section>
  )
}
