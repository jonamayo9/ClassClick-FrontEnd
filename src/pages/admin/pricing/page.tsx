import { useState, useRef, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/ui/select'
import {
  useCourses, useCompanySettings, usePaymentSettings, useCoursePricings,
  useLatePaymentConfigs, useSiblingDiscounts, useScholarships,
  useScholarshipAssignments, useAssignScholarship, useStudentScholarships,
  useDeactivateScholarship, useAllStudents, usePaymentMethods,
  useSavePaymentMethods, useMercadoPagoStatus, useMercadoPagoConnectUrl,
  useDisconnectMercadoPago, useCreatePricing, useDeletePricing,
  useCreateLateFee, useUpdateLateFee, useDeleteLateFee,
  useCreateSiblingDiscount, useDeleteSiblingDiscount,
  useCreateScholarship, useSavePaymentSettings,
  money, formatDate, formatDateShort, recurrenceLabel,
  LATE_FEE_RECURRENCE,
} from './hooks'
import type {
  Course, CoursePricing, LatePaymentConfig, SiblingDiscount, Scholarship,
  PaymentMethodDetail, PaymentSettings, ScholarshipAssignment, Student,
  MercadoPagoStatus,
} from './hooks'

const DISCOUNT_TYPE = { PERCENTAGE: 1, FIXED_AMOUNT: 2 } as const
const SCHOLARSHIP_TYPES = [
  { value: DISCOUNT_TYPE.PERCENTAGE, label: 'Porcentaje' },
  { value: DISCOUNT_TYPE.FIXED_AMOUNT, label: 'Monto fijo' },
]

type TabKey = 'summary' | 'charges' | 'pricing' | 'promotions' | 'lateFees' | 'payments'

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('summary')
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  const [editSettings, setEditSettings] = useState(false)
  const [editLateFeeId, setEditLateFeeId] = useState<string | null>(null)
  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false)
  const [showScholarshipsModal, setShowScholarshipsModal] = useState(false)
  const [showAssignScholarshipModal, setShowAssignScholarshipModal] = useState(false)
  const [showStudentScholarshipsModal, setShowStudentScholarshipsModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; confirmText: string; onConfirm: () => void } | null>(null)

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  const { data: courses = [] } = useCourses()
  const { data: companySettings } = useCompanySettings()
  const { data: paymentSettings, isLoading: psLoading } = usePaymentSettings()
  const { data: pricings = [], isLoading: prLoading } = useCoursePricings()
  const { data: lateFees = [], isLoading: lfLoading } = useLatePaymentConfigs()
  const { data: siblingDiscounts = [], isLoading: sdLoading } = useSiblingDiscounts()
  const { data: scholarships = [], isLoading: schLoading } = useScholarships()
  const { data: scholarshipAssignments = [], isLoading: saLoading } = useScholarshipAssignments()
  const { data: students = [] } = useAllStudents()
  const { data: pMethods = [], isLoading: pmLoading } = usePaymentMethods()
  const { data: mpStatus, isLoading: mpStatusLoading } = useMercadoPagoStatus()

  const savePricingMutation = useCreatePricing()
  const deletePricingMutation = useDeletePricing()
  const saveLateFeeMutation = useCreateLateFee()
  const updateLateFeeMutation = useUpdateLateFee()
  const deleteLateFeeMutation = useDeleteLateFee()
  const saveSiblingMutation = useCreateSiblingDiscount()
  const deleteSiblingMutation = useDeleteSiblingDiscount()
  const saveScholarshipMutation = useCreateScholarship()
  const assignScholarshipMutation = useAssignScholarship()
  const deactivateScholarshipMutation = useDeactivateScholarship()
  const savePaymentMethodsMutation = useSavePaymentMethods()
  const savePaymentSettingsMutation = useSavePaymentSettings()
  const mpConnectMutation = useMercadoPagoConnectUrl()
  const mpDisconnectMutation = useDisconnectMercadoPago()

  const totals = {
    companyName: companySettings?.name || '-',
    generationDay: paymentSettings?.generationDayOfMonth ?? '-',
    dueDay: paymentSettings?.dueDayOfMonth ?? '-',
    pricingsCount: pricings.length,
    lateFeesActive: lateFees.filter((l) => l.isActive).length,
    siblingsCount: siblingDiscounts.length,
    scholarshipsCount: scholarships.length,
    assignmentsCount: scholarshipAssignments.length,
    activePaymentMethods: pMethods.filter((m) => m.isEnabledByAdmin && m.enabledBySuperAdmin).length,
    activeNames: pMethods.filter((m) => m.isEnabledByAdmin && m.enabledBySuperAdmin).map((m) => m.displayName).join(', '),
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'summary', label: 'Resumen rápido' },
    { key: 'charges', label: 'Cuotas' },
    { key: 'pricing', label: 'Precios' },
    { key: 'promotions', label: 'Promociones' },
    { key: 'lateFees', label: 'Vencimientos y moras' },
    { key: 'payments', label: 'Pagos' },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Configuración de pagos</h1>
            <p className="mt-1 text-sm text-emerald-200 sm:mt-1.5 sm:text-base">Administrá precios, vencimientos, promociones y medios de pago</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" className="shadow-lg">Actualizar</Button>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex min-w-max gap-1.5">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition ${
                activeTab === t.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && <SummarySection totals={totals} />}

      {activeTab === 'charges' && (
        <ChargesSection paymentSettings={paymentSettings} psLoading={psLoading}
          editSettings={editSettings} setEditSettings={setEditSettings}
          saveMutation={savePaymentSettingsMutation} toast={toast} />
      )}

      {activeTab === 'pricing' && (
        <PricingSection courses={courses} pricings={pricings} prLoading={prLoading}
          saveMutation={savePricingMutation} deleteMutation={deletePricingMutation}
          toast={toast} setConfirmAction={setConfirmAction} />
      )}

      {activeTab === 'promotions' && (
        <PromotionsSection siblingDiscounts={siblingDiscounts} sdLoading={sdLoading}
          scholarships={scholarships} schLoading={schLoading} scholarshipAssignments={scholarshipAssignments}
          saLoading={saLoading}
          saveSiblingMutation={saveSiblingMutation} deleteSiblingMutation={deleteSiblingMutation}
          onOpenScholarships={() => setShowScholarshipsModal(true)}
          onOpenAssign={() => setShowAssignScholarshipModal(true)}
          onOpenViewAssignments={() => setShowStudentScholarshipsModal(true)}
          toast={toast} setConfirmAction={setConfirmAction} />
      )}

      {activeTab === 'lateFees' && (
        <LateFeesSection courses={courses} lateFees={lateFees} lfLoading={lfLoading}
          editId={editLateFeeId} setEditId={setEditLateFeeId}
          saveMutation={saveLateFeeMutation} updateMutation={updateLateFeeMutation}
          deleteMutation={deleteLateFeeMutation}
          toast={toast} setConfirmAction={setConfirmAction} />
      )}

      {activeTab === 'payments' && (
        <PaymentsSection pMethods={pMethods} pmLoading={pmLoading} mpStatus={mpStatus}
          mpStatusLoading={mpStatusLoading}
          onOpenPaymentMethods={() => setShowPaymentMethodsModal(true)}
          mpConnectMutation={mpConnectMutation} mpDisconnectMutation={mpDisconnectMutation}
          toast={toast} />
      )}

      {showPaymentMethodsModal && (
        <PaymentMethodsModal pMethods={pMethods}
          saveMutation={savePaymentMethodsMutation}
          onClose={() => setShowPaymentMethodsModal(false)} toast={toast} />
      )}

      {showScholarshipsModal && (
        <ScholarshipsModal scholarships={scholarships}
          saveMutation={saveScholarshipMutation}
          onClose={() => setShowScholarshipsModal(false)} toast={toast} />
      )}

      {showAssignScholarshipModal && (
        <AssignScholarshipModal students={students} scholarships={scholarships}
          assignMutation={assignScholarshipMutation}
          onClose={() => setShowAssignScholarshipModal(false)} toast={toast} />
      )}

      {showStudentScholarshipsModal && (
        <StudentScholarshipsModal
          deactivateMutation={deactivateScholarshipMutation}
          onClose={() => setShowStudentScholarshipsModal(false)} toast={toast} />
      )}

      {confirmAction && (
        <ConfirmModal title={confirmAction.title} message={confirmAction.message}
          confirmText={confirmAction.confirmText} onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)} />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:right-4 sm:left-auto sm:top-4 sm:bottom-auto sm:items-end sm:p-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Summary ─── */
interface PricingSummary {
  companyName: string
  generationDay: number | string
  dueDay: number | string
  pricingsCount: number
  lateFeesActive: number
  siblingsCount: number
  scholarshipsCount: number
  assignmentsCount: number
  activePaymentMethods: number
  activeNames: string
}

function SummarySection({ totals }: { totals: PricingSummary }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Resumen rápido</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Estado general de la configuración de pagos.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBox label="Empresa" value={totals.companyName} />
        <StatBox label="Cuotas" value={`Generación día ${totals.generationDay}`} sub={`Vencimiento día ${totals.dueDay}`} />
        <StatBox label="Precios" value={`${totals.pricingsCount} configurados`} />
        <StatBox label="Moras" value={`${totals.lateFeesActive} activas`} />
        <StatBox label="Hermanos" value={`${totals.siblingsCount} descuentos`} />
        <StatBox label="Becas" value={`${totals.scholarshipsCount} tipos`} sub={`${totals.assignmentsCount} asignadas`} />
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800 md:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Medios de pago</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{totals.activePaymentMethods} activos</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {totals.activePaymentMethods > 0 ? totals.activeNames : 'Sin medios activos'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

/* ─── Charges (Cuotas) ─── */
function ChargesSection({ paymentSettings, psLoading, editSettings, setEditSettings, saveMutation, toast }: {
  paymentSettings: PaymentSettings | undefined; psLoading: boolean
  editSettings: boolean; setEditSettings: (v: boolean) => void
  saveMutation: ReturnType<typeof useSavePaymentSettings>; toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [form, setForm] = useState<PaymentSettings>({
    autoGenerateEnabled: false, generationDayOfMonth: null, generationHourUtc: null,
    dueDayOfMonth: null, currentMonthChargeWindowStartDay: null,
    currentMonthChargeWindowEndDay: null,
    newStudentRespectOriginalDueDateForLateFee: null,
    newStudentLateFeeGraceDays: null, lastAutoGenerationUtc: null,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (paymentSettings) {
      setForm({
        autoGenerateEnabled: paymentSettings.autoGenerateEnabled,
        generationDayOfMonth: paymentSettings.generationDayOfMonth,
        generationHourUtc: paymentSettings.generationHourUtc,
        dueDayOfMonth: paymentSettings.dueDayOfMonth,
        currentMonthChargeWindowStartDay: paymentSettings.currentMonthChargeWindowStartDay,
        currentMonthChargeWindowEndDay: paymentSettings.currentMonthChargeWindowEndDay,
        newStudentRespectOriginalDueDateForLateFee: paymentSettings.newStudentRespectOriginalDueDateForLateFee,
        newStudentLateFeeGraceDays: paymentSettings.newStudentLateFeeGraceDays,
        lastAutoGenerationUtc: paymentSettings.lastAutoGenerationUtc,
      })
    }
  }, [paymentSettings])

  async function handleEnableEdit() { setEditSettings(true); setError('') }

  async function handleCancelEdit() {
    setEditSettings(false); setError('')
    if (paymentSettings) {
      setForm({
        autoGenerateEnabled: paymentSettings.autoGenerateEnabled,
        generationDayOfMonth: paymentSettings.generationDayOfMonth,
        generationHourUtc: paymentSettings.generationHourUtc,
        dueDayOfMonth: paymentSettings.dueDayOfMonth,
        currentMonthChargeWindowStartDay: paymentSettings.currentMonthChargeWindowStartDay,
        currentMonthChargeWindowEndDay: paymentSettings.currentMonthChargeWindowEndDay,
        newStudentRespectOriginalDueDateForLateFee: paymentSettings.newStudentRespectOriginalDueDateForLateFee,
        newStudentLateFeeGraceDays: paymentSettings.newStudentLateFeeGraceDays,
        lastAutoGenerationUtc: paymentSettings.lastAutoGenerationUtc,
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try {
      await saveMutation.mutateAsync(form)
      setEditSettings(false)
      toast('Configuración guardada correctamente.')
    } catch { setError('Error al guardar la configuración.'); toast('Error al guardar.', 'error') }
  }

  const showGraceDays = form.newStudentRespectOriginalDueDateForLateFee === false

  if (psLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />

  return (
    <Card className="p-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Generación automática de cuotas</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configurá cuándo se generan las cuotas y cuándo vencen.</p>
      </div>

      {!editSettings ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingsDisplay label="Generación automática" value={form.autoGenerateEnabled ? 'Habilitada' : 'Deshabilitada'} />
            <SettingsDisplay label="Día de generación" value={form.generationDayOfMonth ? `Día ${form.generationDayOfMonth}` : '-'} />
            <SettingsDisplay label="Hora generación (UTC)" value={form.generationHourUtc != null ? `${form.generationHourUtc}:00` : '-'} />
            <SettingsDisplay label="Día de vencimiento" value={form.dueDayOfMonth ? `Día ${form.dueDayOfMonth}` : '-'} />
            <SettingsDisplay label="Cobro mes actual" value={
              form.currentMonthChargeWindowStartDay && form.currentMonthChargeWindowEndDay
                ? `Día ${form.currentMonthChargeWindowStartDay} al ${form.currentMonthChargeWindowEndDay}`
                : '-'
            } />
            <SettingsDisplay label="Última generación" value={formatDate(form.lastAutoGenerationUtc)} />
          </div>
          <Button variant="outline" size="sm" onClick={handleEnableEdit}>Editar</Button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <input type="checkbox" checked={form.autoGenerateEnabled}
              onChange={(e) => setForm({ ...form, autoGenerateEnabled: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generar cuotas automáticamente</span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día de generación</label>
              <Input type="number" min={1} max={28} value={form.generationDayOfMonth ?? ''}
                onChange={(e) => setForm({ ...form, generationDayOfMonth: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Hora generación (UTC)</label>
              <Input type="number" min={0} max={23} value={form.generationHourUtc ?? 3}
                onChange={(e) => setForm({ ...form, generationHourUtc: e.target.value ? Number(e.target.value) : 3 })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día de vencimiento</label>
              <Input type="number" min={1} max={31} value={form.dueDayOfMonth ?? ''}
                onChange={(e) => setForm({ ...form, dueDayOfMonth: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cobrar mes actual desde día</label>
              <Input type="number" min={1} max={31} value={form.currentMonthChargeWindowStartDay ?? ''}
                onChange={(e) => setForm({ ...form, currentMonthChargeWindowStartDay: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Hasta día</label>
              <Input type="number" min={1} max={31} value={form.currentMonthChargeWindowEndDay ?? ''}
                onChange={(e) => setForm({ ...form, currentMonthChargeWindowEndDay: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <input type="checkbox" checked={form.newStudentRespectOriginalDueDateForLateFee ?? true}
              onChange={(e) => setForm({ ...form, newStudentRespectOriginalDueDateForLateFee: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Respetar vencimiento original para alumnos nuevos</span>
          </label>

          {showGraceDays && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Días de gracia alumnos nuevos</label>
              <Input type="number" min={0} value={form.newStudentLateFeeGraceDays ?? ''}
                onChange={(e) => setForm({ ...form, newStudentLateFeeGraceDays: e.target.value ? Number(e.target.value) : null })} />
            </div>
          )}

          <p className="text-sm text-slate-500">Última generación: {formatDate(form.lastAutoGenerationUtc)}</p>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="sm" loading={saveMutation.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">Guardar configuración</Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>Cancelar</Button>
          </div>
        </form>
      )}
    </Card>
  )
}

function SettingsDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

/* ─── Pricing (Course pricing CRUD) ─── */
function PricingSection({ courses, pricings, prLoading, saveMutation, deleteMutation, toast, setConfirmAction }: {
  courses: Course[]; pricings: CoursePricing[]; prLoading: boolean
  saveMutation: ReturnType<typeof useCreatePricing>; deleteMutation: ReturnType<typeof useDeletePricing>
  toast: (msg: string, type?: 'success' | 'error') => void
  setConfirmAction: (a: { title: string; message: string; confirmText: string; onConfirm: () => void } | null) => void
}) {
  const [courseId, setCourseId] = useState('')
  const [classesPerWeek, setClassesPerWeek] = useState(1)
  const [price, setPrice] = useState(0)
  const [error, setError] = useState('')

  function resetForm() { setCourseId(''); setClassesPerWeek(1); setPrice(0); setError('') }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!courseId) { setError('Seleccioná un curso.'); return }
    if (price <= 0) { setError('El precio debe ser mayor a 0.'); return }
    try {
      await saveMutation.mutateAsync({ courseId, classesPerWeek, price })
      resetForm()
      toast('Precio guardado correctamente.')
    } catch { setError('Error al guardar el precio.'); toast('Error al guardar.', 'error') }
  }

  function handleDelete(id: string, courseName: string) {
    setConfirmAction({
      title: 'Eliminar precio',
      message: `¿Querés eliminar el precio para ${courseName}?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try { await deleteMutation.mutateAsync(id); toast('Precio eliminado.'); setConfirmAction(null) }
        catch { toast('Error al eliminar.', 'error'); setConfirmAction(null) }
      },
    })
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <Card className="w-full shrink-0 p-5 xl:w-80">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Precios por curso y frecuencia</h2>
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso</label>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="">Seleccionar curso</option>
              {courses.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Clases por semana</label>
            <Input type="number" min={1} value={classesPerWeek}
              onChange={(e) => setClassesPerWeek(Number(e.target.value) || 1)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Precio</label>
            <Input type="number" min={0} step="0.01" value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)} />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}
          <Button type="submit" size="sm" loading={saveMutation.isPending}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700">Guardar precio</Button>
        </form>
      </Card>

      <Card className="min-w-0 flex-1 p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Precios configurados</h2>
        <div className="mt-4">
          {prLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
          ) : pricings.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">Todavía no hay precios configurados.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Frecuencia</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pricings.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.courseName}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.classesPerWeek} clase(s)/sem</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{money(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          onClick={() => handleDelete(p.id, p.courseName)}>Eliminar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

/* ─── Promotions (Sibling discounts + Scholarships) ─── */
function PromotionsSection({ siblingDiscounts, sdLoading, scholarships, schLoading, scholarshipAssignments, saLoading, saveSiblingMutation, deleteSiblingMutation, onOpenScholarships, onOpenAssign, onOpenViewAssignments, toast, setConfirmAction }: {
  siblingDiscounts: SiblingDiscount[]; sdLoading: boolean
  scholarships: Scholarship[]; schLoading: boolean; scholarshipAssignments: ScholarshipAssignment[]; saLoading: boolean
  saveSiblingMutation: ReturnType<typeof useCreateSiblingDiscount>; deleteSiblingMutation: ReturnType<typeof useDeleteSiblingDiscount>
  onOpenScholarships: () => void; onOpenAssign: () => void; onOpenViewAssignments: () => void
  toast: (msg: string, type?: 'success' | 'error') => void
  setConfirmAction: (a: { title: string; message: string; confirmText: string; onConfirm: () => void } | null) => void
}) {
  const [siblingCount, setSiblingCount] = useState(2)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [error, setError] = useState('')

  function resetSiblingForm() { setSiblingCount(2); setDiscountPercent(0); setError('') }

  async function handleSaveSibling(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (siblingCount < 2) { setError('La cantidad mínima de hermanos es 2.'); return }
    if (discountPercent <= 0 || discountPercent > 100) { setError('El descuento debe ser entre 1 y 100.'); return }
    try {
      await saveSiblingMutation.mutateAsync({ siblingCount, discountPercent })
      resetSiblingForm()
      toast('Descuento guardado correctamente.')
    } catch { setError('Error al guardar.'); toast('Error al guardar.', 'error') }
  }

  function handleDeleteSibling(id: string) {
    setConfirmAction({
      title: 'Eliminar descuento',
      message: '¿Querés eliminar este descuento por hermanos?',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try { await deleteSiblingMutation.mutateAsync(id); toast('Descuento eliminado.'); setConfirmAction(null) }
        catch { toast('Error al eliminar.', 'error'); setConfirmAction(null) }
      },
    })
  }

  function scholarshipTypeLabel(type: unknown) {
    const t = Number(type)
    return t === DISCOUNT_TYPE.PERCENTAGE ? 'Porcentaje' : t === DISCOUNT_TYPE.FIXED_AMOUNT ? 'Monto fijo' : '-'
  }

  function scholarshipValueLabel(s: Scholarship | ScholarshipAssignment) {
    const dt = 'discountType' in s ? s.discountType : undefined
    const dv = 'discountValue' in s ? s.discountValue : 0
    return Number(dt) === DISCOUNT_TYPE.PERCENTAGE ? `${dv}%` : money(Number(dv))
  }

  const SCHOLARSHIP_ASSIGNMENTS_PAGE_SIZE = 10
  const [assignmentsPage, setAssignmentsPage] = useState(1)
  const pagedAssignments = scholarshipAssignments.slice(0, assignmentsPage * SCHOLARSHIP_ASSIGNMENTS_PAGE_SIZE)
  const hasMore = pagedAssignments.length < scholarshipAssignments.length

  function loadMoreAssignments() {
    setAssignmentsPage((p) => p + 1)
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      {/* Sibling Discounts */}
      <Card className="w-full shrink-0 p-5 space-y-4 xl:w-96">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Descuentos por hermanos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configurá descuentos automáticos para hermanos.</p>
        </div>

        <form onSubmit={handleSaveSibling} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad mínima de hermanos</label>
            <Input type="number" min={2} value={siblingCount} onChange={(e) => setSiblingCount(Number(e.target.value) || 2)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descuento (%)</label>
            <Input type="number" min={0} max={100} step="0.01" value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)} />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}
          <Button type="submit" size="sm" loading={saveSiblingMutation.isPending}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700">Guardar descuento</Button>
        </form>

        {sdLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : siblingDiscounts.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No hay descuentos configurados.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Hermanos</th>
                  <th className="px-4 py-3">Descuento</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {siblingDiscounts.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{d.siblingCount}+ hermanos</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{d.discountPercent}%</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        onClick={() => handleDeleteSibling(d.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Scholarships */}
      <Card className="min-w-0 flex-1 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Becas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Administrá becas y asignaciones.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap" onClick={onOpenScholarships}>Administrar becas</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatBox label="Tipos de beca" value={String(scholarships.length)} />
          <StatBox label="Becas asignadas" value={String(scholarshipAssignments.length)} />
          <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/20">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Info</p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Las becas permiten aplicar descuentos personalizados por alumno y curso.</p>
          </div>
        </div>

        {schLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : scholarships.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tipos de beca</p>
            {[...scholarships].sort((a, b) => {
              if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
              return (a.name || '').localeCompare(b.name || '')
            }).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {scholarshipTypeLabel(s.discountType)}: {scholarshipValueLabel(s)}
                  </p>
                </div>
                {s.isActive
                  ? <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activa</span>
                  : <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactiva</span>
                }
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onOpenAssign}>Asignar beca</Button>
          <Button variant="outline" size="sm" onClick={onOpenViewAssignments}>Ver becas otorgadas</Button>
        </div>

        {saLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : scholarshipAssignments.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Becas otorgadas</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">{scholarshipAssignments.length}</span>
            </div>
            {pagedAssignments.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{a.studentFullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.scholarshipName} · {scholarshipValueLabel(a)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {a.isGlobal ? 'Global - todos sus cursos' : a.courseName || 'Curso específico'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Desde {formatDateShort(a.startDateUtc)} hasta {a.endDateUtc ? formatDateShort(a.endDateUtc) : 'sin fin'}
                    </p>
                    {a.studentEmail && <p className="text-xs text-slate-400 dark:text-slate-500">{a.studentEmail}</p>}
                    {a.studentDni && <p className="text-xs text-slate-400 dark:text-slate-500">DNI: {a.studentDni}</p>}
                    {a.notes && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.notes}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {a.isActive
                      ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activa</span>
                      : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactiva</span>
                    }
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <Button variant="outline" size="sm" className="w-full" onClick={loadMoreAssignments}>
                Mostrar más ({scholarshipAssignments.length - pagedAssignments.length} restantes)
              </Button>
            )}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No hay becas otorgadas.</p>
        )}
      </Card>
    </div>
  )
}

/* ─── Late Fees ─── */
function LateFeesSection({ courses, lateFees, lfLoading, editId, setEditId, saveMutation, updateMutation, deleteMutation, toast, setConfirmAction }: {
  courses: Course[]; lateFees: LatePaymentConfig[]; lfLoading: boolean
  editId: string | null; setEditId: (id: string | null) => void
  saveMutation: ReturnType<typeof useCreateLateFee>; updateMutation: ReturnType<typeof useUpdateLateFee>
  deleteMutation: ReturnType<typeof useDeleteLateFee>
  toast: (msg: string, type?: 'success' | 'error') => void
  setConfirmAction: (a: { title: string; message: string; confirmText: string; onConfirm: () => void } | null) => void
}) {
  const [name, setName] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dueDay, setDueDay] = useState(15)
  const [recurrenceType, setRecurrenceType] = useState<number | string>(LATE_FEE_RECURRENCE.ONE_TIME)
  const [percentIncrease, setPercentIncrease] = useState(0)
  const [fixedIncrease, setFixedIncrease] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  function resetForm() {
    setName(''); setCourseId(''); setDueDay(15); setRecurrenceType(LATE_FEE_RECURRENCE.ONE_TIME)
    setPercentIncrease(0); setFixedIncrease(0); setIsActive(true); setError(''); setEditId(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!courseId) { setError('Seleccioná un curso.'); return }
    if (percentIncrease <= 0 && fixedIncrease <= 0) { setError('Debe haber al menos un recargo (porcentaje o fijo).'); return }
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, name, courseId, dueDayOfMonth: dueDay, recurrenceType, percentIncrease, fixedIncrease, isActive })
      } else {
        await saveMutation.mutateAsync({ name, courseId, dueDayOfMonth: dueDay, recurrenceType, percentIncrease, fixedIncrease, isActive })
      }
      resetForm(); toast(editId ? 'Mora actualizada correctamente.' : 'Mora guardada correctamente.')
    } catch { setError('Error al guardar.'); toast('Error al guardar.', 'error') }
  }

  function handleEdit(item: LatePaymentConfig) {
    setEditId(item.id); setName(item.name); setCourseId(item.courseId ?? '')
    setDueDay(item.dueDayOfMonth); setRecurrenceType(item.recurrenceType)
    setPercentIncrease(item.percentIncrease); setFixedIncrease(item.fixedIncrease)
    setIsActive(item.isActive)
  }

  function handleDelete(id: string, name: string) {
    setConfirmAction({
      title: 'Eliminar mora',
      message: `¿Querés eliminar la mora "${name}"?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try { await deleteMutation.mutateAsync(id); toast('Mora eliminada.'); setConfirmAction(null) }
        catch { toast('Error al eliminar.', 'error'); setConfirmAction(null) }
      },
    })
  }

  const isMutating = saveMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <Card className="w-full shrink-0 p-5 xl:w-80">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Moras y vencimientos</h2>
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <Input type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos los cursos</option>
            {courses.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día vencimiento</label>
              <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value) || 1)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recurrencia</label>
              <Select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value={LATE_FEE_RECURRENCE.ONE_TIME}>Única</option>
                <option value={LATE_FEE_RECURRENCE.DAILY}>Diaria</option>
                <option value={LATE_FEE_RECURRENCE.WEEKLY}>Semanal</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recargo %</label>
              <Input type="number" min={0} step="0.01" value={percentIncrease}
                onChange={(e) => setPercentIncrease(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Recargo fijo</label>
              <Input type="number" min={0} step="0.01" value={fixedIncrease}
                onChange={(e) => setFixedIncrease(Number(e.target.value) || 0)} />
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mora activa</span>
          </label>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}
          <div className="flex gap-3">
            {(editId) && (
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={resetForm}>Cancelar</Button>
            )}
            <Button type="submit" size="sm" loading={isMutating}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700">{editId ? 'Actualizar mora' : 'Guardar mora'}</Button>
          </div>
        </form>
      </Card>

      <Card className="min-w-0 flex-1 p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Moras configuradas</h2>
        <div className="mt-4">
          {lfLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
          ) : lateFees.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">Todavía no hay moras configuradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Vence</th>
                    <th className="px-4 py-3">Recurrencia</th>
                    <th className="px-4 py-3">Recargo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lateFees.map((l, i) => {
                    const bg = i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                    const charges: string[] = []
                    if (l.percentIncrease > 0) charges.push(`${l.percentIncrease}%`)
                    if (l.fixedIncrease > 0) charges.push(money(l.fixedIncrease))
                    return (
                      <tr key={l.id} className={bg}>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{l.name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{l.courseName || 'Todos'}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Día {l.dueDayOfMonth}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{recurrenceLabel(l.recurrenceType)}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{charges.join(' + ') || '-'}</td>
                        <td className="px-4 py-3">
                          {l.isActive
                            ? <span className="text-emerald-600 dark:text-emerald-400">Activa</span>
                            : <span className="text-slate-400 dark:text-slate-500">Inactiva</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5"
                              onClick={() => handleEdit(l)}>Editar</Button>
                            <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              onClick={() => handleDelete(l.id, l.name)}>Eliminar</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

/* ─── Payments (Payment methods + Mercado Pago) ─── */
function PaymentsSection({ pMethods, pmLoading, mpStatus, mpStatusLoading, onOpenPaymentMethods, mpConnectMutation, mpDisconnectMutation, toast }: {
  pMethods: PaymentMethodDetail[]; pmLoading: boolean
  mpStatus: MercadoPagoStatus | undefined; mpStatusLoading: boolean
  onOpenPaymentMethods: () => void
  mpConnectMutation: ReturnType<typeof useMercadoPagoConnectUrl>
  mpDisconnectMutation: ReturnType<typeof useDisconnectMercadoPago>
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const activeMethods = pMethods.filter((m) => m.isEnabledByAdmin && m.enabledBySuperAdmin)

  async function handleConnect() {
    try {
      const result = await mpConnectMutation.mutateAsync()
      if (result.url) window.open(result.url, '_blank')
    } catch { toast('Error al conectar Mercado Pago.', 'error') }
  }

  async function handleDisconnect() {
    try {
      await mpDisconnectMutation.mutateAsync()
      toast('Mercado Pago desconectado.')
    } catch { toast('Error al desconectar.', 'error') }
  }

  const showMpSection = mpStatus?.autoCollectionEnabledBySuperAdmin === true ||
    pMethods.some((m) =>
      (String(m.paymentMethod).toLowerCase() === 'mercadopago' ||
       String(m.paymentMethodName).toLowerCase() === 'mercado pago') &&
      m.enabledBySuperAdmin === true
    )

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <Card className="w-full shrink-0 p-5 space-y-4 xl:w-96">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Medios de pago</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configurá transferencia, efectivo, tarjetas y otros medios habilitados.</p>
        </div>

        {pmLoading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ) : (
          <>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Activos para alumnos</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{activeMethods.length}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {activeMethods.length > 0 ? activeMethods.map((m) => m.paymentMethodName || m.paymentMethod || m.displayName || 'Medio de pago').join(', ') : 'Sin medios activos'}
              </p>
            </div>
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={onOpenPaymentMethods}>
              Configurar medios de pago
            </Button>
          </>
        )}
      </Card>

      {showMpSection ? (
        <Card className="min-w-0 flex-1 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Mercado Pago automático</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Conectá la cuenta del club para cobrar cuotas automáticamente.</p>
            </div>
            {mpStatusLoading ? (
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            ) : (
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                mpStatus?.isConnected
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {mpStatus?.isConnected ? 'Conectado' : 'No conectado'}
              </span>
            )}
          </div>

          {mpStatusLoading ? (
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Estado</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {mpStatus?.isConnected ? 'Cuenta conectada correctamente' : 'Pendiente de conexión'}
                </p>
                {mpStatus?.mercadoPagoUserId && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Usuario MP: {mpStatus.mercadoPagoUserId}</p>
                )}
                {mpStatus?.connectedAtUtc && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Conectado: {formatDate(mpStatus.connectedAtUtc)}</p>
                )}
                {mpStatus?.lastError && (
                  <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{mpStatus.lastError}</div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {mpStatus?.isConnected ? (
                  <Button variant="outline" size="sm" className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    loading={mpDisconnectMutation.isPending} onClick={handleDisconnect}>Desconectar</Button>
                ) : (
                  <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"
                    loading={mpConnectMutation.isPending} onClick={handleConnect}>Conectar Mercado Pago</Button>
                )}
              </div>

              {mpStatus?.status && (
                <p className="text-xs text-slate-400">Estado técnico: {mpStatus.status}</p>
              )}
            </>
          )}
        </Card>
      ) : (
        <Card className="min-w-0 flex-1 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Mercado Pago automático</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Esta funcionalidad todavía no está habilitada para esta empresa.</p>
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Para usar cobro automático, el SuperAdmin debe habilitar Mercado Pago automático.
          </div>
        </Card>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   MODALS
   ═══════════════════════════════════════ */

/* ─── Payment Methods Modal ─── */
function PaymentMethodsModal({ pMethods, saveMutation, onClose, toast }: {
  pMethods: PaymentMethodDetail[]
  saveMutation: ReturnType<typeof useSavePaymentMethods>
  onClose: () => void; toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [items, setItems] = useState<PaymentMethodDetail[]>([])

  useEffect(() => { setItems(pMethods.map((m) => ({ ...m }))) }, [pMethods])

  function toggleEnabled(id: string) {
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, isEnabledByAdmin: !m.isEnabledByAdmin } : m))
  }

  function updateField(id: string, field: string, value: unknown) {
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m))
  }

  async function handleSave() {
    try {
      const body = items.map((m) => ({
        companyPaymentMethodId: m.id,
        isEnabledByAdmin: m.isEnabledByAdmin,
        surchargeType: m.surchargeType,
        surchargeValue: m.surchargeValue,
        alias: m.alias || null,
        cbu: m.cbu || null,
        holderName: m.holderName || null,
        instructions: m.instructions || null,
      }))
      await saveMutation.mutateAsync(body as unknown as Record<string, unknown>[])
      toast('Medios de pago actualizados.')
      onClose()
    } catch { toast('Error al guardar.', 'error') }
  }

  return (
    <SlidePanel title="Medios de pago" description="Configurá los medios de pago habilitados para tus alumnos." onClose={onClose}>
      <div className="space-y-4">
        {items.map((m) => (
          <div key={m.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{m.paymentMethodName || m.paymentMethod || m.displayName || 'Medio de pago'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.enabledBySuperAdmin ? 'Habilitado por SuperAdmin' : 'No disponible'}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={m.isEnabledByAdmin}
                    onChange={() => toggleEnabled(m.id)} disabled={!m.enabledBySuperAdmin} />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-disabled:opacity-50" />
                </label>
                <span className="text-xs text-slate-600 dark:text-slate-400">Activo para alumnos</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3 dark:border-slate-700">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo recargo</label>
                <Select value={m.surchargeType} onChange={(e) => updateField(m.id, 'surchargeType', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="None">Sin recargo</option>
                  <option value="Percentage">Porcentaje</option>
                  <option value="FixedAmount">Monto fijo</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Valor</label>
                <Input type="number" min={0} step="0.01" value={m.surchargeValue}
                  onChange={(e) => updateField(m.id, 'surchargeValue', Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alias</label>
                <Input type="text" value={m.alias ?? ''}
                  onChange={(e) => updateField(m.id, 'alias', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">CBU / CVU</label>
                <Input type="text" value={m.cbu ?? ''}
                  onChange={(e) => updateField(m.id, 'cbu', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titular</label>
                <Input type="text" value={m.holderName ?? ''}
                  onChange={(e) => updateField(m.id, 'holderName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Instrucciones</label>
                <textarea value={m.instructions ?? ''} onChange={(e) => updateField(m.id, 'instructions', e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" loading={saveMutation.isPending}
          className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSave}>Guardar cambios</Button>
      </div>
    </SlidePanel>
  )
}

/* ─── Scholarships Modal (CRUD) ─── */
function ScholarshipsModal({ scholarships, saveMutation, onClose, toast }: {
  scholarships: Scholarship[]
  saveMutation: ReturnType<typeof useCreateScholarship>
  onClose: () => void; toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState<number>(DISCOUNT_TYPE.PERCENTAGE)
  const [discountValue, setDiscountValue] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (discountValue <= 0) { setError('El valor del descuento debe ser mayor a 0.'); return }
    try {
      await saveMutation.mutateAsync({ name: name.trim(), discountType, discountValue, isActive })
      setName(''); setDiscountValue(0); setIsActive(true)
      toast('Beca creada correctamente.')
    } catch { setError('Error al crear la beca.'); toast('Error al crear.', 'error') }
  }

  function typeLabel(t: unknown) {
    return Number(t) === DISCOUNT_TYPE.PERCENTAGE ? 'Porcentaje' : Number(t) === DISCOUNT_TYPE.FIXED_AMOUNT ? 'Monto fijo' : '-'
  }

  function valueLabel(s: Scholarship) {
    return s.discountType === DISCOUNT_TYPE.PERCENTAGE ? `${s.discountValue}%` : money(s.discountValue)
  }

  return (
    <SlidePanel title="Administrar becas" description="Creá y administrá tipos de beca. Después asignálas a los alumnos." onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
          <Input type="text" placeholder="Ej: Beca deportiva" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo de descuento</label>
            <Select value={discountType} onChange={(e) => setDiscountType(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {SCHOLARSHIP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Valor</label>
            <Input type="number" min={0} step="0.01" value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} />
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Beca activa</span>
        </label>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}
        <Button type="submit" size="sm" loading={saveMutation.isPending}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700">Crear beca</Button>
      </form>

      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Becas existentes</p>
        {scholarships.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No hay becas creadas.</p>
        ) : (
          <div className="space-y-2">
            {scholarships.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{typeLabel(s.discountType)}: {valueLabel(s)}</p>
                </div>
                {s.isActive
                  ? <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activa</span>
                  : <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactiva</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </SlidePanel>
  )
}

/* ─── Assign Scholarship Modal ─── */
function AssignScholarshipModal({ students, scholarships, assignMutation, onClose, toast }: {
  students: Student[]; scholarships: Scholarship[]
  assignMutation: ReturnType<typeof useAssignScholarship>
  onClose: () => void; toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [scholarshipId, setScholarshipId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const filtered = students.filter(
    (s) => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.dni?.includes(search),
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!studentId) { setError('Seleccioná un alumno.'); return }
    if (!scholarshipId) { setError('Seleccioná una beca.'); return }
    if (!startDate) { setError('La fecha de inicio es obligatoria.'); return }
    try {
      await assignMutation.mutateAsync({
        studentId, scholarshipId, courseId: courseId || null,
        startDateUtc: new Date(startDate).toISOString(),
        endDateUtc: endDate ? new Date(endDate).toISOString() : null,
        notes: notes.trim() || null,
      })
      toast('Beca asignada correctamente.')
      onClose()
    } catch { setError('Error al asignar la beca.'); toast('Error al asignar.', 'error') }
  }

  return (
    <SlidePanel title="Asignar beca" description="Elegí el alumno, la beca y el curso donde aplica." onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar alumno</label>
          <Input type="text" placeholder="Nombre o DNI" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && filtered.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              {filtered.map((s) => (
                <button key={s.id} type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    studentId === s.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'text-slate-900 dark:text-white'
                  }`}
                  onClick={() => { setStudentId(s.id); setSearch(s.fullName) }}>
                  {s.fullName} {s.dni ? `· ${s.dni}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Beca</label>
          <Select value={scholarshipId} onChange={(e) => setScholarshipId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Seleccionar beca</option>
            {scholarships.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.discountType === DISCOUNT_TYPE.PERCENTAGE ? `${s.discountValue}%` : money(s.discountValue)})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Curso donde aplica</label>
          <Input type="text" placeholder="Dejar vacío para beca global (todos sus cursos)" value={courseId}
            onChange={(e) => setCourseId(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">Si lo dejás vacío, la beca será global para el alumno.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Inicio</label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Elegir inicio" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fin (opcional)</label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="Sin fecha de fin" min={startDate || undefined} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" loading={assignMutation.isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-700">Asignar beca</Button>
        </div>
      </form>
    </SlidePanel>
  )
}

/* ─── Student Scholarships Modal (view all assignments) ─── */
function StudentScholarshipsModal({ deactivateMutation, onClose, toast }: {
  deactivateMutation: ReturnType<typeof useDeactivateScholarship>
  onClose: () => void; toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null)

  const { data: allStudents = [] } = useAllStudents()
  const filteredStudents = allStudents.filter(
    (s) => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.dni?.includes(search),
  )

  function selectStudent(id: string, name: string) {
    setSelectedId(id)
    setViewingStudentId(id)
    setSearch(name)
  }

  const { data: studentScholarships = [], isLoading: ssLoading } = useStudentScholarships(viewingStudentId)

  async function handleDeactivate(id: string) {
    try {
      await deactivateMutation.mutateAsync(id)
      toast('Beca desactivada correctamente.')
    } catch { toast('Error al desactivar.', 'error') }
  }

  function scholarshipValueLabel(s: ScholarshipAssignment) {
    return Number(s.discountType) === DISCOUNT_TYPE.PERCENTAGE ? `${s.discountValue}%` : money(Number(s.discountValue))
  }

  return (
    <SlidePanel title="Becas otorgadas" description="Seleccioná un alumno para ver y desactivar sus becas." onClose={onClose}>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Buscar alumno</label>
        <Input type="text" placeholder="Nombre o DNI" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && filteredStudents.length > 0 && (
          <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {filteredStudents.slice(0, 20).map((s) => (
              <button key={s.id} type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                  selectedId === s.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'text-slate-900 dark:text-white'
                }`}
                onClick={() => selectStudent(s.id, s.fullName)}>
                {s.fullName} {s.dni ? `· ${s.dni}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewingStudentId && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Becas asignadas</p>
          {ssLoading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
          ) : studentScholarships.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">Este alumno no tiene becas asignadas.</p>
          ) : (
            studentScholarships.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.scholarshipName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {scholarshipValueLabel(s)} · {s.courseName ? `Curso: ${s.courseName}` : 'Global'}
                      {s.isActive ? '' : ' · Inactiva'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {s.startDateUtc ? `Desde ${formatDateShort(s.startDateUtc)}` : ''}
                      {s.endDateUtc ? ` hasta ${formatDateShort(s.endDateUtc)}` : ''}
                    </p>
                    {s.notes && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.notes}</p>}
                  </div>
                  {s.isActive && (
                    <Button variant="outline" size="sm" className="shrink-0 text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      loading={deactivateMutation.isPending} onClick={() => handleDeactivate(s.id)}>Desactivar</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!viewingStudentId && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400 text-center">
          Buscá y seleccioná un alumno para ver sus becas.
        </div>
      )}
    </SlidePanel>
  )
}

/* ─── SlidePanel ─── */
function SlidePanel({ title, description, children, onClose }: {
  title: string; description: string; children: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl sm:max-h-[100vh] dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">{description}</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── ConfirmModal ─── */
function ConfirmModal({ title, message, confirmText, onConfirm, onClose }: {
  title: string; message: string; confirmText: string; onConfirm: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full animate-slide-up rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}
