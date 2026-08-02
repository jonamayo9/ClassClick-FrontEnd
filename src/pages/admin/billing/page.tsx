import { useRef, useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiError, apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { statusLabel, paymentMethodLabel } from '@/pages/superadmin/billing.types'
import { BillingPeriodDetail } from '@/components/billing/billing-period-detail'
import { BillingProofPreviewModal, type BillingProofViewPayload } from '@/components/billing/billing-proof-preview-modal'
import {
  useAdminBillingOverview,
  useAdminBillingUsageDetail,
  useBillingPaymentOptions,
  useUploadBillingProof,
  type AdminBillingInvoice,
  type BillingPaymentOption,
} from './hooks'

const STATUS_VARIANT: Record<number, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'violet'> = {
  1: 'default',
  2: 'info',
  3: 'warning',
  4: 'violet',
  5: 'success',
  6: 'danger',
  7: 'default',
}

const FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function fmt(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-AR')
}

function BillingInner() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const pageSize = 15

  const { data: overview, isLoading } = useAdminBillingOverview(page, pageSize)

  const [detail, setDetail] = useState<AdminBillingInvoice | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payInvoice, setPayInvoice] = useState<AdminBillingInvoice | null>(null)
  const [payMethod, setPayMethod] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [proofPreview, setProofPreview] = useState<AdminBillingInvoice | null>(null)

  const uploadMutation = useUploadBillingProof()
  const usageDetail = useAdminBillingUsageDetail(detail?.id ?? null)
  const payOptions = useBillingPaymentOptions(payInvoice?.id ?? null)

  const plan = overview?.plan
  const current = overview?.currentInvoice ?? null
  const slug = useAuth((s) => s.activeCompanySlug ?? '')

  const isUsageBased = plan?.billingMode === 2
  const hasAnyInvoice = !!current || (overview?.history.length ?? 0) > 0
  const isPayable = !!current && (current.statusValue === 2 || current.statusValue === 3 || current.statusValue === 6)

  function openPay() {
    if (!current) return
    setPayInvoice(current)
    setPayMethod(null)
    setFile(null)
    setPayOpen(true)
  }

  function submitPayProof() {
    if (!payInvoice) return
    if (!file || !(file instanceof File) || file.size <= 0) {
      toast('Seleccioná un comprobante antes de continuar.', 'error')
      return
    }
    uploadMutation.mutate(
      { invoiceId: payInvoice.id, file },
      {
        onSuccess: () => {
          toast('Comprobante recibido. Está siendo revisado.')
          setPayOpen(false)
          setPayInvoice(null)
          setFile(null)
        },
        onError: (err) => {
          if (import.meta.env.DEV) console.error('[billing] Error subiendo comprobante', err)
          toast('No pudimos enviar el comprobante. Verificá el archivo e intentá nuevamente.', 'error')
        },
      },
    )
  }

  function openProofPreview(invoice: AdminBillingInvoice) {
    setProofPreview(invoice)
  }

  async function downloadPdf(invoice: AdminBillingInvoice) {
    try {
      const blob = await apiService.getBlob(`/api/admin/${slug}/billing/invoices/${invoice.id}/download/pdf`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `billing-ClassClick-${slug}-${invoice.periodYear}-${String(invoice.periodMonth).padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(getApiError(err), 'error')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-slate-600" /></div>
  }

  const history = overview?.history ?? []
  const options = payOptions.data?.options ?? []

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Plan y facturación</h1>
        <p className="mt-1 text-sm text-slate-400">Cargo mensual de ClassClick hacia tu institución</p>
      </div>

      {!hasAnyInvoice ? (
        <Card className="p-6">
          <p className="text-center text-sm text-slate-400">Todavía no hay cargos emitidos para tu institución.</p>
        </Card>
      ) : current ? (
        <>
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Cargo de ClassClick — período {current.period}</h2>
              <Badge variant={STATUS_VARIANT[current.statusValue] ?? 'default'}>{statusLabel(current.status)}</Badge>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Vence: <span className="font-semibold">{fmt(current.dueDateUtc)}</span>
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              <DetailRow label="Importe base" value={FMT.format(current.baseAmount)} />
              <DetailRow label="Usuarios adicionales" value={current.extraUsers > 0 ? String(current.extraUsers) : 'Sin usuarios adicionales'} />
              <DetailRow label="Importe extra" value={FMT.format(current.extraAmount)} />
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total a pagar</p>
              <p className="text-2xl font-black text-emerald-600">{FMT.format(current.amountWithLateFee || current.totalAmount)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isPayable ? (
                <Button size="sm" onClick={openPay} className="bg-emerald-600 text-white hover:bg-emerald-700">Pagar</Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setDetail(current)}>Ver detalle</Button>
              <Button variant="outline" size="sm" onClick={() => downloadPdf(current)}>Descargar PDF</Button>
              {current.hasPaymentProof && (
                <Button variant="outline" size="sm" onClick={() => openProofPreview(current)}>Ver comprobante</Button>
              )}
            </div>

            {current.statusValue === 4 && (
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Comprobante recibido. Está siendo revisado.</p>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-6">
          <p className="text-center text-sm text-slate-400">No hay cargos pendientes. Podés revisar el historial.</p>
        </Card>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Historial</h2>
            {history.length > 3 && (
              <Button variant="outline" size="sm" onClick={() => setShowAllHistory(!showAllHistory)}>
                {showAllHistory ? 'Ver menos' : 'Ver historial completo'}
              </Button>
            )}
          </div>

          <div className="space-y-2 md:hidden">
            {(showAllHistory ? history : history.slice(0, 3)).map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{inv.period}</span>
                  <Badge variant={STATUS_VARIANT[inv.statusValue] ?? 'default'}>{statusLabel(inv.status)}</Badge>
                </div>
                <p className="mt-1 text-sm font-black">{FMT.format(inv.amountWithLateFee || inv.totalAmount)}</p>
                <p className="text-xs text-slate-400">Vence {fmt(inv.dueDateUtc)} · {paymentMethodLabel(inv.paymentMethod) ?? '—'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetail(inv)}>Ver</Button>
                  {inv.hasPaymentProof && (
                    <Button variant="outline" size="sm" onClick={() => openProofPreview(inv)}>Ver comprobante</Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Vencimiento</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Medio</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {(showAllHistory ? history : history.slice(0, 3)).map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">{inv.period}</td>
                    <td className="px-3 py-2 font-medium">{FMT.format(inv.amountWithLateFee || inv.totalAmount)}</td>
                    <td className="px-3 py-2">{fmt(inv.dueDateUtc)}</td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[inv.statusValue] ?? 'default'}>{statusLabel(inv.status)}</Badge></td>
                    <td className="px-3 py-2">{paymentMethodLabel(inv.paymentMethod) ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setDetail(inv)}>Ver</Button>
                        {inv.hasPaymentProof && (
                          <Button variant="outline" size="sm" onClick={() => openProofPreview(inv)}>Ver comprobante</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Pagar cargo */}
      {payOpen && payInvoice && (
        <Modal open onClose={() => setPayOpen(false)} title="Pagar cargo" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <p className="text-xs text-slate-500">Período {payInvoice.period}</p>

            {payOptions.isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-slate-400" /></div>
            ) : options.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No hay medios de pago disponibles.</p>
            ) : (
              <div className="space-y-2">
                {options.map((opt) => (
                  <div key={opt.paymentMethod} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between"
                      onClick={() => setPayMethod(opt.paymentMethod)}
                    >
                      <span className="text-sm font-semibold">{opt.displayName}</span>
                      <span className="text-sm font-black">{FMT.format(opt.totalAmount)}</span>
                    </button>

                    {payMethod === opt.paymentMethod && (
                      <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {opt.paymentMethod === 'Transfer' ? (
                          <TransferDetails option={opt} payInvoice={payInvoice} file={file} setFile={setFile} submitting={uploadMutation.isPending} onSubmit={submitPayProof} />
                        ) : (
                          <div className="space-y-2">
                            <DetailRow label="Importe original" value={FMT.format(payOptions.data?.amountWithLateFee ?? opt.totalAmount)} />
                            {opt.surchargeAmount > 0 && <DetailRow label="Recargo Mercado Pago" value={FMT.format(opt.surchargeAmount)} />}
                            <DetailRow label="Total" value={FMT.format(opt.totalAmount)} />
                            <Button size="sm" disabled className="w-full bg-blue-600 text-white hover:bg-blue-700">Pagar con Mercado Pago</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Detalle */}
      {detail && (
        <Modal open onClose={() => setDetail(null)} title={`Factura ${detail.invoiceNumber}`} className="sm:max-w-2xl">
          <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <DetailRow label="Período" value={detail.period} />
              <DetailRow label="Estado" value={statusLabel(detail.status)} />
              <DetailRow label="Número interno" value={detail.invoiceNumber} />
              <DetailRow label="Concepto" value={detail.description} />
              <DetailRow label="Emisión" value={fmt(detail.issuedAtUtc)} />
              <DetailRow label="Vencimiento" value={fmt(detail.dueDateUtc)} />
              <DetailRow label="Referencia de pago" value={detail.paymentReference} />
              <DetailRow label="Observaciones" value={detail.notes} />
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <BillingPeriodDetail
                period={detail.period}
                billableUsers={detail.billableUsers}
                extraUsers={detail.extraUsers}
                basePrice={detail.baseAmount}
                extraChargeMode={detail.extraChargeMode}
                extraUserPrice={detail.extraUserPrice}
                extraFixedAmount={detail.extraFixedAmount}
                extraAmount={detail.extraAmount}
                totalAmount={detail.totalAmount}
                onDownloadPdf={() => downloadPdf(detail)}
              />
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <h3 className="text-sm font-bold mb-3">Importe del cargo</h3>
              <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                <DetailRow label="Importe original" value={FMT.format(detail.originalAmount)} />
                {detail.lateFeeAmount > 0 && (
                  <DetailRow label={`Mora por vencimiento (${detail.lateFeePercentage}%)`} value={FMT.format(detail.lateFeeAmount)} />
                )}
                <DetailRow label="Total actualizado" value={FMT.format(detail.amountWithLateFee || detail.originalAmount)} />
                {detail.daysOverdue > 0 && <DetailRow label="Días vencido" value={String(detail.daysOverdue)} />}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Detalle de alumnos / consumo</h3>
                {detail.hasPaymentProof && (
                  <Button variant="outline" size="sm" onClick={() => openProofPreview(detail)}>Ver comprobante</Button>
                )}
              </div>
              {usageDetail.isLoading ? (
                <p className="text-xs text-slate-400">Cargando...</p>
              ) : !usageDetail.data || usageDetail.data.movements.length === 0 ? (
                <p className="text-xs text-slate-400">Sin movimientos registrados para el período {detail.period}.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <th className="px-2 py-1.5">Alumno</th>
                        <th className="px-2 py-1.5">Email</th>
                        <th className="px-2 py-1.5">Movimiento</th>
                        <th className="px-2 py-1.5">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageDetail.data.movements.map((m) => (
                        <tr key={`${m.userId}-${m.occurredAtUtc}`} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-2 py-1.5">{`${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || '-'}</td>
                          <td className="px-2 py-1.5">{m.email ?? '-'}</td>
                          <td className="px-2 py-1.5">{m.eventType === 1 ? 'Alta' : m.eventType === 2 ? 'Baja' : `Tipo ${m.eventType}`}</td>
                          <td className="px-2 py-1.5">{fmt(m.occurredAtUtc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      <BillingProofPreviewModal
        open={!!proofPreview}
        onClose={() => setProofPreview(null)}
        period={proofPreview?.period ?? ''}
        load={
          proofPreview
            ? () =>
                apiService.get<BillingProofViewPayload>(
                  `/api/admin/${slug}/billing/invoices/${proofPreview.id}/proof/view`,
                )
            : async () => {
                throw new Error('No invoice seleccionada')
              }
        }
      />
    </div>
  )
}

function TransferDetails({
  option,
  payInvoice,
  file,
  setFile,
  submitting,
  onSubmit,
}: {
  option: BillingPaymentOption
  payInvoice: AdminBillingInvoice
  file: File | null
  setFile: (f: File | null) => void
  submitting: boolean
  onSubmit: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copyValue(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="space-y-3">
      <DetailRow label="Importe original" value={FMT.format(option.totalAmount - option.surchargeAmount)} />
      {option.surchargeAmount > 0 && <DetailRow label="Recargo por transferencia" value={FMT.format(option.surchargeAmount)} />}
      <DetailRow label="Total a transferir" value={FMT.format(option.totalAmount)} />
      {option.alias && (
        <CopyRow label="Alias" value={option.alias} copied={copied === 'alias'} feedback="Alias copiado" onCopy={() => copyValue(option.alias!, 'alias')} />
      )}
      {option.cbu && (
        <CopyRow label="CBU/CVU" value={option.cbu} copied={copied === 'cbu'} feedback="CBU/CVU copiado" onCopy={() => copyValue(option.cbu!, 'cbu')} />
      )}
      {option.holder && <DetailRow label="Titular" value={option.holder} />}
      <CopyRow
        label="Referencia"
        value={`Cargo ClassClick ${payInvoice.period} - ${payInvoice.invoiceNumber}`}
        copied={copied === 'ref'}
        feedback="Referencia copiada"
        onCopy={() => copyValue(`Cargo ClassClick ${payInvoice.period} - ${payInvoice.invoiceNumber}`, 'ref')}
      />

      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:file:bg-slate-700"
      />
      {file && <p className="text-xs text-slate-500">Archivo: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}

      <Button
        loading={submitting}
        disabled={!file || file.size > 5 * 1024 * 1024}
        onClick={onSubmit}
        className="w-full bg-slate-800 text-white hover:bg-slate-700"
      >
        Subir comprobante
      </Button>
      <p className="text-xs text-slate-400">Realizá la transferencia y luego subí el comprobante para que podamos validar el pago.</p>
    </div>
  )
}

function CopyRow({
  label,
  value,
  copied,
  feedback,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  feedback: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-right text-xs font-medium">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {copied ? feedback : 'Copiar'}
        </button>
      </span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-medium">{value === undefined || value === null || value === '' ? '-' : value}</span>
    </div>
  )
}

export default function AdminBillingPage() {
  return <ToastProvider><BillingInner /></ToastProvider>
}

