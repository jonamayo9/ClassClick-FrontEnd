import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { apiService } from '@/lib/api'

interface Company { id: string; name: string; slug: string; isActive: boolean }
interface BillingSettings { companyId: string; basePrice: number; includedUsers: number; extraChargeMode: number; extraUserPrice: number; extraFixedAmount: number; billingDay: number; notifyDaysBefore: number }
interface BillingOverview { companyId: string; year: number; month: number; currentActiveStudents: number; maxStudentsInMonth: number; basePrice: number; includedUsers: number; extraUsers: number; extraUserPrice: number; extraFixedAmount: number; extraAmount: number; totalAmount: number; extraChargeMode: string; users: { userId: string; fullName: string; email?: string; createdAtUtc?: string; deletedAtUtc?: string }[] }

const FMT = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function BillingInner() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1)
  const [showSettings, setShowSettings] = useState(false)
  const [form, setForm] = useState<BillingSettings>({ companyId: '', basePrice: 0, includedUsers: 0, extraChargeMode: 1, extraUserPrice: 0, extraFixedAmount: 0, billingDay: 1, notifyDaysBefore: 5 })

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['billing-overview', selectedCompanyId, reportYear, reportMonth],
    queryFn: () => apiService.get<BillingOverview>(`/api/superadmin/billing/${selectedCompanyId}/overview?year=${reportYear}&month=${reportMonth}`),
    enabled: !!selectedCompanyId,
  })

  const { data: settings } = useQuery({
    queryKey: ['billing-settings', selectedCompanyId],
    queryFn: () => apiService.get<BillingSettings>(`/api/superadmin/billing/${selectedCompanyId}`),
    enabled: !!selectedCompanyId,
  })

  const saveMutation = useMutation({
    mutationFn: (body: BillingSettings) => apiService.post('/api/superadmin/billing', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-settings'] }); setShowSettings(false); toast('Configuración guardada.') },
    onError: () => toast('Error al guardar.', 'error'),
  })

  function openSettings(c: Company) {
    const s = settings || { companyId: c.id, basePrice: 0, includedUsers: 0, extraChargeMode: 1, extraUserPrice: 0, extraFixedAmount: 0, billingDay: 1, notifyDaysBefore: 5 }
    setForm(s); setSelectedCompanyId(c.id); setShowSettings(true)
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-slate-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Facturación</h1>
        <p className="mt-1 text-sm text-slate-400">Configuración de precios y resumen por empresa</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.filter((c) => c.isActive).map((company) => (
          <Card key={company.id} className={`p-5 cursor-pointer transition hover:shadow-md ${selectedCompanyId === company.id ? 'ring-2 ring-slate-800' : ''}`} onClick={() => setSelectedCompanyId(company.id)}>
            <h3 className="text-sm font-bold truncate">{company.name}</h3>
            <p className="text-xs text-slate-400">{company.slug}</p>
            {ovLoading && selectedCompanyId === company.id ? (
              <div className="mt-3"><Spinner className="h-4 w-4 text-slate-600" /></div>
            ) : overview && selectedCompanyId === company.id ? (
              <div className="mt-3 space-y-1 text-xs">
                <p className="flex justify-between"><span className="text-slate-400">Alumnos:</span><span className="font-semibold">{overview.currentActiveStudents}</span></p>
                <p className="flex justify-between"><span className="text-slate-400">Base:</span><span className="font-semibold">{FMT.format(overview.basePrice)}</span></p>
                <p className="flex justify-between"><span className="text-slate-400">Extra:</span><span className="font-semibold">{FMT.format(overview.extraAmount)}</span></p>
                <p className="flex justify-between border-t border-slate-200 pt-1 mt-1 dark:border-slate-700"><span className="text-slate-400">Total:</span><span className="font-semibold text-emerald-600">{FMT.format(overview.totalAmount)}</span></p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">Seleccionar para ver detalle</p>
            )}
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openSettings(company) }} className="mt-3 w-full">Configurar</Button>
          </Card>
        ))}
      </div>

      {selectedCompanyId && overview && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold">Detalle del período</h2>
            <div className="flex items-center gap-2">
              <Select value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-AR', { month: 'long' })}</option>
                ))}
              </Select>
              <Select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - 2 + i}>{new Date().getFullYear() - 2 + i}</option>
                ))}
              </Select>
              <button onClick={async () => {
                try {
                  const blob = await apiService.getBlob(`/api/superadmin/billing/${selectedCompanyId}/monthly-report/pdf?year=${reportYear}&month=${reportMonth}`)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `reporte-${reportMonth}-${reportYear}.pdf`; a.click()
                  URL.revokeObjectURL(url)
                } catch { toast('Error al descargar PDF.', 'error') }
              }}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                PDF
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alumnos activos</p>
              <p className="text-xl font-black">{overview.currentActiveStudents}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Usuarios extra</p>
              <p className="text-xl font-black">{overview.extraUsers}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Base</p>
              <p className="text-xl font-black">{FMT.format(overview.basePrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
              <p className="text-xl font-black text-emerald-600">{FMT.format(overview.totalAmount)}</p>
            </div>
          </div>
          {overview.users.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-3 py-2">Alumno</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overview.users.map((u) => (
                    <tr key={u.userId} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2 font-medium">{u.fullName}</td>
                      <td className="px-3 py-2 text-slate-500">{u.email ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{u.createdAtUtc ? new Date(u.createdAtUtc).toLocaleDateString('es-AR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {showSettings && (
        <Modal open={true} onClose={() => setShowSettings(false)} title="Configurar facturación" className="sm:max-w-md">
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Precio base</label><Input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Usuarios incluidos</label><Input type="number" value={form.includedUsers} onChange={(e) => setForm({ ...form, includedUsers: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Modo extra</label>
                <Select value={form.extraChargeMode} onChange={(e) => setForm({ ...form, extraChargeMode: Number(e.target.value) })}>
                  <option value={1}>Por usuario</option>
                  <option value={2}>Fijo</option>
                </Select>
              </div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Precio por extra</label><Input type="number" step="0.01" value={form.extraUserPrice} onChange={(e) => setForm({ ...form, extraUserPrice: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Monto fijo extra</label><Input type="number" step="0.01" value={form.extraFixedAmount} onChange={(e) => setForm({ ...form, extraFixedAmount: Number(e.target.value) })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Día facturación</label><Input type="number" min={1} max={31} value={form.billingDay} onChange={(e) => setForm({ ...form, billingDay: Number(e.target.value) })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Notificar antes</label><Input type="number" min={0} value={form.notifyDaysBefore} onChange={(e) => setForm({ ...form, notifyDaysBefore: Number(e.target.value) })} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>Cancelar</Button>
              <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate(form)} className="bg-slate-800 text-white hover:bg-slate-700">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function BillingPage() { return <ToastProvider><BillingInner /></ToastProvider> }
