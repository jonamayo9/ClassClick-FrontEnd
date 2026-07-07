import { useState } from 'react'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/ui/select'
import { useCollections, useCourseOptions, useDashboardFilters, money, formatDate } from './hooks'
import type { CollectionItem } from './hooks'

export function AdminDashboard() {
  const { user, activeCompanySlug } = useAuth()
  const { draft, applied, setFilter, apply: applyFilters, clear: clearFilters } = useDashboardFilters()
  const { data, isLoading, error } = useCollections(applied)
  const { data: courses } = useCourseOptions()
  const [showHelp, setShowHelp] = useState(false)
  const [exportFormat, setExportFormat] = useState('excel')

  const summary = data?.summary
  const items = data?.items ?? []

  const courseItems = (courses as { items?: { id: string; name: string }[] } | undefined)?.items
  const courseList = Array.isArray(courses) ? courses : Array.isArray(courseItems) ? courseItems : []

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.name || user?.email || 'Usuario'
  const isSuperAdmin = user?.isSuperAdmin

  async function handleExport() {
    if (!activeCompanySlug) return
    const params = new URLSearchParams()
    if (draft.courseId) params.set('courseId', draft.courseId)
    if (draft.dateFromUtc) params.set('dateFromUtc', `${draft.dateFromUtc}T00:00:00Z`)
    if (draft.dateToUtc) params.set('dateToUtc', `${draft.dateToUtc}T23:59:59Z`)
    if (draft.paymentMethod) params.set('paymentMethod', draft.paymentMethod)
    if (draft.chargeType) params.set('chargeType', draft.chargeType)
    if (draft.status) params.set('status', draft.status)
    const qs = params.toString()
    const endpoint = exportFormat === 'pdf' ? 'pdf' : 'excel'
    const url = qs
      ? `/api/admin/${activeCompanySlug}/reports/collections/${endpoint}?${qs}`
      : `/api/admin/${activeCompanySlug}/reports/collections/${endpoint}`

    const token = localStorage.getItem('classclick_token')
    try {
      const response = await fetch(`https://api.classclick.com.ar${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        const text = await response.text().catch(() => `Error ${response.status}`)
        alert(text)
        return
      }
      const blob = await response.blob()
      let fileName = `reporte.${endpoint}`
      const disposition = response.headers.get('content-disposition')
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
        const basicMatch = disposition.match(/filename="?([^"]+)"?/i)
        if (utf8Match?.[1]) fileName = decodeURIComponent(utf8Match[1])
        else if (basicMatch?.[1]) fileName = basicMatch[1]
      }
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo exportar el archivo.')
    }
  }

  return (
    <div className="space-y-6">
      <HeroBanner
        displayName={displayName}
        summary={summary}
        isSuperAdmin={isSuperAdmin}
        activeCompanySlug={activeCompanySlug}
      />

      {isSuperAdmin && !activeCompanySlug && (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-bold text-amber-900">SuperAdmin</h3>
          <p className="mt-1 text-xs text-amber-800">
            Seleccioná una empresa activa para ver el dashboard de cobranza.
          </p>
        </Card>
      )}

      {activeCompanySlug && !(isSuperAdmin && !activeCompanySlug) && (
        <>
          <FiltersCard
            draft={draft}
            setFilter={setFilter}
            applyFilters={applyFilters}
            clearFilters={clearFilters}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            onExport={handleExport}
            courses={courseList}
            onOpenHelp={() => setShowHelp(true)}
          />

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error instanceof Error ? error.message : 'No se pudo cargar el dashboard.'}
            </div>
          )}

          {!isLoading && !error && (
            <>
              <SummaryGrid summary={summary} />
              <ChargesTable items={items} />
            </>
          )}
        </>
      )}

      {!activeCompanySlug && !isSuperAdmin && (
        <Card className="p-5">
          <p className="text-sm text-slate-500">No hay una empresa activa seleccionada.</p>
        </Card>
      )}

      {showHelp && <MetricsHelpModal onClose={() => setShowHelp(false)} />}

    </div>
  )
}

function HeroBanner({
  displayName, summary, isSuperAdmin, activeCompanySlug,
}: {
  displayName: string; summary?: { totalCollected: number; totalPending: number; totalOverdue: number; paidChargesCount: number } | null
  isSuperAdmin?: boolean; activeCompanySlug: string | null
}) {
  const show = activeCompanySlug || isSuperAdmin

  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Dashboard de cobranza</h1>
          <p className="mt-1.5 text-sm text-indigo-200">{displayName}</p>
          {show && (
            <p className="mt-0.5 text-xs text-indigo-300">
              {isSuperAdmin ? 'SuperAdmin global' : 'Administrador'}
            </p>
          )}
        </div>

        {show && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BannerStat label="Cobrado" value={summary ? money(summary.totalCollected) : '$ 0'} />
            <BannerStat label="A vencer" value={summary ? money(summary.totalPending) : '$ 0'} />
            <BannerStat label="Vencido" value={summary ? money(summary.totalOverdue) : '$ 0'} />
            <BannerStat label="Pagas" value={summary ? String(summary.paidChargesCount) : '0'} />
          </div>
        )}
      </div>
    </section>
  )
}

function BannerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-indigo-200">{label}</p>
    </div>
  )
}

function FiltersCard({
  draft, setFilter, applyFilters, clearFilters, exportFormat, setExportFormat, onExport, courses, onOpenHelp,
}: {
  draft: { dateFromUtc: string; dateToUtc: string; paymentMethod: string; chargeType: string; status: string; courseId: string }
  setFilter: <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => void
  applyFilters: () => void; clearFilters: () => void
  exportFormat: string; setExportFormat: (v: string) => void
  onExport: () => void; courses: { id: string; name: string }[]; onOpenHelp: () => void
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Resumen de cobranza</h2>
          <p className="mt-0.5 text-sm text-slate-500">Filtrá y explorá el estado de las cuotas</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenHelp}>
          ¿Qué significa cada monto?
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Período</label>
          <DateRangePicker
            from={draft.dateFromUtc}
            to={draft.dateToUtc}
            onChange={(range) => {
              setFilter('dateFromUtc', range.from)
              setFilter('dateToUtc', range.to)
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Medio de pago</label>
          <Select value={draft.paymentMethod} onChange={(e) => setFilter('paymentMethod', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos</option>
            <option value="Cash">Efectivo</option>
            <option value="Transfer">Transferencia</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de cuota</label>
          <Select value={draft.chargeType} onChange={(e) => setFilter('chargeType', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todas</option>
            <option value="Pure">Sin promoción</option>
            <option value="WithScholarship">Con beca</option>
            <option value="WithPromotion">Con promoción</option>
            <option value="WithLateFee">Con mora</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</label>
          <Select value={draft.status} onChange={(e) => setFilter('status', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos</option>
            <option value="Paid">Pagadas</option>
            <option value="Unpaid">Impagas</option>
            <option value="Overdue">Vencidas</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Curso</label>
          <Select value={draft.courseId} onChange={(e) => setFilter('courseId', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Exportar como</label>
          <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </Select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={applyFilters}>Aplicar filtros</Button>
        <Button variant="ghost" onClick={clearFilters}>Limpiar</Button>
        <Button variant="outline" onClick={onExport}>Exportar</Button>
      </div>
    </Card>
  )
}

function SummaryGrid({ summary }: {
  summary?: { totalCollected: number; totalPending: number; totalOverdue: number; paidChargesCount: number
    totalCollectedCash: number; totalCollectedTransfer: number; totalCollectedWithPromotion: number; totalCollectedPure: number } | null
}) {
  if (!summary) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total cobrado" value={money(summary.totalCollected)} accent="emerald" />
        <MetricCard title="A vencer" value={money(summary.totalPending)} accent="amber" />
        <MetricCard title="Total vencido" value={money(summary.totalOverdue)} accent="red" />
        <MetricCard title="Cuotas pagas" value={String(summary.paidChargesCount)} accent="indigo" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Efectivo" value={money(summary.totalCollectedCash)} accent="slate" />
        <MetricCard title="Transferencia" value={money(summary.totalCollectedTransfer)} accent="slate" />
        <MetricCard title="Con promoción" value={money(summary.totalCollectedWithPromotion)} accent="violet" />
        <MetricCard title="Sin promoción" value={money(summary.totalCollectedPure)} accent="slate" />
      </div>
    </div>
  )
}

const accentConfig = {
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  amber: { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  red: { bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
  indigo: { bar: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400' },
  slate: { bar: 'bg-slate-400', text: 'text-slate-700 dark:text-slate-400' },
  violet: { bar: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400' },
}

function MetricCard({ title, value, accent }: { title: string; value: string; accent: keyof typeof accentConfig }) {
  const a = accentConfig[accent]
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className={`absolute left-0 top-0 h-full w-1 ${a.bar}`} />
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight sm:text-3xl ${a.text}`}>{value}</p>
    </Card>
  )
}

function ChargesTable({ items }: { items: CollectionItem[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Detalle de cuotas</h3>
          <p className="text-sm text-slate-500">Listado filtrado según los criterios seleccionados.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-slate-500">
            {items.length} resultado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Alumno</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Curso</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Período</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Venc.</th>
              <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Base</th>
              <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Dto.</th>
              <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Mora</th>
              <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Final</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Pago</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
              <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-12 text-center text-sm text-slate-500">
                  No hay resultados para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              items.map((item, i) => {
                const rowBg = i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'
                return (
                <tr key={i} className={`${rowBg} hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors`}>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900 dark:text-white">{item.studentFullName || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{item.courseName || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{item.month}/{item.year}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(item.dueDateUtc)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-500">{money(item.basePrice)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-500">{money(item.siblingDiscountAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-500">{money(item.lateChargeAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900 dark:text-white">{money(item.finalAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{getChargeTypeLabel(item)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{paymentMethodLabel(item.paymentMethod)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={getStatusBadge(item.status)}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(item.paidAtUtc)}</td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function getChargeTypeLabel(item: CollectionItem): string {
  if (item.hasScholarship || Number(item.scholarshipDiscountAmount || 0) > 0) return 'Con beca'
  if (item.hasPromotion || Number(item.promotionAmount || item.promotionDiscountAmount || item.siblingDiscountAmount || 0) > 0) return 'Con promoción'
  return 'Sin promoción'
}

function paymentMethodLabel(value: string): string {
  const v = String(value || '').toLowerCase()
  if (v === 'cash' || v === 'efectivo' || v === '5') return 'Efectivo'
  if (v === 'transfer' || v === 'transferencia' || v === '1') return 'Transferencia'
  if (v === 'debitcard' || v === 'debit_card' || v === '2') return 'Débito'
  if (v === 'creditcard' || v === 'credit_card' || v === '3') return 'Crédito'
  if (v === 'mercadopago' || v === 'mercado_pago' || v === '4') return 'Mercado Pago'
  return '-'
}

function getStatusBadge(status: string) {
  const value = status.toLowerCase()
  if (value === 'paid' || value === 'approved') return 'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
  if (value === 'overdue') return 'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  return 'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
}

function getStatusLabel(status: string) {
  const value = status.toLowerCase()
  if (value === 'paid' || value === 'approved') return 'Pagada'
  if (value === 'overdue') return 'Vencida'
  return 'Pendiente'
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MetricsHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="¿Cómo interpretar el dashboard?">
      <p className="mb-4 text-sm text-slate-500">
        Estos indicadores te ayudan a entender rápidamente el estado de cobranza de tu empresa.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HelpCard icon="💰" title="Cobrado" desc="Total de cuotas pagadas dentro del período filtrado." variant="emerald" />
        <HelpCard icon="⏳" title="A vencer" desc="Cuotas impagas que todavía están dentro de fecha." variant="amber" />
        <HelpCard icon="🚨" title="Vencido" desc="Cuotas impagas que ya superaron la fecha de vencimiento." variant="red" />
        <HelpCard icon="📄" title="Pagadas" desc="Cantidad total de cuotas cobradas." variant="indigo" />
      </div>

      <h4 className="mb-3 mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Métodos y promociones
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HelpCard icon="💵" title="Efectivo" desc="Total cobrado mediante pagos en efectivo." variant="slate" />
        <HelpCard icon="🏦" title="Transferencia" desc="Total cobrado mediante transferencias bancarias." variant="slate" />
        <HelpCard icon="🎟️" title="Con promoción" desc="Cuotas que tuvieron descuentos, promociones o beneficios aplicados." variant="violet" />
        <HelpCard icon="📄" title="Sin promoción" desc="Cuotas cobradas sin descuentos ni promociones aplicadas." variant="slate" />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button onClick={onClose}>Entendido</Button>
      </div>
    </Modal>
  )
}

function HelpCard({ icon, title, desc, variant }: { icon: string; title: string; desc: string; variant: string }) {
  const styles: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
    slate: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    violet: 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
  }
  const descStyles: Record<string, string> = {
    emerald: 'text-emerald-800 dark:text-emerald-300',
    amber: 'text-amber-800 dark:text-amber-300',
    red: 'text-red-800 dark:text-red-300',
    indigo: 'text-indigo-800 dark:text-indigo-300',
    slate: 'text-slate-700 dark:text-slate-400',
    violet: 'text-violet-800 dark:text-violet-300',
  }

  return (
    <div className={`rounded-xl border p-4 ${styles[variant] ?? styles.slate}`}>
      <p className="text-sm font-bold">{icon} {title}</p>
      <p className={`mt-1 text-xs leading-5 ${descStyles[variant] ?? descStyles.slate}`}>{desc}</p>
    </div>
  )
}
