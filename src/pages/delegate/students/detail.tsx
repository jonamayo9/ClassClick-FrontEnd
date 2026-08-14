import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { docStatusInfo, formatDate } from '@/pages/delegate/documents/helpers'
import { RequestDocumentModal } from '@/pages/delegate/documents/request-modal'
import { ChargeItem } from '@/pages/delegate/payments/charge-item'
import { money } from '@/pages/admin/payments/hooks'
import type { DelegateAccountStatus } from '@/pages/delegate/payments/types'
import type { DelegateStudent } from './page'

interface DocFile { id: string; fileName: string; mimeType: string; uploadedAtUtc: string }
interface DocItem {
  assignmentId: string
  documentTypeId: string
  documentTypeName: string
  isRequired: boolean
  status: string
  requestNote: string | null
  reviewNote: string | null
  assignedAtUtc: string
  dueDateUtc: string | null
  submittedAtUtc: string | null
  reviewedAtUtc: string | null
  expirationDateUtc: string | null
  currentFileId: string | null
  currentFileName: string | null
  currentFileMimeType: string | null
  files: DocFile[]
}
interface StudentDocs {
  studentId: string
  fullName: string
  dni: string | null
  memberNumber: string | null
  email: string | null
  visibleCourses: { id: string; name: string }[]
  documents: DocItem[]
}
interface DocType { id: string; name: string; isRequired: boolean; hasExpiration: boolean; maxValidityDays: number | null }

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</span>
    </div>
  )
}

function DocStatusBadge({ status }: { status: string }) {
  const info = docStatusInfo(status)
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${info.classes}`}>{info.label}</span>
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

export default function DelegateStudentDetailPage() {
  const { id } = useParams()
  const slug = useAuth((s) => s.activeCompanySlug) ?? ''
  const toast = useToast()
  const qc = useQueryClient()

  const [requestOpen, setRequestOpen] = useState(false)
  const [docsTab, setDocsTab] = useState<'current' | 'historical'>('current')

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['delegate-student', slug, id],
    queryFn: () => apiService.get<DelegateStudent>(`/api/delegate/${slug}/students/${id}`),
    enabled: !!slug && !!id,
    retry: false,
  })

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ['delegate-student-docs', slug, id],
    queryFn: () => apiService.get<StudentDocs>(`/api/delegate/${slug}/documents/students/${id}/documents`),
    enabled: !!slug && !!id && !isError,
    retry: false,
  })

  const { data: docTypes = [] } = useQuery({
    queryKey: ['delegate-doc-types', slug],
    queryFn: () => apiService.get<DocType[]>(`/api/delegate/${slug}/documents/types`),
    enabled: !!slug,
  })

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['delegate-account', slug, id],
    queryFn: () => apiService.get<DelegateAccountStatus>(`/api/delegate/${slug}/payments/students/${id}/account-status`),
    enabled: !!slug && !!id && !isError,
    retry: false,
  })

  const { data: methods } = useQuery({
    queryKey: ['delegate-payment-methods', slug],
    queryFn: () => apiService.get<{ transferEnabled: boolean }>(`/api/delegate/${slug}/payments/methods`),
    enabled: !!slug,
  })
  const transferEnabled = methods?.transferEnabled ?? false

  const refreshAccount = () => qc.invalidateQueries({ queryKey: ['delegate-account', slug, id] })

  async function openFile(fileId: string) {
    try {
      const res = await apiService.get<{ url: string }>(`/api/delegate/${slug}/documents/files/${fileId}/view`)
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast('No se pudo abrir el archivo.', 'error')
    }
  }

  const docsYear = (d: DocItem) => new Date(d.assignedAtUtc).getFullYear()
  const docsAll = docs?.documents ?? []
  const currentYear = new Date().getFullYear()
  const currentDocs = docsAll.filter((d) => docsYear(d) === currentYear)
  const historicalDocs = docsAll.filter((d) => docsYear(d) !== currentYear)
  const historicalYears = [...new Set(historicalDocs.map(docsYear))].sort((a, b) => b - a)

  function renderDocItem(d: DocItem) {
    return (
      <div key={d.assignmentId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">{d.documentTypeName}</span>
            {d.isRequired && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700">Requerido</span>}
            <DocStatusBadge status={d.status} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {d.currentFileId && (
              <>
                <Button variant="outline" size="sm" onClick={() => openFile(d.currentFileId!)}>Ver</Button>
                <Button variant="outline" size="sm" onClick={() => openFile(d.currentFileId!)}>Descargar</Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
          <span>Vence: {formatDate(d.expirationDateUtc ?? d.dueDateUtc)}</span>
          <span>Solicitado: {formatDate(d.assignedAtUtc)}</span>
          {d.requestNote && <span>Nota: {d.requestNote}</span>}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-blue-600" /></div>
  }

  if (isError || !student) {
    return (
      <div className="space-y-4">
        <Link to="/delegate/students" className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">← Volver a alumnos</Link>
        <Card className="py-14 text-center text-slate-500">Alumno no encontrado o sin acceso.</Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link to="/delegate/students" className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">← Volver a alumnos</Link>

      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-sky-700 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">{student.fullName}</h1>
        <div className="mt-2 flex flex-wrap gap-1">
          {student.visibleCourses.map((c) => (
            <span key={c.id} className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{c.name}</span>
          ))}
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <Row label="Documento" value={student.dni} />
          <Row label="Email" value={student.email} />
          <Row label="Fecha de nacimiento" value={formatDate(student.dateOfBirth)} />
          <Row label="Teléfono" value={student.phone} />
          <Row label="Dirección" value={student.address} />
          <Row label="N° de socio/miembro" value={student.memberNumber} />
          <Row label="Estado" value={student.isActive ? 'Activo' : 'Inactivo'} />
          <Row label="Registro" value={student.isRegistrationCompleted ? 'Completado' : 'Pendiente'} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">Pagos</h2>
        {accountLoading ? (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-blue-600" /></div>
        ) : !account ? (
          <p className="py-8 text-center text-sm text-slate-500">Sin información de pagos.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <SummaryStat label="Saldo pendiente" value={money(account.summary.totalDebt)} />
              <SummaryStat label="Pendientes" value={String(account.summary.pendingCount)} />
              <SummaryStat label="Vencidas" value={String(account.summary.overdueCount)} />
              <SummaryStat label="Pagadas" value={String(account.summary.paidCount)} />
              <SummaryStat label="Próximo venc." value={formatDate(account.summary.nextDueDateUtc)} />
              <SummaryStat label="Último pago" value={formatDate(account.summary.lastPaymentAtUtc)} />
            </div>
            {account.charges.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Sin cuotas registradas.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {account.charges.map((c) => (
                  <ChargeItem key={c.monthlyChargeId} slug={slug} charge={c} transferEnabled={transferEnabled} onUploaded={refreshAccount} />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">Documentos</h2>
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setRequestOpen(true)}>
            Solicitar documento
          </Button>
        </div>

        {docsLoading ? (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-blue-600" /></div>
        ) : !docs || docs.documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Sin documentos registrados.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${docsTab === 'current' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
                onClick={() => setDocsTab('current')}>
                {currentYear} · Año actual
              </button>
              <button
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${docsTab === 'historical' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
                onClick={() => setDocsTab('historical')}>
                Históricos
              </button>
            </div>

            {docsTab === 'current' ? (
              currentDocs.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Sin documentos en el año actual.</p>
              ) : (
                <div className="mt-3 space-y-3">{currentDocs.map(renderDocItem)}</div>
              )
            ) : historicalYears.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Sin documentos históricos.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {historicalYears.map((year) => (
                  <div key={year}>
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{year}</h4>
                    <div className="space-y-3">{historicalDocs.filter((d) => docsYear(d) === year).map(renderDocItem)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {requestOpen && (
        <RequestDocumentModal
          slug={slug}
          mode="individual"
          docTypes={docTypes}
          activeTypeIds={docs?.documents.map((d) => d.documentTypeId) ?? []}
          studentId={id}
          studentName={student?.fullName}
          onClose={() => setRequestOpen(false)}
          onDone={() => qc.invalidateQueries({ queryKey: ['delegate-student-docs', slug, id] })}
        />
      )}
    </div>
  )
}
