import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { apiService } from '@/lib/api'

interface Company { id: string; name: string; slug: string; isActive: boolean; createdAtUtc: string }
interface Admin { id: string; email: string; firstName: string; lastName: string; isActive: boolean }

export function SuperAdminDashboard() {
  const navigate = useNavigate()

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const { data: admins = [] } = useQuery({
    queryKey: ['superadmin-admins'],
    queryFn: () => apiService.get<Admin[]>('/api/superadmin/admins'),
  })

  if (loadingCompanies) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-slate-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Panel SuperAdmin</h1>
        <p className="mt-1 text-sm text-slate-400">Gestión global del sistema</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Empresas" value={String(companies.length)} />
          <Stat label="Activas" value={String(companies.filter((c) => c.isActive).length)} />
          <Stat label="Admins" value={String(admins.length)} />
          <Stat label="Activos" value={String(admins.filter((a) => a.isActive).length)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold">Empresas</h2>
          <p className="text-xs text-slate-400">Últimas empresas registradas</p>
          <div className="space-y-2">
            {companies.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.slug}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/superadmin/companies')} className="w-full">Ver todas</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold">Administradores</h2>
          <p className="text-xs text-slate-400">Últimos admins registrados</p>
          <div className="space-y-2">
            {admins.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-slate-400">{a.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {a.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/superadmin/admins')} className="w-full">Ver todos</Button>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/10 p-3"><div className="text-2xl font-black">{value}</div><div className="text-xs text-slate-400">{label}</div></div>
}
