import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Cloud,
  GraduationCap,
  LayoutDashboard,
  MonitorSmartphone,
  MousePointerClick,
  PersonStanding,
  Rocket,
  Smartphone,
  TrendingUp,
} from 'lucide-react'
import { Container, Eyebrow, SectionHeading } from './primitives'
import { whatsappLink } from './landing-utils'
import { divisionStyles } from './theme'

const blue = divisionStyles.educativa
const green = divisionStyles.deportiva

const benefits = [
  {
    icon: MousePointerClick,
    title: 'Simple e intuitivo',
    description: 'Una experiencia pensada para que administrar tu institución sea fácil desde el primer día.',
  },
  {
    icon: LayoutDashboard,
    title: 'Todo centralizado',
    description: 'Organizá la información y las tareas de tu institución desde un único lugar.',
  },
  {
    icon: Cloud,
    title: 'Accedé desde donde estés',
    description: 'Trabajá desde tu computadora, tablet o celular, sin instalaciones complicadas.',
  },
  {
    icon: TrendingUp,
    title: 'Crece con vos',
    description: 'Una plataforma preparada para acompañar las nuevas necesidades de tu institución.',
  },
]

const technology = [
  {
    icon: MonitorSmartphone,
    title: 'Web + PWA',
    description: 'Accedé desde el navegador e instalá ClassClick en dispositivos compatibles.',
  },
  {
    icon: Smartphone,
    title: 'Experiencia responsive',
    description: 'Una interfaz adaptada a computadoras, tablets y celulares.',
  },
  {
    icon: Rocket,
    title: 'Evolución continua',
    description: 'Una plataforma que evoluciona para mejorar la experiencia de gestión.',
  },
]

export function AboutSection() {
  return (
    <section
      id="sobre-classclick"
      className="relative scroll-mt-24 overflow-hidden border-b border-white/[0.06] py-16 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-cc-blue/10 blur-[120px]" aria-hidden="true" />
      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Conocé ClassClick"
              title={
                <>
                  La tecnología que <span className="text-cc-blue">simplifica tu gestión</span>
                </>
              }
              description="En ClassClick creemos que administrar una institución no debería ser complicado. Por eso desarrollamos una plataforma que reúne las herramientas necesarias para organizar, administrar y hacer crecer tu institución desde un solo lugar."
            />
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-cc-muted">
              Nuestro objetivo es ayudarte a dedicar menos tiempo a las tareas administrativas y más tiempo a lo que
              realmente importa: tu comunidad.
            </p>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[18px] border border-cc-border bg-cc-card shadow-[0_30px_90px_-52px_rgba(0,140,255,0.8)]">
              <img
                src="/landing/about-technology-1600.webp"
                srcSet="/landing/about-technology-800.webp 800w, /landing/about-technology-1600.webp 1600w"
                sizes="(min-width: 1024px) 560px, 100vw"
                alt="Equipo trabajando con tecnología en un espacio moderno"
                width="1600"
                height="1067"
                className="aspect-[3/2] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cc-bg/85 via-cc-bg/10 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cc-blue/50 to-transparent" aria-hidden="true" />
            </div>

            <div className="absolute -bottom-5 left-5 hidden items-center gap-3 rounded-xl border border-cc-border bg-cc-bg/95 px-4 py-3 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur sm:flex">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${blue.iconTile}`}>
                <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[12.5px] font-semibold text-white">Web + PWA</span>
                <span className="block text-[10.5px] text-slate-400">Desde el navegador</span>
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function WhyChooseSection() {
  return (
    <section id="beneficios" className="relative scroll-mt-24 border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Por qué elegir ClassClick"
          title="Todo lo que necesitás para trabajar mejor"
          description="Una plataforma diseñada para simplificar procesos y acompañar el crecimiento de tu institución."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-[14px] border border-cc-border bg-cc-card/60 p-6 transition duration-200 hover:-translate-y-0.5 hover:border-cc-blue/60 hover:bg-cc-card/85 hover:shadow-[0_24px_70px_-40px_rgba(0,140,255,0.65)]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${blue.iconTile}`}>
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-[19px] font-bold tracking-[-0.02em] text-white">{title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-6 text-cc-muted">{description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function PlatformSection() {
  return (
    <section id="plataforma" className="relative scroll-mt-24 border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-cc-green/10 blur-[120px]" aria-hidden="true" />
      <Container className="relative">
        <SectionHeading
          align="center"
          eyebrow="Una plataforma para tu institución"
          title="Cada institución es diferente. ClassClick se adapta."
          description="Descubrí las herramientas diseñadas para acompañar la gestión educativa y deportiva."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-5">
          <Link
            to="/educativa"
            className="group flex items-start gap-4 rounded-[14px] border border-cc-border bg-cc-card/55 p-6 transition duration-200 hover:-translate-y-0.5 hover:border-cc-blue/60 hover:bg-cc-card/85 hover:shadow-[0_24px_70px_-42px_rgba(0,140,255,0.65)]"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${blue.iconTile}`}>
              <GraduationCap className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[19px] font-bold tracking-[-0.02em] text-white">Gestión Educativa</span>
              <span className="mt-2 block text-[13.5px] leading-6 text-cc-muted">
                Organizá alumnos, cursos, docentes y la administración de tu institución.
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-cc-blue-light">
                Explorar Educativa
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </span>
          </Link>

          <Link
            to="/deportiva"
            className="group flex items-start gap-4 rounded-[14px] border border-cc-border bg-cc-card/55 p-6 transition duration-200 hover:-translate-y-0.5 hover:border-cc-green/60 hover:bg-cc-card/85 hover:shadow-[0_24px_70px_-42px_rgba(0,207,165,0.6)]"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${green.iconTile}`}>
              <PersonStanding className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[19px] font-bold tracking-[-0.02em] text-white">Gestión Deportiva</span>
              <span className="mt-2 block text-[13.5px] leading-6 text-cc-muted">
                Gestioná socios, disciplinas, entrenadores y actividades deportivas.
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-cc-green-bright">
                Explorar Deportiva
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </span>
          </Link>
        </div>
      </Container>
    </section>
  )
}

export function TechnologySection() {
  return (
    <section
      id="tecnologia"
      className="relative scroll-mt-24 overflow-hidden border-b border-white/[0.06] bg-cc-surface/40 py-16 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,140,255,0.18),transparent_46%),radial-gradient(circle_at_18%_80%,rgba(0,168,255,0.1),transparent_40%),radial-gradient(circle_at_82%_80%,rgba(0,207,165,0.08),transparent_40%)]" aria-hidden="true" />
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-full w-full opacity-50"
        viewBox="0 0 1440 520"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path d="M-120 400C260 260 520 470 840 330C1100 216 1240 120 1580 190" stroke="url(#tech-line-1)" strokeWidth="1" />
        <path d="M-80 470C300 340 560 540 900 400C1150 300 1280 210 1580 260" stroke="url(#tech-line-2)" strokeWidth="0.8" opacity="0.6" />
        <defs>
          <linearGradient id="tech-line-1" x1="0" y1="0" x2="1440" y2="520" gradientUnits="userSpaceOnUse">
            <stop stopColor="#008CFF" stopOpacity="0" />
            <stop offset="0.5" stopColor="#00A8FF" stopOpacity="0.5" />
            <stop offset="1" stopColor="#00CFA5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tech-line-2" x1="0" y1="0" x2="1440" y2="520" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00CFA5" stopOpacity="0" />
            <stop offset="0.55" stopColor="#008CFF" stopOpacity="0.32" />
            <stop offset="1" stopColor="#008CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mx-auto">Tecnología</Eyebrow>
          <h2 className="mt-4 text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-white sm:text-[32px] lg:text-[38px]">
            Tu institución, siempre conectada
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-cc-muted sm:text-base">
            ClassClick funciona desde el navegador y se adapta a tus dispositivos para que puedas gestionar tu
            institución estés donde estés.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:gap-5">
          {technology.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[14px] border border-cc-border bg-cc-card/60 p-6 text-center transition duration-200 hover:-translate-y-0.5 hover:border-cc-blue/60 hover:bg-cc-card/85"
            >
              <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl border ${blue.iconTile}`}>
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-[17px] font-bold tracking-[-0.015em] text-white">{title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-6 text-cc-muted">{description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function HomeFinalCta() {
  return (
    <section className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[20px] border border-cc-blue/25 bg-cc-surface/60 px-6 py-14 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-cc-blue/20 blur-[110px]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cc-blue/60 to-transparent" aria-hidden="true" />
          <div className="relative">
            <h2 className="mx-auto max-w-[760px] text-[28px] font-bold leading-[1.1] tracking-[-0.04em] text-white sm:text-[38px] lg:text-[44px]">
              ¿Listo para simplificar la gestión de tu institución?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-cc-muted sm:text-base">
              Descubrí cómo ClassClick puede ayudarte a organizar tu institución y trabajar de manera más simple.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/prueba-gratis" className={blue.primaryButton}>
                Probar gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={whatsappLink('Hola, quiero hablar con el equipo de ClassClick.')}
                target="_blank"
                rel="noopener noreferrer"
                className={blue.secondaryButton}
              >
                Contactarnos
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
