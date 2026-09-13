import { useEffect, useState, type ComponentType } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, Rocket, Sparkles, Wrench } from 'lucide-react'
import { apiService, getApiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { NEWS_TYPE_LABEL, NEWS_TYPE_VARIANT, normalizeNewsType } from '@/lib/news-type'

export interface AdminNews {
  id: string
  title: string
  message: string
  // Update | Important | Maintenance | NewFeature (o número por compatibilidad).
  type?: string | number
  publishedAtUtc: string
  isDismissed: boolean
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Icono conceptual por tipo. Update no lleva icono (diseño aprobado).
const NEWS_TYPE_ICON: Record<string, ComponentType<{ className?: string }> | undefined> = {
  Important: AlertTriangle,
  Maintenance: Wrench,
  NewFeature: Rocket,
  Update: undefined,
}

function NewsTypeBadge({ type }: { type: string | number | undefined }) {
  const t = normalizeNewsType(type)
  const Icon = NEWS_TYPE_ICON[t]
  return (
    <Badge variant={NEWS_TYPE_VARIANT[t]} className="gap-1 text-[11px] uppercase tracking-wide">
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {NEWS_TYPE_LABEL[t]}
    </Badge>
  )
}

interface NewsCardProps {
  news: AdminNews
  checked: boolean
  onToggle: (id: string, value: boolean) => void
}

function NewsCard({ news, checked, onToggle }: NewsCardProps) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-700/60 dark:bg-slate-800/50">
      <NewsTypeBadge type={news.type} />

      <h3 className="mt-2.5 text-base font-bold leading-snug text-slate-900 dark:text-white">{news.title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fmtDate(news.publishedAtUtc)}</p>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{news.message}</p>

      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700/60">
        <label className="flex min-h-10 cursor-pointer select-none items-center gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(news.id, e.target.checked)}
            className="peer sr-only"
            aria-label={`No volver a mostrar: ${news.title}`}
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition-colors peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:peer-checked:border-violet-500 dark:peer-checked:bg-violet-600 dark:peer-focus-visible:ring-offset-slate-800"
          >
            <Check className="h-3.5 w-3.5 opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3.5} />
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">No volver a mostrar</span>
        </label>
      </div>
    </article>
  )
}

interface NovedadesModalProps {
  open: boolean
  slug: string
  news: AdminNews[]
  onClose: () => void
}

export function NovedadesModal({ open, slug, news, onClose }: NovedadesModalProps) {
  const toast = useToast()
  const qc = useQueryClient()
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) setChecked({})
  }, [open, news])

  const dismissMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => apiService.post(`/api/admin/${slug}/news/${id}/dismiss`))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-news', slug] })
      onClose()
    },
    onError: (err) => toast(getApiError(err), 'error'),
  })

  function accept() {
    const toDismiss = Object.keys(checked).filter((id) => checked[id])
    if (toDismiss.length > 0) {
      dismissMutation.mutate(toDismiss)
    } else {
      onClose()
    }
  }

  // Defensivo: nunca renderizar con 0 novedades visibles.
  // Evita que una regresión vuelva a mostrar "Tenés 0 novedades para tu institución".
  // Se coloca después de todos los hooks para respetar las reglas de React.
  if (!news || news.length === 0) return null

  const subtitle =
    news.length === 1
      ? 'Tenemos una novedad para tu institución'
      : `Tenés ${news.length} novedades para tu institución`

  const headerTitle = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>Novedades de ClassClick</span>
    </span>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={headerTitle}
      description={subtitle}
      ariaLabel="Novedades de ClassClick"
      className="sm:max-w-lg"
      footer={
        <Button
          variant="violet"
          size="lg"
          loading={dismissMutation.isPending}
          onClick={accept}
          className="w-full sm:ml-auto sm:w-auto sm:min-w-44"
        >
          Entendido
        </Button>
      }
    >
      <div className="space-y-3 p-5 sm:p-6">
        {news.map((n) => (
          <NewsCard
            key={n.id}
            news={n}
            checked={!!checked[n.id]}
            onToggle={(id, value) => setChecked((prev) => ({ ...prev, [id]: value }))}
          />
        ))}
      </div>
    </Modal>
  )
}