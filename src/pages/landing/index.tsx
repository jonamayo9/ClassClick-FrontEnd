import { Link } from 'react-router-dom'

const WHATSAPP = 'https://wa.me/5491140733436'
const contactText = encodeURIComponent('Hola, quiero hablar con ustedes sobre ClassClick.')

function publicPrice(value: string | undefined, fallback: string) {
  return value?.trim() ? `${value.trim()} / mes` : fallback
}

const screenshots = [
  {
    src: '/landing/admin-panel.png',
    role: 'Administrador',
    title: 'Gestión y cobranza',
    body: 'Alumnos, cursos, reportes, cuotas, vencimientos, comprobantes y configuración por módulos.',
    tint: 'from-violet-500 to-indigo-600',
  },
  {
    src: '/landing/student-panel.png',
    role: 'Alumno',
    title: 'Todo desde el celular',
    body: 'Carnet digital, pagos, cursos, documentos, novedades, sponsors, partidos e indumentaria.',
    tint: 'from-sky-500 to-blue-600',
  },
  {
    src: '/landing/teacher-panel.png',
    role: 'Docente',
    title: 'Docentes enfocados',
    body: 'Cursos, asistencia, materiales y muro de comunicación sin acceder a la gestión administrativa.',
    tint: 'from-emerald-500 to-teal-600',
  },
]

const modules = [
  { icon: '👥', title: 'Alumnos', desc: 'Altas, perfiles, importación por Excel, seguros, becas y asignación a uno o varios cursos.' },
  { icon: '📚', title: 'Cursos y docentes', desc: 'Cursos, frecuencias, precios, profesores, clases, materiales y comunicación centralizada.' },
  { icon: '✅', title: 'Asistencia', desc: 'Registro por curso para administradores y docentes, con consulta desde cada perfil.' },
  { icon: '💳', title: 'Cuotas automáticas', desc: 'Cuota mensual y otros tipos configurables, generación programada y detalle de cada concepto.' },
  { icon: '🎓', title: 'Becas y beneficios', desc: 'Becas, promociones y descuentos por hermanos aplicados según la configuración de cada cuota.' },
  { icon: '🧾', title: 'Pagos y comprobantes', desc: 'Transferencias, Mercado Pago, revisión de comprobantes, estados, recargos y reportes de cobranza.' },
  { icon: '📄', title: 'Legajos digitales', desc: 'Solicitud, carga, aprobación y vencimiento de documentación de cada alumno.' },
  { icon: '💬', title: 'Muro por curso', desc: 'Publicaciones, respuestas, imágenes, reacciones y visualización de quién participó.' },
  { icon: '🪪', title: 'Carnet y biometría', desc: 'Carnet digital en la app, acceso rápido y autenticación biométrica en dispositivos compatibles.' },
  { icon: '📣', title: 'Novedades y sponsors', desc: 'Anuncios institucionales, notificaciones y espacios para sponsors dentro de la experiencia del alumno.' },
  { icon: '👕', title: 'Indumentaria', desc: 'Catálogo, categorías, variantes, stock, pedidos, señas, comprobantes y entregas.' },
  { icon: '⚽', title: 'Actividad deportiva', desc: 'Partidos, rivales, sedes, convocatorias e información deportiva vinculada con los cursos.' },
]

const collectionFeatures = [
  'Precios por curso y frecuencia semanal.',
  'Tipos de cuota con conceptos y montos propios.',
  'Vencimientos y mora calculados en la fecha correcta.',
  'Becas, promociones y descuentos por hermanos.',
  'Comprobantes sujetos a revisión y trazabilidad del pago.',
  'Resumen de cobranza, filtros y exportación de reportes.',
]

const onboarding = [
  'Creamos tu empresa y dejamos el logo, colores y modulos activos.',
  'Cargamos cursos, profesores y alumnos para que arranques con datos reales.',
  'Configuramos cuotas, precios, vencimientos, becas, moras y medios de pago.',
  'Te acompanamos en los primeros 7 dias hasta que el flujo quede andando.',
]

const prices = [
  {
    name: 'Inicial',
    price: publicPrice(import.meta.env.VITE_PRICE_INITIAL, 'Consultar'),
    desc: 'Para escuelitas o academias que quieren ordenar alumnos, cursos y pagos.',
    items: ['Alumnos y cursos', 'Cuotas y comprobantes', 'Carnet digital', 'Soporte de arranque'],
  },
  {
    name: 'Pro',
    price: publicPrice(import.meta.env.VITE_PRICE_PRO, 'Consultar'),
    desc: 'Para instituciones que necesitan modulos avanzados y mas automatizacion.',
    items: ['Todo lo del Inicial', 'Documentos y legajos', 'Novedades y sponsors', 'Indumentaria'],
    featured: true,
  },
  {
    name: 'Institucional',
    price: publicPrice(import.meta.env.VITE_PRICE_INSTITUTIONAL, 'A medida'),
    desc: 'Para organizaciones con varias sedes, volumen alto o necesidades especiales.',
    items: ['Multiempresa', 'Configuracion personalizada', 'Acompanamiento prioritario', 'Roadmap por necesidades'],
  },
]

const commercialConditions = [
  { title: 'Prueba', text: '7 días sin cargo y sin tarjeta para solicitar el alta.' },
  { title: 'Activación', text: 'La suscripción comienza únicamente cuando confirmás el plan.' },
  { title: 'Facturación', text: 'Mensual, según cantidad de alumnos, sedes y módulos contratados.' },
  { title: 'Acompañamiento', text: 'Soporte durante la configuración inicial y canales de contacto disponibles.' },
]

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <HeroSection />
      <ProductShowcase />
      <ModulesSection />
      <CollectionsSection />
      <TrialSection />
      <PricingSection />
      <ContactSection />
    </main>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-[calc(92svh-4rem)] overflow-hidden text-white">
      <div className="absolute inset-0">
        <img src="/landing/hero-soccer.png" alt="" className="h-full w-full object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/48" />
        <div className="absolute inset-0 bg-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-start md:py-12 lg:py-14">
        <div>
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100 backdrop-blur">
            Gestion web + app instalable
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            Todo tu club en un solo lugar.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
            Gestiona alumnos, cursos, cuotas, comprobantes, carnet digital, docentes, documentos, novedades, sponsors e indumentaria desde una plataforma moderna para web y celular.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/prueba-gratis"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-500 px-7 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-400"
            >
              Proba gratis 7 dias
            </Link>
            <a
              href={`${WHATSAPP}?text=${contactText}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              Contactarse con nosotros
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
            {['Alta guiada', '7 dias sin cargo', 'Web + celular', 'Soporte inicial'].map((item) => (
              <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">{item}</span>
            ))}
          </div>
          <nav className="mt-8 border-t border-white/15 pt-5" aria-label="Secciones de ClassClick">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Conocé la plataforma</p>
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold">
              <a href="#producto" className="text-white transition hover:text-blue-300">Perfiles</a>
              <a href="#modulos" className="text-white transition hover:text-blue-300">Módulos</a>
              <a href="#cobranza" className="text-white transition hover:text-blue-300">Cobranza</a>
              <a href="#precios" className="text-white transition hover:text-blue-300">Precios</a>
              <a href="#contacto" className="text-white transition hover:text-blue-300">Contacto</a>
            </div>
          </nav>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[500px] md:block">
          <div className="absolute inset-6 rounded-[44px] bg-blue-500/20 blur-3xl" />
          <div className="relative grid grid-cols-[0.82fr_1fr] items-end gap-3 sm:gap-4">
            <PhoneMockup src="/landing/admin-panel.png" label="Admin" className="translate-y-6 rotate-[-4deg]" />
            <PhoneMockup src="/landing/student-panel.png" label="Alumno" className="z-10 scale-105" />
          </div>
        </div>
      </div>
    </section>
  )
}

function PhoneMockup({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-900 p-1.5 shadow-2xl ${className}`}>
      <img src={src} alt={`Pantalla ${label} de ClassClick`} className="max-h-[430px] w-full rounded-[22px] object-cover" />
      <div className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">
        {label}
      </div>
    </div>
  )
}

function ProductShowcase() {
  return (
    <section id="producto" className="bg-slate-950 py-10">
      <div className="mx-auto max-w-7xl px-5">
        <div className="max-w-3xl">
          <div className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Producto real</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Tres perfiles, una misma institucion funcionando.</h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            El administrador controla, el docente trabaja sus cursos y el alumno tiene una app clara para resolver todo sin escribirte por WhatsApp.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {screenshots.map((shot) => (
            <article key={shot.role} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-xl">
              <div className={`bg-gradient-to-br ${shot.tint} p-5`}>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">{shot.role}</div>
                <h3 className="mt-2 text-2xl font-black">{shot.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/85">{shot.body}</p>
              </div>
              <div className="bg-slate-900 p-4">
                <img src={shot.src} alt={`Vista ${shot.role} de ClassClick`} className="mx-auto max-h-[560px] rounded-lg border border-white/10 object-contain shadow-2xl" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ModulesSection() {
  return (
    <section id="modulos" className="bg-white py-16 text-slate-950 dark:bg-slate-950 dark:text-white md:py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">Módulos</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Mucho más que alumnos y cuotas.</h2>
          </div>
          <p className="text-base leading-8 text-slate-600 dark:text-slate-300">
            Cada institución habilita lo que necesita. La información se comparte entre módulos para evitar cargas duplicadas y mantener una única historia por alumno.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-2xl text-white dark:bg-slate-800">{item.icon}</div>
              <h3 className="mt-5 text-xl font-black">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CollectionsSection() {
  return (
    <section id="cobranza" className="bg-slate-100 py-16 text-slate-950 dark:bg-slate-900 dark:text-white md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Cobranza conectada</div>
          <h2 className="mt-3 text-3xl font-black sm:text-5xl">Desde el precio del curso hasta el pago confirmado.</h2>
          <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
            ClassClick genera, explica y sigue cada cuota. El administrador ve el detalle completo y el alumno entiende qué está pagando desde la misma aplicación.
          </p>
          <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {collectionFeatures.map((feature, index) => (
              <div key={feature} className="flex gap-4 py-3.5">
                <span className="font-black text-emerald-700 dark:text-emerald-300">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{feature}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <img src="/landing/admin-panel.png" alt="Panel de cobranza de ClassClick" className="mx-auto max-h-[680px] w-full object-contain" />
        </div>
      </div>
    </section>
  )
}

function TrialSection() {
  return (
    <section id="prueba" className="bg-blue-600 py-16 text-white md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.22em] text-blue-100">Prueba gratis</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">7 dias para dejar tu empresa andando.</h2>
          <p className="mt-5 text-base leading-8 text-blue-50">
            Te acompanamos en la configuracion inicial para que puedas probar ClassClick con datos reales: empresa, alumnos, cursos, cuotas, medios de pago y usuarios. Al finalizar la prueba, elegis el plan mensual que mejor se adapte a tu institucion.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/prueba-gratis" className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-sm font-black text-blue-700 shadow-xl transition hover:bg-blue-50">
              Proba gratis 7 dias
            </Link>
            <a href={`${WHATSAPP}?text=${contactText}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-7 py-4 text-sm font-black text-white transition hover:bg-white/10">
              Chat con nosotros
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-white">
          <div className="grid gap-3">
            {onboarding.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-black text-white">{index + 1}</div>
                <div>
                  <div className="text-sm font-black">Paso {index + 1}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section id="precios" className="bg-slate-100 py-16 text-slate-950 dark:bg-slate-950 dark:text-white md:py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">Precios</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Planes simples, segun el momento de tu institucion.</h2>
          <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
            Siete días sin cargo. Después elegís una configuración mensual acorde a la cantidad de alumnos, sedes y módulos que necesitás.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {prices.map((plan) => (
            <article data-plan={plan.name} key={plan.name} className={`rounded-lg border p-6 shadow-sm ${plan.featured ? 'border-blue-500 bg-slate-950 text-white shadow-2xl dark:bg-blue-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
              {plan.featured && <div className="mb-4 inline-flex rounded-full bg-blue-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">Recomendado</div>}
              <h3 className="text-2xl font-black">{plan.name}</h3>
              <div className="mt-4 text-4xl font-black">{plan.price}</div>
              <p className={`mt-3 text-sm leading-6 ${plan.featured ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>{plan.desc}</p>
              <ul className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm font-semibold">
                    <span className={plan.featured ? 'text-blue-300' : 'text-blue-600'}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/prueba-gratis" className={`mt-7 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-black transition ${plan.featured ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'}`}>
                Consultar plan
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          {commercialConditions.map((condition) => (
            <div key={condition.title} className="bg-white p-5 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">{condition.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{condition.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          El alcance final, los importes y cualquier servicio adicional se informan antes de activar la suscripción. Consultá los <Link to="/terminos" className="font-bold text-blue-700 hover:underline dark:text-blue-300">términos de uso</Link>.
        </p>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contacto" className="bg-slate-950 py-16 text-white md:py-24">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <div className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Hablemos</div>
        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Tu institucion puede estar operando en ClassClick esta semana.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">
          Te ayudamos a crear la empresa, cargar la base inicial, configurar cuotas y dejar a alumnos, docentes y administradores usando la plataforma.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/prueba-gratis" className="inline-flex items-center justify-center rounded-2xl bg-blue-500 px-7 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition hover:bg-blue-400">
            Proba gratis 7 dias
          </Link>
          <Link to="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white transition hover:bg-white/15">
            Ya soy cliente
          </Link>
        </div>
      </div>
    </section>
  )
}
