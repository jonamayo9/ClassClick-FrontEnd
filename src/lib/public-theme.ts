export interface PublicThemeColors {
  primary: string
  secondary: string
  accent: string
  bg: string
  text: string
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b }
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b > 150
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function mixHex(a: string, b: string, weight: number): string {
  const ca = hexToRgb(a) ?? { r: 255, g: 255, b: 255 }
  const cb = hexToRgb(b) ?? { r: 0, g: 0, b: 0 }
  const w = Math.max(0, Math.min(1, weight))
  const r = Math.round(ca.r + (cb.r - ca.r) * w)
  const g = Math.round(ca.g + (cb.g - ca.g) * w)
  const bl = Math.round(ca.b + (cb.b - ca.b) * w)
  return `rgb(${r}, ${g}, ${bl})`
}

export interface ResolvedPublicTheme {
  colors: PublicThemeColors
  isLight: boolean
  surface: string
  surfaceBorder: string
  placeholderBg: string
  textMuted: string
  textFaint: string
  onAccent: string
}

/**
 * Deriva tokens de contraste a partir de la paleta de la Página Pública.
 * En temas claros las cards usan blanco; en temas oscuros se genera una
 * superficie ligeramente más clara que el fondo general para mantener
 * el contraste sin hardcodear colores fijos.
 */
export function resolvePublicTheme(colors: PublicThemeColors): ResolvedPublicTheme {
  const isLight = isLightColor(colors.bg)

  return {
    colors,
    isLight,
    surface: isLight ? '#ffffff' : mixHex(colors.bg, '#ffffff', 0.10),
    surfaceBorder: isLight ? withAlpha(colors.primary, 0.18) : 'rgba(255, 255, 255, 0.14)',
    placeholderBg: isLight ? '#f1f5f9' : mixHex(colors.bg, '#ffffff', 0.06),
    textMuted: withAlpha(colors.text, 0.75),
    textFaint: withAlpha(colors.text, 0.6),
    onAccent: isLightColor(colors.accent) ? '#0f172a' : '#ffffff',
  }
}
