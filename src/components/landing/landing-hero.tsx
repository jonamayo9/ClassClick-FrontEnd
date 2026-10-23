import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { HeroMockups } from './product-mockups'
import {
  CheckPill,
  GradientText,
  SectionLink,
  primaryButtonClass,
  secondaryButtonClass,
} from './landing-ui'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(22,139,255,0.22),transparent_34%),radial-gradient(circle_at_82%_34%,rgba(129,60,255,0.2),transparent_32%),radial-gradient(circle_at_58%_96%,rgba(0,200,255,0.1),transparent_32%)]" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -left-44 top-20 h-80 w-80 rounded-full bg-landing-blue/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-landing-purple/10 blur-[110px]" />

      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-full w-full opacity-40"
        viewBox="0 0 1440 720"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path d="M-120 560C280 380 470 660 810 470C1090 314 1190 140 1560 210" stroke="url(#hero-line)" strokeWidth="1.2" />
        <path d="M-80 650C330 470 520 740 880 540C1140 398 1250 250 1560 300" stroke="url(#hero-line)" strokeWidth="0.8" opacity="0.55" />
        <defs>
          <linearGradient id="hero-line" x1="0" y1="0" x2="1440" y2="720" gradientUnits="userSpaceOnUse">
            <stop stopColor="#168BFF" stopOpacity="0" />
            <stop offset="0.45" stopColor="#00C8FF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#813CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto grid w-full max-w-[1280px] gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-landing-border bg-white/[0.035] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-landing-cyan shadow-[0_0_30px_-12px_rgba(0,200,255,0.5)] sm:text-[11px]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Gestión completa para tu institución
          </span>

          <h1 className="mx-auto mt-6 max-w-[680px] text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] text-landing-text sm:text-[52px] lg:mx-0 lg:text-[64px]">
            Tu institución,
            <br />
            en <GradientText>un solo lugar</GradientText>
          </h1>

          <p className="mx-auto mt-5 max-w-[580px] text-[15px] leading-7 text-landing-muted sm:text-[17px] sm:leading-8 lg:mx-0">
            Gestioná alumnos, cursos, cuotas, comprobantes, documentos, eventos, indumentaria y mucho más.
            Una plataforma moderna, flexible y pensada para instituciones deportivas y educativas.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link to="/prueba-gratis" className={primaryButtonClass}>
              Probar gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <SectionLink id="producto" className={secondaryButtonClass}>
              Conocer más
            </SectionLink>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
            <CheckPill>Prueba guiada</CheckPill>
            <CheckPill>Web + PWA</CheckPill>
            <CheckPill>Acompañamiento inicial</CheckPill>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            ClassClick es una PWA: se usa desde el navegador y se puede instalar en tu dispositivo.
          </p>
        </div>

        <HeroMockups className="mt-2 lg:mt-0" />
      </div>
    </section>
  )
}
