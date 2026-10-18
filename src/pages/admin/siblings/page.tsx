import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import {
  useSearchStudents, useFamilyGroupsPaged, useFamilyGroupDetail,
  useSiblingRequestsPaged, useSiblingsSummary,
  useLinkStudents, useUnlinkStudent, useBreakFamilyGroup, useUpdateFamilyGroupBilling,
  useRequestDetail, useRequestDocuments, useViewDocument,
  useRequestDocumentsAction, useApproveSiblingRequest, useRejectSiblingRequest,
  formatDate, formatDateShort, getRequestStatusLabel, getRequestStatusBadgeClass,
  isRequestActionable,
} from './hooks'
import type { SearchStudent, FamilyMember, FamilyGroupListItem, SiblingRequest } from './hooks'
import {
  Users, UserRoundCheck, Clock, CheckCircle2, Plus, Search, RotateCcw, RefreshCw,
  X, Eye, ExternalLink, FileText,
} from 'lucide-react'

type Tab = 'groups' | 'requests'
type KpiTone = 'blue' | 'green' | 'amber' | 'cyan'

const kpiTones: Record<KpiTone, { icon: string; text: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400' },
  green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  cyan: { icon: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400', text: 'text-cyan-600 dark:text-cyan-400' },
}

const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']

function useSlug() {
  return useAuth((state) => state.activeCompanySlug) ?? ''
}

function shortId(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('') || '?'
}

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function SiblingsPageInner() {
  const toast = useToast()
  const slug = useSlug()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('groups')

  const [groupSearchInput, setGroupSearchInput] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  const [shareChargesFilter, setShareChargesFilter] = useState('')
  const [groupPage, setGroupPage] = useState(1)
  const [groupPageSize, setGroupPageSize] = useState(10)

  const [reqSearchInput, setReqSearchInput] = useState('')
  const [reqSearch, setReqSearch] = useState('')
  const [reqStatus, setReqStatus] = useState('')
  const [reqPage, setReqPage] = useState(1)
  const [reqPageSize, setReqPageSize] = useState(10)

  const [panelGroupId, setPanelGroupId] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [billingTarget, setBillingTarget] = useState<FamilyGroupListItem | null>(null)
  const [unlinkTarget, setUnlinkTarget] = useState<{ group: FamilyGroupListItem; member: FamilyMember } | null>(null)
  const [breakTarget, setBreakTarget] = useState<FamilyGroupListItem | null>(null)

  const [detailRequestId, setDetailRequestId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<{ url: string; fileName: string; isImage: boolean; isPdf: boolean } | null>(null)
  const [showReview, setShowReview] = useState<{ action: 'approve' | 'reject' | 'request-docs'; requestId: string } | null>(null)

  const groupTimer = useRef<number | undefined>(undefined)
  const reqTimer = useRef<number | undefined>(undefined)
  const previousSlug = useRef(slug)

  useEffect(() => {
    if (previousSlug.current === slug) return
    previousSlug.current = slug
    setGroupSearchInput(''); setGroupSearch(''); setShareChargesFilter(''); setGroupPage(1)
    setReqSearchInput(''); setReqSearch(''); setReqStatus(''); setReqPage(1)
    setPanelGroupId(null); setLinkOpen(false); setDetailRequestId(null); setShowPreview(null); setShowReview(null)
  }, [slug])

  useEffect(() => () => { clearTimeout(groupTimer.current); clearTimeout(reqTimer.current) }, [])

  function debounceGroup(value: string) {
    clearTimeout(groupTimer.current)
    groupTimer.current = window.setTimeout(() => { setGroupSearch(value); setGroupPage(1) }, 300)
  }

  function debounceRequests(value: string) {
    clearTimeout(reqTimer.current)
    reqTimer.current = window.setTimeout(() => { setReqSearch(value); setReqPage(1) }, 300)
  }

  const summaryQuery = useSiblingsSummary()
  const groupsQuery = useFamilyGroupsPaged({
    search: groupSearch,
    shareCharges: shareChargesFilter,
    page: groupPage,
    pageSize: groupPageSize,
  })
  const requestsQuery = useSiblingRequestsPaged({
    search: reqSearch,
    status: reqStatus,
    page: reqPage,
    pageSize: reqPageSize,
  })

  const requestDetailQuery = useRequestDetail(detailRequestId)
  const requestDocumentsQuery = useRequestDocuments(detailRequestId)

  const approveMutation = useApproveSiblingRequest()
  const rejectMutation = useRejectSiblingRequest()
  const requestDocsMutation = useRequestDocumentsAction()
  const viewDocMutation = useViewDocument()
  const billingMutation = useUpdateFamilyGroupBilling()
  const unlinkMutation = useUnlinkStudent()
  const breakMutation = useBreakFamilyGroup()

  const summary = summaryQuery.data
  const groups = groupsQuery.data?.items ?? []
  const groupsTotal = groupsQuery.data?.totalCount ?? 0
  const requests = requestsQuery.data?.items ?? []
  const requestsTotal = requestsQuery.data?.totalCount ?? 0

  const hasGroupFilters = !!groupSearch || !!shareChargesFilter
  const hasRequestFilters = !!reqSearch || !!reqStatus

  function clearGroupFilters() {
    clearTimeout(groupTimer.current)
    setGroupSearchInput(''); setGroupSearch(''); setShareChargesFilter(''); setGroupPage(1)
  }

  function clearRequestFilters() {
    clearTimeout(reqTimer.current)
    setReqSearchInput(''); setReqSearch(''); setReqStatus(''); setReqPage(1)
  }

  async function handleRefresh() {
    await Promise.all([
      summaryQuery.refetch(),
      tab === 'groups' ? groupsQuery.refetch() : requestsQuery.refetch(),
    ])
  }

  async function confirmBilling() {
    if (!billingTarget) return
    try {
      await billingMutation.mutateAsync({ familyGroupId: billingTarget.familyGroupId, shareCharges: !billingTarget.shareCharges })
      toast(!billingTarget.shareCharges
        ? 'Compartir cuotas habilitado para el grupo.'
        : 'Compartir cuotas deshabilitado para el grupo.')
    } catch (e) {
      toast(getApiError(e), 'error')
    }
    setBillingTarget(null)
  }

  async function confirmUnlink() {
    if (!unlinkTarget) return
    try {
      await unlinkMutation.mutateAsync(unlinkTarget.member.studentId)
      toast(`${unlinkTarget.member.fullName} fue quitado del grupo familiar.`)
    } catch (e) {
      toast(getApiError(e) || 'Error al quitar del grupo.', 'error')
    }
    setUnlinkTarget(null)
  }

  async function confirmBreak() {
    if (!breakTarget) return
    const firstMember = (breakTarget.members ?? [])[0]
    if (!firstMember) { setBreakTarget(null); return }
    try {
      await breakMutation.mutateAsync(firstMember.studentId)
      toast('Grupo familiar desvinculado correctamente.')
    } catch (e) {
      toast(getApiError(e) || 'Error al desvincular el grupo.', 'error')
    }
    setBreakTarget(null)
  }

  async function handleViewDocument(documentId: string) {
    if (!detailRequestId) return
    const doc = (requestDocumentsQuery.data ?? []).find((d) => String(d.id) === String(documentId))
    try {
      const result = await viewDocMutation.mutateAsync({ requestId: detailRequestId, documentId })
      setShowPreview({
        url: result.url,
        fileName: doc?.fileName || 'Documento',
        isImage: doc?.isImage ?? false,
        isPdf: doc?.isPdf ?? false,
      })
    } catch {
      toast('No se pudo abrir el documento.', 'error')
    }
  }

  async function handleReviewSubmit(note: string | null) {
    if (!showReview) return
    try {
      if (showReview.action === 'approve') {
        await approveMutation.mutateAsync({ requestId: showReview.requestId, note })
        toast('Solicitud aprobada correctamente.')
      } else if (showReview.action === 'reject') {
        await rejectMutation.mutateAsync({ requestId: showReview.requestId, note })
        toast('Solicitud rechazada correctamente.')
      } else {
        await requestDocsMutation.mutateAsync({ requestId: showReview.requestId, note: note! })
        toast('Se solicitó documentación correctamente.')
      }
      setShowReview(null)
      setDetailRequestId(null)
    } catch (e) {
      toast(getApiError(e), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Hermanos</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">
            Administrá grupos familiares, vinculaciones y solicitudes de alumnos.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            className="h-10"
            loading={groupsQuery.isFetching || requestsQuery.isFetching || summaryQuery.isFetching}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          <Button className="hidden h-10 bg-blue-600 text-white hover:bg-blue-500 sm:inline-flex" onClick={() => setLinkOpen(true)}>
            <Plus className="h-4 w-4" /> Vincular alumnos
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <KpiCard icon={Users} tone="blue" value={summary?.familyGroups ?? 0} label="Grupos familiares" loading={summaryQuery.isLoading} />
        <KpiCard icon={UserRoundCheck} tone="green" value={summary?.linkedStudents ?? 0} label="Alumnos vinculados" loading={summaryQuery.isLoading} />
        <KpiCard icon={Clock} tone="amber" value={summary?.pendingRequests ?? 0} label="Solicitudes pendientes" loading={summaryQuery.isLoading} />
        <KpiCard icon={CheckCircle2} tone="cyan" value={summary?.approvedRequests ?? 0} label="Solicitudes aprobadas" loading={summaryQuery.isLoading} />
      </div>

      <div className="sm:hidden">
        <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500" onClick={() => setLinkOpen(true)}>
          <Plus className="h-4 w-4" /> Vincular alumnos
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
        {([
          { key: 'groups', label: 'Grupos familiares' },
          { key: 'requests', label: 'Solicitudes' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'groups' ? (
        <>
          {/* Filters */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <div className="relative min-w-0 lg:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={groupSearchInput}
                  onChange={(e) => { setGroupSearchInput(e.target.value); debounceGroup(e.target.value) }}
                  placeholder="Buscar por nombre, apellido o DNI de integrante..."
                  autoComplete="off"
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[18rem]">
                <Select value={shareChargesFilter} onChange={(e) => { setShareChargesFilter(e.target.value); setGroupPage(1) }} aria-label="Filtro por compartir cuotas">
                  <option value="">Compartir cuotas: Todos</option>
                  <option value="enabled">Habilitado</option>
                  <option value="disabled">Deshabilitado</option>
                </Select>
              </div>
              <Button variant="outline" className="h-11 shrink-0" onClick={clearGroupFilters} disabled={!hasGroupFilters}>
                <RotateCcw className="h-4 w-4" /> Limpiar
              </Button>
            </div>
            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {groupsTotal} {groupsTotal === 1 ? 'grupo' : 'grupos'} {hasGroupFilters ? 'encontrados' : 'en total'}
              </span>
              {groupsQuery.isFetching && <span className="text-xs text-slate-400">Actualizando...</span>}
            </div>
          </Card>

          {/* Listing */}
          <Card className="p-4 sm:p-6">
            {groupsQuery.isLoading ? (
              <TableSkeleton />
            ) : groupsQuery.isError ? (
              <ErrorState message="No se pudieron cargar los grupos familiares." onRetry={() => void groupsQuery.refetch()} />
            ) : groups.length === 0 ? (
              <EmptyState
                icon="👫"
                title={hasGroupFilters ? 'Sin resultados' : 'Todavía no hay grupos familiares'}
                description={hasGroupFilters ? 'Probá ajustar o limpiar los filtros.' : 'Vinculá dos alumnos para crear el primer grupo.'}
                action={hasGroupFilters ? { label: 'Limpiar filtros', onClick: clearGroupFilters } : { label: 'Vincular alumnos', onClick: () => setLinkOpen(true) }}
              />
            ) : (
              <GroupsList
                groups={groups}
                onOpen={(g) => setPanelGroupId(g.familyGroupId)}
                onManageBilling={(g) => setBillingTarget(g)}
                onUnlink={(g, m) => setUnlinkTarget({ group: g, member: m })}
                onBreak={(g) => setBreakTarget(g)}
              />
            )}

            {!groupsQuery.isLoading && !groupsQuery.isError && groups.length > 0 && (
              <div className="mt-4">
                <Pagination
                  page={groupPage}
                  pageSize={groupPageSize}
                  totalCount={groupsTotal}
                  onPageChange={setGroupPage}
                  loading={groupsQuery.isFetching}
                  showPageNumbers
                  pageSizeOptions={[10, 20, 50]}
                  onPageSizeChange={(n) => { setGroupPageSize(n); setGroupPage(1) }}
                />
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <div className="relative min-w-0 lg:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={reqSearchInput}
                  onChange={(e) => { setReqSearchInput(e.target.value); debounceRequests(e.target.value) }}
                  placeholder="Buscar por solicitante, destinatario, DNI o email..."
                  autoComplete="off"
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[18rem]">
                <Select value={reqStatus} onChange={(e) => { setReqStatus(e.target.value); setReqPage(1) }} aria-label="Filtro por estado">
                  <option value="">Estado: Todas</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                </Select>
              </div>
              <Button variant="outline" className="h-11 shrink-0" onClick={clearRequestFilters} disabled={!hasRequestFilters}>
                <RotateCcw className="h-4 w-4" /> Limpiar
              </Button>
            </div>
            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {requestsTotal} {requestsTotal === 1 ? 'solicitud' : 'solicitudes'} {hasRequestFilters ? 'encontradas' : 'en total'}
              </span>
              {requestsQuery.isFetching && <span className="text-xs text-slate-400">Actualizando...</span>}
            </div>
          </Card>

          {/* Listing */}
          <Card className="p-4 sm:p-6">
            {requestsQuery.isLoading ? (
              <TableSkeleton />
            ) : requestsQuery.isError ? (
              <ErrorState message="No se pudieron cargar las solicitudes." onRetry={() => void requestsQuery.refetch()} />
            ) : requests.length === 0 ? (
              <EmptyState
                icon="📩"
                title={hasRequestFilters ? 'Sin resultados' : 'No hay solicitudes'}
                description={hasRequestFilters ? 'Probá ajustar o limpiar los filtros.' : 'Las solicitudes enviadas por los alumnos aparecerán acá.'}
                action={hasRequestFilters ? { label: 'Limpiar filtros', onClick: clearRequestFilters } : undefined}
              />
            ) : (
              <RequestsTable
                requests={requests}
                onOpenDetail={(r) => setDetailRequestId(r.id)}
                onViewGroup={(gid) => setPanelGroupId(gid)}
                onReview={(action, requestId) => setShowReview({ action, requestId })}
              />
            )}

            {!requestsQuery.isLoading && !requestsQuery.isError && requests.length > 0 && (
              <div className="mt-4">
                <Pagination
                  page={reqPage}
                  pageSize={reqPageSize}
                  totalCount={requestsTotal}
                  onPageChange={setReqPage}
                  loading={requestsQuery.isFetching}
                  showPageNumbers
                  pageSizeOptions={[10, 20, 50]}
                  onPageSizeChange={(n) => { setReqPageSize(n); setReqPage(1) }}
                />
              </div>
            )}
          </Card>
        </>
      )}

      <GroupPanel
        open={!!panelGroupId}
        slug={slug}
        familyGroupId={panelGroupId}
        onClose={() => setPanelGroupId(null)}
        onOpenStudent={() => navigate('/admin/students')}
      />

      <LinkModal open={linkOpen} onClose={() => setLinkOpen(false)} />

      <RequestDetailModal
        open={!!detailRequestId}
        request={requestDetailQuery.data ?? null}
        documents={requestDocumentsQuery.data ?? []}
        detailLoading={requestDetailQuery.isLoading}
        detailError={requestDetailQuery.isError}
        documentsLoading={requestDocumentsQuery.isLoading}
        documentsError={requestDocumentsQuery.isError}
        isViewingDocument={viewDocMutation.isPending}
        onViewDocument={handleViewDocument}
        onViewGroup={(gid) => { setPanelGroupId(gid); setDetailRequestId(null) }}
        onRetry={() => void Promise.all([requestDetailQuery.refetch(), requestDocumentsQuery.refetch()])}
        onReview={(action) => { if (detailRequestId) setShowReview({ action, requestId: detailRequestId }) }}
        onClose={() => setDetailRequestId(null)}
      />

      {showPreview && (
        <DocumentPreviewModal
          url={showPreview.url}
          fileName={showPreview.fileName}
          isImage={showPreview.isImage}
          isPdf={showPreview.isPdf}
          onClose={() => setShowPreview(null)}
        />
      )}

      {showReview && (
        <ReviewModal
          action={showReview.action}
          isPending={approveMutation.isPending || rejectMutation.isPending || requestDocsMutation.isPending}
          onSubmit={handleReviewSubmit}
          onClose={() => setShowReview(null)}
        />
      )}

      <ConfirmModal
        open={!!billingTarget}
        onClose={() => setBillingTarget(null)}
        title={billingTarget?.shareCharges ? 'Deshabilitar compartir cuotas' : 'Habilitar compartir cuotas'}
        message={billingTarget?.shareCharges
          ? 'Los integrantes dejarán de ver las cuotas compartidas del grupo. No se modifican titulares, importes ni pagos.'
          : 'Los integrantes del grupo podrán ver y pagar las cuotas compartidas. Esta opción no fusiona ni modifica obligaciones económicas.'}
        confirmText={billingTarget?.shareCharges ? 'Deshabilitar' : 'Habilitar'}
        variant="primary"
        loading={billingMutation.isPending}
        onConfirm={() => void confirmBilling()}
      />

      <ConfirmModal
        open={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        title="Quitar del grupo"
        message={unlinkTarget
          ? (unlinkTarget.group.memberCount <= 2
            ? `Vas a quitar a ${unlinkTarget.member.fullName} del grupo familiar. Como el grupo tiene 2 integrantes, quedará desvinculado por completo. El alumno sigue registrado en la empresa; no se eliminan inscripciones, cuotas, pagos ni beneficios.`
            : `¿Querés quitar a ${unlinkTarget.member.fullName} del grupo familiar? Solo se desvincula del grupo; el alumno sigue registrado en la empresa y no se modifican inscripciones, cuotas, pagos ni beneficios.`)
          : ''}
        confirmText="Quitar del grupo"
        variant="danger"
        loading={unlinkMutation.isPending}
        onConfirm={() => void confirmUnlink()}
      />

      <ConfirmModal
        open={!!breakTarget}
        onClose={() => setBreakTarget(null)}
        title="Desvincular grupo"
        message={breakTarget
          ? `Se van a desvincular los ${breakTarget.memberCount} integrantes del grupo familiar. Los alumnos seguirán registrados en la empresa; no se eliminan inscripciones, cuotas, pagos ni información académica.`
          : ''}
        confirmText="Desvincular grupo"
        variant="danger"
        loading={breakMutation.isPending}
        onConfirm={() => void confirmBreak()}
      />
    </div>
  )
}

/* ─── KPI ─── */
function KpiCard({ icon: Icon, tone, value, label, loading }: {
  icon: React.ComponentType<{ className?: string }>
  tone: KpiTone
  value: number
  label: string
  loading?: boolean
}) {
  const t = kpiTones[tone]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-[42px] sm:w-[42px] ${t.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white sm:text-2xl">
          {loading ? '—' : value}
        </p>
        <p className="text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      </div>
    </div>
  )
}

/* ─── Tables ─── */
function GroupsList({ groups, onOpen, onManageBilling, onUnlink, onBreak }: {
  groups: FamilyGroupListItem[]
  onOpen: (group: FamilyGroupListItem) => void
  onManageBilling: (group: FamilyGroupListItem) => void
  onUnlink: (group: FamilyGroupListItem, member: FamilyMember) => void
  onBreak: (group: FamilyGroupListItem) => void
}) {
  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const members = group.members ?? []
        return (
          <section key={group.familyGroupId} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Grupo familiar #{groupIndex + 1}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{group.memberCount} {group.memberCount === 1 ? 'integrante' : 'integrantes'}. Las cuotas no se duplican.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onManageBilling(group)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Compartir cuotas</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${group.shareCharges ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'}`}>
                    {group.shareCharges ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => onOpen(group)}>
                  <Eye className="h-3.5 w-3.5" /> Ver detalle
                </Button>
                <Button variant="outline" size="sm" disabled={members.length === 0}
                  className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  onClick={() => onBreak(group)}>
                  Desvincular grupo
                </Button>
              </div>
            </div>

            {members.length === 0 ? (
              group.memberNames.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.memberNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white px-4 py-3 dark:bg-slate-900">
                      <Avatar name={name} />
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">Este grupo no tiene integrantes.</div>
              )
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map((member) => (
                  <div key={member.studentId} className="flex flex-col gap-3 bg-white px-4 py-3 dark:bg-slate-900 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={member.fullName} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{member.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">DNI {member.dni || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className={member.isActive ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-400' : 'text-xs font-semibold text-rose-600 dark:text-rose-400'}>
                        {member.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      <Button variant="outline" size="sm" className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        onClick={() => onUnlink(group, member)}>
                        Quitar del grupo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function RequestsTable({ requests, onOpenDetail, onViewGroup, onReview }: {
  requests: SiblingRequest[]
  onOpenDetail: (request: SiblingRequest) => void
  onViewGroup: (familyGroupId: string) => void
  onReview: (action: 'approve' | 'reject' | 'request-docs', requestId: string) => void
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800">
              <th className="px-3 py-3 font-semibold">Solicitante</th>
              <th className="px-3 py-3 font-semibold">Destinatario</th>
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map((req) => {
              const canAct = isRequestActionable(req.status)
              return (
                <tr
                  key={req.id}
                  onClick={() => onOpenDetail(req)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(req) } }}
                  className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-2">
                    <div className="flex min-h-[48px] items-center gap-2.5">
                      <Avatar name={req.requestedByStudentFullName} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{req.requestedByStudentFullName}</p>
                        <p className="truncate text-xs text-slate-400">{req.requestedByDni || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <p className="truncate font-medium text-slate-700 dark:text-slate-200">{req.targetStudentFullName}</p>
                    <p className="truncate text-xs text-slate-400">{req.targetDni || '—'}</p>
                  </td>
                  <td className="px-3 py-2 text-[13px] text-slate-500 dark:text-slate-400">{formatDateShort(req.createdAtUtc)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getRequestStatusBadgeClass(req.status)}`}>
                      {getRequestStatusLabel(req.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => onOpenDetail(req)}>Ver detalle</Button>
                      {req.familyGroupId && (
                        <Button variant="outline" size="sm" className="h-8 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                          onClick={() => onViewGroup(req.familyGroupId!)}>Ver grupo</Button>
                      )}
                      {canAct && (
                        <>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            onClick={() => onReview('approve', req.id)}>Aprobar</Button>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            onClick={() => onReview('reject', req.id)}>Rechazar</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {requests.map((req) => {
          const canAct = isRequestActionable(req.status)
          return (
            <div
              key={req.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDetail(req)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(req) } }}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{req.requestedByStudentFullName}</p>
                  <p className="truncate text-xs text-slate-400">Vincular con {req.targetStudentFullName}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getRequestStatusBadgeClass(req.status)}`}>
                  {getRequestStatusLabel(req.status)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{formatDateShort(req.createdAtUtc)}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => onOpenDetail(req)}>Ver detalle</Button>
                {req.familyGroupId && (
                  <Button variant="outline" size="sm" className="h-8 text-[11px] border-blue-200 text-blue-700 dark:border-blue-900/50 dark:text-blue-400"
                    onClick={() => onViewGroup(req.familyGroupId!)}>Ver grupo</Button>
                )}
                {canAct && (
                  <>
                    <Button variant="outline" size="sm" className="h-8 text-[11px] border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400"
                      onClick={() => onReview('approve', req.id)}>Aprobar</Button>
                    <Button variant="outline" size="sm" className="h-8 text-[11px] border-rose-200 text-rose-600 dark:border-rose-900/50 dark:text-rose-400"
                      onClick={() => onReview('reject', req.id)}>Rechazar</Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs'
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-full font-bold text-white ${avatarColor(name)}`}>
      {initials(name)}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
    </div>
  )
}

/* ─── Group side panel ─── */
function GroupPanel({ open, slug, familyGroupId, onClose, onOpenStudent }: {
  open: boolean
  slug: string
  familyGroupId: string | null
  onClose: () => void
  onOpenStudent: () => void
}) {
  const toast = useToast()
  const [tab, setTab] = useState<'resumen' | 'integrantes'>('resumen')
  const [mounted, setMounted] = useState(open)
  const [billingTarget, setBillingTarget] = useState<FamilyMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<FamilyMember | null>(null)
  const [breakTarget, setBreakTarget] = useState<FamilyMember | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const detailQuery = useFamilyGroupDetail(open ? familyGroupId : null)
  const billingMutation = useUpdateFamilyGroupBilling()
  const unlinkMutation = useUnlinkStudent()
  const breakMutation = useBreakFamilyGroup()

  useEffect(() => {
    if (open) {
      setMounted(true)
      setTab('resumen')
      setTimeout(() => closeButtonRef.current?.focus(), 50)
    } else {
      const t = setTimeout(() => setMounted(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const group = detailQuery.data ?? null
  const members = group?.members ?? []

  async function confirmBilling() {
    if (!billingTarget || !group?.familyGroupId) return
    const next = !group.shareCharges
    try {
      await billingMutation.mutateAsync({ familyGroupId: group.familyGroupId, shareCharges: next })
      toast(next ? 'Compartir cuotas habilitado para el grupo.' : 'Compartir cuotas deshabilitado para el grupo.')
    } catch (e) {
      toast(getApiError(e), 'error')
    }
    setBillingTarget(null)
  }

  function requestRemove(member: FamilyMember) {
    if (members.length <= 2) setBreakTarget(member)
    else setRemoveTarget(member)
  }

  async function confirmRemove() {
    if (!removeTarget) return
    try {
      await unlinkMutation.mutateAsync(removeTarget.studentId)
      toast(`${removeTarget.fullName} fue quitado del grupo familiar.`)
    } catch (e) {
      toast(getApiError(e), 'error')
    }
    setRemoveTarget(null)
  }

  async function confirmBreak() {
    if (!breakTarget) return
    try {
      await breakMutation.mutateAsync(breakTarget.studentId)
      toast('Grupo familiar eliminado correctamente.')
      onClose()
    } catch (e) {
      toast(getApiError(e), 'error')
    }
    setBreakTarget(null)
  }

  void slug

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del grupo familiar"
        className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:max-w-[540px] dark:bg-slate-900 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Fixed header */}
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[19px] font-bold text-slate-900 dark:text-white">Grupo familiar</p>
                  {familyGroupId && (
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {shortId(familyGroupId)}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {group ? `${members.length} ${members.length === 1 ? 'integrante' : 'integrantes'}` : 'Cargando integrantes...'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex gap-5 overflow-x-auto scrollbar-hide">
              {([
                { key: 'resumen', label: 'Resumen' },
                { key: 'integrantes', label: 'Integrantes' },
              ] as { key: 'resumen' | 'integrantes'; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`whitespace-nowrap border-b-2 pb-2 text-xs font-semibold transition ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {detailQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : detailQuery.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">No se pudo cargar el grupo familiar.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>Reintentar</Button>
            </div>
          ) : !group ? (
            <p className="py-12 text-center text-sm text-slate-400">Grupo familiar no encontrado.</p>
          ) : tab === 'resumen' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Información general</p>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <InfoRow label="Identificador" value={shortId(group.familyGroupId ?? '')} />
                  <InfoRow label="Integrantes" value={String(members.length)} />
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Compartir cuotas</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {group.shareCharges ? 'Habilitado' : 'Deshabilitado'}
                    </p>
                  </div>
                  <Switch
                    checked={group.shareCharges}
                    disabled={billingMutation.isPending}
                    onCheckedChange={() => setBillingTarget(members[0] ?? null)}
                    aria-label="Activar o desactivar compartir cuotas"
                  />
                </div>
                <p className="mt-3 text-[11px] leading-4 text-slate-400">
                  Habilitar Compartir cuotas permite el acceso compartido previsto por el sistema, pero no fusiona ni modifica
                  obligaciones económicas: no cambia titulares, importes, deudas, pagos, becas ni vencimientos.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Acciones</p>
                <Button
                  variant="outline"
                  className="mt-3 w-full justify-start border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => setBreakTarget(members[0] ?? null)}
                >
                  {members.length <= 2 ? 'Romper grupo' : 'Administrar integrantes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Integrantes <span className="font-medium text-slate-400">({members.length})</span>
              </p>
              {members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  Este grupo no tiene integrantes.
                </div>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li key={member.studentId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.fullName} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{member.fullName}</p>
                          <p className="truncate text-xs text-slate-400">DNI {member.dni || '—'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          member.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
                        }`}>
                          {member.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <Button variant="outline" size="sm" onClick={onOpenStudent}>
                          <ExternalLink className="h-3.5 w-3.5" /> Ver en Alumnos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => requestRemove(member)}
                        >
                          {members.length <= 2 ? 'Romper grupo' : 'Quitar del grupo'}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!billingTarget}
        onClose={() => setBillingTarget(null)}
        title={group?.shareCharges ? 'Deshabilitar compartir cuotas' : 'Habilitar compartir cuotas'}
        message={group?.shareCharges
          ? 'Los integrantes dejarán de ver las cuotas compartidas del grupo. No se modifican titulares, importes ni pagos.'
          : 'Los integrantes del grupo podrán ver y pagar las cuotas compartidas. Esta opción no fusiona ni modifica obligaciones económicas.'}
        confirmText={group?.shareCharges ? 'Deshabilitar' : 'Habilitar'}
        variant="primary"
        loading={billingMutation.isPending}
        onConfirm={() => void confirmBilling()}
      />

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Quitar del grupo"
        message={removeTarget ? `¿Querés quitar a ${removeTarget.fullName} del grupo familiar?` : ''}
        confirmText="Quitar"
        loading={unlinkMutation.isPending}
        onConfirm={() => void confirmRemove()}
      />

      <ConfirmModal
        open={!!breakTarget}
        onClose={() => setBreakTarget(null)}
        title="Romper grupo"
        message={breakTarget
          ? `Se van a desvincular todos los integrantes del grupo familiar. ¿Querés continuar?`
          : ''}
        confirmText="Romper grupo"
        loading={breakMutation.isPending}
        onConfirm={() => void confirmBreak()}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  )
}

/* ─── Link students modal ─── */
function LinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [studentA, setStudentA] = useState<SearchStudent | null>(null)
  const [studentB, setStudentB] = useState<SearchStudent | null>(null)
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [error, setError] = useState('')

  const searchResultsA = useSearchStudents(searchA, null)
  const searchResultsB = useSearchStudents(searchB, studentA?.studentId ?? null)
  const linkMutation = useLinkStudents()

  useEffect(() => {
    if (!open) return
    setStudentA(null); setStudentB(null); setSearchA(''); setSearchB(''); setError('')
  }, [open])

  function selectA(student: SearchStudent) {
    setStudentA(student)
    setSearchA(student.fullName)
    setStudentB(null)
    setSearchB('')
    setError('')
  }

  function selectB(student: SearchStudent) {
    setStudentB(student)
    setSearchB(student.fullName)
    setError('')
  }

  async function submit() {
    if (!studentA || !studentB) { setError('Seleccioná dos alumnos para vincular.'); return }
    if (studentA.studentId === studentB.studentId) { setError('No podés vincular un alumno consigo mismo.'); return }
    try {
      await linkMutation.mutateAsync({ studentId: studentA.studentId, siblingStudentId: studentB.studentId })
      toast(`Alumnos vinculados: ${studentA.fullName} y ${studentB.fullName}.`)
      onClose()
    } catch (e) {
      setError(getApiError(e))
    }
  }

  const canSubmit = !!studentA && !!studentB && !linkMutation.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vincular alumnos"
      description="Seleccioná dos alumnos para vincularlos en un grupo familiar."
      className="sm:max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={linkMutation.isPending}>Cancelar</Button>
          <Button
            loading={linkMutation.isPending}
            disabled={!canSubmit}
            className="bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => void submit()}
          >
            Confirmar vinculación
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alumno base</label>
          <SearchInput
            value={searchA}
            onChange={(v) => { setSearchA(v); if (!v.trim()) { setStudentA(null); setStudentB(null); setSearchB('') } }}
            onSelect={selectA}
            results={searchResultsA.data ?? []}
            selected={studentA}
            placeholder="Buscar por nombre, apellido, DNI o email"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Agregar al grupo</label>
          <SearchInput
            value={searchB}
            onChange={setSearchB}
            onSelect={selectB}
            results={searchResultsB.data ?? []}
            selected={studentB}
            disabled={!studentA}
            placeholder={studentA ? 'Buscar por nombre, apellido, DNI o email' : 'Seleccioná primero el alumno base'}
          />
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        <p className="text-[11px] leading-4 text-slate-400">
          La vinculación no modifica cuotas, pagos ni obligaciones económicas.
        </p>
      </div>
    </Modal>
  )
}

/* ─── Search input ─── */
function SearchInput({ value, onChange, onSelect, results, selected, placeholder, disabled }: {
  value: string
  onChange: (v: string) => void
  onSelect: (s: SearchStudent) => void
  results: SearchStudent[]
  selected: SearchStudent | null
  placeholder?: string
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {selected && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{selected.fullName}</p>
          <p className="text-xs text-slate-500">{selected.dni || '-'}{selected.email ? ` · ${selected.email}` : ''}</p>
        </div>
      )}
      {focused && !selected && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {results.map((r) => (
            <button key={r.studentId} type="button"
              onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect(r)}
              className="flex w-full flex-col border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700">
              <span className="text-sm font-medium text-slate-900 dark:text-white">{r.fullName}</span>
              <span className="text-xs text-slate-500">{r.dni || '-'}{r.email ? ` · ${r.email}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Request detail modal ─── */
function RequestDetailModal({
  open, request, documents, detailLoading, detailError, documentsLoading, documentsError,
  isViewingDocument, onViewDocument, onViewGroup, onRetry, onReview, onClose,
}: {
  open: boolean
  request: import('./hooks').RequestDetail | null
  documents: import('./hooks').RequestDocument[]
  detailLoading: boolean
  detailError: boolean
  documentsLoading: boolean
  documentsError: boolean
  isViewingDocument: boolean
  onViewDocument: (id: string) => void
  onViewGroup: (familyGroupId: string) => void
  onRetry: () => void
  onReview: (action: 'approve' | 'reject' | 'request-docs') => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de solicitud"
      description="Revisá participantes, notas y documentación adjunta."
      className="sm:max-w-3xl"
      footer={request && isRequestActionable(request.status) ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" size="sm"
            className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-950/30"
            onClick={() => onReview('request-docs')}>Pedir documentación</Button>
          <Button type="button" variant="outline" size="sm"
            className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            onClick={() => onReview('reject')}>Rechazar</Button>
          <Button type="button" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => onReview('approve')}>Aprobar</Button>
        </div>
      ) : undefined}
    >
      <div className="space-y-5 px-5 py-4 sm:px-6">
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-slate-500 dark:text-slate-400">Cargando solicitud...</span>
          </div>
        ) : detailError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">No se pudo cargar el detalle de la solicitud.</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
          </div>
        ) : !request ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            La solicitud no está disponible.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Solicita</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{request.requestedByStudentFullName || '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">DNI: {request.requestedByDni || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Destino</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{request.targetStudentFullName || '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">DNI: {request.targetDni || '-'}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Estado</p>
                <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getRequestStatusBadgeClass(request.status)}`}>
                  {getRequestStatusLabel(request.status)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Creada</p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatDate(request.createdAtUtc)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Revisada</p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatDate(request.reviewedAtUtc)}</p>
              </div>
            </div>

            {request.familyGroupId && (
              <Button variant="outline" size="sm" onClick={() => onViewGroup(request.familyGroupId!)}>
                <Users className="h-3.5 w-3.5" /> Ver grupo familiar
              </Button>
            )}

            {request.note && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nota original</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{request.note}</p>
              </div>
            )}

            {request.documentsRequestNote && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">Documentación solicitada</p>
                <p className="mt-2 text-sm text-orange-800 dark:text-orange-300">{request.documentsRequestNote}</p>
              </div>
            )}

            {request.adminReviewNote && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nota del administrador</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{request.adminReviewNote}</p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Documentos adjuntos</p>
                <p className="text-xs text-slate-400">{documents.length} archivo(s)</p>
              </div>
              {documentsLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-400">
                  Cargando documentación...
                </div>
              ) : documentsError ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
                  <p className="text-sm text-rose-700 dark:text-rose-300">No se pudo cargar la documentación.</p>
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-500">
                  No hay documentación cargada.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{doc.fileName || '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {doc.isPdf ? 'PDF' : doc.isImage ? 'Imagen' : 'Archivo'} · {formatDateShort(doc.uploadedAtUtc)}
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" loading={isViewingDocument} onClick={() => onViewDocument(doc.id)}>Ver</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/* ─── Document preview modal ─── */
function DocumentPreviewModal({ url, fileName, isImage, isPdf, onClose }: {
  url: string; fileName: string; isImage: boolean; isPdf: boolean; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="min-w-0 truncate text-sm font-bold text-slate-900 sm:text-base dark:text-white">{fileName}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" download
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Descargar</a>
            <button onClick={onClose} aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {isPdf ? (
            <iframe src={url} className="h-[60vh] w-full rounded-xl border border-slate-200 dark:border-slate-700" title={fileName} />
          ) : isImage ? (
            <div className="flex max-h-[60vh] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <img src={url} alt={fileName} className="max-h-[55vh] w-auto max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay vista previa disponible.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" download
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600">Descargar archivo</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Review modal ─── */
function ReviewModal({ action, isPending, onSubmit, onClose }: {
  action: 'approve' | 'reject' | 'request-docs'; isPending: boolean
  onSubmit: (note: string | null) => void; onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const titles = { approve: 'Aprobar solicitud', reject: 'Rechazar solicitud', 'request-docs': 'Solicitar documentación' }
  const descriptions = {
    approve: 'Podés dejar una nota opcional para registrar la aprobación.',
    reject: 'Podés dejar una nota explicando el rechazo.',
    'request-docs': 'Indicá qué documentación debe presentar el alumno.',
  }
  const confirmTexts = { approve: 'Aprobar', reject: 'Rechazar', 'request-docs': 'Solicitar documentación' }
  const confirmColors = {
    approve: 'bg-emerald-600 text-white hover:bg-emerald-700',
    reject: 'bg-rose-600 text-white hover:bg-rose-700',
    'request-docs': 'bg-orange-600 text-white hover:bg-orange-700',
  }
  const requireNote = action === 'request-docs'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (requireNote && !note.trim()) { setError('Debés completar una nota.'); return }
    onSubmit(note.trim() || null)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={titles[action]}
      description={descriptions[action]}
      className="sm:max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" form="sibling-review-form" size="sm" loading={isPending} className={confirmColors[action]}>{confirmTexts[action]}</Button>
        </div>
      }
    >
      <form id="sibling-review-form" onSubmit={handleSubmit} className="space-y-4 px-5 py-4 sm:px-6">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={action === 'request-docs' ? 'Describí qué documentación se necesita...' : 'Opcional'}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}
      </form>
    </Modal>
  )
}

export default function SiblingsPage() {
  return (
    <ToastProvider>
      <SiblingsPageInner />
    </ToastProvider>
  )
}
