import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const updatedAt = '30 de junio de 2026'

export function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" intro="Cómo ClassClick trata la información necesaria para operar la plataforma.">
      <Section title="1. Información que tratamos">
        <p>Podemos tratar datos de identificación y contacto, perfiles de acceso, información de alumnos y cursos, documentación cargada, comunicaciones, comprobantes de pago, preferencias y datos técnicos del dispositivo.</p>
      </Section>
      <Section title="2. Para qué usamos la información">
        <p>La utilizamos para prestar el servicio, autenticar usuarios, administrar instituciones, cursos y cuotas, enviar comunicaciones, brindar soporte, proteger las cuentas y mejorar el funcionamiento de ClassClick.</p>
      </Section>
      <Section title="3. Instituciones y datos de alumnos">
        <p>Cada institución decide qué información incorpora y quién puede acceder. Debe contar con las autorizaciones necesarias, especialmente cuando carga datos de menores de edad. ClassClick procesa esos datos para brindar las funciones contratadas.</p>
      </Section>
      <Section title="4. Proveedores y transferencias">
        <p>Podemos utilizar proveedores de infraestructura, correo, notificaciones y pagos. Solo reciben la información necesaria para cumplir su función y deben aplicar medidas de seguridad adecuadas.</p>
      </Section>
      <Section title="5. Conservación y seguridad">
        <p>Conservamos la información mientras la cuenta o la relación con la institución permanezca activa y durante el plazo necesario para cumplir obligaciones, resolver reclamos y mantener registros legítimos. Aplicamos controles de acceso y medidas técnicas razonables para reducir riesgos.</p>
      </Section>
      <Section title="6. Derechos y consultas">
        <p>Podés solicitar acceso, actualización o eliminación de tus datos. Cuando la información fue cargada por una institución, también podremos derivar la solicitud a su administrador para validar y resolver el pedido.</p>
      </Section>
      <Section title="7. Cambios">
        <p>Podemos actualizar esta política cuando cambie el servicio. La versión vigente se publica en esta página con su fecha de actualización.</p>
      </Section>
      <ContactLegal />
    </LegalPage>
  )
}

export function TermsPage() {
  return (
    <LegalPage title="Términos de uso" intro="Condiciones generales para utilizar ClassClick y sus aplicaciones.">
      <Section title="1. Servicio">
        <p>ClassClick ofrece herramientas para gestionar instituciones, usuarios, cursos, cuotas, documentación, comunicaciones y módulos relacionados. Las funciones disponibles dependen de la configuración y del plan contratado.</p>
      </Section>
      <Section title="2. Cuentas y accesos">
        <p>Los datos de registro deben ser correctos. Cada usuario debe proteger sus credenciales y avisar ante un acceso no autorizado. La institución administra roles, permisos e invitaciones dentro de su espacio.</p>
      </Section>
      <Section title="3. Prueba gratuita">
        <p>La prueba gratuita dura siete días corridos desde su activación, salvo que se informe una condición diferente. Al finalizar, puede limitarse la operación hasta contratar una suscripción. El acceso a soporte y a la información necesaria para decidir la contratación seguirá disponible.</p>
      </Section>
      <Section title="4. Suscripción y pagos">
        <p>El precio, alcance, impuestos y forma de pago se informan antes de contratar. La continuidad del servicio puede depender del pago de la suscripción. Los cobros gestionados por cada institución a sus alumnos son responsabilidad de esa institución y de los proveedores de pago intervinientes.</p>
      </Section>
      <Section title="5. Uso permitido">
        <p>No se permite vulnerar la seguridad, acceder a datos sin autorización, cargar contenido ilegal, interferir con el servicio ni utilizar ClassClick para afectar derechos de terceros.</p>
      </Section>
      <Section title="6. Contenido y propiedad">
        <p>La institución y sus usuarios conservan los derechos sobre la información que cargan. ClassClick conserva los derechos sobre la plataforma, su diseño, código, marca y documentación.</p>
      </Section>
      <Section title="7. Disponibilidad y cambios">
        <p>Trabajamos para mantener el servicio disponible, aunque pueden existir mantenimientos o interrupciones. Podemos mejorar o modificar funciones procurando no reducir de forma sustancial un servicio ya contratado sin comunicación previa.</p>
      </Section>
      <Section title="8. Suspensión y baja">
        <p>Una cuenta puede suspenderse por falta de pago, riesgos de seguridad o incumplimiento de estas condiciones. La institución puede solicitar la baja y coordinar el tratamiento de su información conforme las condiciones contratadas.</p>
      </Section>
      <ContactLegal />
    </LegalPage>
  )
}

function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const navigate = useNavigate()
  const titleParts = title.split(' ')
  const highlightedTitle = titleParts.pop()

  return (
    <section className="bg-slate-100 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 sm:py-16">
      <article className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Volver
          </button>
          <Link
            to="/"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ir al inicio
          </Link>
          <Link
            to="/prueba-gratis"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Probar gratis 7 días
          </Link>
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950 dark:text-white sm:text-5xl">
          {titleParts.join(' ')} <span className="text-blue-600 dark:text-blue-300">{highlightedTitle}</span>
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{intro}</p>
        <p className="mt-2 text-xs font-semibold uppercase text-slate-400">Última actualización: {updatedAt}</p>
        <div className="mt-10 space-y-8">{children}</div>
      </article>
    </section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  )
}

function ContactLegal() {
  return (
    <Section title="Contacto">
      <p>
        Para consultas sobre estas condiciones o sobre privacidad, escribinos por{' '}
        <a className="font-bold text-blue-700 hover:underline dark:text-blue-300" href="https://wa.me/5491140733436" target="_blank" rel="noreferrer">WhatsApp</a>.
      </p>
    </Section>
  )
}
