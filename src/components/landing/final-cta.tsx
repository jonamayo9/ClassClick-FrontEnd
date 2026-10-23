import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { primaryButtonClass, secondaryButtonClass, whatsappLink } from './landing-ui'

export function FinalCTA() {
  return (
    <section id="contacto" className="relative scroll-mt-24 overflow-hidden border-t border-white/[0.06] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(22,139,255,0.2),transparent_46%),radial-gradient(circle_at_82%_70%,rgba(129,60,255,0.13),transparent_34%)]" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-landing-cyan/40 to-transparent" />

      <div className="relative mx-auto max-w-[860px] px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-landing-border bg-white/[0.035] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-landing-cyan">
          Empezá por una conversación
        </span>
        <h2 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.04em] text-landing-text sm:text-[42px] lg:text-[52px]">
          Tu institución puede estar más ordenada.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-landing-muted sm:text-base">
          Solicitá una prueba guiada y te acompañamos en la configuración inicial de tu empresa, cursos, cuotas y
          usuarios.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/prueba-gratis" className={primaryButtonClass}>
            Probar gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={whatsappLink('Hola, quiero hablar con el equipo de ClassClick.')}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryButtonClass}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Hablar por WhatsApp
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          ¿Ya sos cliente?{' '}
          <Link to="/login" className="font-semibold text-landing-cyan transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg">
            Ingresá al panel
          </Link>
        </p>
      </div>
    </section>
  )
}
