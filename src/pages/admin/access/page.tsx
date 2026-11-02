import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'
import { config } from '@/lib/config'
import { useAuth } from '@/stores/auth'

type Tab = 'dashboard' | 'settings' | 'students' | 'logs' | 'devices' | 'credentials' | 'operators'

interface AccessSettings {
  companyId: string
  companyName: string
  isModuleEnabled: boolean
  debtPolicy: 'Block' | 'Warn'
  defaultMonthlyLimit: number | null
  timeZoneId: string
  isReceptionEnabled: boolean
  isTurnstileEnabled: boolean
  requirePassageConfirmation: boolean
  duplicateWindowSeconds: number
  allowDebtOverride: boolean
  allowQuotaOverride: boolean
  isPublicReceptionEnabled: boolean
}

interface StudentSummary {
  studentId: string
  fullName: string
  dni?: string | null
  memberNumber?: string | null
  isActive: boolean
  hasStudentPolicy: boolean
  monthlyLimit?: number | null
  effectiveMonthlyLimit?: number | null
  currentMonthUsed: number
  currentMonthRemaining?: number | null
}

interface StudentPolicy extends StudentSummary {
  hasDebt: boolean
  debtAmount: number
  debtOverdueCount: number
  debtReason?: string | null
  debtDescription?: string | null
  updatedAtUtc?: string | null
  currentQuotaState: string
  currentQuotaDueDateUtc?: string | null
  previousMonthQuotaLimit?: number | null
  previousMonthQuotaUsed: number
  previousMonthQuotaRemaining?: number | null
}

interface AccessLog {
  id: string
  accessDeviceId?: string | null
  deviceName?: string | null
  studentId: string
  studentName: string
  dni?: string | null
  memberNumber?: string | null
  mode: string
  decision: string
  isWarning: boolean
  denialReason?: string | null
  occurredAtUtc: string
  localDate: string
  currentQuotaState: string
  quotaPeriodSource: string
  quotaYear?: number | null
  quotaMonth?: number | null
  quotaLimit?: number | null
  quotaUsedBefore: number
  quotaUsedAfter: number
  quotaConsumed: boolean
  hasDebt: boolean
  debtAmount: number
  overrideDebt: boolean
  overrideQuota: boolean
  overrideReason?: string | null
  operatorName?: string | null
}

interface AccessDashboard {
  from: string
  to: string
  granted: number
  denied: number
  warnings: number
  debtDenied: number
  quotaDenied: number
  uniqueStudents: number
  todayGranted: number
  todayDenied: number
  devicesTotal: number
  devicesOnline: number
  alerts: { type: string; message: string; count: number }[]
  recent: AccessLog[]
}

interface AccessDevice {
  id: string
  name: string
  location?: string | null
  mode: string
  status: string
  lastSeenAtUtc?: string | null
  keyPrefix: string
  firmwareVersion?: string | null
  isOnline: boolean
  createdAtUtc: string
}

interface AccessCredential {
  id: string
  studentId: string
  studentName: string
  memberNumber?: string | null
  type: string
  credentialCode: string
  status: string
  label?: string | null
  validFromUtc: string
  validUntilUtc?: string | null
  lastCounter: number
  lastUsedAtUtc?: string | null
  createdAtUtc: string
  revokedAtUtc?: string | null
}

interface CredentialAudit {
  id: string
  action: string
  reason?: string | null
  replacedCredentialCode?: string | null
  newCredentialCode?: string | null
  actorName?: string | null
  createdAtUtc: string
}

interface AccessAuthorization {
  userId: string
  fullName: string
  email: string
  role: string
  canOverrideDebt: boolean
  canOverrideQuota: boolean
  canAdjustQuota: boolean
  canOperate: boolean
  canMonitor: boolean
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'settings', label: 'ConfiguraciÃ³n' },
  { key: 'students', label: 'Alumnos y cupos' },
  { key: 'logs', label: 'Historial' },
  { key: 'devices', label: 'Dispositivos' },
  { key: 'credentials', label: 'Credenciales' },
  { key: 'operators', label: 'Operadores' },
]

function useSlug() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const activeCompanySlug = useAuth((state) => state.activeCompanySlug ?? '')
  return companySlug ?? activeCompanySlug
}

function formatDate(value?: string | null) {
  if (!value) return 'â€”'
  return new Date(value).toLocaleString('es-AR')
}

function decisionBadge(log: AccessLog) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {log.decision === 'Granted'
        ? <Badge variant={log.isWarning ? 'warning' : 'success'}>{log.isWarning ? 'Advertencia' : 'Autorizado'}</Badge>
        : <Badge variant="danger">{log.denialReason === 'DebtBlocked' ? 'Deuda' : log.denialReason === 'QuotaExceeded' ? 'Cupo' : 'Rechazado'}</Badge>}
      {(log.overrideDebt || log.overrideQuota) && <Badge variant="violet">ExcepciÃ³n</Badge>}
    </span>
  )
}

function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
      </span>
    </label>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'success' | 'danger' | 'warning' }) {
  const color = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-900 dark:text-white'
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
    </Card>
  )
}

function DashboardTab({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['access-dashboard', slug],
    queryFn: () => apiService.get<AccessDashboard>(`/api/admin/${slug}/access/dashboard`),
    enabled: !!slug,
    refetchInterval: 10000,
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div>
  if (!data) return null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Autorizados" value={data.granted} tone="success" />
        <Stat label="Rechazados" value={data.denied} tone="danger" />
        <Stat label="Advertencias" value={data.warnings} tone="warning" />
        <Stat label="Alumnos Ãºnicos" value={data.uniqueStudents} />
        <Stat label="Hoy autorizados" value={data.todayGranted} tone="success" />
        <Stat label="Hoy rechazados" value={data.todayDenied} tone="danger" />
        <Stat label="Dispositivos online" value={`${data.devicesOnline}/${data.devicesTotal}`} />
        <Stat label="Rechazos por deuda" value={data.debtDenied} tone="danger" />
      </div>

      {data.alerts.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold">Alertas</h3>
          <div className="mt-3 space-y-2">
            {data.alerts.map((alert, index) => (
              <div key={`${alert.type}-${index}`} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <span>{alert.message}</span>
                <Badge variant="warning">{alert.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-bold">Ãšltimos ingresos</h3>
        <LogsTable logs={data.recent} compact />
      </Card>
    </div>
  )
}

function SettingsTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-access-settings', slug],
    queryFn: () => apiService.get<AccessSettings>(`/api/admin/${slug}/access/settings`),
    enabled: !!slug,
  })
  const [form, setForm] = useState({
    debtPolicy: 'Warn' as 'Block' | 'Warn',
    defaultMonthlyLimit: '',
    timeZoneId: 'America/Argentina/Buenos_Aires',
    isReceptionEnabled: true,
    isTurnstileEnabled: false,
    requirePassageConfirmation: false,
    duplicateWindowSeconds: '10',
    allowDebtOverride: false,
    allowQuotaOverride: false,
    isPublicReceptionEnabled: false,
  })

  useEffect(() => {
    if (!data) return
    setForm({
      debtPolicy: data.debtPolicy,
      defaultMonthlyLimit: data.defaultMonthlyLimit == null ? '' : String(data.defaultMonthlyLimit),
      timeZoneId: data.timeZoneId,
      isReceptionEnabled: data.isReceptionEnabled,
      isTurnstileEnabled: data.isTurnstileEnabled,
      requirePassageConfirmation: data.requirePassageConfirmation,
      duplicateWindowSeconds: String(data.duplicateWindowSeconds),
      allowDebtOverride: data.allowDebtOverride,
      allowQuotaOverride: data.allowQuotaOverride,
      isPublicReceptionEnabled: data.isPublicReceptionEnabled,
    })
  }, [data])

  const save = useMutation({
    mutationFn: () => {
      const limitText = form.defaultMonthlyLimit.trim()
      const limit = limitText === '' ? null : Number(limitText)
      const duplicateWindow = Number(form.duplicateWindowSeconds)
      if (limit != null && (!Number.isInteger(limit) || limit <= 0)) throw new Error('El cupo debe ser un entero positivo o vacÃ­o para ilimitado.')
      if (!Number.isInteger(duplicateWindow) || duplicateWindow < 0 || duplicateWindow > 300) throw new Error('La ventana anti-duplicado debe estar entre 0 y 300.')
      if (form.requirePassageConfirmation && !form.isTurnstileEnabled) throw new Error('La confirmaciÃ³n de paso requiere modo molinete.')
      return apiService.put<AccessSettings>(`/api/admin/${slug}/access/settings`, {
        debtPolicy: form.debtPolicy,
        defaultMonthlyLimit: limit,
        timeZoneId: form.timeZoneId.trim() || 'America/Argentina/Buenos_Aires',
        isReceptionEnabled: form.isReceptionEnabled,
        isTurnstileEnabled: form.isTurnstileEnabled,
        requirePassageConfirmation: form.requirePassageConfirmation,
        duplicateWindowSeconds: duplicateWindow,
        allowDebtOverride: form.allowDebtOverride,
        allowQuotaOverride: form.allowQuotaOverride,
        isPublicReceptionEnabled: form.isPublicReceptionEnabled,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-access-settings', slug] })
      toast('ConfiguraciÃ³n guardada.')
    },
    onError: (error) => toast(error instanceof Error ? error.message : getApiError(error) || 'No se pudo guardar.', 'error'),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div>

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Deuda y cupos</h2>
            <p className="mt-1 text-xs text-slate-400">La evaluaciÃ³n se aplica en el backend. La configuraciÃ³n no modifica los flujos de cobro.</p>
          </div>
          <Badge variant={data?.isModuleEnabled ? 'success' : 'danger'}>{data?.isModuleEnabled ? 'MÃ³dulo habilitado' : 'MÃ³dulo deshabilitado'}</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">PolÃ­tica de deuda</label>
            <Select value={form.debtPolicy} onChange={(event) => setForm({ ...form, debtPolicy: event.target.value as 'Block' | 'Warn' })}>
              <option value="Warn">Advertir (permitir ingreso)</option>
              <option value="Block">Bloquear ingreso</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Cupo mensual predeterminado</label>
            <Input type="number" min={1} value={form.defaultMonthlyLimit} onChange={(event) => setForm({ ...form, defaultMonthlyLimit: event.target.value })} placeholder="VacÃ­o = ilimitado" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Zona horaria</label>
            <Input value={form.timeZoneId} onChange={(event) => setForm({ ...form, timeZoneId: event.target.value })} placeholder="America/Argentina/Buenos_Aires" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Ventana anti-duplicado (segundos)</label>
            <Input type="number" min={0} max={300} value={form.duplicateWindowSeconds} onChange={(event) => setForm({ ...form, duplicateWindowSeconds: event.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-bold">RecepciÃ³n y dispositivos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={form.isReceptionEnabled} onChange={(value) => setForm({ ...form, isReceptionEnabled: value })} label="RecepciÃ³n sin molinete" description="Habilita la pantalla de recepciÃ³n y el registro manual." />
          <Toggle checked={form.isTurnstileEnabled} onChange={(value) => setForm({ ...form, isTurnstileEnabled: value, requirePassageConfirmation: value ? form.requirePassageConfirmation : false })} label="Acceso con molinete" description="Autoriza apertura al registrar ingreso. El cupo se consume al autorizar." />
          <Toggle checked={form.requirePassageConfirmation} onChange={(value) => setForm({ ...form, requirePassageConfirmation: value })} label="Confirmar paso del molinete" description="Informativo. No condiciona el consumo de cupo." disabled={!form.isTurnstileEnabled} />
          <Toggle checked={form.isPublicReceptionEnabled} onChange={(value) => setForm({ ...form, isPublicReceptionEnabled: value })} label="Modo pÃºblico de recepciÃ³n" description="Prepara una pantalla futura sin datos confidenciales." />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-bold">Excepciones autorizadas</h2>
        <p className="text-xs text-slate-400">Requieren permiso explÃ­cito por usuario, motivo obligatorio y quedan auditadas.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={form.allowDebtOverride} onChange={(value) => setForm({ ...form, allowDebtOverride: value })} label="Permitir excepciÃ³n de deuda" />
          <Toggle checked={form.allowQuotaOverride} onChange={(value) => setForm({ ...form, allowQuotaOverride: value })} label="Permitir excepciÃ³n de cupo" description="Un Warn no habilita cupo inexistente; esta excepciÃ³n sÃ­ puede autorizarlo." />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={() => save.mutate()} loading={save.isPending}>Guardar configuraciÃ³n</Button>
      </div>
    </div>
  )
}

function LogsTable({ logs, compact = false }: { logs: AccessLog[]; compact?: boolean }) {
  if (logs.length === 0) return <p className="py-6 text-center text-sm text-slate-400">Sin registros.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-slate-200 text-slate-400 dark:border-slate-700">
          <tr>
            <th className="py-2 pr-3">Fecha</th>
            <th className="py-2 pr-3">Alumno</th>
            <th className="py-2 pr-3">Modo</th>
            <th className="py-2 pr-3">Resultado</th>
            {!compact && <th className="py-2 pr-3">Cupo</th>}
            {!compact && <th className="py-2 pr-3">Dispositivo</th>}
            {!compact && <th className="py-2">Operador</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="py-2 pr-3 text-slate-500">{formatDate(log.occurredAtUtc)}</td>
              <td className="py-2 pr-3">
                <span className="font-semibold">{log.studentName}</span>
                {log.memberNumber && <span className="ml-1 text-slate-400">#{log.memberNumber}</span>}
              </td>
              <td className="py-2 pr-3">{log.mode}</td>
              <td className="py-2 pr-3">{decisionBadge(log)}</td>
              {!compact && (
                <td className="py-2 pr-3">
                  <span>{log.quotaPeriodSource}</span>
                  <span className="ml-1 text-slate-400">{log.quotaUsedAfter}/{log.quotaLimit ?? 'âˆž'}</span>
                </td>
              )}
              {!compact && <td className="py-2 pr-3">{log.deviceName || 'RecepciÃ³n'}</td>}
              {!compact && <td className="py-2">{log.operatorName || 'â€”'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentSearchSelect({ slug, onSelect }: { slug: string; onSelect: (student: StudentSummary) => void }) {
  const [search, setSearch] = useState('')
  const { data = [] } = useQuery({
    queryKey: ['access-student-search', slug, search],
    queryFn: () => apiService.get<{ items: StudentSummary[] }>(`/api/admin/${slug}/access/students?search=${encodeURIComponent(search)}&page=1&pageSize=10`).then((result) => result.items),
    enabled: !!slug && search.trim().length >= 2,
  })

  return (
    <div className="space-y-2">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno por nombre, DNI o carnet" />
      {data.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          {data.map((student) => (
            <button key={student.studentId} type="button" onClick={() => onSelect(student)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              {student.fullName} {student.memberNumber ? `Â· #${student.memberNumber}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StudentPolicyModal({ slug, studentId, onClose }: { slug: string; studentId: string | null; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [limit, setLimit] = useState('')
  const [adjustment, setAdjustment] = useState({
    type: 'ManualCredit',
    delta: '',
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1),
    reason: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['access-student-policy', slug, studentId],
    queryFn: () => apiService.get<StudentPolicy>(`/api/admin/${slug}/access/students/${studentId}/policy`),
    enabled: !!slug && !!studentId,
  })

  useEffect(() => {
    if (!data) return
    setLimit(data.monthlyLimit == null ? '' : String(data.monthlyLimit))
  }, [data])

  const savePolicy = useMutation({
    mutationFn: () => {
      const value = limit.trim() === '' ? null : Number(limit)
      if (value != null && (!Number.isInteger(value) || value <= 0)) throw new Error('El cupo debe ser un entero positivo o vacÃ­o para ilimitado.')
      return apiService.put(`/api/admin/${slug}/access/students/${studentId}/policy`, { monthlyLimit: value })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-student-policy', slug, studentId] })
      qc.invalidateQueries({ queryKey: ['access-students', slug] })
      toast('Cupo actualizado.')
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo actualizar.', 'error'),
  })

  const createAdjustment = useMutation({
    mutationFn: () => {
      const delta = Number(adjustment.delta)
      if (!Number.isInteger(delta) || delta === 0) throw new Error('El ajuste debe ser un entero distinto de cero.')
      if (adjustment.type === 'ManualCredit' && delta > 0) throw new Error('El crÃ©dito manual debe ser negativo.')
      if (adjustment.type === 'ManualDebit' && delta < 0) throw new Error('El dÃ©bito manual debe ser positivo.')
      if (!adjustment.reason.trim()) throw new Error('El motivo es obligatorio.')
      return apiService.post(`/api/admin/${slug}/access/students/${studentId}/quota-adjustments`, {
        requestId: crypto.randomUUID(),
        year: Number(adjustment.year),
        month: Number(adjustment.month),
        delta,
        type: adjustment.type,
        reason: adjustment.reason.trim(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-student-policy', slug, studentId] })
      qc.invalidateQueries({ queryKey: ['access-logs', slug] })
      toast('Ajuste registrado.')
      setAdjustment({ ...adjustment, delta: '', reason: '' })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo registrar el ajuste.', 'error'),
  })

  return (
    <Modal open={!!studentId} onClose={onClose} title="Cupo y situaciÃ³n del alumno" description={data?.fullName} className="sm:max-w-3xl">
      {isLoading || !data ? (
        <div className="flex justify-center py-10"><Spinner className="h-7 w-7 text-slate-600" /></div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[11px] uppercase text-slate-400">Cupo efectivo</p>
              <p className="text-lg font-black">{data.effectiveMonthlyLimit ?? 'Ilimitado'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[11px] uppercase text-slate-400">Usado este mes</p>
              <p className="text-lg font-black">{data.currentMonthUsed}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[11px] uppercase text-slate-400">Saldo anterior en gracia</p>
              <p className="text-lg font-black">{data.previousMonthQuotaRemaining ?? 'â€”'}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-400">Cuota actual</p>
              <p className="mt-1 font-bold">{data.currentQuotaState}</p>
              <p className="text-xs text-slate-400">Vence: {formatDate(data.currentQuotaDueDateUtc)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-400">Deuda</p>
              <p className={`mt-1 font-bold ${data.hasDebt ? 'text-red-600' : 'text-emerald-600'}`}>{data.hasDebt ? `$${data.debtAmount}` : 'Sin deuda'}</p>
              <p className="text-xs text-slate-400">{data.debtDescription || 'â€”'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="text-sm font-bold">Cupo individual</h3>
            <p className="mt-1 text-xs text-slate-400">VacÃ­o = ilimitado. Los lÃ­mites positivos cuentan ingresos autorizados del mes.</p>
            <div className="mt-3 flex gap-2">
              <Input type="number" min={1} value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="VacÃ­o = ilimitado" />
              <Button variant="primary" onClick={() => savePolicy.mutate()} loading={savePolicy.isPending}>Guardar</Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="text-sm font-bold">Ajuste manual de cupo</h3>
            <p className="mt-1 text-xs text-slate-400">ManualCredit reduce consumo; ManualDebit aumenta consumo. Motivo obligatorio y auditorÃ­a.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Select value={adjustment.type} onChange={(event) => setAdjustment({ ...adjustment, type: event.target.value })}>
                <option value="ManualCredit">CrÃ©dito manual</option>
                <option value="ManualDebit">DÃ©bito manual</option>
                <option value="Correction">CorrecciÃ³n</option>
              </Select>
              <Input type="number" value={adjustment.delta} onChange={(event) => setAdjustment({ ...adjustment, delta: event.target.value })} placeholder="Delta (ej. -1 o 1)" />
              <Input type="number" value={adjustment.year} onChange={(event) => setAdjustment({ ...adjustment, year: event.target.value })} placeholder="AÃ±o" />
              <Input type="number" min={1} max={12} value={adjustment.month} onChange={(event) => setAdjustment({ ...adjustment, month: event.target.value })} placeholder="Mes" />
              <div className="sm:col-span-2">
                <Input value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder="Motivo obligatorio" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={() => createAdjustment.mutate()} loading={createAdjustment.isPending}>Registrar ajuste</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function StudentsTab({ slug }: { slug: string }) {
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['access-students', slug, search],
    queryFn: () => apiService.get<{ items: StudentSummary[]; total: number }>(`/api/admin/${slug}/access/students?search=${encodeURIComponent(search)}&page=1&pageSize=100`),
    enabled: !!slug,
  })

  return (
    <div className="space-y-4">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, DNI o carnet" />
      <Card className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">DNI</th>
                  <th className="px-4 py-3">Carnet</th>
                  <th className="px-4 py-3">Cupo</th>
                  <th className="px-4 py-3">Usado</th>
                  <th className="px-4 py-3">Disponible</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.items ?? []).map((student) => (
                  <tr key={student.studentId}>
                    <td className="px-4 py-3 font-semibold">{student.fullName}</td>
                    <td className="px-4 py-3">{student.dni || 'â€”'}</td>
                    <td className="px-4 py-3">{student.memberNumber || 'â€”'}</td>
                    <td className="px-4 py-3">{student.monthlyLimit ?? student.effectiveMonthlyLimit ?? 'Ilimitado'}</td>
                    <td className="px-4 py-3">{student.currentMonthUsed}</td>
                    <td className="px-4 py-3">{student.currentMonthRemaining ?? 'âˆž'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedStudentId(student.studentId)}>Ver / editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.items ?? []).length === 0 && <p className="py-10 text-center text-sm text-slate-400">Sin alumnos.</p>}
          </div>
        )}
      </Card>
      <StudentPolicyModal slug={slug} studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />
    </div>
  )
}

function LogsTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [decision, setDecision] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [studentFilter, setStudentFilter] = useState<StudentSummary | null>(null)
  const [quotaYear, setQuotaYear] = useState('')
  const [quotaMonth, setQuotaMonth] = useState('')
  const [refundLog, setRefundLog] = useState<AccessLog | null>(null)
  const [reason, setReason] = useState('')

  const { data: devices = [] } = useQuery({
    queryKey: ['access-devices', slug],
    queryFn: () => apiService.get<AccessDevice[]>(`/api/admin/${slug}/access/devices`),
    enabled: !!slug,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['access-logs', slug, from, to, decision, deviceId, studentFilter?.studentId, quotaYear, quotaMonth],
    queryFn: () => {
      const params = new URLSearchParams({ page: '1', pageSize: '100' })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (decision) params.set('decision', decision)
      if (deviceId) params.set('deviceId', deviceId)
      if (studentFilter) params.set('studentId', studentFilter.studentId)
      if (quotaYear) params.set('quotaYear', quotaYear)
      if (quotaMonth) params.set('quotaMonth', quotaMonth)
      return apiService.get<{ items: AccessLog[]; total: number }>(`/api/admin/${slug}/access/logs?${params.toString()}`)
    },
    enabled: !!slug,
  })

  const refund = useMutation({
    mutationFn: () => {
      if (!refundLog) throw new Error('SeleccionÃ¡ un ingreso.')
      if (!reason.trim()) throw new Error('El motivo es obligatorio.')
      return apiService.post(`/api/admin/${slug}/access/students/${refundLog.studentId}/quota-adjustments`, {
        requestId: crypto.randomUUID(),
        delta: -1,
        type: 'Refund',
        reason: reason.trim(),
        accessLogId: refundLog.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-logs', slug] })
      qc.invalidateQueries({ queryKey: ['access-dashboard', slug] })
      toast('Reintegro registrado.')
      setRefundLog(null)
      setReason('')
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo registrar el reintegro.', 'error'),
  })

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Select value={decision} onChange={(event) => setDecision(event.target.value)}>
            <option value="">Todos los resultados</option>
            <option value="Granted">Autorizados</option>
            <option value="Denied">Rechazados</option>
          </Select>
          <Select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
            <option value="">Todos los dispositivos</option>
            {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </Select>
          <Input type="number" value={quotaYear} onChange={(event) => setQuotaYear(event.target.value)} placeholder="AÃ±o del cupo" />
          <Input type="number" min={1} max={12} value={quotaMonth} onChange={(event) => setQuotaMonth(event.target.value)} placeholder="Mes del cupo" />
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          {studentFilter ? (
            <div className="flex items-center justify-between text-sm">
              <span>Alumno: <strong>{studentFilter.fullName}</strong></span>
              <Button size="sm" variant="outline" onClick={() => setStudentFilter(null)}>Quitar filtro</Button>
            </div>
          ) : (
            <StudentSearchSelect slug={slug} onSelect={setStudentFilter} />
          )}
        </div>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">Cupo consumido</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.items ?? []).map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3">{formatDate(log.occurredAtUtc)}</td>
                    <td className="px-4 py-3 font-semibold">{log.studentName}</td>
                    <td className="px-4 py-3">{decisionBadge(log)}</td>
                    <td className="px-4 py-3">{log.quotaPeriodSource} Â· {log.quotaUsedAfter}/{log.quotaLimit ?? 'âˆž'} {log.quotaYear ? `(${log.quotaMonth}/${log.quotaYear})` : ''}</td>
                    <td className="px-4 py-3">{log.deviceName || 'RecepciÃ³n'}</td>
                    <td className="px-4 py-3">{log.operatorName || 'â€”'}</td>
                    <td className="px-4 py-3 text-right">
                      {log.decision === 'Granted' && log.quotaConsumed && log.quotaPeriodSource !== 'Unlimited' && (
                        <Button size="sm" variant="outline" onClick={() => { setRefundLog(log); setReason('') }}>Reintegrar</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.items ?? []).length === 0 && <p className="py-10 text-center text-sm text-slate-400">Sin ingresos.</p>}
          </div>
        )}
      </Card>

      <Modal open={!!refundLog} onClose={() => setRefundLog(null)} title="Reintegrar cupo" description={refundLog ? `${refundLog.studentName} Â· perÃ­odo ${refundLog.quotaMonth}/${refundLog.quotaYear}` : undefined} footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRefundLog(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => refund.mutate()} loading={refund.isPending}>Registrar reintegro</Button>
        </div>
      }>
        <div className="space-y-3 p-5">
          <p className="text-xs text-slate-400">El reintegro se aplica al perÃ­odo de cupo efectivamente consumido, no al mes de ocurrencia.</p>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obligatorio" />
        </div>
      </Modal>
    </div>
  )
}

function DevicesTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [secretDevice, setSecretDevice] = useState<{ name: string; key?: string; deviceId: string; pairingToken?: string } | null>(null)
  const [readingsDevice, setReadingsDevice] = useState<AccessDevice | null>(null)
  const [editDevice, setEditDevice] = useState<AccessDevice | null>(null)
  const [form, setForm] = useState({ name: '', location: '', mode: 'Reception' })
  const [editForm, setEditForm] = useState({ name: '', location: '', mode: 'Reception' })

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['access-devices', slug],
    queryFn: () => apiService.get<AccessDevice[]>(`/api/admin/${slug}/access/devices`),
    enabled: !!slug,
  })

  const { data: readings = [] } = useQuery({
    queryKey: ['access-device-readings', slug, readingsDevice?.id],
    queryFn: () => apiService.get<any[]>(`/api/admin/${slug}/access/devices/${readingsDevice?.id}/readings`),
    enabled: !!slug && !!readingsDevice,
  })

  const create = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) throw new Error('El nombre es obligatorio.')
      return apiService.post<{ id: string; name: string; deviceKey: string; pairingToken?: string }>(`/api/admin/${slug}/access/devices`, {
        name: form.name.trim(),
        location: form.location.trim() || null,
        mode: form.mode,
      })
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['access-devices', slug] })
      setCreateOpen(false)
      setForm({ name: '', location: '', mode: 'Reception' })
      setSecretDevice({ name: created.name, key: created.deviceKey, deviceId: created.id, pairingToken: created.pairingToken })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo crear.', 'error'),
  })

  const update = useMutation({
    mutationFn: () => {
      if (!editDevice) throw new Error('SeleccionÃ¡ un dispositivo.')
      if (!editForm.name.trim()) throw new Error('El nombre es obligatorio.')
      return apiService.put(`/api/admin/${slug}/access/devices/${editDevice.id}`, {
        name: editForm.name.trim(),
        location: editForm.location.trim() || null,
        mode: editForm.mode,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-devices', slug] })
      setEditDevice(null)
      toast('Dispositivo actualizado.')
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo actualizar.', 'error'),
  })

  const rotate = useMutation({
    mutationFn: (device: AccessDevice) => apiService.post<{ deviceKey: string; pairingToken?: string }>(`/api/admin/${slug}/access/devices/${device.id}/rotate-secret`, {}),
    onSuccess: (result, device) => {
      qc.invalidateQueries({ queryKey: ['access-devices', slug] })
      setSecretDevice({ name: device.name, key: result.deviceKey, deviceId: device.id, pairingToken: result.pairingToken })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo rotar.', 'error'),
  })

  const pairing = useMutation({
    mutationFn: (device: AccessDevice) => apiService.post<{ pairingToken: string; expiresAtUtc: string }>(`/api/admin/${slug}/access/devices/${device.id}/pairing-token`, {}),
    onSuccess: (result, device) => {
      setSecretDevice({ name: device.name, deviceId: device.id, pairingToken: result.pairingToken })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo generar el QR de vinculaciÃ³n.', 'error'),
  })

  const revoke = useMutation({
    mutationFn: (device: AccessDevice) => apiService.post(`/api/admin/${slug}/access/devices/${device.id}/revoke`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-devices', slug] }); toast('Dispositivo revocado.') },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo revocar.', 'error'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setCreateOpen(true)}>Registrar dispositivo</Button></div>
      <Card className="p-0">
        {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 dark:border-slate-700">
                <tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">UbicaciÃ³n</th><th className="px-4 py-3">Modo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Ãšltimo heartbeat</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="px-4 py-3 font-semibold">{device.name}<div className="text-[11px] text-slate-400">{device.keyPrefix}</div></td>
                    <td className="px-4 py-3">{device.location || 'â€”'}</td>
                    <td className="px-4 py-3">{device.mode}</td>
                    <td className="px-4 py-3"><Badge variant={device.status === 'Active' ? (device.isOnline ? 'success' : 'warning') : 'danger'}>{device.status === 'Active' ? (device.isOnline ? 'Online' : 'Offline') : device.status}</Badge></td>
                    <td className="px-4 py-3">{formatDate(device.lastSeenAtUtc)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditDevice(device); setEditForm({ name: device.name, location: device.location || '', mode: device.mode }) }}>Editar</Button>
                        <Button size="sm" variant="outline" onClick={() => setReadingsDevice(device)}>Lecturas</Button>
                        {device.status === 'Active' && <Button size="sm" variant="outline" onClick={() => pairing.mutate(device)} loading={pairing.isPending}>Vincular</Button>}
                        <Button size="sm" variant="outline" onClick={() => rotate.mutate(device)}>Rotar clave</Button>
                        {device.status === 'Active' && <Button size="sm" variant="danger" onClick={() => revoke.mutate(device)}>Revocar</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devices.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Sin dispositivos.</p>}
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Registrar dispositivo Access">
        <div className="space-y-3 p-5">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del lector" />
          <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="UbicaciÃ³n" />
          <Select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
            <option value="Reception">RecepciÃ³n</option>
            <option value="Turnstile">Molinete</option>
            <option value="Monitor">Monitor</option>
          </Select>
          <div className="flex justify-end"><Button variant="primary" onClick={() => create.mutate()} loading={create.isPending}>Crear y generar clave</Button></div>
        </div>
      </Modal>

      <Modal open={!!editDevice} onClose={() => setEditDevice(null)} title="Editar dispositivo" description={editDevice?.name}>
        <div className="space-y-3 p-5">
          <Input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} placeholder="Nombre del lector" />
          <Input value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} placeholder="UbicaciÃ³n" />
          <Select value={editForm.mode} onChange={(event) => setEditForm({ ...editForm, mode: event.target.value })}>
            <option value="Reception">RecepciÃ³n</option>
            <option value="Turnstile">Molinete</option>
            <option value="Monitor">Monitor</option>
          </Select>
          <div className="flex justify-end"><Button variant="primary" onClick={() => update.mutate()} loading={update.isPending}>Guardar</Button></div>
        </div>
      </Modal>

      <Modal
        open={!!secretDevice}
        onClose={() => setSecretDevice(null)}
        title={secretDevice?.pairingToken ? 'Vincular dispositivo' : 'Clave del dispositivo'}
        description={secretDevice?.pairingToken
          ? 'El QR es de un solo uso y vence en 10 minutos.'
          : 'La clave se muestra una sola vez. Guardala en el lector de forma segura.'}
      >
        <div className="space-y-3 p-5">
          <p className="text-sm font-semibold">{secretDevice?.name}</p>
          {secretDevice?.pairingToken && (
            <div className="mx-auto w-fit rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <QRCodeSVG
                value={JSON.stringify({
                  type: 'classclick-access-device-pairing',
                  version: 1,
                  apiUrl: config.apiBaseUrl,
                  token: secretDevice.pairingToken,
                })}
                size={240}
                level="M"
                includeMargin
              />
            </div>
          )}
          {secretDevice?.pairingToken && (
            <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300">EscaneÃ¡ este QR desde la app ClassClick Access Reader para vincular el dispositivo.</p>
          )}
          {secretDevice?.key && (
            <>
              <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300">{secretDevice.key}</pre>
              <p className="text-xs text-slate-400">El lector firma cada request con HMAC-SHA256. No compartas esta clave.</p>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!readingsDevice} onClose={() => setReadingsDevice(null)} title={`Lecturas Â· ${readingsDevice?.name ?? ''}`} className="sm:max-w-4xl">
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {readings.length === 0 ? <p className="text-sm text-slate-400">Sin lecturas.</p> : (
            <table className="w-full text-left text-xs">
              <thead><tr><th className="py-2">Fecha</th><th className="py-2">Tipo</th><th className="py-2">Resultado</th><th className="py-2">Alumno</th><th className="py-2">Mensaje</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {readings.map((reading: any) => (
                  <tr key={reading.id}><td className="py-2">{formatDate(reading.createdAtUtc)}</td><td className="py-2">{reading.requestType}</td><td className="py-2">{reading.result}</td><td className="py-2">{reading.studentName || 'â€”'}</td><td className="py-2">{reading.message || reading.errorCode || 'â€”'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  )
}

function CredentialsTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [issueOpen, setIssueOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null)
  const [form, setForm] = useState({ type: 'QrFallback', label: '', validUntil: '' })
  const [issued, setIssued] = useState<{ name: string; code: string; secret: string } | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<AccessCredential | null>(null)
  const [replaceReason, setReplaceReason] = useState('')
  const [auditTarget, setAuditTarget] = useState<AccessCredential | null>(null)

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['access-credentials', slug],
    queryFn: () => apiService.get<AccessCredential[]>(`/api/admin/${slug}/access/credentials`),
    enabled: !!slug,
  })

  const issue = useMutation({
    mutationFn: () => {
      if (!selectedStudent) throw new Error('SeleccionÃ¡ un alumno.')
      return apiService.post<{ credentialCode: string; secret: string; studentName: string }>(`/api/admin/${slug}/access/credentials`, {
        studentId: selectedStudent.studentId,
        type: form.type,
        label: form.label.trim() || null,
        validUntilUtc: form.validUntil ? new Date(form.validUntil).toISOString() : null,
      })
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['access-credentials', slug] })
      setIssueOpen(false)
      setSelectedStudent(null)
      setForm({ type: 'QrFallback', label: '', validUntil: '' })
      setIssued({ name: created.studentName, code: created.credentialCode, secret: created.secret })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo emitir.', 'error'),
  })

  const revoke = useMutation({
    mutationFn: (credential: AccessCredential) => apiService.post(`/api/admin/${slug}/access/credentials/${credential.id}/revoke`, { reason: 'Revocada por administrador' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-credentials', slug] }); toast('Credencial revocada.') },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo revocar.', 'error'),
  })

  const suspend = useMutation({
    mutationFn: ({ credential, reason }: { credential: AccessCredential; reason: string }) =>
      apiService.post(`/api/admin/${slug}/access/credentials/${credential.id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-credentials', slug] }); toast('Credencial suspendida.') },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo suspender.', 'error'),
  })

  const activate = useMutation({
    mutationFn: (credential: AccessCredential) => apiService.post(`/api/admin/${slug}/access/credentials/${credential.id}/activate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-credentials', slug] }); toast('Credencial activada.') },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo activar.', 'error'),
  })

  const { data: auditRows = [] } = useQuery({
    queryKey: ['access-credential-audit', slug, auditTarget?.id],
    queryFn: () => apiService.get<CredentialAudit[]>(`/api/admin/${slug}/access/credentials/${auditTarget?.id}/audit`),
    enabled: !!slug && !!auditTarget,
  })

  const replace = useMutation({
    mutationFn: () => {
      if (!replaceTarget) throw new Error('SeleccionÃ¡ una credencial.')
      if (!replaceReason.trim()) throw new Error('El motivo es obligatorio.')
      return apiService.post<{ credentialCode: string; secret: string; studentName: string }>(`/api/admin/${slug}/access/credentials/${replaceTarget.id}/replace`, {
        reason: replaceReason.trim(),
        label: replaceTarget.label,
      })
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['access-credentials', slug] })
      setReplaceTarget(null)
      setReplaceReason('')
      setIssued({ name: created.studentName, code: created.credentialCode, secret: created.secret })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo reemplazar.', 'error'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setIssueOpen(true)}>Emitir credencial</Button></div>
      <Card className="p-0">
        {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 dark:border-slate-700">
                <tr><th className="px-4 py-3">Alumno</th><th className="px-4 py-3">CÃ³digo</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Ãšltimo uso</th><th className="px-4 py-3">Contador</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {credentials.map((credential) => (
                  <tr key={credential.id}>
                    <td className="px-4 py-3 font-semibold">{credential.studentName}</td>
                    <td className="px-4 py-3 font-mono">{credential.credentialCode}</td>
                    <td className="px-4 py-3">{credential.type}</td>
                    <td className="px-4 py-3"><Badge variant={credential.status === 'Active' ? 'success' : credential.status === 'Revoked' ? 'danger' : 'warning'}>{credential.status}</Badge></td>
                    <td className="px-4 py-3">{formatDate(credential.lastUsedAtUtc)}</td>
                    <td className="px-4 py-3">{credential.lastCounter}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setAuditTarget(credential)}>AuditorÃ­a</Button>
                        {credential.status === 'Suspended' && <Button size="sm" variant="outline" onClick={() => activate.mutate(credential)}>Activar</Button>}
                        {credential.status === 'Active' && (
                          <Button size="sm" variant="outline" onClick={() => {
                            const reason = window.prompt('Motivo de la suspensiÃ³n')
                            if (reason?.trim()) suspend.mutate({ credential, reason: reason.trim() })
                          }}>Suspender</Button>
                        )}
                        {credential.status !== 'Revoked' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setReplaceTarget(credential)}>Reemplazar</Button>
                            <Button size="sm" variant="danger" onClick={() => revoke.mutate(credential)}>Revocar</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {credentials.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Sin credenciales.</p>}
          </div>
        )}
      </Card>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Emitir credencial Access">
        <div className="space-y-3 p-5">
          <StudentSearchSelect slug={slug} onSelect={setSelectedStudent} />
          {selectedStudent && <p className="text-xs text-slate-500">Seleccionado: <strong>{selectedStudent.fullName}</strong></p>}
          <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="QrFallback">QR de respaldo (recepciÃ³n PWA)</option>
            <option value="NfcSecureTag">Tarjeta/llavero NFC seguro</option>
            <option value="MobileHce">Credencial mÃ³vil Android HCE</option>
          </Select>
          <Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Etiqueta opcional" />
          <Input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} />
          <p className="text-xs text-slate-400">Las credenciales NFC seguras requieren un lector autenticado. La PWA de recepciÃ³n solo acepta credenciales QR de respaldo.</p>
          <div className="flex justify-end"><Button variant="primary" onClick={() => issue.mutate()} loading={issue.isPending}>Emitir</Button></div>
        </div>
      </Modal>

      <Modal open={!!replaceTarget} onClose={() => setReplaceTarget(null)} title="Reemplazar credencial" description={replaceTarget?.studentName}>
        <div className="space-y-3 p-5">
          <Input value={replaceReason} onChange={(event) => setReplaceReason(event.target.value)} placeholder="Motivo obligatorio" />
          <div className="flex justify-end"><Button variant="danger" onClick={() => replace.mutate()} loading={replace.isPending}>Reemplazar</Button></div>
        </div>
      </Modal>

      <Modal open={!!auditTarget} onClose={() => setAuditTarget(null)} title="AuditorÃ­a de credencial" description={auditTarget?.studentName}>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {auditRows.length === 0 ? <p className="text-sm text-slate-400">Sin eventos.</p> : (
            <div className="space-y-2">
              {auditRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                  <div className="flex items-center justify-between"><span className="font-bold">{row.action}</span><span className="text-slate-400">{formatDate(row.createdAtUtc)}</span></div>
                  <p className="mt-1 text-slate-500">{row.reason || 'Sin motivo'}</p>
                  <p className="mt-1 text-slate-400">{row.replacedCredentialCode ? `Reemplazada: ${row.replacedCredentialCode}` : ''} {row.newCredentialCode ? `Nueva: ${row.newCredentialCode}` : ''}</p>
                  <p className="text-slate-400">Actor: {row.actorName || 'â€”'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!issued} onClose={() => setIssued(null)} title="Credencial emitida" description="El secreto se muestra una sola vez.">
        <div className="space-y-3 p-5">
          <p className="text-sm font-semibold">{issued?.name}</p>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-[11px] uppercase text-slate-400">CÃ³digo de credencial</p>
            <p className="font-mono text-sm">{issued?.code}</p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3 text-emerald-300">
            <p className="text-[11px] uppercase text-slate-400">Secreto</p>
            <p className="break-all font-mono text-xs">{issued?.secret}</p>
          </div>
          <p className="text-xs text-slate-400">Para NFC seguro, grabÃ¡ el cÃ³digo y el secreto en el lector/tag mediante el proceso de provisioning. No uses el UID como identidad.</p>
        </div>
      </Modal>
    </div>
  )
}

function OperatorsTab({ slug }: { slug: string }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<AccessAuthorization | null>(null)
  const [flags, setFlags] = useState({ canOverrideDebt: false, canOverrideQuota: false, canAdjustQuota: false, canOperate: false, canMonitor: false })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['access-authorization-users', slug, search],
    queryFn: () => apiService.get<AccessAuthorization[]>(`/api/admin/${slug}/access/authorizations/users?search=${encodeURIComponent(search)}`),
    enabled: !!slug,
  })

  function openUser(user: AccessAuthorization) {
    setTarget(user)
    setFlags({
      canOverrideDebt: user.canOverrideDebt,
      canOverrideQuota: user.canOverrideQuota,
      canAdjustQuota: user.canAdjustQuota,
      canOperate: user.canOperate,
      canMonitor: user.canMonitor,
    })
  }

  const save = useMutation({
    mutationFn: () => {
      if (!target) throw new Error('SeleccionÃ¡ un usuario.')
      return apiService.put(`/api/admin/${slug}/access/authorizations/${target.userId}`, flags)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-authorization-users', slug] })
      setTarget(null)
      toast('Permisos actualizados.')
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo guardar.', 'error'),
  })

  return (
    <div className="space-y-4">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar operador, docente o administrador" />
      <Card className="p-0">
        {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 dark:border-slate-700">
                <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Operar</th><th className="px-4 py-3">Monitor</th><th className="px-4 py-3">Excepciones</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td className="px-4 py-3"><span className="font-semibold">{user.fullName}</span><div className="text-[11px] text-slate-400">{user.email}</div></td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">{user.canOperate ? 'SÃ­' : 'No'}</td>
                    <td className="px-4 py-3">{user.canMonitor ? 'SÃ­' : 'No'}</td>
                    <td className="px-4 py-3">{user.canOverrideDebt || user.canOverrideQuota || user.canAdjustQuota ? 'SÃ­' : 'No'}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => openUser(user)}>Editar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Sin usuarios.</p>}
          </div>
        )}
      </Card>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Permisos Access" description={target?.fullName}>
        <div className="space-y-3 p-5">
          <Toggle checked={flags.canOperate} onChange={(value) => setFlags({ ...flags, canOperate: value })} label="Operar recepciÃ³n" description="Puede buscar alumnos y registrar ingresos." />
          <Toggle checked={flags.canMonitor} onChange={(value) => setFlags({ ...flags, canMonitor: value })} label="Ver monitor" description="Puede ver el monitor con datos limitados." />
          <Toggle checked={flags.canOverrideDebt} onChange={(value) => setFlags({ ...flags, canOverrideDebt: value })} label="ExcepciÃ³n de deuda" />
          <Toggle checked={flags.canOverrideQuota} onChange={(value) => setFlags({ ...flags, canOverrideQuota: value })} label="ExcepciÃ³n de cupo" />
          <Toggle checked={flags.canAdjustQuota} onChange={(value) => setFlags({ ...flags, canAdjustQuota: value })} label="Ajustar cupos" />
          <div className="flex justify-end"><Button variant="primary" onClick={() => save.mutate()} loading={save.isPending}>Guardar permisos</Button></div>
        </div>
      </Modal>
    </div>
  )
}

function AccessAdminInner() {
  const slug = useSlug()
  const [tab, setTab] = useState<Tab>('dashboard')

  if (!slug) {
    return <Card><p className="text-sm text-slate-500">SeleccionÃ¡ una empresa para administrar Access.</p></Card>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">ClassClick Access</h1>
        <p className="mt-1 text-sm text-slate-300">RecepciÃ³n, cupos, credenciales, dispositivos y operadores.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`/access/reception/${slug}`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10">Abrir recepciÃ³n</a>
          <a href={`/access/monitor/${slug}`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10">Abrir monitor</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {TABS.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === item.key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab slug={slug} />}
      {tab === 'settings' && <SettingsTab slug={slug} />}
      {tab === 'students' && <StudentsTab slug={slug} />}
      {tab === 'logs' && <LogsTab slug={slug} />}
      {tab === 'devices' && <DevicesTab slug={slug} />}
      {tab === 'credentials' && <CredentialsTab slug={slug} />}
      {tab === 'operators' && <OperatorsTab slug={slug} />}
    </div>
  )
}

export default function AccessAdminPage() {
  return (
    <ToastProvider>
      <AccessAdminInner />
    </ToastProvider>
  )
}
