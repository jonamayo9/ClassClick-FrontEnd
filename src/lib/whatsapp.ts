export function createWhatsAppUrl(e164: string | null | undefined, message?: string): string | null {
  if (!e164) return null
  const digits = e164.replace(/\D/g, '')
  if (digits.length < 8) return null
  const base = `https://wa.me/${digits}`
  if (message) return `${base}?text=${encodeURIComponent(message)}`
  return base
}
