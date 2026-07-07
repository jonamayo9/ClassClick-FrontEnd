import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import {
  usePaymentsPage, money, formatDate, formatDateTime,
  paymentStatusBadge, chargeStatusBadge, getChargePaymentMethodText,
  useApprovePayment, useRejectSubmission, useProofSubmissions,
  useProofViewUrl, useProofSubmissionView, useBulkGenerateCharges, useUpdateCharge,
  useManualPay, useCourseOptions, usePaymentMethods,
  isChargePaid, isChargeOverdue, isChargeCancelled, normalizeStatus,
} from './hooks'
import { formatDisplayName } from '@/lib/text'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox, MultiSelect } from '@/components/ui/combobox'
import { SelectField } from '@/components/ui/select-field'
import { DatePicker, MonthYearPicker } from '@/components/ui/date-picker'
import { Modal as SharedModal } from '@/components/ui/modal'
import { ToastProvider, useToast } from '@/components/ui/toast'
import type { Charge, Payment } from '@/types/payments'
import { HelpCircle } from 'lucide-react'
import { FinancingRequestsTab } from './financing'

function PaymentsPageInner() {
  const ctx = usePaymentsPage()
  const toast = useToast()
  const [showHelp, setShowHelp] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState<string | null>(null)
  const [showProofModal, setShowProofModal] = useState<string | null>(null)

  const { data: chargeTypeOptions = [] } = useQuery({
    queryKey: ['charge-types-filter', useAuth.getState().activeCompanySlug],
    queryFn: () => apiService.get<any[]>(`/api/admin/${useAuth.getState().activeCompanySlug}/charge-types`),
    enabled: !!useAuth.getState().activeCompanySlug,
  })

  const notifyPendingMutation = useMutation({
    mutationFn: () => apiService.post<{ message?: string; studentsNotified?: number; chargesIncluded?: number }>(
      `/api/admin/${useAuth.getState().activeCompanySlug}/payments/monthly-charges/notify-pending`,
    ),
    onSuccess: (response) => {
      toast(response.message ?? 'Notificaciones enviadas.')
    },
    onError: () => toast('No se pudieron enviar las notificaciones.', 'error'),
  })

  function handleNotifyPendingCharges() {
    const ok = window.confirm('Se notificará a todos los alumnos con al menos una cuota pendiente o vencida. ¿Continuar?')
    if (!ok) return
    notifyPendingMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black sm:text-2xl">Pagos y Cuotas</h1>
        {ctx.tab === 'charges' && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNotifyPendingCharges}
              loading={notifyPendingMutation.isPending}
            >
              Notificar cuotas pendientes
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowGenerateModal(true)}>Generar cuotas</Button>
          </div>
        )}
      </div>

      {ctx.tab !== 'financing' && <SummaryCards ctx={ctx} />}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {([
              ['charges', 'Cuotas'],
              ['payments', 'Pagos'],
              ['financing', 'Financiación'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => {
                  ctx.setTab(tab)
                  setShowHelp(false)
                }}
                className={`min-w-0 rounded-lg px-1 py-2.5 text-xs font-bold transition sm:text-sm ${
                  ctx.tab === tab
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            title="¿Qué muestra esta sección?"
            aria-label="Ayuda de la sección"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((current) => !current)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {showHelp && <TabHelp tab={ctx.tab} />}
      </div>

      {ctx.tab === 'charges' ? (
        <ChargesTab ctx={ctx} chargeTypes={chargeTypeOptions} onPay={setShowPayModal} onEdit={setShowEditModal} onViewProof={setShowProofModal} onViewDetail={setSelectedCharge} />
      ) : ctx.tab === 'payments' ? (
        <PaymentsTab ctx={ctx} onViewDetail={setSelectedPayment} />
      ) : (
        <FinancingRequestsTab />
      )}

      {showGenerateModal && <GenerateChargesModal onClose={() => setShowGenerateModal(false)} />}
      {showPayModal && <PayModal chargeId={showPayModal} onClose={() => setShowPayModal(null)} />}
      {showEditModal && <EditChargeModal chargeId={showEditModal} onClose={() => setShowEditModal(null)} />}
      {showProofModal && <ProofViewer chargeId={showProofModal} onClose={() => setShowProofModal(null)} />}
      {selectedPayment && <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
      {selectedCharge && <ChargeDetailModal charge={selectedCharge} onClose={() => setSelectedCharge(null)} />}
    </div>
  )
}

function TabHelp({ tab }: { tab: ReturnType<typeof usePaymentsPage>['tab'] }) {
  const content = {
    charges: {
      title: 'Cuotas',
      text: 'Consultá las obligaciones de cada alumno, generá nuevas cuotas, registrá cobros y revisá su detalle.',
    },
    payments: {
      title: 'Pagos',
      text: 'Revisá pagos recibidos y comprobantes enviados, y aprobá o rechazá cada presentación.',
    },
    financing: {
      title: 'Financiación',
      text: 'Revisá las solicitudes de alumnos, comprobá el plan y el interés total, y aprobá o rechazá la financiación.',
    },
  }[tab]

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900/60 dark:bg-blue-950/25">
      <p className="font-bold text-blue-900 dark:text-blue-100">{content.title}</p>
      <p className="mt-0.5 leading-5 text-blue-800 dark:text-blue-200">{content.text}</p>
    </div>
  )
}

/* ── Summary Cards ── */
function SummaryCards({ ctx }: { ctx: ReturnType<typeof usePaymentsPage> }) {
  const s = ctx.paySummary
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total pagos" value={money(s.total)} />
      <StatCard label="En revisión" value={String(s.inreview)} color="text-amber-600 dark:text-amber-400" />
      <StatCard label="Aprobados" value={String(s.approved)} color="text-emerald-600 dark:text-emerald-400" />
      <StatCard label="Rechazados" value={String(s.rejected)} color="text-red-600 dark:text-red-400" />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-black ${color ?? 'text-slate-900 dark:text-white'}`}>{value}</div>
    </Card>
  )
}

/* ── Charges Tab ── */
function ChargesTab({ ctx, chargeTypes, onPay, onEdit, onViewProof, onViewDetail }: {
  ctx: ReturnType<typeof usePaymentsPage>
  chargeTypes: any[]
  onPay: (id: string) => void; onEdit: (id: string) => void
  onViewProof: (id: string) => void; onViewDetail: (charge: Charge) => void
}) {
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('es-AR', { month: 'long' }) }))
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="w-full sm:w-36">
          <SelectField value={String(ctx.chargeMonth)} onValueChange={(value) => { ctx.setChargeMonth(Number(value)); ctx.setChargePage(1) }}
            options={months.map((item) => ({ value: String(item.value), label: item.label }))} aria-label="Mes" />
        </div>
        <div className="w-full sm:w-28">
          <SelectField value={String(ctx.chargeYear)} onValueChange={(value) => { ctx.setChargeYear(Number(value)); ctx.setChargePage(1) }}
            options={years.map((year) => ({ value: String(year), label: String(year) }))} aria-label="Año" />
        </div>
        <div className="w-full sm:w-44">
          <SelectField value={ctx.chargeStatus} onValueChange={(value) => { ctx.setChargeStatus(value); ctx.setChargePage(1) }}
            placeholder="Todos los estados" options={[
              { value: 'pending', label: 'Pendiente' },
              { value: 'paid', label: 'Pagada' },
              { value: 'overdue', label: 'Vencida' },
            ]} aria-label="Estado" />
        </div>
        <div className="w-full sm:w-44">
          <SelectField value={ctx.chargeTypeId} onValueChange={(value) => { ctx.setChargeTypeId(value); ctx.setChargePage(1) }}
            placeholder="Todos los tipos" options={chargeTypes.map((item: any) => ({ value: item.id, label: item.name }))}
            aria-label="Tipo de cuota" />
        </div>
        <Input placeholder="Buscar alumno..." value={ctx.chargeSearch}
          onChange={(e) => { ctx.setChargeSearch(e.target.value); ctx.setChargePage(1) }}
          className="max-w-[180px]" />
        <Button variant="ghost" size="sm" onClick={ctx.resetChargesFilters}>Limpiar</Button>
      </div>

      {ctx.loadingCharges ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : !ctx.charges.length ? (
        <Card className="py-12 text-center">
          <p className="text-4xl mb-2">💰</p>
          <p className="text-slate-500 font-medium">No hay cuotas para este período</p>
          <p className="text-xs text-slate-400 mt-1">Generá cuotas usando el botón superior</p>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <th className="px-4 py-2.5">Alumno</th>
                    <th className="px-4 py-2.5 text-center">Tipo</th>
                    <th className="px-4 py-2.5">Curso</th>
                    <th className="px-4 py-2.5 text-right">Base</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-center">Estado</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {ctx.charges.map((c, i) => (
                    <ChargeRow key={c.id} charge={c} index={i}
                      onPay={() => onPay(c.id)} onEdit={() => onEdit(c.id)}
                      onViewProof={() => onViewProof(c.id)} onViewDetail={() => onViewDetail(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {ctx.charges.map((c) => (
              <ChargeCard key={c.id} charge={c} onPay={() => onPay(c.id)} onEdit={() => onEdit(c.id)}
                onViewProof={() => onViewProof(c.id)} onViewDetail={() => onViewDetail(c)} />
            ))}
          </div>

          {ctx.chargeTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{(ctx.chargePage - 1) * 25 + 1}–{Math.min(ctx.chargePage * 25, ctx.chargeTotalCount)} de {ctx.chargeTotalCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={ctx.chargePage <= 1}
                  onClick={() => ctx.setChargePage(ctx.chargePage - 1)}>Anterior</Button>
                <span className="flex items-center text-xs">Pág {ctx.chargePage} de {ctx.chargeTotalPages}</span>
                <Button variant="outline" size="sm" disabled={ctx.chargePage >= ctx.chargeTotalPages}
                  onClick={() => ctx.setChargePage(ctx.chargePage + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function chargeTypeBadge(c: Charge) {
  if ((c as any).isRefund) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">Devolución</span>
  if ((c as any).chargeTypeName) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">{formatDisplayName((c as any).chargeTypeName)}</span>
  if ((c as any).isCustom) return <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-300">Custom</span>
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">Mensual</span>
}

/* ── Charge Row (desktop) ── */
function ChargeRow({ charge, index, onPay, onEdit, onViewProof, onViewDetail }: {
  charge: Charge; index: number; onPay: () => void; onEdit: () => void; onViewProof: () => void; onViewDetail: () => void
}) {
  const badge = chargeStatusBadge(charge.status)
  const paid = isChargePaid(charge.status)
  const cancelled = isChargeCancelled(charge.status)
  const isTransferPay = String(charge.paymentMethod) === "1" || String(charge.paymentMethod).toLowerCase() === "transfer"
  const hasProof = paid && isTransferPay && !!charge.paymentId
  const payMethodLabel = charge.paymentMethodNameSnapshot || getChargePaymentMethodText(charge.paymentMethod)
  const isMp = String(charge.paymentMethod) === "4" || String(charge.paymentMethod).toLowerCase() === "mercadopago"

  return (
    <tr className={`${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'} hover:bg-blue-50 dark:hover:bg-slate-800/60 transition-colors`}>
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-900 dark:text-white">{charge.studentFullName}</div>
        <div className="text-xs text-slate-400">{charge.studentDni}</div>
      </td>
      <td className="px-4 py-2.5 text-center">{chargeTypeBadge(charge)}</td>
      <td className="px-4 py-2.5 text-slate-500">{formatDisplayName(charge.courseName, 'Curso')}</td>
      <td className="px-4 py-2.5 text-right text-slate-400">{money(charge.basePrice)}</td>
      <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{money(charge.finalAmount)}</td>
      <td className="px-4 py-2.5 text-center">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.classes}`}>{badge.label}</span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-slate-400">Vto: {formatDate(charge.dueDateUtc)}</span>
          {paid && (
            <span className="text-[10px] font-medium text-emerald-600">Pagado con {payMethodLabel}</span>
          )}
          <span className="flex gap-1">
            {paid ? (
              hasProof ? (
                <Button variant="ghost" size="sm" onClick={onViewProof}>Comprobante</Button>
              ) : (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300">Pagada</span>
              )
            ) : cancelled ? (
              <span className="text-xs font-semibold text-slate-400">Sin acciones</span>
            ) : (
              <Button variant="primary" size="sm" onClick={onPay}>Cobrar</Button>
            )}
            {!cancelled && <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>}
            <Button variant="ghost" size="sm" onClick={onViewDetail}>Detalle</Button>
          </span>
          {paid && isMp && (
            <span className="text-[10px] text-blue-500 italic">Sincronizado automáticamente</span>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ── Charge Card (mobile) ── */
function ChargeCard({ charge, onPay, onEdit, onViewProof, onViewDetail }: {
  charge: Charge; onPay: () => void; onEdit: () => void; onViewProof: () => void; onViewDetail: () => void
}) {
  const badge = chargeStatusBadge(charge.status)
  const paid = isChargePaid(charge.status)
  const cancelled = isChargeCancelled(charge.status)
  const overdue = isChargeOverdue(charge.status)
  const isTransferPay = String(charge.paymentMethod) === "1" || String(charge.paymentMethod).toLowerCase() === "transfer"
  const hasProof = paid && isTransferPay && !!charge.paymentId
  const payMethodLabel = charge.paymentMethodNameSnapshot || getChargePaymentMethodText(charge.paymentMethod)
  const isMp = String(charge.paymentMethod) === "4" || String(charge.paymentMethod).toLowerCase() === "mercadopago"

  return (
    <Card className={`p-3.5 ${overdue ? 'ring-1 ring-red-300 dark:ring-red-700' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">{charge.studentFullName}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{formatDisplayName(charge.courseName, 'Curso')}</span>
            {chargeTypeBadge(charge)}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.classes}`}>{badge.label}</span>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-lg font-bold text-slate-900 dark:text-white">{money(charge.finalAmount)}</div>
        <div className="text-xs text-slate-400">Vto: {formatDate(charge.dueDateUtc)}</div>
      </div>

      {paid && (
        <div className="mt-1 text-[10px] font-medium text-emerald-600">
          Pagado con {payMethodLabel}
        </div>
      )}

      {paid && isMp && (
        <div className="text-[10px] text-blue-500 italic">Sincronizado automáticamente</div>
      )}

      <ChargeBadges charge={charge} />

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {paid ? (
          hasProof ? (
            <Button variant="ghost" size="sm" onClick={onViewProof}>Comprobante</Button>
          ) : (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300">Pagada</span>
          )
        ) : cancelled ? (
          <span className="inline-flex items-center px-1 py-1 text-xs font-semibold text-slate-400">Sin acciones disponibles</span>
        ) : (
          <>
            <Button variant="primary" size="sm" onClick={onPay}>Cobrar</Button>
            <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={onViewDetail}>Detalle</Button>
      </div>
    </Card>
  )
}

function ChargeBadges({ charge }: { charge: Charge }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {charge.hasScholarship && (
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
          Beca {charge.scholarshipName}
        </span>
      )}
      {charge.hasPromotion && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          Promoción
        </span>
      )}
      {charge.lateChargeAmount > 0 && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
          Recargo +{money(charge.lateChargeAmount)}
        </span>
      )}
      {charge.siblingDiscountAmount > 0 && (
        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Hermano -{money(charge.siblingDiscountAmount)}
        </span>
      )}
    </div>
  )
}

/* ── Payments Tab ── */
function PaymentsTab({ ctx, onViewDetail }: {
  ctx: ReturnType<typeof usePaymentsPage>; onViewDetail: (payment: Payment) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar alumno..." value={ctx.paySearch}
          onChange={(e) => ctx.setPaySearch(e.target.value)} className="max-w-[200px]" />
        <div className="w-full sm:w-48">
          <SearchableCombobox value={ctx.payCourseId} onValueChange={ctx.setPayCourseId}
            options={(ctx.courses ?? []).map((course) => ({ value: course.id, label: course.name }))}
            placeholder="Todos los cursos" />
        </div>
        <Input placeholder="MM/AAAA" value={ctx.payPeriod} onChange={(e) => ctx.setPayPeriod(e.target.value)}
          className="max-w-[100px]" />
        <div className="w-full sm:w-44">
          <SelectField value={ctx.payStatus} onValueChange={ctx.setPayStatus} placeholder="Todos los estados"
            options={[
              { value: '2', label: 'En revisión' },
              { value: '3', label: 'Aprobado' },
              { value: '4', label: 'Rechazado' },
            ]} aria-label="Estado del pago" />
        </div>
        <Button variant="ghost" size="sm" onClick={ctx.resetPaymentsFilters}>Limpiar</Button>
      </div>

      {ctx.loadingPayments ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : !ctx.payments.length ? (
        <Card className="py-12 text-center">
          <p className="text-4xl mb-2">💳</p>
          <p className="text-slate-500 font-medium">No hay pagos registrados</p>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <th className="px-4 py-2.5">Alumno</th>
                    <th className="px-4 py-2.5">Curso</th>
                    <th className="px-4 py-2.5">Período</th>
                    <th className="px-4 py-2.5 text-right">Monto</th>
                    <th className="px-4 py-2.5 text-center">Estado</th>
                    <th className="px-4 py-2.5">Método</th>
                    <th className="px-4 py-2.5">Pagado</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {ctx.payments.map((p, i) => (
                    <PaymentRow key={p.id} payment={p} index={i} onViewDetail={() => onViewDetail(p)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {ctx.payments.map((p) => (
              <PaymentCard key={p.id} payment={p} onViewDetail={() => onViewDetail(p)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PaymentRow({ payment, index, onViewDetail }: { payment: Payment; index: number; onViewDetail: () => void }) {
  const badge = paymentStatusBadge(payment.paymentStatus)
  const methodLabel = payment.paymentMethodNameSnapshot || getChargePaymentMethodText(payment.paymentMethod)
  return (
    <tr className={`${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'} hover:bg-blue-50 dark:hover:bg-slate-800/60 transition-colors`}>
      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{payment.studentFullName}</td>
      <td className="px-4 py-2.5 text-slate-500">{payment.courseName}</td>
      <td className="px-4 py-2.5 text-slate-500">{payment.month}/{payment.year}</td>
      <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{money(payment.finalAmount)}</td>
      <td className="px-4 py-2.5 text-center">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.classes}`}>{badge.label}</span>
      </td>
      <td className="px-4 py-2.5 text-slate-500 text-xs">{methodLabel}</td>
      <td className="px-4 py-2.5 text-slate-500 text-xs">{formatDate(payment.paidAtUtc)}</td>
      <td className="px-4 py-2.5 text-right">
        <Button variant="ghost" size="sm" onClick={onViewDetail}>Detalle</Button>
      </td>
    </tr>
  )
}

function PaymentCard({ payment, onViewDetail }: { payment: Payment; onViewDetail: () => void }) {
  const badge = paymentStatusBadge(payment.paymentStatus)
  const methodLabel = payment.paymentMethodNameSnapshot || getChargePaymentMethodText(payment.paymentMethod)
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">{payment.studentFullName}</div>
          <div className="text-xs text-slate-400 mt-0.5">{payment.courseName} · {payment.month}/{payment.year}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.classes}`}>{badge.label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-lg font-bold text-slate-900 dark:text-white">{money(payment.finalAmount)}</div>
        <div className="text-xs text-slate-400">{methodLabel}</div>
      </div>
      <div className="mt-2.5 flex justify-between items-center">
        <span className="text-xs text-slate-400">{formatDate(payment.paidAtUtc)}</span>
        <Button variant="ghost" size="sm" onClick={onViewDetail}>Detalle</Button>
      </div>
    </Card>
  )
}

/* ── Modals ── */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <SharedModal open onClose={onClose} title={title} className="sm:max-w-lg">
      <div className="p-5 text-slate-900 sm:p-6 dark:text-white">{children}</div>
    </SharedModal>
  )
}

function GenerateChargesModal({ onClose }: { onClose: () => void }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [type, setType] = useState<'global' | 'course' | 'student'>('global')
  const [courseId, setCourseId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentCourseIds, setStudentCourseIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [studentPage, setStudentPage] = useState(1)
  const [chargeTypeId, setChargeTypeId] = useState('')
  const [skipExisting, setSkipExisting] = useState(true)
  const mutation = useBulkGenerateCharges()
  const { data: courses } = useCourseOptions()
  const companySlug = useAuth((state) => state.activeCompanySlug)
  const { data: studentsPage, isFetching: studentsLoading } = useQuery({
    queryKey: ['charge-student-options', companySlug, studentSearch, studentPage],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(studentPage), pageSize: '20' })
      if (studentSearch.trim()) params.set('search', studentSearch.trim())
      return apiService.get<{
        items: Array<{ id: string; fullName?: string; firstName: string; lastName: string; email: string }>
        page: number
        totalPages: number
      }>(`/api/admin/${companySlug}/students?${params}`)
    },
    enabled: type === 'student' && !!companySlug,
  })
  const { data: studentCourses = [], isFetching: studentCoursesLoading } = useQuery({
    queryKey: ['charge-student-courses', companySlug, studentId],
    queryFn: () => apiService.get<Array<{ id: string; name: string; classesPerWeek: number }>>(
      `/api/admin/${companySlug}/students/${studentId}/course-options`,
    ),
    enabled: type === 'student' && !!companySlug && !!studentId,
  })
  const { data: chargeTypes = [] } = useQuery({
    queryKey: ['charge-types-select'],
    queryFn: () => apiService.get<any[]>(`/api/admin/${useAuth.getState().activeCompanySlug}/charge-types`),
    enabled: !!useAuth.getState().activeCompanySlug,
  })
  const selectedChargeType = chargeTypes.find((ct: any) => ct.id === chargeTypeId)
  const selectedChargeTypeIsMonthly = selectedChargeType?.name?.trim().toLowerCase() === 'mensual'
  const selectedDueText = selectedChargeType
    ? selectedChargeTypeIsMonthly
      ? selectedChargeType.dueDays
        ? `Vence el dia ${selectedChargeType.dueDays} del mes.`
        : 'Vence segun la configuracion global de pagos.'
      : `Vence ${selectedChargeType.dueDays ?? 10} dias despues de generarse.`
    : null

  const handleGenerate = async () => {
    try {
      await mutation.mutateAsync({
        year,
        month,
        chargeTypeId: chargeTypeId || undefined,
        courseId: type === 'course' ? courseId : undefined,
        courseIds: type === 'student' ? studentCourseIds : undefined,
        studentIds: type === 'student' ? [studentId] : undefined,
        skipExisting,
      })
      onClose()
    } catch { /* handled */ }
  }
  const canGenerate = !!chargeTypeId
    && (type === 'global'
      || (type === 'course' && !!courseId)
      || (type === 'student' && !!studentId && studentCourseIds.length > 0))

  return (
    <Modal onClose={onClose} title="Generar cuotas">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Generá cuotas para el período y tipo seleccionado.</p>
        <div>
          <label className="mb-1 block text-sm font-bold">Período contable</label>
          <MonthYearPicker month={month} year={year} onChange={(value) => { setMonth(value.month); setYear(value.year) }} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">Tipo de cuota</label>
          <SelectField
            value={chargeTypeId}
            onValueChange={setChargeTypeId}
            placeholder="Seleccionar tipo..."
            options={chargeTypes.map((ct: any) => ({
              value: ct.id,
              label: ct.name,
              description: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(ct.amount),
            }))}
          />
          {selectedDueText && (
            <p className="mt-1 text-xs text-slate-500">{selectedDueText}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">Alcance</label>
          <div className="grid grid-cols-3 gap-2">
            {(['global', 'course', 'student'] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setStudentCourseIds([]) }}
                className={`min-h-10 rounded-lg px-2 py-2 text-sm font-bold transition ${
                  type === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                {t === 'global' ? 'Todos' : t === 'course' ? 'Por curso' : 'Por alumno'}
              </button>
            ))}
          </div>
        </div>

        {type === 'course' && (
          <div>
            <label className="mb-1 block text-sm font-bold">Curso</label>
            <SearchableCombobox
              value={courseId}
              onValueChange={setCourseId}
              options={(courses ?? []).map((course) => ({ value: course.id, label: course.name }))}
              placeholder="Seleccionar curso"
              searchPlaceholder="Buscar curso..."
            />
          </div>
        )}

        {type === 'student' && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div>
              <label className="mb-1 block text-sm font-bold">Alumno</label>
              <SearchableCombobox
                value={studentId}
                onValueChange={(value) => { setStudentId(value); setStudentCourseIds([]) }}
                onSearchChange={(value) => { setStudentSearch(value); setStudentPage(1) }}
                options={(studentsPage?.items ?? []).map((student) => ({
                  value: student.id,
                  label: student.fullName || `${student.firstName} ${student.lastName}`,
                  description: student.email,
                }))}
                placeholder="Buscar alumno"
                searchPlaceholder="Nombre, email o DNI..."
                loading={studentsLoading}
              />
              {!!studentsPage && studentsPage.totalPages > 1 && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <button type="button" disabled={studentPage <= 1} onClick={() => setStudentPage((page) => page - 1)} className="font-bold disabled:opacity-40">Anterior</button>
                  <span>Página {studentPage} de {studentsPage.totalPages}</span>
                  <button type="button" disabled={studentPage >= studentsPage.totalPages} onClick={() => setStudentPage((page) => page + 1)} className="font-bold disabled:opacity-40">Siguiente</button>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">Cursos del alumno</label>
              <MultiSelect
                values={studentCourseIds}
                onValuesChange={setStudentCourseIds}
                options={studentCourses.map((course) => ({
                  value: course.id,
                  label: course.name,
                  description: `${course.classesPerWeek} clase${course.classesPerWeek === 1 ? '' : 's'} por semana`,
                }))}
                placeholder={studentId ? 'Seleccionar uno o varios cursos' : 'Primero seleccioná un alumno'}
                disabled={!studentId || studentCoursesLoading}
              />
              {studentId && !studentCoursesLoading && studentCourses.length === 0 && (
                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">Este alumno no tiene cursos activos asignados.</p>
              )}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)}
            className="rounded border-slate-300" />
          Saltar alumnos con cuota ya generada
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleGenerate} loading={mutation.isPending} disabled={!canGenerate}>Generar cuotas</Button>
        </div>
      </div>
    </Modal>
  )
}

function PayModal({ chargeId, onClose }: { chargeId: string; onClose: () => void }) {
  const [method, setMethod] = useState<string | number>('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useManualPay()
  const { data: paymentMethods } = usePaymentMethods()
  const selectedMethod = paymentMethods?.find((pm) => String(pm.paymentMethod) === String(method))

  const handlePay = async () => {
    if (!method) return
    try {
      await mutation.mutateAsync({ chargeId, paymentMethod: method, paymentReference: reference, notes: notes || undefined })
      onClose()
    } catch { /* handled */ }
  }

  return (
    <Modal onClose={onClose} title="Registrar pago">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Seleccioná el método de pago y una referencia si es necesario.</p>

        <div>
          <label className="mb-2 block text-sm font-bold">Método de pago</label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods?.filter((pm) => pm.enabledBySuperAdmin).map((pm) => (
              <button key={pm.paymentMethod} onClick={() => setMethod(pm.paymentMethod)}
                className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition ${
                  String(method) === String(pm.paymentMethod)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}>
                {pm.displayName ?? pm.paymentMethodName}
              </button>
            ))}
          </div>
        </div>

        {selectedMethod && Number(selectedMethod.surchargeValue) > 0 && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-700">
            <div className="font-semibold text-amber-800 dark:text-amber-300">Recargo por método de pago</div>
            <div className="mt-1 text-amber-700 dark:text-amber-400">
              {selectedMethod.surchargeType === 'percentage'
                ? `${selectedMethod.surchargeValue}% de recargo sobre el total`
                : `$${selectedMethod.surchargeValue} de recargo`}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-bold">Referencia (opcional)</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder="N° de transacción, comprobante..." />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">Notas (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            rows={2} placeholder="Observaciones internas..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handlePay} loading={mutation.isPending} disabled={!method}>Confirmar pago</Button>
        </div>
      </div>
    </Modal>
  )
}

function EditChargeModal({ chargeId, onClose }: { chargeId: string; onClose: () => void }) {
  const [basePrice, setBasePrice] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lateCharge, setLateCharge] = useState('')
  const [siblingDiscount, setSiblingDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useUpdateCharge()

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        chargeId,
        basePrice: basePrice ? Number(basePrice) : undefined,
        dueDateUtc: dueDate || undefined,
        lateChargeAmount: lateCharge ? Number(lateCharge) : undefined,
        siblingDiscountAmount: siblingDiscount ? Number(siblingDiscount) : undefined,
        notes: notes || undefined,
      })
      onClose()
    } catch { /* handled */ }
  }

  return (
    <Modal onClose={onClose} title="Editar cuota">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Modificá los valores de esta cuota. Dejá en blanco lo que no quieras cambiar.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-bold">Precio base</label>
            <Input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
              placeholder="Nuevo precio base" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">Vencimiento</label>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Elegir vencimiento" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">Recargo por mora</label>
            <Input type="number" step="0.01" value={lateCharge} onChange={(e) => setLateCharge(e.target.value)}
              placeholder="$" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">Dto. hermano ($)</label>
            <Input type="number" step="0.01" value={siblingDiscount} onChange={(e) => setSiblingDiscount(e.target.value)}
              placeholder="$" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            rows={3} placeholder="Notas internas..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={mutation.isPending}>Guardar cambios</Button>
        </div>
      </div>
    </Modal>
  )
}

function ProofViewer({ chargeId, onClose }: { chargeId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useProofViewUrl(chargeId)

  return (
    <Modal onClose={onClose} title="Comprobante de pago">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : isError || !data?.url ? (
        <div className="py-12 text-center">
          <p className="text-4xl mb-2">📎</p>
          <p className="text-slate-500">No hay comprobante disponible</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{data.fileName}</p>
          {data.isImage ? (
            <img src={data.url} alt={data.fileName} className="w-full rounded-xl" />
          ) : data.isPdf ? (
            <iframe src={data.url} className="h-[70vh] w-full rounded-xl" title="PDF" />
          ) : (
            <a href={data.url} download={data.fileName}
              className="flex items-center justify-center rounded-xl bg-slate-100 p-8 text-center font-bold text-blue-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-blue-400">
              Descargar {data.fileName}
            </a>
          )}
        </div>
      )}
    </Modal>
  )
}

function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { data: submissions } = useProofSubmissions(payment.id)
  const approveMutation = useApprovePayment()
  const rejectMutation = useRejectSubmission()
  const [note, setNote] = useState('')
  const normalizedPaymentStatus = normalizeStatus(payment.paymentStatus)
  const [viewingSubmission, setViewingSubmission] = useState<string | null>(null)
  const { data: proofView } = useProofSubmissionView(viewingSubmission)
  const badge = paymentStatusBadge(payment.paymentStatus)
  const methodLabel = getChargePaymentMethodText(payment.paymentMethod)

  const handleApprove = async () => {
    try { await approveMutation.mutateAsync({ paymentId: payment.id, reviewNote: note }); onClose() } catch { }
  }

  const handleReject = async (submissionId: string) => {
    try { await rejectMutation.mutateAsync({ submissionId, reviewNote: note }); onClose() } catch { }
  }

  if (viewingSubmission && proofView) {
    return (
      <Modal onClose={() => setViewingSubmission(null)} title={proofView.fileName}>
        {proofView.isImage ? (
          <img src={proofView.url} alt={proofView.fileName} className="w-full rounded-xl" />
        ) : proofView.isPdf ? (
          <iframe src={proofView.url} className="h-[70vh] w-full rounded-xl" title="PDF" />
        ) : (
          <a href={proofView.url} download={proofView.fileName}
            className="flex items-center justify-center rounded-xl bg-slate-100 p-8 text-center font-bold text-blue-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-blue-400">
            Descargar {proofView.fileName}
          </a>
        )}
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title="Detalle del pago">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <LabelValue label="Alumno" value={payment.studentFullName} />
          <LabelValue label="DNI" value={payment.studentDni} />
          <LabelValue label="Curso" value={payment.courseName} />
          <LabelValue label="Período" value={`${payment.month}/${payment.year}`} />
          <LabelValue label="Método" value={methodLabel} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</div>
            <span className={`inline-block mt-0.5 rounded-full px-3 py-1 text-xs font-bold ${badge.classes}`}>{badge.label}</span>
          </div>
          {payment.paidAtUtc && <LabelValue label="Pagado" value={formatDateTime(payment.paidAtUtc)} />}
          {(String(payment.paymentMethod) === "4" || String(payment.paymentMethod).toLowerCase() === "mercadopago") && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Pago sincronizado</div>
              <div className="mt-1 text-xs text-blue-800">Sincronizado automáticamente desde Mercado Pago</div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Desglose</div>
            <div className="space-y-1 text-sm rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <BreakdownRow label="Precio base" value={payment.basePrice} />
              {payment.scholarshipDiscountAmount > 0 && (
                <BreakdownRow label={`Beca (${payment.scholarshipName})`} value={-payment.scholarshipDiscountAmount} color="text-purple-600" />
              )}
              {payment.siblingDiscountAmount > 0 && (
                <BreakdownRow label="Dto. hermano" value={-payment.siblingDiscountAmount} color="text-cyan-600" />
              )}
              {payment.promotionDiscountAmount > 0 && (
                <BreakdownRow label="Promoción" value={-payment.promotionDiscountAmount} color="text-blue-600" />
              )}
              {payment.lateChargeAmount > 0 && (
                <BreakdownRow label="Recargo mora" value={payment.lateChargeAmount} color="text-red-600" />
              )}
              {payment.manualDiscountAmount > 0 && (
                <BreakdownRow label="Dto. manual" value={-payment.manualDiscountAmount} color="text-red-600" />
              )}
              {payment.manualIncreaseAmount > 0 && (
                <BreakdownRow label="Aumento manual" value={payment.manualIncreaseAmount} color="text-red-600" />
              )}
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1 mt-1 dark:border-slate-600">
                <span>Total</span><span>{money(payment.finalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(normalizedPaymentStatus === 'inreview' || normalizedPaymentStatus === 'rejected') && (
        <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <h3 className="font-bold text-sm">Revisión de pago</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Nota de revisión (opcional)..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            rows={2} />
          {normalizedPaymentStatus === 'inreview' && (
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleApprove} loading={approveMutation.isPending}>Aprobar pago</Button>
              {submissions?.[0] && (
                <Button variant="danger" onClick={() => handleReject(submissions[0].id)} loading={rejectMutation.isPending}>Rechazar</Button>
              )}
            </div>
          )}
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold mb-2">Comprobantes ({submissions.length})</h3>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-medium">{sub.fileName}</span>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(sub.uploadedAtUtc)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewingSubmission(sub.id)}>Ver</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function ChargeDetailModal({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const badge = chargeStatusBadge(charge.status)
  const { companies, activeCompanySlug } = useAuth()
  const activeCompany = companies?.find((c: any) => (c.slug ?? c.companySlug) === activeCompanySlug)
  const companyLogo = activeCompany?.logoUrl || activeCompany?.LogoUrl || ''
  const detailItems = (charge as any).detailItems ?? []

  return (
    <Modal onClose={onClose} title="Detalle de cuota">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <div className="flex items-center gap-3 mb-3">
            {companyLogo && <img src={companyLogo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />}
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{activeCompany?.name || 'Empresa'}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{charge.studentFullName} · {charge.courseName}</div>
            </div>
          </div>

          {detailItems.length > 0 && (
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-1 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"><span>Descripción</span><span>Monto</span></div>
              {detailItems.map((item: any) => (
                <div key={item.id} className="flex justify-between text-slate-600 dark:text-slate-300"><span>{item.description}</span><span>{money(item.amount)}</span></div>
              ))}
            </div>
          )}

          {detailItems.length === 0 && (
            <div className="space-y-1 text-sm">
              <BreakdownRow label="Precio base" value={charge.basePrice} />
              {charge.scholarshipDiscountAmount > 0 && (
                <BreakdownRow label={`Beca (${charge.scholarshipName})`} value={-charge.scholarshipDiscountAmount} color="text-purple-600" />
              )}
              {charge.siblingDiscountAmount > 0 && (
                <BreakdownRow label="Dto. hermano" value={-charge.siblingDiscountAmount} color="text-cyan-600" />
              )}
              {charge.lateChargeAmount > 0 && (
                <BreakdownRow label="Recargo mora" value={charge.lateChargeAmount} color="text-red-600" />
              )}
              {charge.paymentMethodSurchargeAmount > 0 && (
                <BreakdownRow label="Recargo método de pago" value={charge.paymentMethodSurchargeAmount} color="text-amber-600" />
              )}
            </div>
          )}

          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-600">
            <span>Total</span><span>{money(charge.finalAmount)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alumno</div>
            <div className="text-sm font-medium mt-0.5">{charge.studentFullName}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Período</div>
            <div className="text-sm font-medium mt-0.5">{charge.month}/{charge.year}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vencimiento</div>
            <div className="text-sm font-medium mt-0.5">{formatDate(charge.dueDateUtc)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</div>
            <span className={`inline-block mt-0.5 rounded-full px-3 py-1 text-xs font-bold ${badge.classes}`}>{badge.label}</span>
          </div>
        </div>

        {charge.notes && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notas</div>
            <div className="text-sm mt-0.5">{charge.notes}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ── Helpers ── */
function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  )
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className={`flex justify-between ${color ?? ''}`}>
      <span>{label}</span>
      <span>{value >= 0 ? money(value) : `-${money(Math.abs(value))}`}</span>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <ToastProvider>
      <PaymentsPageInner />
    </ToastProvider>
  )
}
