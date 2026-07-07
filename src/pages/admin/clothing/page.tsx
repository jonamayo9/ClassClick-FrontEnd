import { useNavigate } from 'react-router-dom'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const sections = [
  {
    path: 'categories',
    icon: '🏷️',
    title: 'Categorías',
    description: 'Categorías y subcategorías para organizar los productos.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    path: 'products',
    icon: '👕',
    title: 'Productos',
    description: 'Catálogo de productos con variantes, imágenes y personalización.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    path: 'stock',
    icon: '📦',
    title: 'Stock',
    description: 'Gestión de stock por producto y variante.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    path: 'orders',
    icon: '🛒',
    title: 'Pedidos',
    description: 'Revisar pedidos, comprobantes de pago y marcar entregas.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    path: 'cancellations',
    icon: '❌',
    title: 'Cancelaciones',
    description: 'Solicitudes de cancelación de pedidos pendientes de revisión.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    path: 'payment-proofs',
    icon: '🧾',
    title: 'Comprobantes',
    description: 'Listado de todos los comprobantes de pago subidos.',
    color: 'from-fuchsia-500 to-purple-600',
  },
  {
    path: 'settings',
    icon: '⚙️',
    title: 'Configuración',
    description: 'Alias y titular de pago que ven los alumnos.',
    color: 'from-slate-500 to-slate-700',
  },
]

export default function ClothingPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <PageHero
        label="Indumentaria"
        title="Gestión de indumentaria"
        description="Catálogo, pedidos, stock, variantes, comprobantes y gestión de productos."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
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
    </div>
  )
}
