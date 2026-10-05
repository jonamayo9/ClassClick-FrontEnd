export type RefundBannerState = 'Refunded' | 'Partial' | 'Pending' | 'Failed'

/** Extrae el detalle del reembolso más reciente desde los pagos del pedido. */
export function latestRefundDetail(payments: { refundState?: string | number | null; refundedAtUtc?: string | null; refundNote?: string | null }[]) {
  const withRefund = (payments ?? []).filter(
    (p) => p.refundState != null && String(p.refundState) !== 'None',
  )
  const sorted = [...withRefund].sort((a, b) =>
    (b.refundedAtUtc ?? '').localeCompare(a.refundedAtUtc ?? ''),
  )
  const top = sorted[0]
  return {
    refundedAtUtc: top?.refundedAtUtc ?? null,
    note: top?.refundNote ?? null,
  }
}