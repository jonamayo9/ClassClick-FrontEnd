import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'
import { NEWS_TYPE_LABEL, NEWS_TYPE_OPTIONS, NEWS_TYPE_VARIANT, normalizeNewsType } from '@/lib/news-type'

interface Company { id: string; name: string; isActive: boolean }

interface NewsItem {
  id: string
  title: string
  message: string
  type: string
  publishedAtUtc: string
  isActive: boolean
  isGlobal: boolean
  status: 'active' | 'future' | 'expired' | 'inactive'
  targetCompanyIds: string[]
  targetCompanyCount: number
  dismissalCount: number
  createdAtUtc: string
}

const STATUS_VARIANT: Record<NewsItem['status'], 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  active: 'success',
  future: 'info',
  expired: 'default',
  inactive: 'danger',
}

const STATUS_LABEL: Record<NewsItem['status'], string> = {
  active: 'Activa',
  future: 'Futura',
  expired: 'Vencida',
  inactive: 'Desactivada',
}

const FMT = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function fmtCount(n: number) {
  return `${n} empresa${n === 1 ? '' : 's'}`
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-AR')
}

function toLocalInputValue(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function NewsInner() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: companies = [] } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['superadmin-news'],
    queryFn: () => apiService.get<NewsItem[]>('/api/superadmin/news'),
  })

  const [editor, setEditor] = useState<NewsItem | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null)
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'Update',
    publishedAtUtc: '',
    isActive: true,
    allCompanies: true,
    companyIds: [] as string[],
  })

  function openCreate() {
    setForm({
      title: '',
      message: '',
      type: 'Update',
      publishedAtUtc: new Date().toISOString().slice(0, 16),
      isActive: true,
      allCompanies: true,
      companyIds: [],
    })
    setEditor('new')
  }

  function openEdit(item: NewsItem) {
    setForm({
      title: item.title,
      message: item.message,
      type: normalizeNewsType(item.type),
      publishedAtUtc: toLocalInputValue(item.publishedAtUtc),
      isActive: item.isActive,
      allCompanies: item.isGlobal,
      companyIds: item.targetCompanyIds,
    })
    setEditor(item)
  }

  function toggleCompany(id: string) {
    setForm((prev) => ({
      ...prev,
      companyIds: prev.companyIds.includes(id) ? prev.companyIds.filter((x) => x !== id) : [...prev.companyIds, id],
    }))
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title,
        message: form.message,
        type: form.type,
        publishedAtUtc: new Date(form.publishedAtUtc).toISOString(),
        isActive: form.isActive,
        allCompanies: form.allCompanies,
        companyIds: form.companyIds,
      }
      if (editor === 'new') return apiService.post('/api/superadmin/news', body)
      return apiService.put(`/api/superadmin/news/${(editor as NewsItem).id}`, body)
    },
    onSuccess: () => {
      toast('Novedad guardada.')
      setEditor(null)
      qc.invalidateQueries({ queryKey: ['superadmin-news'] })
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiService.del(`/api/superadmin/news/${deleteTarget!.id}`),
    onSuccess: () => {
      toast('Novedad eliminada.')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['superadmin-news'] })
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  function toggleActive(item: NewsItem) {
    apiService
      .put(`/api/superadmin/news/${item.id}`, {
        title: item.title,
        message: item.message,
        type: item.type,
        publishedAtUtc: item.publishedAtUtc,
        isActive: !item.isActive,
        allCompanies: item.isGlobal,
        companyIds: item.targetCompanyIds,
      })
      .then(() => {
        qc.invalidateQueries({ queryKey: ['superadmin-news'] })
        toast(item.isActive ? 'Novedad desactivada.' : 'Novedad activada.')
      })
      .catch((err) => toast(getApiError(err), 'error'))
  }

  const canSave = form.title.trim() && form.message.trim() && !!form.type && form.publishedAtUtc && (!form.allCompanies ? form.companyIds.length > 0 : true)

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
          <h1 className="text-xl font-black sm:text-2xl">Novedades</h1>
          <p className="mt-1 text-sm text-slate-400">Avisos de ClassClick dirigidos a administradores de empresas.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-slate-800 text-white hover:bg-slate-700">+ Crear novedad</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-14"><Spinner className="h-8 w-8 text-slate-600" /></div>
      ) : news.length === 0 ? (
        <Card className="p-6"><EmptyState title="Sin novedades" description="Creá una novedad para comunicarte con los administradores de las empresas." /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {news.map((item) => (
            <Card key={item.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={NEWS_TYPE_VARIANT[normalizeNewsType(item.type)]} className="text-[11px] uppercase tracking-wide">
                    {NEWS_TYPE_LABEL[normalizeNewsType(item.type)]}
                  </Badge>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                </div>
                <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{item.message}</p>
              <div className="grid gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                <span>Publicación: {fmtDate(item.publishedAtUtc)}</span>
                <span>Fin: {fmtDate(item.publishedAtUtc ? new Date(new Date(item.publishedAtUtc).getTime() + 30 * 86400000).toISOString() : null)}</span>
                <span>Alcance: {item.isGlobal ? 'Todas las empresas' : fmtCount(item.targetCompanyCount)}</span>
                <span>Ocultada por: {FMT.format(item.dismissalCount)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(item)}>
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)} className="bg-red-600 text-white hover:bg-red-700">Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <Modal open onClose={() => setEditor(null)} title={editor === 'new' ? 'Crear novedad' : 'Editar novedad'} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Título *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Incremento del servicio" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Mensaje *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                placeholder="Ej: A partir del 01/10/2026 habrá un incremento del 10% en el servicio."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo de novedad *</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {NEWS_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha de publicación *</label>
                <input
                  type="datetime-local"
                  value={form.publishedAtUtc}
                  onChange={(e) => setForm({ ...form, publishedAtUtc: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Estado</label>
                <Select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Destinatarios</label>
              <Select
                value={form.allCompanies ? 'all' : 'selected'}
                onChange={(e) => setForm({ ...form, allCompanies: e.target.value === 'all' })}
              >
                <option value="all">Todas las empresas</option>
                <option value="selected">Empresas específicas</option>
              </Select>
            </div>

            {!form.allCompanies && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                {companies.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={form.companyIds.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditor(null)} disabled={saveMutation.isPending}>Cancelar</Button>
              <Button size="sm" loading={saveMutation.isPending} disabled={!canSave} onClick={() => saveMutation.mutate()} className="bg-slate-800 text-white hover:bg-slate-700">
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          open
          onClose={() => setDeleteTarget(null)}
          title="¿Eliminar novedad?"
          message={`Vas a eliminar la novedad "${deleteTarget.title}". Esta acción no se puede deshacer.`}
          confirmText="Eliminar novedad"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
        />
      )}
    </div>
  )
}

export default function SuperAdminNewsPage() {
  return <ToastProvider><NewsInner /></ToastProvider>
}