import type { ReactNode } from 'react'
import { Check, Smartphone } from 'lucide-react'

export function NotebookFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[22px] border border-white/10 bg-[#0A1428] p-2 shadow-[0_36px_110px_-36px_rgba(22,139,255,0.55)]">
        <div className="overflow-hidden rounded-[15px] border border-white/[0.09] bg-[#061126]">
          <div className="flex h-7 items-center gap-2 border-b border-white/[0.07] bg-[#08142A] px-3">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]/80" />
            <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/80" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]/80" />
            <span className="ml-2 flex h-4 flex-1 items-center rounded-md border border-white/[0.06] bg-black/20 px-2 text-[8px] font-medium text-slate-500">
              classclick.com.ar
            </span>
          </div>
          <div className="aspect-[16/10]">{children}</div>
        </div>
      </div>
      <div className="mx-auto h-1.5 w-[26%] rounded-b-xl bg-white/[0.06]" />
    </div>
  )
}

export function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[2.2rem] border-[6px] border-[#0A1428] bg-[#030817] p-1 shadow-[0_26px_70px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-landing-surface">
          <div className="absolute left-1/2 top-1.5 z-10 h-1.5 w-[34%] -translate-x-1/2 rounded-full bg-black/80" />
          {children}
        </div>
      </div>
    </div>
  )
}

export function DesktopPreviewPlaceholder() {
  return (
    <div
      role="img"
      aria-label="Vista previa neutra del panel de ClassClick. Captura de escritorio real pendiente."
      className="flex h-full w-full bg-[#061126]"
    >
      <aside className="hidden w-[19%] shrink-0 flex-col gap-3 border-r border-white/[0.06] p-3 sm:flex" aria-hidden="true">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192.png" width="22" height="22" alt="" className="h-5 w-5 rounded-md border border-white/10" />
          <span className="h-1.5 w-14 rounded-full bg-white/10" />
        </div>
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${item === 1 ? 'border border-landing-blue/20 bg-landing-blue/10' : ''}`}>
              <span className={`h-4 w-4 rounded-md ${item === 1 ? 'bg-landing-blue/50' : 'bg-white/[0.06]'}`} />
              <span className={`h-1.5 rounded-full ${item === 1 ? 'w-14 bg-landing-cyan/50' : 'w-10 bg-white/[0.08]'}`} />
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 items-center justify-between border-b border-white/[0.06] px-3 sm:px-4" aria-hidden="true">
          <span className="h-1.5 w-20 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="h-5 w-14 rounded-md border border-white/[0.07] bg-white/[0.02]" />
            <span className="h-5 w-5 rounded-full bg-landing-blue/25" />
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-4" aria-hidden="true">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="h-2.5 w-32 rounded-full bg-white/15 sm:w-40" />
              <div className="mt-2 h-1.5 w-24 rounded-full bg-white/[0.07] sm:w-28" />
            </div>
            <div className="h-7 w-20 rounded-lg border border-landing-blue/20 bg-landing-blue/15" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-xl border border-white/[0.07] bg-landing-card/60 p-2.5 sm:p-3">
                <div className="h-1.5 w-12 rounded-full bg-white/10" />
                <div className="mt-3 h-3 w-16 rounded-full bg-white/15" />
                <div className="mt-2 h-1.5 w-10 rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-white/[0.07] bg-landing-card/50 p-3">
              <div className="flex items-center justify-between">
                <span className="h-1.5 w-20 rounded-full bg-white/10" />
                <span className="h-1.5 w-8 rounded-full bg-landing-cyan/25" />
              </div>
              <div className="mt-5 flex h-20 items-end gap-2">
                {[38, 55, 42, 72, 58, 84, 66, 92, 74, 88].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-landing-blue/20 to-landing-cyan/60"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-landing-card/50 p-3">
              <div className="h-1.5 w-16 rounded-full bg-white/10" />
              <div className="mt-3 space-y-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full bg-white/[0.06]" />
                    <span className="h-1.5 flex-1 rounded-full bg-white/[0.07]" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-white/[0.07] bg-landing-card/40 p-3">
            <div className="h-1.5 w-24 rounded-full bg-white/10" />
            <div className="mt-3 space-y-2">
              {[0, 1].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1/3 rounded-full bg-white/[0.08]" />
                  <span className="h-1.5 w-1/4 rounded-full bg-white/[0.05]" />
                  <span className="h-1.5 w-1/5 rounded-full bg-landing-blue/20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-10 hidden rounded-full border border-white/10 bg-landing-bg/80 px-2.5 py-1 text-[9px] font-medium text-slate-400 backdrop-blur sm:block">
        Captura desktop pendiente
      </div>
    </div>
  )
}

export function MobileProductDemo({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <picture>
        <source srcSet="/landing/mobile-demo.avif" type="image/avif" />
        <source srcSet="/landing/mobile-demo.webp" type="image/webp" />
        <img
          src="/landing/mobile-demo.webp"
          width="390"
          height="780"
          alt="Vista de demostración del panel docente de ClassClick"
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
      </picture>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#030817] via-[#030817]/50 to-transparent" />
      <div className="absolute bottom-3 left-1/2 flex w-[calc(100%-1rem)] -translate-x-1/2 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-landing-bg/75 px-2 py-1 text-[9px] font-semibold text-slate-200 backdrop-blur">
        <Smartphone className="h-3 w-3 text-landing-cyan" aria-hidden="true" />
        Demo del producto
      </div>
    </div>
  )
}

export function HeroMockups({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[680px] ${className}`}>
      <div className="pointer-events-none absolute -inset-8 rounded-[50%] bg-landing-blue/10 blur-[80px]" />

      <NotebookFrame className="relative z-10 w-[94%] sm:w-[95%]">
        <DesktopPreviewPlaceholder />
      </NotebookFrame>

      <div className="absolute -bottom-6 right-0 z-20 w-[29%] min-w-[108px] max-w-[178px] sm:-right-2 sm:bottom-[-22px] lg:-right-3 lg:bottom-[-28px]">
        <PhoneFrame>
          <div className="aspect-[9/19]">
            <MobileProductDemo className="h-full w-full" />
          </div>
        </PhoneFrame>
      </div>

      <div className="absolute -left-1 top-[42%] z-20 hidden items-center gap-1.5 rounded-full border border-landing-border bg-landing-surface/90 px-3 py-1.5 text-[10px] font-semibold text-slate-200 shadow-lg backdrop-blur sm:flex">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-landing-blue/20 text-landing-cyan">
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
        PWA instalable
      </div>

      <div className="absolute -right-2 top-8 z-20 hidden items-center gap-1.5 rounded-full border border-landing-border bg-landing-surface/90 px-3 py-1.5 text-[10px] font-semibold text-slate-200 shadow-lg backdrop-blur md:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Roles y permisos
      </div>
    </div>
  )
}
