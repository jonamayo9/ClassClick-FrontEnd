// Tipo de novedad ClassClick -> Administradores.
// El backend serializa el enum como string (JsonStringEnumConverter):
// "Update" | "Important" | "Maintenance" | "NewFeature".
// Se aceptan también números (1-4) por compatibilidad, igual que en PriceIncreases.

export const NEWS_TYPE_LABEL: Record<string, string> = {
  Update: 'Actualización',
  Important: 'Importante',
  Maintenance: 'Mantenimiento',
  NewFeature: 'Nueva función',
}

export const NEWS_TYPE_VARIANT: Record<string, 'violet' | 'warning' | 'default' | 'success'> = {
  Update: 'violet',
  Important: 'warning',
  Maintenance: 'default',
  NewFeature: 'success',
}

export const NEWS_TYPE_OPTIONS = [
  { value: 'Update', label: 'Actualización' },
  { value: 'Important', label: 'Importante' },
  { value: 'Maintenance', label: 'Mantenimiento' },
  { value: 'NewFeature', label: 'Nueva función' },
] as const

export type NewsTypeKey = keyof typeof NEWS_TYPE_LABEL

export function normalizeNewsType(value: string | number | null | undefined): NewsTypeKey {
  const s = String(value ?? '')
  switch (s) {
    case '1': return 'Update'
    case '2': return 'Important'
    case '3': return 'Maintenance'
    case '4': return 'NewFeature'
    default:
      return s in NEWS_TYPE_LABEL ? (s as NewsTypeKey) : 'Update'
  }
}