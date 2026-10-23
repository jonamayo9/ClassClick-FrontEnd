import { Link } from 'react-router-dom'
import { MessageCircle, Smartphone } from 'lucide-react'
import { SectionLink, whatsappLink } from './landing-ui'

const footerColumnClass = 'space-y-2.5'
const footerLinkClass =
  'block text-[12px] leading-5 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg'

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-landing-bg">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-7">
          <div className="col-span-2 lg:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
              aria-label="ClassClick, ir al inicio"
            >
              <img
                src="/icons/icon-512.png"
                width="36"
                height="36"
                alt=""
                className="h-9 w-9 rounded-lg border border-white/10 bg-[#0A1730] object-contain p-0.5"
                decoding="async"
              />
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-white">ClassClick</span>
            </Link>
            <p className="mt-4 max-w-xs text-[12px] leading-5 text-slate-400">
              Gestión para instituciones educativas y deportivas. Alumnos, cursos, cuotas, eventos e indumentaria en
              una sola plataforma.
            </p>
            <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-landing-cyan" aria-hidden="true" />
              <span>PWA: accedé desde el navegador e instalá ClassClick en tu dispositivo.</span>
            </div>
          </div>

          <div className={footerColumnClass}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Producto</h2>
            <SectionLink id="producto" className={footerLinkClass}>Funcionalidades</SectionLink>
            <SectionLink id="experiencia" className={footerLinkClass}>Experiencia</SectionLink>
            <SectionLink id="cobranza" className={footerLinkClass}>Cobranza</SectionLink>
            <SectionLink id="precios" className={footerLinkClass}>Precios</SectionLink>
          </div>

          <div className={footerColumnClass}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Educativa</h2>
            <SectionLink id="educativa-detalle" className={footerLinkClass}>Formaciones y comisiones</SectionLink>
            <SectionLink id="educativa-detalle" className={footerLinkClass}>Certificaciones</SectionLink>
            <SectionLink id="educativa-detalle" className={footerLinkClass}>Graduados</SectionLink>
            <SectionLink id="cobranza" className={footerLinkClass}>Pagos y cuotas</SectionLink>
          </div>

          <div className={footerColumnClass}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Deportiva</h2>
            <SectionLink id="deportiva-detalle" className={footerLinkClass}>Alumnos y disciplinas</SectionLink>
            <SectionLink id="deportiva-detalle" className={footerLinkClass}>Asistencia QR</SectionLink>
            <SectionLink id="eventos" className={footerLinkClass}>Eventos</SectionLink>
            <SectionLink id="producto" className={footerLinkClass}>Indumentaria</SectionLink>
          </div>

          <div className={footerColumnClass}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Contacto</h2>
            <a
              href={whatsappLink('Hola, quiero hablar con el equipo de ClassClick.')}
              target="_blank"
              rel="noopener noreferrer"
              className={`${footerLinkClass} inline-flex items-center gap-1.5`}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
            <Link to="/prueba-gratis" className={footerLinkClass}>Probar gratis</Link>
            <Link to="/login" className={footerLinkClass}>Ingresar</Link>
          </div>

          <div className={footerColumnClass}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Legales</h2>
            <Link to="/privacidad" className={footerLinkClass}>Privacidad</Link>
            <Link to="/terminos" className={footerLinkClass}>Términos</Link>
            <SectionLink id="faq" className={footerLinkClass}>Preguntas frecuentes</SectionLink>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ClassClick. Todos los derechos reservados.</p>
          <p>ClassClick no se distribuye en App Store ni Google Play.</p>
        </div>
      </div>
    </footer>
  )
}
