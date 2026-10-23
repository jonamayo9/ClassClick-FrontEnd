import {
  Award,
  BookOpen,
  CalendarCheck,
  ChartNoAxesCombined,
  Cloud,
  FileText,
  MessagesSquare,
  UserRound,
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
  { icon: UsersRound, label: 'Alumnos' },
  { icon: BookOpen, label: 'Cursos' },
  { icon: WalletCards, label: 'Cuotas' },
  { icon: UserRound, label: 'Docentes' },
  { icon: MessagesSquare, label: 'Comunicaciones' },
  { icon: ChartNoAxesCombined, label: 'Reportes' },
]

const benefits = [
  {
    icon: CalendarCheck,
    title: 'Más organización',
    description: 'Centralizá toda la gestión académica y administrativa.',
  },
  {
    icon: MessagesSquare,
    title: 'Mejor comunicación',
    description: 'Mantené a alumnos, familias y docentes siempre informados.',
  },
  {
    icon: Cloud,
    title: 'Todo en la nube',
    description: 'Accedé desde cualquier dispositivo, de forma segura y sin instalaciones.',
  },
]

const details = [
  {
    icon: UsersRound,
    title: 'Gestión de alumnos e inscripciones',
    description: 'Altas, legajos, familias y hermanos, con la información académica centralizada.',
    tags: ['Legajos', 'Inscripciones', 'Familias'],
  },
  {
    icon: BookOpen,
    title: 'Cursos y formaciones',
    description: 'Organizá formaciones, comisiones, horarios y cupos en una estructura clara.',
    tags: ['Comisiones', 'Horarios', 'Cupos'],
  },
  {
    icon: UserRound,
    title: 'Docentes y asistencias',
    description: 'Asigná docentes, registrá asistencias y consultá el historial de cada curso.',
    tags: ['Docentes', 'Asistencias', 'QR'],
  },
  {
    icon: WalletCards,
    title: 'Cuotas y pagos',
    description: 'Definí precios y vencimientos, registrá pagos y revisá comprobantes.',
    tags: ['Cuotas', 'Becas', 'Comprobantes'],
  },
  {
    icon: FileText,
    title: 'Comunicaciones y documentación',
    description: 'Publicá novedades y gestioná solicitudes y documentación de alumnos.',
    tags: ['Novedades', 'Documentos', 'Solicitudes'],
  },
  {
    icon: Award,
    title: 'Certificaciones y reportes',
    description: 'Acompañá el cierre de cursada con certificaciones, graduados y reportes.',
    tags: ['Certificados', 'Graduados', 'Reportes'],
  },
]

const faqs = [
  {
    question: '¿Cómo empiezo a ordenar los alumnos y los cursos?',
    answer:
      'Solicitás la prueba y coordinamos el alta de tu institución. Después definís la estructura inicial de formaciones, comisiones, alumnos y usuarios, con acompañamiento del equipo.',
  },
  {
    question: '¿Puedo gestionar cuotas, becas y comprobantes?',
    answer:
      'Sí. La institución define precios, vencimientos, becas y medios de pago. ClassClick permite registrar pagos, revisar comprobantes y consultar el estado de la cobranza.',
  },
  {
    question: '¿Cómo acceden docentes, alumnos y familias?',
    answer:
      'Cada institución administra sus usuarios y permisos. Las personas ingresan desde la pantalla de inicio de sesión y acceden únicamente a los módulos que les corresponden.',
  },
  {
    question: '¿ClassClick es una aplicación nativa?',
    answer:
      'No. ClassClick es una PWA: se usa desde el navegador y se puede instalar en el dispositivo. No se descarga desde App Store ni Google Play.',
  },
]

export function EducativaLandingPage() {
  const styles = divisionStyles.educativa

  return (
    <LandingLayout variant="division" division="educativa">
      <Seo
        title="ClassClick Educativa | Gestión para instituciones educativas"
        description="Gestioná alumnos, cursos, cuotas, docentes y comunicaciones en una sola plataforma. ClassClick Educativa para colegios, institutos y centros de formación."
        canonical="https://classclick.com.ar/educativa"
        image="https://classclick.com.ar/landing/og-classclick.png"
        imageAlt="ClassClick Educativa"
      />

      <DivisionHero
        theme="educativa"
        eyebrow="Educativa"
        title={
          <>
            Gestioná tu institución
            <br />
            educativa <span className={styles.gradientText}>en un solo lugar</span>
          </>
        }
        description="Alumnos, cursos, cuotas, docentes, comunicaciones, reportes y mucho más. Todo en una plataforma moderna, simple y segura."
        imageDesktop="/landing/hero-educativa-1600.webp"
        imageMobile="/landing/hero-educativa-800.webp"
        imageAlt="Estudiantes participando en una clase moderna con notebooks y levantando la mano"
        imagePosition="object-[64%_center]"
        features={heroFeatures}
      />

      <BenefitsGrid
        theme="educativa"
        eyebrow="Beneficios"
        title="Una gestión más simple, todos los días"
        description="Menos planillas sueltas y más tiempo para lo importante: enseñar y acompañar."
        benefits={benefits}
      />

      <DetailsSection
        theme="educativa"
        eyebrow="Módulos"
        title="Todo lo que podés gestionar"
        description="Las herramientas reales de ClassClick para la gestión académica y administrativa de tu institución."
        items={details}
      />

      <PlansSection theme="educativa" />

      <ResourcesSection
        theme="educativa"
        eyebrow="Recursos"
        title="Lo importante, antes de empezar"
        description="Condiciones reales de uso, acceso y prueba. Si te queda una duda, podés escribirnos."
        faqs={faqs}
      />

      <FinalCta
        theme="educativa"
        title="Tu institución educativa puede estar más ordenada."
        description="Solicitá una prueba guiada y te acompañamos en la configuración inicial de tu institución, cursos, cuotas y usuarios."
      />
    </LandingLayout>
  )
}
