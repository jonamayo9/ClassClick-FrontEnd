import { useEffect, useRef, useState } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { getApiError } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { ActionMenu } from '@/components/ui/action-menu'
import { Badge } from '@/components/ui/badge'
import {
  useAnnouncements, useAnnouncementsSummary, useCourses,
  useCreateAnnouncement, useUpdateAnnouncement, useToggleAnnouncement, useDeleteAnnouncement,
} from './hooks'
import type { Announcement, CourseOption } from './hooks'
import {
  Megaphone, CheckCircle2, EyeOff, ImageIcon, Plus, Search, RotateCcw,
  Pencil, Trash2, Power, X, Eye, CalendarDays, AlertCircle,
} from 'lucide-react'

export default function AnnouncementsPage() {
  return (
    <ToastProvider>
      <AnnouncementsPageInner />
    </ToastProvider>
  )
}

type KpiTone = 'blue' | 'green' | 'slate' | 'violet'

const kpiTones: Record<KpiTone, { icon: string; text: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400' },
  green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  slate: { icon: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300', text: 'text-slate-500 dark:text-slate-300' },
  violet: { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', text: 'text-violet-600 dark:text-violet-400' },
}

export type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; item: Announcement }
  | null

function AnnouncementsPageInner() {
  const toast = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchTimer = useRef<number | undefined>(undefined)

  const [panelId, setPanelId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Announcement | null>(null)

  const listQuery = useAnnouncements({
    search, status: statusFilter, scope: scopeFilter,
    courseId: courseFilter, page, pageSize,
  })
  const summaryQuery = useAnnouncementsSummary()
  const { data: courses = [] } = useCourses()
  const toggleMutation = useToggleAnnouncement()
  const deleteMutation = useDeleteAnnouncement()

  const items = listQuery.data?.items ?? []
  const totalCount = listQuery.data?.totalCount ?? 0
  const summary = summaryQuery.data

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const panelItem = items.find((i) => i.id === panelId) ?? null

  function debouncedSearch(value: string) {
    clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { setSearch(value); setPage(1) }, 300)
  }

  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setScopeFilter('')
    setCourseFilter('')
    setPage(1)
  }

  const hasFilters = !!search || !!statusFilter || !!scopeFilter || !!courseFilter

  async function handleDelete(item: Announcement) {
    try {
      await deleteMutation.mutateAsync(item.id)
      toast('Novedad eliminada.')
      if (panelId === item.id) setPanelId(null)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteTarget(null)
      toast(getApiError(err), 'error')
    }
  }

  async function handleToggle(item: Announcement) {
    try {
      await toggleMutation.mutateAsync({ id: item.id, isActive: !item.isActive })
      toast(item.isActive ? 'Novedad desactivada.' : 'Novedad activada.')
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setDeactivateTarget(null)
    }
  }

  function requestToggle(item: Announcement) {
    if (item.isActive) setDeactivateTarget(item)
    else void handleToggle(item)
  }

  function openDetail(item: Announcement) {
    setPanelId(item.id)
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Novedades</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">
            Publicá y administrá comunicados para tus alumnos.
          </p>
        </div>
        <div className="hidden shrink-0 sm:flex">
          <Button className="h-10 bg-blue-600 text-white hover:bg-blue-500" onClick={() => setModal({ mode: 'create' })}>
            <Plus className="h-4 w-4" /> Nueva novedad
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <KpiCard icon={Megaphone} tone="blue" value={summary?.total} label="Total de novedades" />
        <KpiCard icon={CheckCircle2} tone="green" value={summary?.active} label="Activas" />
        <KpiCard icon={EyeOff} tone="slate" value={summary?.inactive} label="Inactivas" />
        <KpiCard icon={ImageIcon} tone="violet" value={summary?.withImage} label="Con imagen" />
      </div>

      <div className="sm:hidden">
        <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500" onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-4 w-4" /> Nueva novedad
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value) }}
              placeholder="Buscar por título o contenido..."
              autoComplete="off"
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:w-[30rem]">
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} aria-label="Filtro por estado">
              <option value="">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </Select>
            <Select value={scopeFilter} onChange={(e) => { setScopeFilter(e.target.value); if (e.target.value !== 'course') setCourseFilter(''); setPage(1) }} aria-label="Filtro por alcance">
              <option value="">Todos los alcances</option>
              <option value="global">Global</option>
              <option value="course">Por curso</option>
            </Select>
            <Select
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setScopeFilter('course'); setPage(1) }}
              disabled={scopeFilter !== 'course'}
              aria-label="Filtro por curso"
            >
              <option value="">Todos los cursos</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={clearFilters} disabled={!hasFilters}>
            <RotateCcw className="h-4 w-4" /> Limpiar
          </Button>
        </div>

        <div className="mt-3.5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {totalCount} {totalCount === 1 ? 'novedad' : 'novedades'} {hasFilters ? 'encontradas' : 'en total'}
          </span>
        </div>
      </Card>

      {/* Listing */}
      <Card className="p-4 sm:p-6">
        {listQuery.isLoading ? (
          <ListSkeleton />
        ) : listQuery.isError ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No se pudieron cargar las novedades.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => listQuery.refetch()}>
              <RotateCcw className="h-3.5 w-3.5" /> Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="📢"
            title={hasFilters ? 'Sin resultados' : 'Todavía no hay novedades'}
            description={hasFilters ? 'Probá ajustar o limpiar los filtros.' : 'Creá tu primera novedad para comunicar a tus alumnos.'}
            action={hasFilters
              ? { label: 'Limpiar filtros', onClick: clearFilters }
              : { label: 'Nueva novedad', onClick: () => setModal({ mode: 'create' }) }}
          />
        ) : (
          <div className={listQuery.isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <AnnouncementTable
              items={items}
              onOpen={openDetail}
              onEdit={(item) => setModal({ mode: 'edit', item })}
              onToggle={requestToggle}
              onDelete={setDeleteTarget}
            />
          </div>
        )}

        {!listQuery.isLoading && !listQuery.isError && items.length > 0 && (
          <div className="mt-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              loading={listQuery.isFetching}
              showPageNumbers
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
            />
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      <AnnouncementDrawer
        open={!!panelItem}
        item={panelItem}
        onClose={() => setPanelId(null)}
        onEdit={(item) => setModal({ mode: 'edit', item })}
        onToggle={requestToggle}
        onDelete={setDeleteTarget}
      />

      {/* Create / Edit modal */}
      {modal && (
        <AnnouncementModal
          key={modal.mode === 'edit' ? `edit-${modal.item.id}` : 'create'}
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : null}
          courses={courses}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar novedad"
        message="Vas a eliminar esta novedad. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget) }}
      />

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Desactivar novedad"
        message="La novedad dejará de ser visible para los alumnos. Podés reactivarla cuando quieras."
        confirmText="Desactivar"
        variant="danger"
        loading={toggleMutation.isPending}
        onConfirm={() => { if (deactivateTarget) void handleToggle(deactivateTarget) }}
      />
    </div>
  )
}

function KpiCard({ icon: Icon, tone, value, label }: {
  icon: React.ComponentType<{ className?: string }>
  tone: KpiTone
  value?: number
  label: string
}) {
  const t = kpiTones[tone]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-[42px] sm:w-[42px] ${t.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white sm:text-2xl">
          {value == null ? '—' : value}
        </p>
        <p className="text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function previewText(item: Announcement) {
  return item.text?.trim() ? item.text : 'Contiene una imagen.'
}

function ScopeBadge({ item }: { item: Announcement }) {
  if (item.isGlobal) return <Badge variant="info">Global</Badge>
  const names = item.courseNames ?? []
  if (names.length === 0) return <Badge variant="default">Por curso</Badge>
  const label = names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`
  return <Badge variant="default">{label}</Badge>
}

function AnnouncementThumb({ item }: { item: Announcement }) {
  const [error, setError] = useState(false)
  const src = imgUrl(item.imageUrl)
  if (src && !error) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setError(true)}
        className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
      />
    )
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <ImageIcon className="h-4 w-4" />
    </div>
  )
}

function AnnouncementTable({ items, onOpen, onEdit, onToggle, onDelete }: {
  items: Announcement[]
  onOpen: (item: Announcement) => void
  onEdit: (item: Announcement) => void
  onToggle: (item: Announcement) => void
  onDelete: (item: Announcement) => void
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400 dark:border-slate-800">
              <th className="px-3 py-3 font-semibold">Novedad</th>
              <th className="px-3 py-3 font-semibold">Imagen</th>
              <th className="px-3 py-3 font-semibold">Alcance</th>
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 text-center font-semibold">Estado</th>
              <th className="px-3 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onOpen(item)}
                className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white">{item.title || 'Sin título'}</p>
                  <p className="mt-0.5 line-clamp-2 max-w-[420px] text-xs text-slate-400">{previewText(item)}</p>
                </td>
                <td className="px-3 py-3"><AnnouncementThumb item={item} /></td>
                <td className="px-3 py-3"><ScopeBadge item={item} /></td>
                <td className="px-3 py-3 text-[13px] text-slate-500 dark:text-slate-400">{formatDate(item.createdAtUtc)}</td>
                <td className="px-3 py-3 text-center">
                  <Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Activa' : 'Inactiva'}</Badge>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <IconButton label="Ver detalle" onClick={() => onOpen(item)}><Eye className="h-4 w-4" /></IconButton>
                    <IconButton label="Editar" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></IconButton>
                    <ActionMenu actions={[
                      { label: item.isActive ? 'Desactivar' : 'Activar', onClick: () => onToggle(item) },
                      { label: 'Eliminar', onClick: () => onDelete(item), danger: true },
                    ]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40"
          >
            <div className="flex items-start gap-3">
              <AnnouncementThumb item={item} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title || 'Sin título'}</p>
                <p className="line-clamp-2 text-xs text-slate-400">{previewText(item)}</p>
              </div>
              <Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Activa' : 'Inactiva'}</Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ScopeBadge item={item} />
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(item.createdAtUtc)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-slate-100 pt-2.5 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <IconButton label="Ver detalle" onClick={() => onOpen(item)}><Eye className="h-4 w-4" /></IconButton>
              <IconButton label="Editar" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></IconButton>
              <ActionMenu actions={[
                { label: item.isActive ? 'Desactivar' : 'Activar', onClick: () => onToggle(item) },
                { label: 'Eliminar', onClick: () => onDelete(item), danger: true },
              ]} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {children}
    </button>
  )
}

function AnnouncementDrawer({ open, item, onClose, onEdit, onToggle, onDelete }: {
  open: boolean
  item: Announcement | null
  onClose: () => void
  onEdit: (item: Announcement) => void
  onToggle: (item: Announcement) => void
  onDelete: (item: Announcement) => void
}) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setImageError(false)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const timer = setTimeout(() => setMounted(false), 250)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  const src = imgUrl(item?.imageUrl)

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item?.title ?? 'Detalle de la novedad'}
        className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:max-w-[540px] dark:bg-slate-900 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[19px] font-bold text-slate-900 dark:text-white">{item?.title || 'Sin título'}</h2>
              {item && <Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Activa' : 'Inactiva'}</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Detalle de la novedad</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {!item ? (
            <p className="py-12 text-center text-sm text-slate-400">Novedad no encontrada.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <dl className="space-y-2.5 text-sm">
                  <InfoRow label="Estado" value={item.isActive ? 'Activa' : 'Inactiva'} />
                  <InfoRow label="Fecha" value={formatDate(item.createdAtUtc)} />
                  <InfoRow label="Alcance" value={item.isGlobal ? 'Todos los alumnos' : 'Cursos seleccionados'} />
                  {!item.isGlobal && (item.courseNames?.length ?? 0) > 0 && (
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cursos</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {(item.courseNames ?? []).map((name) => (
                          <span key={name} className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                            {name}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {item.text?.trim() && (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contenido</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{item.text}</p>
                </div>
              )}

              {src && (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Imagen</p>
                  {imageError ? (
                    <p className="mt-2 text-xs text-slate-400">No se pudo cargar la imagen.</p>
                  ) : (
                    <img src={src} alt="" onError={() => setImageError(true)} className="mt-2 w-full rounded-xl object-cover" />
                  )}
                </div>
              )}

              {!item.text?.trim() && !src && (
                <p className="text-sm text-slate-400">Esta novedad no tiene contenido adicional.</p>
              )}
            </div>
          )}
        </div>

        {item && (
          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:px-6">
            <Button variant="outline" className="h-11 flex-1" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="outline" className="h-11 flex-1" onClick={() => onToggle(item)}>
              <Power className="h-4 w-4" /> {item.isActive ? 'Desactivar' : 'Activar'}
            </Button>
            <Button
              variant="outline"
              className="h-11 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        )}
      </div>
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

function AnnouncementModal({ mode, item, courses, onClose }: {
  mode: 'create' | 'edit'
  item: Announcement | null
  courses: CourseOption[]
  onClose: () => void
}) {
  const toast = useToast()
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()

  const [title, setTitle] = useState(() => item?.title ?? '')
  const [text, setText] = useState(() => item?.text ?? '')
  const [scope, setScope] = useState<'global' | 'courses'>(() => (item && !item.isGlobal ? 'courses' : 'global'))
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(() => item?.courseIds ?? [])
  const [isActive, setIsActive] = useState(() => item?.isActive ?? true)
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isMutating = createMutation.isPending || updateMutation.isPending
  const existingImage = imgUrl(item?.imageUrl)
  const showExistingImage = mode === 'edit' && !!existingImage && !removeImage

  useEffect(() => {
    if (!image) { setImagePreview(null); return }
    const url = URL.createObjectURL(image)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function validate() {
    const next: Record<string, string> = {}
    const hasText = text.trim().length > 0
    const hasNewImage = !!image
    const hasExistingImage = showExistingImage
    if (!hasText && !hasNewImage && !hasExistingImage) {
      next.text = 'La novedad debe tener texto, imagen o ambas cosas.'
    }
    if (image && image.size > 5 * 1024 * 1024) next.image = 'La imagen no puede superar los 5 MB.'
    if (scope === 'courses' && selectedCourseIds.length === 0) next.courses = 'Seleccioná al menos un curso.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isMutating) return
    if (!validate()) return

    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('text', text.trim())
    if (image) fd.append('image', image)
    fd.append('isGlobal', scope === 'global' ? 'true' : 'false')
    if (scope === 'courses') selectedCourseIds.forEach((id) => fd.append('courseIds', id))
    fd.append('isActive', isActive ? 'true' : 'false')

    try {
      if (mode === 'edit' && item) {
        fd.append('removeImage', removeImage ? 'true' : 'false')
        await updateMutation.mutateAsync({ id: item.id, formData: fd })
        toast('Novedad actualizada.')
      } else {
        fd.append('notifyStudents', notifyStudents ? 'true' : 'false')
        await createMutation.mutateAsync(fd)
        toast('Novedad publicada.')
      }
      onClose()
    } catch (err) {
      toast(getApiError(err), 'error')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'edit' ? 'Editar novedad' : 'Nueva novedad'}
      description="Podés publicar solo texto, solo imagen o ambas cosas."
      className="sm:max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isMutating}>Cancelar</Button>
          <Button
            type="submit"
            form="announcement-form"
            loading={isMutating}
            disabled={isMutating}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            {mode === 'edit' ? 'Guardar cambios' : 'Publicar'}
          </Button>
        </div>
      }
    >
      <form id="announcement-form" onSubmit={handleSubmit} autoComplete="off" className="space-y-4 px-5 py-5 sm:px-6">
        <Field label="Título">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Ej: Entrenamiento suspendido"
            autoFocus
          />
        </Field>

        <Field label="Contenido" error={errors.text}>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="Escribí la novedad..."
          />
        </Field>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alcance</label>
          <div className="flex flex-wrap gap-2">
            <ScopeOption label="Todos los alumnos" active={scope === 'global'} onClick={() => setScope('global')} />
            <ScopeOption label="Por curso" active={scope === 'courses'} onClick={() => setScope('courses')} />
          </div>
          {scope === 'courses' && (
            <div className={`mt-2 rounded-xl border p-3 ${errors.courses ? 'border-red-400 dark:border-red-500/70' : 'border-slate-200 dark:border-slate-700'}`}>
              {courses.length === 0 ? (
                <p className="text-xs text-slate-400">No hay cursos disponibles.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCourse(c.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        selectedCourseIds.includes(c.id)
                          ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {errors.courses && <p className="mt-2 text-xs text-red-500">{errors.courses}</p>}
            </div>
          )}
        </div>

        <Field label="Imagen" error={errors.image}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => { setImage(e.target.files?.[0] ?? null); setRemoveImage(false) }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300"
          />
          <p className="mt-1 text-xs text-slate-400">JPG, PNG o WEBP. Máx 5 MB.</p>
        </Field>

        {imagePreview && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Vista previa</p>
            <img src={imagePreview} alt="" className="max-h-44 w-full rounded-xl object-cover" />
          </div>
        )}

        {showExistingImage && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Imagen actual</p>
            <img src={existingImage ?? undefined} alt="" className="max-h-44 w-full rounded-xl object-cover" />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              Eliminar imagen actual
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/40">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Novedad activa</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Novedad activa" />
        </div>

        {mode === 'create' && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/40">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Notificar a alumnos</span>
            <Switch checked={notifyStudents} onCheckedChange={setNotifyStudents} aria-label="Notificar a alumnos" />
          </div>
        )}
      </form>
    </Modal>
  )
}

function ScopeOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-200'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
