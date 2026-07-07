export function formatDisplayName(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim()
  if (!text) return fallback

  const spaced = text
    .replace(/[_-]+/g, ' ')
    .replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')

  return spaced.charAt(0).toLocaleUpperCase('es-AR') + spaced.slice(1)
}
