import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface ReceptionContext {
  companyId: string
  companyName: string
  timeZoneId: string
  isReceptionEnabled: boolean
  isTurnstileEnabled: boolean
  canOperate: boolean
  canMonitor: boolean
  canOverrideDebt: boolean
  canOverrideQuota: boolean
  canAdjustQuota: boolean
}

interface ReceptionStudent {
  studentId: string
  fullName: string
  dni?: string | null
  memberNumber?: string | null
  photoUrl?: string | null
  hasDebt: boolean
  debtAmount: number
  currentQuotaState: string
  quotaLimit?: number | null
  quotaUsed: number
  quotaRemaining?: number | null
  previousMonthQuotaRemaining?: number | null
  quotaDueDateUtc?: string | null
}

interface AuthorizeResult {
  accessLogId: string
  studentName: string
  memberNumber?: string | null
  granted: boolean
  warning: boolean
  denialReason?: string | null
  message?: string | null
  hasDebt: boolean
  debtAmount: number
  currentQuotaState: string
  quotaPeriodSource: string
  quotaYear?: number | null
  quotaMonth?: number | null
  quotaLimit?: number | null
  quotaUsed: number
  quotaRemaining?: number | null
  occurredAtUtc: string
}

interface RecentEntry {
  accessLogId: string
  studentName: string
  memberNumber?: string | null
  granted: boolean
  warning: boolean
  denialReason?: string | null
  message?: string | null
  mode: string
  occurredAtUtc: string
  quotaYear?: number | null
  quotaMonth?: number | null
  quotaLimit?: number | null
  quotaUsed: number
  quotaRemaining?: number | null
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('es-AR') : '—'
}

export default function AccessReceptionPage() {
  const { companySlug = '' } = useParams<{ companySlug: string }>()
  const token = useAuth((state) => state.token)
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ReceptionStudent | null>(null)
  const [credentialCode, setCredentialCode] = useState('')
  const [qrTokenInput, setQrTokenInput] = useState('')
  const [mode, setMode] = useState('Reception')
  const [overrideDebt, setOverrideDebt] = useState(false)
  const [overrideQuota, setOverrideQuota] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [result, setResult] = useState<AuthorizeResult | null>(null)
  const [bridgeUrl, setBridgeUrl] = useState('http://127.0.0.1:8765')
  const [bridgeLoading, setBridgeLoading] = useState(false)

  async function readWithBridge() {
    setBridgeLoading(true)

    try {
      const parsed = new URL(bridgeUrl.trim())
      const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

      if (!loopbackHosts.has(parsed.hostname)) {
        throw new Error('El bridge PC/SC solo puede apuntar a localhost o 127.0.0.1. Para lectores de red usá el lector Android o la API de dispositivos.')
      }

      const requestInit = {
        method: 'POST',
        targetAddressSpace: 'loopback',
      } as RequestInit & { targetAddressSpace: string }

      const response = await fetch(`${parsed.origin}/read`, requestInit)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'El bridge no pudo leer la credencial.')
      }

      setResult(payload as AuthorizeResult)
      qc.invalidateQueries({ queryKey: ['access-reception-recent', companySlug] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo usar el bridge PC/SC.'
      const browserBlocked =
        error instanceof TypeError &&
        /failed to fetch|load failed|networkerror/i.test(message)

      setResult({
        accessLogId: '',
        studentName: '',
        granted: false,
        warning: false,
        denialReason: 'InvalidRequest',
        message: browserBlocked
          ? 'No se pudo conectar con el bridge local. Verificá que esté ejecutándose y usá Chrome, Edge o Firefox. Safari bloquea HTTP local desde una PWA HTTPS.'
          : message,
        hasDebt: false,
        debtAmount: 0,
        currentQuotaState: '',
        quotaPeriodSource: '',
        quotaUsed: 0,
        occurredAtUtc: new Date().toISOString(),
      })
    } finally {
      setBridgeLoading(false)
    }
  }

  const contextQuery = useQuery({
    queryKey: ['access-reception-context', companySlug],
    queryFn: () => apiService.get<ReceptionContext>(`/api/access/reception/${companySlug}/context`),
    enabled: !!token && !!companySlug,
  })

  const searchQuery = useQuery({
    queryKey: ['access-reception-search', companySlug, search],
    queryFn: () => apiService.get<ReceptionStudent[]>(`/api/access/reception/${companySlug}/students?search=${encodeURIComponent(search)}`),
    enabled: !!token && !!companySlug && search.trim().length >= 2,
  })

  const detailQuery = useQuery({
    queryKey: ['access-reception-student', companySlug, selected?.studentId],
    queryFn: () => apiService.get<ReceptionStudent>(`/api/access/reception/${companySlug}/students/${selected?.studentId}`),
    enabled: !!token && !!companySlug && !!selected,
  })

  const recentQuery = useQuery({
    queryKey: ['access-reception-recent', companySlug],
    queryFn: () => apiService.get<RecentEntry[]>(`/api/access/reception/${companySlug}/recent?limit=10`),
    enabled: !!token && !!companySlug && !!contextQuery.data,
    refetchInterval: 5000,
  })

  const detail = detailQuery.data ?? selected

  const authorize = useMutation({
    mutationFn: () => {
      if (!detail) throw new Error('Seleccioná un alumno.')
      return apiService.post<AuthorizeResult>(`/api/access/reception/${companySlug}/authorize`, {
        studentId: detail.studentId,
        mode,
        requestId: crypto.randomUUID(),
        overrideDebt,
        overrideQuota,
        overrideReason: overrideDebt || overrideQuota ? overrideReason.trim() : null,
      })
    },
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['access-reception-recent', companySlug] })
      qc.invalidateQueries({ queryKey: ['access-reception-student', companySlug, detail?.studentId] })
    },
    onError: (error) => setResult({
      accessLogId: '',
      studentName: detail?.fullName ?? '',
      granted: false,
      warning: false,
      denialReason: 'InvalidRequest',
      message: error instanceof Error ? error.message : getApiError(error),
      hasDebt: false,
      debtAmount: 0,
      currentQuotaState: '',
      quotaPeriodSource: '',
      quotaUsed: 0,
      occurredAtUtc: new Date().toISOString(),
    }),
  })

  const scanQr = useMutation({
    mutationFn: () => {
      if (!qrTokenInput.trim()) throw new Error('Ingresá el QR dinámico.')
      return apiService.post<AuthorizeResult>(`/api/access/reception/${companySlug}/qr`, {
        token: qrTokenInput.trim(),
        requestId: crypto.randomUUID(),
        mode,
      })
    },
    onSuccess: (data) => {
      setResult(data)
      setQrTokenInput('')
      qc.invalidateQueries({ queryKey: ['access-reception-recent', companySlug] })
    },
    onError: (error) => setResult({
      accessLogId: '',
      studentName: '',
      granted: false,
      warning: false,
      denialReason: 'InvalidRequest',
      message: error instanceof Error ? error.message : getApiError(error),
      hasDebt: false,
      debtAmount: 0,
      currentQuotaState: '',
      quotaPeriodSource: '',
      quotaUsed: 0,
      occurredAtUtc: new Date().toISOString(),
    }),
  })

  const scan = useMutation({
    mutationFn: () => {
      if (!credentialCode.trim()) throw new Error('Ingresá el código de credencial.')
      return apiService.post<AuthorizeResult>(`/api/access/reception/${companySlug}/scan`, {
        credentialCode: credentialCode.trim(),
        requestId: crypto.randomUUID(),
        mode,
      })
    },
    onSuccess: (data) => {
      setResult(data)
      setCredentialCode('')
      qc.invalidateQueries({ queryKey: ['access-reception-recent', companySlug] })
    },
    onError: (error) => setResult({
      accessLogId: '',
      studentName: '',
      granted: false,
      warning: false,
      denialReason: 'InvalidRequest',
      message: error instanceof Error ? error.message : getApiError(error),
      hasDebt: false,
      debtAmount: 0,
      currentQuotaState: '',
      quotaPeriodSource: '',
      quotaUsed: 0,
      occurredAtUtc: new Date().toISOString(),
    }),
  })

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-black">ClassClick Access</h1>
          <p className="mt-2 text-sm text-slate-500">Necesitás iniciar sesión para operar la recepción.</p>
          <Link to="/login" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Iniciar sesión</Link>
        </Card>
      </div>
    )
  }

  if (contextQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner className="h-10 w-10 text-white" /></div>
  }

  if (contextQuery.error || !contextQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-black">Recepción no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">{getApiError(contextQuery.error) || 'No tenés permiso o el módulo está deshabilitado.'}</p>
          <Link to="/" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Volver</Link>
        </Card>
      </div>
    )
  }

  const context = contextQuery.data

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">ClassClick Access</p>
            <h1 className="text-lg font-black">{context.companyName}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link to={`/access/monitor/${companySlug}`} className="rounded-xl border border-white/15 px-3 py-2 font-semibold hover:bg-white/10">Abrir monitor</Link>
            <span className="rounded-full bg-emerald-500/15 px-3 py-2 font-semibold text-emerald-300">Recepción</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {result && (
            <div className={`rounded-2xl border p-5 ${result.granted ? (result.warning ? 'border-amber-400/40 bg-amber-500/15' : 'border-emerald-400/40 bg-emerald-500/15') : 'border-red-400/40 bg-red-500/15'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-white/60">{result.granted ? (result.warning ? 'Advertencia' : 'Autorizado') : 'Rechazado'}</p>
                  <h2 className="mt-1 text-2xl font-black">{result.studentName || 'Sin alumno'}</h2>
                  <p className="mt-1 text-sm text-white/80">{result.message || result.denialReason}</p>
                </div>
                <Badge variant={result.granted ? (result.warning ? 'warning' : 'success') : 'danger'}>{result.granted ? 'Pasar' : 'No pasar'}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/70">
                <span>Cuota: {result.currentQuotaState || '—'}</span>
                <span>Cupo: {result.quotaUsed}/{result.quotaLimit ?? '∞'}</span>
                <span>Período: {result.quotaMonth ? `${result.quotaMonth}/${result.quotaYear}` : '—'}</span>
              </div>
            </div>
          )}

          <Card className="space-y-3 bg-slate-900 text-white">
            <h2 className="text-base font-bold">Buscar alumno</h2>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, DNI o número de carnet" className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500" />
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {(searchQuery.data ?? []).map((student) => (
                <button key={student.studentId} type="button" onClick={() => { setSelected(student); setResult(null) }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-2 text-left hover:bg-white/5">
                  {student.photoUrl ? <img src={student.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">{student.fullName.charAt(0)}</span>}
                  <span>
                    <span className="block text-sm font-semibold">{student.fullName}</span>
                    <span className="block text-xs text-slate-400">{student.dni || 'Sin DNI'} · #{student.memberNumber || '—'}</span>
                  </span>
                </button>
              ))}
              {search.trim().length >= 2 && (searchQuery.data ?? []).length === 0 && <p className="text-xs text-slate-400">Sin resultados.</p>}
            </div>
          </Card>

          <Card className="space-y-3 bg-slate-900 text-white">
            <h2 className="text-base font-bold">QR dinámico del alumno</h2>
            <p className="text-xs text-slate-400">El alumno muestra su QR desde la PWA. Es de un solo uso y se valida en backend.</p>
            <div className="flex gap-2">
              <Input value={qrTokenInput} onChange={(event) => setQrTokenInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') scanQr.mutate() }} placeholder="Token QR dinámico" className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500" />
              <Button variant="primary" onClick={() => scanQr.mutate()} loading={scanQr.isPending}>Validar QR</Button>
            </div>
          </Card>

          <Card className="space-y-3 bg-slate-900 text-white">
            <h2 className="text-base font-bold">Credencial QR de respaldo / lector USB HID</h2>
            <p className="text-xs text-slate-400">Las tarjetas NFC seguras se validan con un lector autenticado. Los lectores USB HID escriben en este campo. En recepción solo se aceptan credenciales QR de respaldo.</p>
            <div className="flex gap-2">
              <Input value={credentialCode} onChange={(event) => setCredentialCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') scan.mutate() }} placeholder="Código de credencial / lector HID" className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500" />
              <Button variant="primary" onClick={() => scan.mutate()} loading={scan.isPending}>Validar</Button>
            </div>
            <p className="text-[11px] text-slate-500">Para lector USB HID: enfocá el campo y acercá la credencial. Un UID suelto no se acepta como identidad segura.</p>
          </Card>

          <Card className="space-y-3 bg-slate-900 text-white">
            <h2 className="text-base font-bold">Lector PC/SC (bridge local)</h2>
            <p className="text-xs text-slate-400">Requiere ClassClick Access Bridge en esta PC con un lector PC/SC compatible. Usá Chrome, Edge o Firefox: Safari bloquea HTTP local desde una PWA HTTPS.</p>
            <div className="flex gap-2">
              <Input value={bridgeUrl} onChange={(event) => setBridgeUrl(event.target.value)} placeholder="http://127.0.0.1:8765" className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500" />
              <Button variant="outline" onClick={readWithBridge} loading={bridgeLoading}>Leer</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 bg-slate-900 text-white">
            <h2 className="text-base font-bold">Alumno seleccionado</h2>
            {detail ? (
              <>
                <div className="flex items-center gap-3">
                  {detail.photoUrl ? <img src={detail.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black">{detail.fullName.charAt(0)}</span>}
                  <div>
                    <p className="text-lg font-black">{detail.fullName}</p>
                    <p className="text-xs text-slate-400">{detail.dni || 'Sin DNI'} · #{detail.memberNumber || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">Cuota actual</p><p className="mt-1 font-bold">{detail.currentQuotaState}</p></div>
                  <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">Vencimiento</p><p className="mt-1 font-bold">{formatDate(detail.quotaDueDateUtc)}</p></div>
                  <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">Cupo</p><p className="mt-1 font-bold">{detail.quotaUsed}/{detail.quotaLimit ?? '∞'}</p></div>
                  <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">Saldo anterior</p><p className="mt-1 font-bold">{detail.previousMonthQuotaRemaining ?? '—'}</p></div>
                  <div className="col-span-2 rounded-xl bg-white/5 p-3"><p className="text-slate-400">Deuda</p><p className={`mt-1 font-bold ${detail.hasDebt ? 'text-red-300' : 'text-emerald-300'}`}>{detail.hasDebt ? `$${detail.debtAmount}` : 'Sin deuda'}</p></div>
                </div>

                <Select value={mode} onChange={(event) => setMode(event.target.value)} className="border-white/10 bg-slate-800 text-white">
                  <option value="Reception">Recepción sin molinete</option>
                  {context.isTurnstileEnabled && <option value="Turnstile">Molinete</option>}
                </Select>

                {(context.canOverrideDebt || context.canOverrideQuota) && (
                  <div className="space-y-2 rounded-xl border border-white/10 p-3 text-xs">
                    <p className="font-semibold text-slate-300">Excepciones autorizadas</p>
                    {context.canOverrideDebt && <label className="flex items-center gap-2"><input type="checkbox" checked={overrideDebt} onChange={(event) => setOverrideDebt(event.target.checked)} /> Excepción de deuda</label>}
                    {context.canOverrideQuota && <label className="flex items-center gap-2"><input type="checkbox" checked={overrideQuota} onChange={(event) => setOverrideQuota(event.target.checked)} /> Excepción de cupo</label>}
                    {(overrideDebt || overrideQuota) && <Input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Motivo obligatorio" className="border-white/10 bg-slate-800 text-white" />}
                  </div>
                )}

                <Button variant="primary" className="w-full" onClick={() => authorize.mutate()} loading={authorize.isPending}>Registrar ingreso</Button>
              </>
            ) : (
              <p className="text-sm text-slate-400">Buscá y seleccioná un alumno para validar el ingreso.</p>
            )}
          </Card>

          <Card className="space-y-3 bg-slate-900 text-white">
            <h2 className="text-base font-bold">Últimos ingresos</h2>
            <div className="space-y-2">
              {(recentQuery.data ?? []).map((entry) => (
                <div key={entry.accessLogId} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold">{entry.studentName}</p>
                    <p className="text-slate-400">{formatDate(entry.occurredAtUtc)} · {entry.mode}</p>
                  </div>
                  <Badge variant={entry.granted ? (entry.warning ? 'warning' : 'success') : 'danger'}>{entry.granted ? (entry.warning ? 'Advertencia' : 'OK') : 'Rechazado'}</Badge>
                </div>
              ))}
              {(recentQuery.data ?? []).length === 0 && <p className="text-xs text-slate-400">Sin ingresos recientes.</p>}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
