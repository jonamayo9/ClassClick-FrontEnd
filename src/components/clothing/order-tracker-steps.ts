export interface OrderTrackerData {
  status?: string | number | null
  deliveryStatus?: string | number | null
  deliveryMethod?: string | number | null
  paid?: number
  balance?: number
  orderRefundState?: string | null
  totalRefunded?: number
}

export type TrackerStepState = 'completed' | 'current' | 'pending'

export interface TrackerStep {
  key: string
  label: string
  hint?: string
  hintTone?: 'default' | 'warn'
  state: TrackerStepState
}

function toStr(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

/**
 * Deriva los 4 pasos del seguimiento únicamente a partir de estados reales del backend:
 * pagos aprobados, estado logístico (DeliveryStatus) y método de entrega.
 * Nunca simula avances: los pasos se completan solo cuando el backend lo confirma.
 */
export function buildOrderTrackerSteps(order: OrderTrackerData): TrackerStep[] {
  const status = toStr(order.status)
  const ds = toStr(order.deliveryStatus)
  const method = toStr(order.deliveryMethod)
  const paid = order.paid ?? 0
  const balance = order.balance ?? 0
  const orderRefundState = toStr(order.orderRefundState)
  const totalRefunded = order.totalRefunded ?? 0
  const isHomeDelivery = method === 'HomeDelivery'

  const delivered = status === 'Delivered' || ds === 'Delivered'
  // Un pedido totalmente reembolsado se muestra como historial: el pago fue aprobado
  // en su momento y no hay ninguna etapa activa esperando al alumno.
  const fullyRefunded = orderRefundState === 'Refunded'
  const paymentComplete = fullyRefunded ? paid > 0 || totalRefunded > 0 : paid > 0
  const inPreparation =
    ds === 'InPreparation' || ds === 'ReadyForPickup' || ds === 'ReadyForDispatch' || ds === 'InTransit' || delivered
  // Envío a domicilio: el paso "listo" se completa recién cuando se despachó/en tránsito.
  // Retiro: se completa cuando está listo para entregar. Nunca se confunde con "Entregado".
  const ready = isHomeDelivery
    ? ds === 'InTransit' || delivered
    : ds === 'ReadyForPickup' || delivered

  const completed = [paymentComplete, inPreparation, ready, delivered]
  // Reembolsado total: el pedido no es una compra activa → sin paso "actual" destacado.
  const currentIndex = fullyRefunded ? -1 : completed.findIndex((c) => !c)

  const step3Label = isHomeDelivery
    ? ds === 'InTransit' || delivered
      ? 'En tránsito'
      : 'Listo para enviar'
    : 'Listo para entregar'

  const step3Hint = isHomeDelivery
    ? ds === 'InTransit' || delivered
      ? 'Tu pedido viaja hacia tu domicilio'
      : 'Listo para despacho'
    : 'Retirá en la institución'

  const hints: (TrackerStep['hint'] | undefined)[] = [
    paid > 0 && balance > 0 ? 'Saldo pendiente por abonar' : undefined,
    undefined,
    step3Hint,
    undefined,
  ]
  const hintTones: (TrackerStep['hintTone'] | undefined)[] = [
    paid > 0 && balance > 0 ? 'warn' : undefined,
    undefined,
    undefined,
    undefined,
  ]

  const base: { key: string; label: string }[] = [
    { key: 'payment', label: 'Pago aprobado' },
    { key: 'preparation', label: 'En preparación' },
    { key: 'ready', label: step3Label },
    { key: 'delivered', label: 'Entregado' },
  ]

  return base.map((step, i) => ({
    key: step.key,
    label: step.label,
    hint: hints[i],
    hintTone: hintTones[i],
    state: (completed[i] ? 'completed' : i === currentIndex ? 'current' : 'pending') as TrackerStepState,
  }))
}

/** El seguimiento solo tiene sentido en pedidos activos o entregados. */
export function isOrderTrackerVisible(status: string | number | null | undefined): boolean {
  const s = toStr(status)
  return !['Cancelled', 'Expired', 'Rejected'].includes(s)
}