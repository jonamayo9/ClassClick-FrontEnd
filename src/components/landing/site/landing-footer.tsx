import { Link } from 'react-router-dom'
import { MessageCircle, Smartphone } from 'lucide-react'
import { HashLink } from './primitives'
import { whatsappLink } from './landing-utils'
import type { DivisionTheme } from './theme'

const footerLinkClass =
  'block text-[12px] leading-5 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg'

const footerHeadingClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300'

function FooterBrand() {
  return (
    <>
      <Link
        to="/"
        className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
        aria-label="ClassClick, ir al inicio"
      >
        <img
          src="/icons/icon-512.png"
          srcSet="/icons/icon-192.png 1x, /icons/icon-512.png 2x"
          width="40"
          height="40"
          alt=""
          className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow-lg"
          decoding="async"
          loading="lazy"
        />
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold tracking-[-0.02em] text-white">ClassClick</span>
          <span className="block text-[10.5px] font-medium text-slate-400">Tu institución, más simple</span>
        </span>
      </Link>
    </>
  )
}

function HomeFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-cc-bg">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <FooterBrand />
            <p className="mt-4 max-w-xs text-[12px] leading-5 text-slate-400">
              ClassClick reúne la gestión educativa y deportiva en una plataforma simple, moderna y segura.
            </p>
            <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cc-blue-light" aria-hidden="true" />
              <span>ClassClick es una PWA: se usa desde el navegador y se puede instalar en tu dispositivo.</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h2 className={footerHeadingClass}>Plataforma</h2>
            <Link to="/" className={footerLinkClass}>Inicio</Link>
            <Link to="/educativa" className={footerLinkClass}>Educativa</Link>
            <Link to="/deportiva" className={footerLinkClass}>Deportiva</Link>
            <Link to="/educativa#precios" className={footerLinkClass}>Precios</Link>
          </div>

          <div className="space-y-2.5">
            <h2 className={footerHeadingClass}>Información</h2>
            <HashLink id="sobre-classclick" className={footerLinkClass}>Sobre ClassClick</HashLink>
            <HashLink id="tecnologia" className={footerLinkClass}>Tecnología</HashLink>
            <Link to="/educativa#recursos" className={footerLinkClass}>Recursos</Link>
            <Link to="/privacidad" className={footerLinkClass}>Privacidad</Link>
            <Link to="/terminos" className={footerLinkClass}>Términos</Link>
          </div>

          <div className="space-y-2.5">
            <h2 className={footerHeadingClass}>Contacto</h2>
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
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ClassClick. Todos los derechos reservados.</p>
          <p>PWA. No se distribuye en App Store ni Google Play.</p>
        </div>
      </div>
    </footer>
  )
}

function DivisionFooter({ division }: { division: DivisionTheme }) {
  return (
    <footer className="border-t border-white/[0.06] bg-cc-bg">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <FooterBrand />
            <p className="mt-4 max-w-xs text-[12px] leading-5 text-slate-400">
              Gestión para instituciones educativas y deportivas. Una plataforma simple para ordenar el día a día.
            </p>
            <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cc-blue-light" aria-hidden="true" />
              <span>ClassClick es una PWA: se usa desde el navegador y se puede instalar en tu dispositivo.</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h2 className={footerHeadingClass}>Navegación</h2>
            <Link to="/" className={footerLinkClass}>Inicio</Link>
            <Link to="/educativa" className={footerLinkClass}>Educativa</Link>
            <Link to="/deportiva" className={footerLinkClass}>Deportiva</Link>
            <Link to="/prueba-gratis" className={footerLinkClass}>Probar gratis</Link>
          </div>

          <div className="space-y-2.5">
            <h2 className={footerHeadingClass}>En esta página</h2>
            <HashLink id="funcionalidades" path={`/${division}`} className={footerLinkClass}>
              Funcionalidades
            </HashLink>
            <HashLink id="precios" path={`/${division}`} className={footerLinkClass}>
              Precios
            </HashLink>
            <HashLink id="recursos" path={`/${division}`} className={footerLinkClass}>
              Recursos
            </HashLink>
          </div>

          <div className="space-y-2.5">
            <h2 className={footerHeadingClass}>Contacto</h2>
            <a
              href={whatsappLink('Hola, quiero hablar con el equipo de ClassClick.')}
              target="_blank"
              rel="noopener noreferrer"
              className={`${footerLinkClass} inline-flex items-center gap-1.5`}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
            <Link to="/login" className={footerLinkClass}>Ingresar</Link>
            <Link to="/privacidad" className={footerLinkClass}>Privacidad</Link>
            <Link to="/terminos" className={footerLinkClass}>Términos</Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ClassClick. Todos los derechos reservados.</p>
          <p>PWA. No se distribuye en App Store ni Google Play.</p>
        </div>
      </div>
    </footer>
  )
}

export function LandingFooter({ division }: { division?: DivisionTheme }) {
  if (division) return <DivisionFooter division={division} />
  return <HomeFooter />
}
