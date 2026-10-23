import { ChevronDown } from 'lucide-react'
import { Section, SectionHeader, whatsappLink } from './landing-ui'

const faqs = [
  {
    question: '¿Cómo solicito la prueba gratis?',
    answer:
      'Completás el formulario y coordinamos el alta de tu institución. La prueba es guiada: no es un registro automático. Te acompañamos con la configuración inicial para que puedas probar ClassClick con datos reales.',
  },
  {
    question: '¿ClassClick es una aplicación nativa?',
    answer:
      'No. ClassClick es una PWA: se usa desde el navegador y se puede instalar en el dispositivo. No se descarga desde App Store ni Google Play.',
  },
  {
    question: '¿Cómo acceden alumnos, docentes y administradores?',
    answer:
      'Cada institución crea y administra sus usuarios. Las personas ingresan con sus credenciales desde la pantalla de inicio de sesión. Los permisos y módulos disponibles dependen de la configuración de la institución.',
  },
  {
    question: '¿Cómo se gestionan las cuotas y los pagos?',
    answer:
      'La institución define precios, vencimientos, becas y medios de pago. ClassClick permite generar cuotas, registrar pagos, revisar comprobantes y consultar el estado de la cobranza.',
  },
  {
    question: '¿Qué incluye la propuesta Educativa y la Deportiva?',
    answer:
      'Educativa incluye formaciones, comisiones, inscripciones, docentes, asistencias, certificaciones, graduados, pagos y permisos. Deportiva incluye alumnos, disciplinas, profesores, cuotas, asistencia QR, carnet, eventos e indumentaria.',
  },
  {
    question: '¿Puedo personalizar la página pública de mi institución?',
    answer:
      'Sí. La página pública permite configurar logo, colores, contenido, actividades, galería y canales de contacto. Es una página propia de la institución dentro de ClassClick.',
  },
  {
    question: '¿Qué soporte hay durante la implementación?',
    answer:
      'La prueba incluye acompañamiento en la configuración inicial y un canal de contacto por WhatsApp. El alcance del soporte y los tiempos se confirman antes de activar la suscripción.',
  },
]

export function FAQSection() {
  return (
    <Section id="faq" className="relative py-14 sm:py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-14">
        <div>
          <SectionHeader
            eyebrow="Preguntas frecuentes"
            title="Lo importante, antes de empezar"
            description="Condiciones reales de uso, acceso y prueba. Si te queda una duda, podés escribirnos."
          />
          <a
            href={whatsappLink('Hola, tengo una consulta sobre ClassClick.')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex text-sm font-semibold text-landing-cyan transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
          >
            Hacer una consulta por WhatsApp
          </a>
        </div>

        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-[14px] font-semibold leading-6 text-landing-text sm:text-[15px]">{faq.question}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-landing-border bg-white/[0.03] text-slate-400 transition group-open:rotate-180 group-open:border-landing-blue/40 group-open:text-landing-cyan">
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </summary>
              <div className="pb-5 pr-10 text-[13px] leading-6 text-landing-muted">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}
