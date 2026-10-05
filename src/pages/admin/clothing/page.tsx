import { useNavigate } from 'react-router-dom'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const primary = [
  {
    path: 'products',
    icon: '👕',
    title: 'Productos',
    description: 'Catálogo con variantes, precios, política de pago y disponibilidad.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    path: 'orders',
    icon: '🛒',
    title: 'Pedidos',
    description: 'Pagos, comprobantes, preparación y entregas.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    path: 'settings',
    icon: '⚙️',
    title: 'Configuración',
    description: 'Medios de pago, Mercado Pago y tiempo de reserva.',
    color: 'from-slate-500 to-slate-700',
  },
]

const secondary = [
  { path: 'stock', icon: '📦', title: 'Stock', color: 'from-amber-500 to-orange-600' },
  { path: 'categories', icon: '🏷️', title: 'Categorías', color: 'from-emerald-500 to-teal-600' },
  { path: 'delivery-zones', icon: '🚚', title: 'Zonas de envío', color: 'from-cyan-500 to-teal-600' },
]

export default function ClothingPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <PageHero
        label="Tienda"
        title="Gestión de la tienda"
        description="Productos, pedidos, pagos, entregas y configuración."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {primary.map((s) => (
          <Card
            key={s.path}
            onClick={() => navigate(s.path)}
            className="group cursor-pointer p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-4">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-sm', s.color)}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{s.description}</p>
              </div>
              <svg className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Gestión</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {secondary.map((s) => (
            <Card
              key={s.path}
              onClick={() => navigate(s.path)}
              className="group cursor-pointer p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base shadow-sm', s.color)}>
                  {s.icon}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}