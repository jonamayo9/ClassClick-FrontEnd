import { useMemo, useRef, useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { PageHero } from '@/components/ui/page-hero'
import { Select } from '@/components/ui/select'
import { imgUrl } from '@/lib/media'
import { formatDisplayName } from '@/lib/text'
import { useAuth } from '@/stores/auth'
import { formatDate } from '../student.hooks'
import type { PaymentMethod, StudentBilling } from '../student.hooks'
import {
  useBilling,
  useFinancingConfig,
  useFinancingRequests,
  usePaymentMethods,
  useProofView,
  useRequestFinancing,
  useSubmitProof,
  useTransferInfo,
} from './hooks'
import type { FinancingConfig, FinancingRequest } from './hooks'

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function money(value: number | null | undefined) {
  return ARS.format(Number(value || 0))
}

function normalizePaymentStatus(value: string | number | null | undefined): string {
  const raw = String(value ?? '').toLowerCase().trim()
  const map: Record<string, string> = {
    '': 'pending',
    '0': 'pending',
    '1': 'pending',
    '2': 'inreview',
    '3': 'approved',
    '4': 'rejected',
    pending: 'pending',
    inreview: 'inreview',
    enrevision: 'inreview',
    approved: 'approved',
    rejected: 'rejected',
  }
  return map[raw] ?? raw
}

function normalizeChargeStatus(value: string | number | null | undefined): string {
  const raw = String(value ?? '').toLowerCase().trim()
  const map: Record<string, string> = {
    '0': 'pending',
    '1': 'paid',
    '2': 'inreview',
    '3': 'overdue',
    '4': 'cancelled',
    '5': 'refundpending',
    pending: 'pending',
    paid: 'paid',
    overdue: 'overdue',
    cancelled: 'cancelled',
    refundpending: 'refundpending',
  }
  return map[raw] ?? raw
}

function PaymentPageInner() {
  const toast = useToast()
  const { data: billing = [], isLoading } = useBilling()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: transferInfo } = useTransferInfo()
  const { data: financingConfig } = useFinancingConfig()
  const { data: financingRequests = [] } = useFinancingRequests()
  const submitProof = useSubmitProof()
  const requestFinancing = useRequestFinancing()

  const [step, setStep] = useState<'idle' | 'method' | 'transfer'>('idle')
  const [payId, setPayId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)
  const [detail, setDetail] = useState<StudentBilling | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [financeCharge, setFinanceCharge] = useState<StudentBilling | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: proofView, isLoading: loadProof } = useProofView(viewId)
  const item = billing.find((charge) => charge.chargeId === payId)

  const summary = useMemo(() => {
    return billing.reduce(
      (acc, charge) => {
        const paymentStatus = normalizePaymentStatus(charge.paymentStatus)
        const chargeStatus = normalizeChargeStatus(charge.chargeStatus)
        if (chargeStatus === 'cancelled') return acc
        if (paymentStatus === 'approved' || chargeStatus === 'paid') acc.paid += Number(charge.finalAmountPaid || charge.finalAmount || 0)
        else if (chargeStatus === 'overdue') acc.overdue += Number(charge.finalAmount || 0)
        else acc.pending += Number(charge.finalAmount || 0)
        return acc
      },
      { paid: 0, pending: 0, overdue: 0 },
    )
  }, [billing])

  const preview = useMemo(() => {
    if (!item || !method) return null
    const base = Number(item.finalAmount || 0)
    const surcharge = calculateSurcharge(base, method)
    return { base, surcharge, total: base + surcharge }
  }, [item, method])

  const transfer = useMemo(() => {
    return {
      alias: method?.alias || transferInfo?.alias || '',
      cbu: method?.cbu || transferInfo?.cbu || '',
      holder: method?.holderName || transferInfo?.accountHolder || '',
      bank: transferInfo?.bankName || '',
      notes: method?.instructions || method?.notes || transferInfo?.notes || '',
    }
  }, [method, transferInfo])

  async function handlePay() {
    if (!payId || !file || !method?.companyPaymentMethodId) {
      toast('Seleccioná un medio de pago habilitado.', 'error')
      return
    }

    const methodStillEnabled = paymentMethods.some(
      (item) => item.companyPaymentMethodId === method.companyPaymentMethodId,
    )

    if (!methodStillEnabled) {
      toast('El medio de pago seleccionado ya no está disponible.', 'error')
      setStep('method')
      setMethod(null)
      return
    }

    try {
      await submitProof.mutateAsync({
        chargeId: payId,
        companyPaymentMethodId: method.companyPaymentMethodId,
        file,
      })
      toast('Comprobante enviado. Queda en revision.')
      resetPay()
    } catch (error: any) {
      const response = error?.response?.data
      const message = typeof response === 'string'
        ? response
        : response?.message || response?.error || 'Error al enviar el comprobante.'
      toast(message, 'error')
    }
  }

  function resetPay() {
    setStep('idle')
    setPayId(null)
    setMethod(null)
    setFile(null)
    setCopied(false)
  }

  function startPayment(charge: StudentBilling) {
    setPayId(charge.chargeId)
    setStep('method')
    setMethod(null)
  }

  const pendingCount = billing.filter((charge) => {
    const paymentStatus = normalizePaymentStatus(charge.paymentStatus)
    const chargeStatus = normalizeChargeStatus(charge.chargeStatus)
    return paymentStatus !== 'approved' &&
      chargeStatus !== 'paid' &&
      chargeStatus !== 'cancelled' &&
      chargeStatus !== 'refundpending'
  }).length
  const hasSharedCharges = billing.some((charge) => charge.isOwnCharge === false)
  const earlierDebtByChargeId = useMemo(() => {
    const result = new Map<string, StudentBilling>()
    for (const current of billing) {
      const ownerKey = current.studentId || current.studentFullName || ''
      const currentDue = new Date(current.dueDateUtc).getTime()
      const earlier = billing
        .filter((candidate) => {
          const candidateOwnerKey = candidate.studentId || candidate.studentFullName || ''
          const status = normalizeChargeStatus(candidate.chargeStatus)
          const paymentStatus = normalizePaymentStatus(candidate.paymentStatus)
          return candidate.chargeId !== current.chargeId &&
            candidateOwnerKey === ownerKey &&
            candidate.chargeTypeId === current.chargeTypeId &&
            (status === 'pending' || status === 'overdue') &&
            paymentStatus !== 'approved' &&
            new Date(candidate.dueDateUtc).getTime() < currentDue
        })
        .sort((a, b) => new Date(a.dueDateUtc).getTime() - new Date(b.dueDateUtc).getTime())[0]
      if (earlier) result.set(current.chargeId, earlier)
    }
    return result
  }, [billing])

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-blue-600" /></div>
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        label="Panel alumno"
        title={hasSharedCharges ? 'Pagos del grupo familiar' : 'Mis pagos'}
        description={hasSharedCharges
          ? 'Las cuotas compartidas muestran siempre a qué alumno pertenecen.'
          : 'Tus cuotas, vencimientos y comprobantes en un solo lugar.'}
        stats={[
          { label: 'Cuotas', value: billing.length },
          { label: 'Pendiente', value: money(summary.pending) },
          ...(pendingCount > 0 ? [{ label: 'A resolver', value: pendingCount }] : []),
        ]}
      />

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Pagado" value={money(summary.paid)} tone="emerald" />
        <MiniStat label="Pendiente" value={money(summary.pending)} tone="amber" />
        <MiniStat label="Vencido" value={money(summary.overdue)} tone="red" />
      </div>

      {billing.length === 0 ? (
        <EmptyState icon="P" title="Sin cuotas" description="Cuando el sistema genere tus cuotas, las vas a ver aca." />
      ) : (
        <div className="space-y-3">
          {billing.map((charge) => (
            <StudentChargeCard
              key={charge.chargeId}
              charge={charge}
              financingEnabled={Boolean(financingConfig?.isEnabled)}
              financingRequest={financingRequests.find(
                (request) => request.chargeId === charge.chargeId,
              )}
              earlierDebt={earlierDebtByChargeId.get(charge.chargeId)}
              onPay={() => startPayment(charge)}
              onFinance={() => setFinanceCharge(charge)}
              onDetail={() => setDetail(charge)}
              onProof={() => charge.paymentId && setViewId(charge.paymentId)}
            />
          ))}
        </div>
      )}

      <PaymentMethodModal
        open={step === 'method'}
        item={item}
        methods={paymentMethods}
        method={method}
        preview={preview}
        onClose={resetPay}
        onSelect={setMethod}
        onContinue={() => setStep('transfer')}
      />

      <TransferModal
        open={step === 'transfer'}
        item={item}
        transfer={transfer}
        preview={preview}
        file={file}
        copied={copied}
        fileRef={fileRef}
        submitting={submitProof.isPending}
        onClose={resetPay}
        onBack={() => setStep('method')}
        onFile={setFile}
        onSubmit={handlePay}
        onCopy={() => {
          if (!transfer.alias) return
          navigator.clipboard.writeText(transfer.alias)
          setCopied(true)
          setTimeout(() => setCopied(false), 3000)
        }}
      />

      <ProofModal
        open={!!viewId}
        loading={loadProof}
        proofView={proofView}
        onClose={() => setViewId(null)}
      />

      {detail && <ChargeDetailModal charge={detail} onClose={() => setDetail(null)} />}

      {financeCharge && financingConfig && (
        <FinancingRequestModal
          charge={financeCharge}
          config={financingConfig}
          submitting={requestFinancing.isPending}
          onClose={() => setFinanceCharge(null)}
          onSubmit={async (installments, frequency) => {
            try {
              await requestFinancing.mutateAsync({
                chargeId: financeCharge.chargeId,
                installments,
                frequency,
              })
              toast('Solicitud de financiación enviada.')
              setFinanceCharge(null)
            } catch (error: any) {
              const response = error?.response?.data
              toast(
                typeof response === 'string'
                  ? response
                  : response?.message || 'No se pudo solicitar la financiación.',
                'error',
              )
            }
          }}
        />
      )}
    </div>
  )
}

function StudentChargeCard({
  charge,
  financingEnabled,
  financingRequest,
  earlierDebt,
  onPay,
  onFinance,
  onDetail,
  onProof,
}: {
  charge: StudentBilling
  financingEnabled: boolean
  financingRequest?: FinancingRequest
  earlierDebt?: StudentBilling
  onPay: () => void
  onFinance: () => void
  onDetail: () => void
  onProof: () => void
}) {
  const paymentStatus = normalizePaymentStatus(charge.paymentStatus)
  const chargeStatus = normalizeChargeStatus(charge.chargeStatus)
  const paid = paymentStatus === 'approved' || chargeStatus === 'paid'
  const overdue = chargeStatus === 'overdue' && !paid
  const locked = paymentStatus === 'inreview'
  const rejected = paymentStatus === 'rejected'
  const cancelled = chargeStatus === 'cancelled'
  const refundable = chargeStatus === 'refundpending'
  const financingPending = financingRequest?.status === 1
  const financingApproved = financingRequest?.status === 2
  const payable = !paid && !cancelled && !refundable && !financingPending
  const paymentBlockedByDebt = payable && Boolean(earlierDebt)
  const canFinance = Boolean(
    payable &&
    !locked &&
    financingEnabled &&
    charge.isFinanceable &&
    !charge.financingRequestId &&
    !financingPending &&
    !financingApproved,
  )
  const amount = paid ? Number(charge.finalAmountPaid || charge.finalAmount) : Number(charge.finalAmount)

  return (
    <Card className={`overflow-hidden p-0 ${overdue ? 'ring-1 ring-red-300 dark:ring-red-800' : ''}`}>
      <div className={`h-1 ${paid ? 'bg-emerald-500' : overdue ? 'bg-red-500' : locked ? 'bg-amber-500' : 'bg-blue-500'}`} />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{formatDisplayName(charge.courseName, 'Curso')}</h3>
              <ChargeTypeBadge charge={charge} />
              {charge.financingInstallmentNumber && (
                <Badge variant="info">
                  Financiación {charge.financingInstallmentNumber}/{charge.financingInstallmentCount}
                </Badge>
              )}
              <StatusBadge paymentStatus={paymentStatus} chargeStatus={chargeStatus} />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {String(charge.month).padStart(2, '0')}/{charge.year} - Vence {formatDate(charge.dueDateUtc)}
            </p>
            {charge.studentFullName && (
              <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                charge.isOwnCharge === false
                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                Alumno: {charge.studentFullName}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-xl font-black sm:text-2xl ${overdue ? 'text-red-600 dark:text-red-300' : 'text-slate-950 dark:text-white'}`}>
              {money(amount)}
            </p>
            {paid && charge.paymentMethodNameSnapshot && (
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                {charge.paymentMethodNameSnapshot}
              </p>
            )}
          </div>
        </div>

        <ChargeBadges charge={charge} />

        {charge.detailItems && charge.detailItems.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-2 flex justify-between text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              <span>Detalle</span>
              <span>Monto</span>
            </div>
            <div className="space-y-1">
              {charge.detailItems.slice(0, 3).map((detail) => (
                <Row key={detail.id} label={detail.description} value={money(detail.amount)} />
              ))}
              {charge.detailItems.length > 3 && (
                <p className="pt-1 text-xs font-semibold text-slate-400">+{charge.detailItems.length - 3} items mas</p>
              )}
            </div>
          </div>
        )}

        {rejected && charge.reviewNote?.trim() && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-[10px] font-black uppercase text-red-500">Motivo del rechazo</p>
            <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">{charge.reviewNote}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {payable && (
            <Button size="sm" disabled={locked || paymentBlockedByDebt} onClick={onPay} className="bg-blue-600 text-white hover:bg-blue-500">
              {locked ? 'En revisión' : paymentBlockedByDebt ? 'Pago bloqueado' : rejected ? 'Reintentar pago' : 'Pagar'}
            </Button>
          )}
          {canFinance && (
            <Button variant="outline" size="sm" onClick={onFinance}>
              Solicitar financiación
            </Button>
          )}
          {financingPending && <Badge variant="warning">Financiación pendiente</Badge>}
          {financingApproved && <Badge variant="success">Financiación aprobada</Badge>}
          <Button variant="outline" size="sm" onClick={onDetail}>Detalle</Button>
          {charge.transferProofImageUrl && charge.paymentId && (
            <Button variant="outline" size="sm" onClick={onProof}>Comprobante</Button>
          )}
        </div>
        {paymentBlockedByDebt && earlierDebt && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Primero resolvé la cuota anterior que vence el {formatDate(earlierDebt.dueDateUtc)}.
          </p>
        )}
      </div>
    </Card>
  )
}

function ChargeDetailModal({ charge, onClose }: { charge: StudentBilling; onClose: () => void }) {
  const paymentStatus = normalizePaymentStatus(charge.paymentStatus)
  const chargeStatus = normalizeChargeStatus(charge.chargeStatus)
  const paid = paymentStatus === 'approved' || chargeStatus === 'paid'
  const paidAmount = Number(charge.finalAmountPaid || 0)
  const { companies, activeCompanySlug } = useAuth()
  const activeCompany = companies?.find((company: any) => (company.slug ?? company.companySlug) === activeCompanySlug)
  const companyLogo = imgUrl(activeCompany?.logoUrl || activeCompany?.LogoUrl || '') || ''
  const detailItems = charge.detailItems ?? []

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalle de cuota"
      className="sm:max-w-2xl"
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-3">
            {companyLogo && <img src={companyLogo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />}
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{activeCompany?.name || 'Empresa'}</div>
              <div className="text-xs text-slate-400">{formatDisplayName(charge.courseName, 'Curso')}</div>
            </div>
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <ChargeTypeBadge charge={charge} />
              <StatusBadge paymentStatus={paymentStatus} chargeStatus={chargeStatus} />
            </div>
          </div>

          {charge.studentFullName && (
            <div className="mb-3 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200">
              Cuota de {charge.studentFullName}
            </div>
          )}

          {detailItems.length > 0 && (
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-1 font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <span>Descripcion</span>
                <span>Monto</span>
              </div>
              {detailItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                  <span className="min-w-0">{item.description}</span>
                  <span className="shrink-0 font-semibold">{money(item.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {detailItems.length === 0 && (
            <div className="space-y-1 text-sm">
              <BreakdownRow label="Precio base" value={charge.basePrice} />
              {Number(charge.scholarshipDiscountAmount) > 0 && (
                <BreakdownRow label={`Beca${charge.scholarshipName ? ` (${charge.scholarshipName})` : ''}`} value={-Number(charge.scholarshipDiscountAmount)} color="text-violet-600 dark:text-violet-300" />
              )}
              {Number(charge.siblingDiscountAmount) > 0 && (
                <BreakdownRow label="Dto. hermano" value={-Number(charge.siblingDiscountAmount)} color="text-cyan-600 dark:text-cyan-300" />
              )}
              {Number(charge.lateChargeAmount) > 0 && (
                <BreakdownRow label="Recargo mora" value={Number(charge.lateChargeAmount)} color="text-red-600 dark:text-red-300" />
              )}
              {Number(charge.paymentMethodSurchargeAmount) > 0 && (
                <BreakdownRow label="Recargo metodo de pago" value={Number(charge.paymentMethodSurchargeAmount)} color="text-amber-600 dark:text-amber-300" />
              )}
            </div>
          )}

          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <span>Total</span>
            <span>{money(charge.finalAmount)}</span>
          </div>

          {paid && paidAmount > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">Pagado</span>
                <span className="font-black text-emerald-800 dark:text-emerald-200">{money(paidAmount)}</span>
              </div>
              {charge.paymentMethodNameSnapshot && (
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Medio: {charge.paymentMethodNameSnapshot}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabelValue label="Curso" value={charge.courseName} />
          <LabelValue label="Periodo" value={`${charge.month}/${charge.year}`} />
          <LabelValue label="Vencimiento" value={formatDate(charge.dueDateUtc)} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</div>
            <div className="mt-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge paymentStatus={paymentStatus} chargeStatus={chargeStatus} />
              </div>
            </div>
          </div>
        </div>

        {charge.reviewNote?.trim() && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notas</div>
            <div className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{charge.reviewNote}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function FinancingRequestModal({
  charge,
  config,
  submitting,
  onClose,
  onSubmit,
}: {
  charge: StudentBilling
  config: FinancingConfig
  submitting: boolean
  onClose: () => void
  onSubmit: (installments: number, frequency: number) => void
}) {
  const frequencies = [
    config.allowWeekly && { value: 1, label: 'Semanal', rate: config.weeklyInterestRate },
    config.allowBiweekly && { value: 2, label: 'Quincenal', rate: config.biweeklyInterestRate },
    config.allowMonthly && { value: 3, label: 'Mensual', rate: config.monthlyInterestRate },
  ].filter(Boolean) as { value: number; label: string; rate: number }[]
  const maxInstallments = Math.max(2, Number(charge.maxFinancingInstallments || 2))
  const configuredPlans = config.installmentRates?.length
    ? config.installmentRates
    : [
        { installmentCount: 2, interestRate: Number(config.interestRate2 || 0) },
        { installmentCount: 3, interestRate: Number(config.interestRate3 || 0) },
        { installmentCount: 4, interestRate: Number(config.interestRate4 || 0) },
        { installmentCount: 6, interestRate: Number(config.interestRate6 || 0) },
      ]
  const installmentOptions = configuredPlans
    .filter((plan) => plan.installmentCount <= maxInstallments)
    .sort((a, b) => a.installmentCount - b.installmentCount)
  const [frequency, setFrequency] = useState(frequencies[0]?.value ?? 3)
  const [installments, setInstallments] = useState(installmentOptions[0]?.installmentCount ?? 0)
  const selectedFrequency = frequencies.find((item) => item.value === frequency)
  const installmentRates = Object.fromEntries(
    configuredPlans.map((plan) => [plan.installmentCount, Number(plan.interestRate || 0)]),
  ) as Record<number, number>
  const frequencyRate = Number(selectedFrequency?.rate || 0)
  const installmentRate = installmentRates[installments] || 0
  const interestRate = frequencyRate + installmentRate
  const interest = Number(charge.finalAmount) * interestRate / 100
  const total = Number(charge.finalAmount) + interest
  const installmentAmount = total / installments

  return (
    <Modal
      open
      onClose={onClose}
      title="Solicitar financiación"
      description={`${formatDisplayName(charge.chargeTypeName, 'Cuota')} - ${money(charge.finalAmount)}`}
      className="sm:max-w-lg"
    >
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Frecuencia
            </label>
            <Select
              value={frequency}
              onChange={(event) => setFrequency(Number(event.target.value))}
            >
              {frequencies.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} · cada {item.value === 1 ? '7 días' : item.value === 2 ? '14 días' : 'mes'} · {item.rate}%
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Cantidad de cuotas
            </label>
            <Select
              value={installments}
              onChange={(event) => setInstallments(Number(event.target.value))}
            >
              {installmentOptions.map((plan) => (
                <option key={plan.installmentCount} value={plan.installmentCount}>
                  {plan.installmentCount} cuotas · +{plan.interestRate || 0}%
                </option>
              ))}
            </Select>
            {installmentOptions.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                No hay cantidades configuradas para el máximo de esta cuota.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="space-y-2 text-sm">
            <Row label="Monto original" value={money(charge.finalAmount)} />
            <Row label={`Por frecuencia (${frequencyRate}%)`} value="" />
            <Row label={`Por ${installments} cuotas (${installmentRate}%)`} value="" />
            <Row label={`Interés total (${interestRate}%)`} value={`+${money(interest)}`} />
            <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
              <Row label="Total financiado" value={money(total)} className="font-black text-slate-950 dark:text-white" />
              <Row
                label={`${installments} cuotas · frecuencia ${selectedFrequency?.label.toLowerCase() || ''}`}
                value={`${money(installmentAmount)} c/u`}
                className="font-bold text-blue-700 dark:text-blue-300"
              />
            </div>
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          La solicitud queda pendiente de aprobación. Al aprobarse se activa la primera cuota; las siguientes aparecen según la frecuencia elegida y cada una tiene su propio vencimiento.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={() => onSubmit(installments, frequency)}
            loading={submitting}
            disabled={installmentOptions.length === 0}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-500"
          >
            Solicitar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function PaymentMethodModal({
  open,
  item,
  methods,
  method,
  preview,
  onClose,
  onSelect,
  onContinue,
}: {
  open: boolean
  item?: StudentBilling
  methods: PaymentMethod[]
  method: PaymentMethod | null
  preview: { base: number; surcharge: number; total: number } | null
  onClose: () => void
  onSelect: (method: PaymentMethod) => void
  onContinue: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Pagar cuota" description={item ? `${item.courseName} - ${String(item.month).padStart(2, '0')}/${item.year}` : ''} className="sm:max-w-md">
      <div className="space-y-3 p-5">
        {methods.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            No hay medios de pago habilitados.
          </div>
        ) : methods.map((paymentMethod) => {
          const base = Number(item?.finalAmount || 0)
          const surcharge = calculateSurcharge(base, paymentMethod)
          const active = method?.companyPaymentMethodId === paymentMethod.companyPaymentMethodId
          return (
            <button
              key={paymentMethod.companyPaymentMethodId}
              type="button"
              onClick={() => onSelect(paymentMethod)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                active
                  ? 'border-blue-300 bg-blue-50 shadow-sm dark:border-blue-700 dark:bg-blue-950/30'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{paymentMethod.displayName || paymentMethod.paymentMethodName || paymentMethod.name || 'Medio de pago'}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{surcharge > 0 ? `Recargo: +${money(surcharge)}` : 'Sin recargo'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">{money(base + surcharge)}</p>
                </div>
              </div>
            </button>
          )
        })}

        {method && preview && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-black uppercase text-slate-500">Resumen</p>
            <div className="mt-3 space-y-1.5 text-sm">
              <Row label="Cuota" value={money(preview.base)} />
              {preview.surcharge > 0 && <Row label="Recargo" value={`+${money(preview.surcharge)}`} className="text-amber-600 dark:text-amber-300" />}
              <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                <Row label="Total a pagar" value={money(preview.total)} className="text-lg font-black text-slate-950 dark:text-white" />
              </div>
            </div>
            <Button onClick={onContinue} className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-500">
              Continuar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function TransferModal({
  open,
  item,
  transfer,
  preview,
  file,
  copied,
  fileRef,
  submitting,
  onClose,
  onBack,
  onFile,
  onSubmit,
  onCopy,
}: {
  open: boolean
  item?: StudentBilling
  transfer: { alias: string; cbu: string; holder: string; bank: string; notes: string }
  preview: { total: number } | null
  file: File | null
  copied: boolean
  fileRef: React.RefObject<HTMLInputElement | null>
  submitting: boolean
  onClose: () => void
  onBack: () => void
  onFile: (file: File | null) => void
  onSubmit: () => void
  onCopy: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Transferencia" description={item ? `${item.courseName} - ${money(preview?.total || item.finalAmount)}` : ''} className="sm:max-w-lg">
      <div className="space-y-4 p-5">
        <InfoCard label="Alias" value={transfer.alias || 'No configurado'} copy={transfer.alias ? onCopy : undefined} copied={copied} />
        {transfer.cbu && <InfoCard label="CBU / CVU" value={transfer.cbu} />}
        {transfer.holder && <InfoCard label="Titular" value={transfer.holder} />}
        {transfer.bank && <InfoCard label="Banco" value={transfer.bank} />}
        {transfer.notes && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">Notas</p>
            <p className="mt-0.5 whitespace-pre-line text-sm text-blue-800 dark:text-blue-200">{transfer.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Comprobante de pago</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Imagen o PDF, máximo 5 MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="mt-3 w-full justify-center"
          >
            Subir comprobante
          </Button>
          {file && (
            <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400" title={file.name}>
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onBack} className="flex-1">Volver</Button>
          <Button onClick={onSubmit} disabled={!file} loading={submitting} className="flex-1 bg-blue-600 text-white hover:bg-blue-500">
            Enviar comprobante
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ProofModal({
  open,
  loading,
  proofView,
  onClose,
}: {
  open: boolean
  loading: boolean
  proofView: { url: string; fileName: string; isImage: boolean; isPdf: boolean } | null | undefined
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Comprobante" className="sm:max-w-4xl">
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-blue-600" /></div>
      ) : proofView?.url ? (
        <>
          <div className="flex justify-end border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <a href={proofView.url} download={proofView.fileName} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Descargar
            </a>
          </div>
          <div className="bg-slate-100 p-4 dark:bg-slate-800">
            {proofView.isImage ? (
              <img src={proofView.url} alt="Comprobante" className="mx-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-sm" />
            ) : proofView.isPdf ? (
              <iframe src={proofView.url} title="PDF" className="h-[72vh] w-full rounded-lg border-0" />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No se puede previsualizar este archivo.</p>
            )}
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-sm text-slate-400">No hay comprobante disponible.</div>
      )}
    </Modal>
  )
}

function ChargeTypeBadge({ charge }: { charge: StudentBilling }) {
  const chargeTypeName = resolveChargeTypeName(charge)
  if (charge.isRefund) return <Badge variant="warning">Devolucion</Badge>
  if (chargeTypeName) return <Badge variant="info">{formatDisplayName(chargeTypeName)}</Badge>
  if (charge.isCustom) return <Badge variant="violet">Custom</Badge>
  return <Badge variant="default">Mensual</Badge>
}

function resolveChargeTypeName(charge: StudentBilling): string {
  const explicitName = String(charge.chargeTypeName || '').trim()
  if (explicitName) return explicitName

  const firstDetail = charge.detailItems?.find((item) => String(item.description || '').trim())
  const detailName = String(firstDetail?.description || '').trim()
  if (detailName && !isDefaultMonthlyDetailName(detailName)) return detailName

  return ''
}

function isDefaultMonthlyDetailName(value: string) {
  const normalized = value.toLowerCase().trim()
  return normalized === 'mensual' || normalized === 'cuota mensual' || normalized === 'precio base'
}

function StatusBadge({ paymentStatus, chargeStatus }: { paymentStatus: string; chargeStatus: string }) {
  if (paymentStatus === 'approved') return <Badge variant="success">Pagada</Badge>
  if (paymentStatus === 'rejected') return <Badge variant="danger">Rechazada</Badge>
  if (paymentStatus === 'inreview') return <Badge variant="warning">En revision</Badge>
  if (chargeStatus === 'paid') return <Badge variant="success">Pagada</Badge>
  if (chargeStatus === 'overdue') return <Badge variant="danger">Vencida</Badge>
  if (chargeStatus === 'cancelled') return <Badge variant="default">Cancelada</Badge>
  if (chargeStatus === 'refundpending') return <Badge variant="warning">Pend. aprobacion</Badge>
  return <Badge variant="warning">Pendiente</Badge>
}

function ChargeBadges({ charge }: { charge: StudentBilling }) {
  const hasAny =
    Number(charge.lateChargeAmount) > 0 ||
    Number(charge.siblingDiscountAmount) > 0 ||
    Number(charge.scholarshipDiscountAmount) > 0 ||
    Number(charge.paymentMethodSurchargeAmount) > 0

  if (!hasAny) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {Number(charge.lateChargeAmount) > 0 && <Badge variant="danger">Mora +{money(charge.lateChargeAmount)}</Badge>}
      {Number(charge.siblingDiscountAmount) > 0 && <Badge variant="info">Hermanos -{money(charge.siblingDiscountAmount)}</Badge>}
      {Number(charge.scholarshipDiscountAmount) > 0 && <Badge variant="violet">Beca -{money(charge.scholarshipDiscountAmount)}</Badge>}
      {Number(charge.paymentMethodSurchargeAmount) > 0 && <Badge variant="warning">Recargo +{money(charge.paymentMethodSurchargeAmount)}</Badge>}
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'amber' | 'red' }) {
  const colors = {
    emerald: 'text-emerald-600 dark:text-emerald-300',
    amber: 'text-amber-600 dark:text-amber-300',
    red: 'text-red-600 dark:text-red-300',
  }
  return (
    <Card className="p-3">
      <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-sm font-black sm:text-lg ${colors[tone]}`}>{value}</div>
    </Card>
  )
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className || 'text-slate-700 dark:text-slate-300'}`}>
      <span className="min-w-0 truncate text-sm">{label}</span>
      <span className="shrink-0 text-sm font-bold">{value}</span>
    </div>
  )
}

function BreakdownRow({ label, value, color }: { label: string; value: number | null | undefined; color?: string }) {
  const amount = Number(value || 0)
  return (
    <div className={`flex justify-between gap-3 ${color ?? 'text-slate-700 dark:text-slate-300'}`}>
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 font-bold">{amount >= 0 ? money(amount) : `-${money(Math.abs(amount))}`}</span>
    </div>
  )
}

function InfoCard({ label, value, copy, copied }: { label: string; value: string; copy?: () => void; copied?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className="mt-0.5 break-all text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        {copy && (
          <button
            type="button"
            onClick={copy}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              copied
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  )
}

function calculateSurcharge(base: number, method: PaymentMethod) {
  const type = String(method.surchargeType || '').toLowerCase()
  const value = Number(method.surchargeValue || 0)
  if (value <= 0) return 0
  if (type === 'percentage') return Math.round((base * value / 100) * 100) / 100
  if (type === 'fixedamount' || type === 'fixed') return value
  return 0
}

export default function StudentPaymentsPage() {
  return (
    <ToastProvider>
      <PaymentPageInner />
    </ToastProvider>
  )
}
