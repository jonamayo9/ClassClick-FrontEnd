import { GraduationCap, PersonStanding } from 'lucide-react'
import { Seo } from '@/components/seo'
import { Container } from '@/components/landing/site/primitives'
import { InstitutionCard } from '@/components/landing/site/institution-card'
import { LandingLayout } from '@/components/landing/site/landing-layout'
import {
  AboutSection,
  HomeFinalCta,
  PlatformSection,
  TechnologySection,
  WhyChooseSection,
} from '@/components/landing/site/home-sections'

export function LandingPage() {
  return (
    <LandingLayout variant="home">
      <Seo
        title="ClassClick | Gestión para instituciones"
        description="Elegí el tipo de institución y descubrí todo lo que podés hacer con ClassClick. Gestión educativa y deportiva en una sola plataforma."
        canonical="https://classclick.com.ar/"
        image="https://classclick.com.ar/landing/og-classclick.png"
        imageAlt="ClassClick, gestión para instituciones educativas y deportivas"
      />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,140,255,0.16),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(0,207,165,0.08),transparent_32%),radial-gradient(circle_at_50%_92%,rgba(0,140,255,0.08),transparent_38%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-40 top-12 h-80 w-80 rounded-full bg-cc-blue/10 blur-[120px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-cc-green/10 blur-[120px]" aria-hidden="true" />

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] w-full opacity-50"
          viewBox="0 0 1440 620"
          fill="none"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path d="M-140 470C250 330 470 590 810 420C1090 280 1210 140 1580 200" stroke="url(#home-line-1)" strokeWidth="1.1" />
          <path d="M-90 560C310 410 520 660 880 490C1130 365 1260 235 1580 280" stroke="url(#home-line-2)" strokeWidth="0.8" opacity="0.6" />
          <defs>
            <linearGradient id="home-line-1" x1="0" y1="0" x2="1440" y2="620" gradientUnits="userSpaceOnUse">
              <stop stopColor="#008CFF" stopOpacity="0" />
              <stop offset="0.48" stopColor="#32B9FF" stopOpacity="0.45" />
              <stop offset="1" stopColor="#00CFA5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="home-line-2" x1="0" y1="0" x2="1440" y2="620" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00CFA5" stopOpacity="0" />
              <stop offset="0.55" stopColor="#008CFF" stopOpacity="0.3" />
              <stop offset="1" stopColor="#008CFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <Container className="relative pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
          <div className="mx-auto max-w-[780px] text-center">
            <h1 className="text-[34px] font-extrabold leading-[1.06] tracking-[-0.05em] text-white sm:text-[46px] lg:text-[56px]">
              Gestioná tu institución
              <br />
              <span className="text-cc-blue">de forma simple</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[760px] text-[15px] leading-7 text-cc-muted sm:text-[17px] sm:leading-8">
              Elegí el tipo de institución y descubrí todo lo que podés hacer con ClassClick.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-[1120px] gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-2 lg:gap-6">
            <div className="w-full">
              <InstitutionCard
                theme="educativa"
                title="Educativa"
                description="Colegios, institutos, academias y centros de formación."
                imageSrc="/landing/home-educativa-1600.webp"
                imageSrcSet="/landing/home-educativa-800.webp 800w, /landing/home-educativa-1600.webp 1600w"
                imageSizes="(min-width: 1024px) 560px, 100vw"
                imageAlt="Aula moderna con mesas, sillas y ventanales"
                to="/educativa"
                icon={GraduationCap}
              />
            </div>

            <div className="w-full">
              <InstitutionCard
                theme="deportiva"
                title="Deportiva"
                description="Clubes, academias, escuelas y organizaciones deportivas."
                imageSrc="/landing/home-deportiva-1600.webp"
                imageSrcSet="/landing/home-deportiva-800.webp 800w, /landing/home-deportiva-1600.webp 1600w"
                imageSizes="(min-width: 1024px) 560px, 100vw"
                imageAlt="Campo de fútbol con pelota y conos de entrenamiento"
                to="/deportiva"
                icon={PersonStanding}
              />
            </div>
          </div>

          <p className="mt-10 text-center text-[13px] font-light tracking-[0.01em] text-cc-muted sm:text-[14px]">
            Una plataforma. Dos realidades. Infinitas posibilidades.
          </p>
        </Container>
      </section>

      <AboutSection />
      <WhyChooseSection />
      <PlatformSection />
      <TechnologySection />
      <HomeFinalCta />
    </LandingLayout>
  )
}
