import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import type { Company, CompanyStructureType, CompanyVertical } from '@/types/auth'

interface GroupChild {
  id: string
  name: string
  slug: string
  isActive: boolean
  structureType?: CompanyStructureType
  vertical?: CompanyVertical | null
}

interface GroupInfo {
  id: string
  name: string
  slug: string
  isActive: boolean
  children: GroupChild[]
}

const VERTICAL_LABEL: Record<string, string> = { Deportiva: 'Deportiva', Educativa: 'Educativa' }

function slugOf(c: { slug?: string; companySlug?: string }): string {
  return c.slug ?? c.companySlug ?? ''
}

export function GroupAdminPage() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const { activeCompanySlug, companies, switchCompany } = useAuth()
  const navigate = useNavigate()
  const slug = companySlug ?? activeCompanySlug ?? ''

  const infoQuery = useQuery({
    queryKey: ['group-admin', slug],
    queryFn: () => apiService.get<GroupInfo>(`/api/group-admin/${slug}`),
    enabled: !!slug,
    retry: false,
  })

  function enterChild(child: GroupChild) {
    // Preferir la hija dentro de las empresas accesibles (heredadas o directas);
    // si no está (p. ej. todavía no refrescó), construir una Company mínima.
    const existing = (companies ?? []).find((c) => slugOf(c) === child.slug)
    const target: Company = existing ?? {
      id: child.id,
      companyId: child.id,
      slug: child.slug,
      companySlug: child.slug,
      name: child.name,
      companyName: child.name,
      role: 'admin',
      activeRole: 'admin',
      isActive: child.isActive,
      structureType: child.structureType ?? 'Child',
      vertical: child.vertical ?? null,
    }
    switchCompany(target, 'direct')
    if (child.vertical === 'Educativa') {
      navigate(`/educativa/${child.slug}`)
    } else {
      navigate('/admin')
    }
  }

  if (!slug) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        No hay un grupo seleccionado.
      </div>
    )
  }

  if (infoQuery.isLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Cargando grupo...</div>
  }

  if (infoQuery.isError || !infoQuery.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        No se pudo cargar el grupo. Verificá que tengas acceso.
      </div>
    )
  }

  const group = infoQuery.data

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          {group.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Grupo · {group.children.length} empresa{group.children.length === 1 ? '' : 's'} hija
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          Empresas hijas
        </h2>
        {group.children.length === 0 ? (
          <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Este grupo todavía no tiene empresas hijas asignadas.
          </p>
        ) : (
          <ul className="space-y-2">
            {group.children.map((child) => (
              <li key={child.id}>
                <button
                  onClick={() => enterChild(child)}
                  disabled={!child.isActive}
                  className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition dark:border-slate-700 dark:bg-slate-900 ${
                    child.isActive
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'cursor-not-allowed opacity-70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {child.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {child.slug} · {VERTICAL_LABEL[child.vertical ?? 'Deportiva'] ?? child.vertical}
                    </p>
                  </div>
                  {child.isActive ? (
                    <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      Administrar →
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Inactiva
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Como administrador del grupo podés operar todas las empresas hijas sin acceso individual.
        Cada empresa conserva su vertical (Deportiva o Educativa) y sus propios datos.
      </p>
    </div>
  )
}