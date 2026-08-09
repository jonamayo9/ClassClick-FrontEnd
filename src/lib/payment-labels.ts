// Etiquetas centralizadas del origen de un pago (cómo ingresó al sistema).
// NO deducir el texto sólo desde PaymentMethod.
// El backend serializa PaymentOrigin como enum string ("Manual") por JsonStringEnumConverter;
// se aceptan también valores numéricos (datos viejos) y null/undefined.
const ORIGIN_NAMES: Record<number, string> = {
  0: 'Unknown',
  1: 'Manual',
  2: 'MercadoPagoCheckout',
  3: 'MercadoPagoSync',
  4: 'TransferProof',
  5: 'Cash',
  6: 'Other',
}

const ORIGIN_LABELS: Record<string, string> = {
  Unknown: 'Origen del pago no disponible',
  Manual: 'Pago manual',
  MercadoPagoCheckout: 'Checkout Pro',
  MercadoPagoSync: 'Sincronización de Mercado Pago',
  TransferProof: 'Pagado con Transferencia bancaria',
  Cash: 'Pago en efectivo',
  Other: 'Origen del pago no disponible',
}

const METHOD_LABELS: Record<string, string> = {
  '0': 'Sin medio',
  '1': 'Transferencia bancaria',
  Transfer: 'Transferencia bancaria',
  '2': 'Tarjeta de débito',
  DebitCard: 'Tarjeta de débito',
  '3': 'Tarjeta de crédito',
  CreditCard: 'Tarjeta de crédito',
  '4': 'Mercado Pago',
  MercadoPago: 'Mercado Pago',
  '5': 'Efectivo',
  Cash: 'Efectivo',
}

function resolvePaymentOriginName(origin: number | string | null | undefined): string {
  if (origin === null || origin === undefined || origin === '') return 'Unknown'
  const numeric = Number(origin)
  if (!Number.isNaN(numeric)) return ORIGIN_NAMES[numeric] ?? 'Unknown'
  return String(origin)
}

export function paymentOriginName(origin: number | string | null | undefined): string {
  return resolvePaymentOriginName(origin)
}

export function paymentOriginLabel(origin: number | string | null | undefined): string {
  const name = resolvePaymentOriginName(origin)
  return ORIGIN_LABELS[name] ?? 'Origen del pago no disponible'
}

export function paymentMethodLabel(method: number | string | null | undefined): string {
  if (method === null || method === undefined || method === '') return 'Sin medio'
  return METHOD_LABELS[String(method)] ?? 'Otro'
}
