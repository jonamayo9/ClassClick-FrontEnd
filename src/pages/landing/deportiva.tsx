import {
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  FileText,
  Shirt,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { Seo } from '@/components/seo'
import { LandingLayout } from '@/components/landing/site/landing-layout'
import { DivisionHero } from '@/components/landing/site/division-hero'
import {
  BenefitsGrid,
  DetailsSection,
  FinalCta,
  PlansSection,
  ResourcesSection,
} from '@/components/landing/site/division-sections'
import { divisionStyles } from '@/components/landing/site/theme'

const heroFeatures = [
  { icon: UsersRound, label: 'Socios' },
  { icon: Dumbbell, label: 'Disciplinas' },
  { icon: WalletCards, label: 'Cuotas' },
  { icon: UserRound, label: 'Entrenadores' },
  { icon: CalendarDays, label: 'Eventos' },
  { icon: Shirt, label: 'Indumentaria' },
]

const benefits = [
  {
    icon: Users,
    title: 'Más control',
    description: 'Gestioná socios, entrenamientos y competencias fácilmente.',
  },
  {
    icon: TrendingUp,
    title: 'Mayor compromiso',
    description: 'Mantené a tu comunidad siempre conectada e informada.',
  },
  {
    icon: Trophy,
    title: 'Crecé tu institución',
    description: 'Potenciá la organización y desarrollá nuevas oportunidades.',
  },
]

const details = [
  {
    icon: UsersRound,
    title: 'Gestión de socios',
    description: 'Centralizá perfiles, datos de contacto y vínculos familiares en un solo lugar.',
    tags: ['Socios', 'Familias', 'Perfiles'],
  },
  {
    icon: Dumbbell,
    title: 'Disciplinas',
    description: 'Organizá disciplinas, categorías, horarios y cupos de cada actividad.',
    tags: ['Categorías', 'Horarios', 'Cupos'],
  },
  {
    icon: UserRound,
    title: 'Profesores y entrenadores',
    description: 'Asigná responsables, coordiná actividades y registrá asistencias.',
    tags: ['Entrenadores', 'Asistencias', 'QR'],
  },
  {
    icon: WalletCards,
    title: 'Cuotas y pagos',
    description: 'Definí precios y vencimientos, registrá pagos y revisá comprobantes.',
    tags: ['Cuotas', 'Cobranza', 'Comprobantes'],
  },
  {
    icon: CalendarDays,
    title: 'Eventos',
    description: 'Publicá eventos, gestioná inscripciones y controlá el acceso con QR.',
    tags: ['Entradas', 'Inscripciones', 'Accesos'],
  },
  {
    icon: Shirt,
    title: 'Indumentaria',
    description: 'Mostrá el catálogo, organizá pedidos y seguí el estado de cada entrega.',
    tags: ['Catálogo', 'Stock', 'Pedidos'],
  },
  {
    icon: FileText,
    title: 'Documentación',
    description: 'Gestioná solicitudes, documentación y legajos de la institución.',
    tags: ['Documentos', 'Solicitudes', 'Legajos'],
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Reportes',
    description: 'Consultá reportes de gestión y exportá la información que necesitás.',
    tags: ['Reportes', 'Exportación', 'Gestión'],
  },
]

const faqs = [
  {
    question: '¿Cómo organizo socios, disciplinas y entrenadores?',
    answer:
      'Solicitás la prueba y coordinamos el alta de tu institución. Después definís las disciplinas, categorías, socios, entrenadores y usuarios iniciales con acompañamiento del equipo.',
  },
  {
    question: '¿Puedo gestionar cuotas, eventos e indumentaria?',
    answer:
      'Sí. ClassClick permite administrar cuotas y comprobantes, publicar eventos con control de acceso por QR y organizar el catálogo de indumentaria con pedidos y entregas.',
  },
  {
    question: '¿Cómo funciona la asistencia por QR?',
    answer:
      'La institución define las actividades y sus responsables. Las asistencias se registran desde la plataforma y pueden validarse mediante QR, dejando el historial disponible.',
  },
  {
    question: '¿ClassClick es una aplicación nativa?',
    answer:
      'No. ClassClick es una PWA: se usa desde el navegador y se puede instalar en el dispositivo. No se descarga desde App Store ni Google Play.',
  },
]

export function DeportivaLandingPage() {
  const styles = divisionStyles.deportiva

  return (
    <LandingLayout variant="division" division="deportiva">
      <Seo
        title="ClassClick Deportiva | Gestión para clubes e instituciones deportivas"
        description="Gestioná socios, disciplinas, entrenadores, cuotas, eventos e indumentaria en una sola plataforma. ClassClick Deportiva para clubes y academias."
        canonical="https://classclick.com.ar/deportiva"
        image="https://classclick.com.ar/landing/og-classclick.png"
        imageAlt="ClassClick Deportiva"
      />

      <DivisionHero
        theme="deportiva"
        eyebrow="Deportiva"
        title={
          <>
            Gestioná tu club o
            <br />
            <span className={styles.gradientText}>institución deportiva</span>
          </>
        }
        description="Socios, disciplinas, entrenadores, cuotas, eventos, indumentaria y mucho más. Una plataforma pensada para el mundo deportivo."
        imageDesktop="/landing/hero-deportiva-1600.webp"
        imageMobile="/landing/hero-deportiva-800.webp"
        imageAlt="Jugador de fútbol en acción sobre el césped al atardecer"
        imagePosition="object-[68%_center]"
        features={heroFeatures}
      />

      <BenefitsGrid
        theme="deportiva"
        eyebrow="Beneficios"
        title="Una gestión más simple, dentro y fuera de la cancha"
        description="Menos tareas sueltas y más tiempo para acompañar a tu comunidad deportiva."
        benefits={benefits}
      />

      <DetailsSection
        theme="deportiva"
        eyebrow="Módulos"
        title="Todo lo que podés gestionar"
        description="Las herramientas reales de ClassClick para la gestión diaria de clubes y organizaciones deportivas."
        items={details}
      />

      <PlansSection theme="deportiva" />

      <ResourcesSection
        theme="deportiva"
        eyebrow="Recursos"
        title="Lo importante, antes de empezar"
        description="Condiciones reales de uso, acceso y prueba. Si te queda una duda, podés escribirnos."
        faqs={faqs}
      />

      <FinalCta
        theme="deportiva"
        title="Tu club puede estar más ordenado."
        description="Solicitá una prueba guiada y te acompañamos en la configuración inicial de tu institución, disciplinas, cuotas y usuarios."
      />
    </LandingLayout>
  )
}
