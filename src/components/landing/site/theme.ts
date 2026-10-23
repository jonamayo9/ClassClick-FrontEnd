export type DivisionTheme = 'educativa' | 'deportiva'

export interface DivisionThemeStyles {
  eyebrow: string
  accentText: string
  accentLightText: string
  iconTile: string
  gradientText: string
  primaryButton: string
  secondaryButton: string
  cardBorder: string
  cardHover: string
  cardGlow: string
  softBadge: string
  check: string
  line: string
  glow: string
  focusRing: string
}

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg'

export const divisionStyles: Record<DivisionTheme, DivisionThemeStyles> = {
  educativa: {
    eyebrow: 'border-cc-blue/25 bg-cc-blue/10 text-cc-blue-light',
    accentText: 'text-cc-blue',
    accentLightText: 'text-cc-blue-light',
    iconTile: 'border-cc-blue/25 bg-cc-blue/10 text-cc-blue-light',
    gradientText: 'bg-[linear-gradient(92deg,#32B9FF_0%,#008CFF_100%)] bg-clip-text text-transparent',
    primaryButton: `${buttonBase} bg-[linear-gradient(135deg,#0069D9_0%,#00A8FF_100%)] text-white shadow-[0_14px_38px_-16px_rgba(0,140,255,0.8)] hover:brightness-110 focus-visible:ring-cc-blue-light`,
    secondaryButton: `${buttonBase} border border-cc-blue/45 bg-white/[0.02] text-white hover:border-cc-blue hover:bg-cc-blue/10 focus-visible:ring-cc-blue-light`,
    cardBorder: 'border-cc-blue/35',
    cardHover: 'hover:border-cc-blue/70',
    cardGlow: 'hover:shadow-[0_24px_70px_-38px_rgba(0,140,255,0.7)]',
    softBadge: 'border-cc-blue/20 bg-cc-blue/[0.07] text-cc-blue-light',
    check: 'bg-cc-blue/15 text-cc-blue-light',
    line: 'via-cc-blue/60',
    glow: 'bg-[radial-gradient(circle,rgba(0,140,255,0.22),transparent_68%)]',
    focusRing: 'focus-visible:ring-cc-blue-light',
  },
  deportiva: {
    eyebrow: 'border-cc-green/25 bg-cc-green/10 text-cc-green-bright',
    accentText: 'text-cc-green',
    accentLightText: 'text-cc-green-bright',
    iconTile: 'border-cc-green/25 bg-cc-green/10 text-cc-green-bright',
    gradientText: 'bg-[linear-gradient(92deg,#00E6B2_0%,#00CFA5_100%)] bg-clip-text text-transparent',
    primaryButton: `${buttonBase} bg-[linear-gradient(135deg,#009E88_0%,#00D7B2_100%)] text-[#02231e] shadow-[0_14px_38px_-16px_rgba(0,207,165,0.75)] hover:brightness-110 focus-visible:ring-cc-green-bright`,
    secondaryButton: `${buttonBase} border border-cc-green/45 bg-white/[0.02] text-white hover:border-cc-green hover:bg-cc-green/10 focus-visible:ring-cc-green-bright`,
    cardBorder: 'border-cc-green/35',
    cardHover: 'hover:border-cc-green/70',
    cardGlow: 'hover:shadow-[0_24px_70px_-38px_rgba(0,207,165,0.65)]',
    softBadge: 'border-cc-green/20 bg-cc-green/[0.07] text-cc-green-bright',
    check: 'bg-cc-green/15 text-cc-green-bright',
    line: 'via-cc-green/60',
    glow: 'bg-[radial-gradient(circle,rgba(0,207,165,0.18),transparent_68%)]',
    focusRing: 'focus-visible:ring-cc-green-bright',
  },
}

export const plans = [
  {
    name: 'Inicial',
    envKey: 'VITE_PRICE_INITIAL' as const,
    fallback: 'Consultar',
    description: 'Para instituciones que quieren ordenar la gestión diaria y empezar a digitalizar.',
    items: ['Alumnos o socios', 'Cuotas y comprobantes', 'Carnet digital', 'Soporte de arranque'],
  },
  {
    name: 'Pro',
    envKey: 'VITE_PRICE_PRO' as const,
    fallback: 'Consultar',
    description: 'Para instituciones que necesitan módulos avanzados y más automatización.',
    items: ['Todo lo del plan Inicial', 'Documentación y legajos', 'Comunicaciones y eventos', 'Indumentaria'],
    featured: true,
  },
  {
    name: 'Institucional',
    envKey: 'VITE_PRICE_INSTITUTIONAL' as const,
    fallback: 'A medida',
    description: 'Para organizaciones con varias sedes, mayor volumen o necesidades especiales.',
    items: ['Multiempresa', 'Configuración personalizada', 'Acompañamiento prioritario', 'Alcance a medida'],
  },
]
