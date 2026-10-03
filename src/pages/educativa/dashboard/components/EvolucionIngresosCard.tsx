import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { card, cardHover, muted } from './visual'
import { useTheme } from '@/stores/theme'
import type { EvolutionPoint } from '@/types/dashboard'

interface EvolucionIngresosCardProps {
  data: EvolutionPoint[]
  title?: string
  loading?: boolean
  onPointClick?: (point: EvolutionPoint) => void
  onGeneralClick?: () => void
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  const text = typeof val === 'number' ? `$${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : val
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-white/10 dark:bg-[#0B1220]">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{text}</p>
    </div>
  )
}

function ChartDot({ cx, cy, r, payload, onPointClick }: any) {
  if (cx == null || cy == null) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="#3b82f6"
      stroke="transparent"
      className="cursor-pointer transition hover:opacity-60"
      onClick={(e) => { e.stopPropagation(); onPointClick?.(payload) }}
    />
  )
}

export function EvolucionIngresosCard({ data, title = 'Evolución de ingresos últimos 12 meses', loading, onPointClick, onGeneralClick }: EvolucionIngresosCardProps) {
  const resolved = useTheme((s) => s.resolved)
  const isDark = resolved === 'dark'
  const grid = isDark ? 'rgba(148,163,184,0.12)' : '#e2e8f0'
  const axis = isDark ? '#64748b' : '#94a3b8'

  if (loading && !data.length) {
    return (
      <div className={cn(card, 'animate-pulse p-5')}>
        <div className="h-4 w-44 rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="mt-4 h-44 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    )
  }

  return (
    <div className={cn(card, cardHover, 'flex flex-col p-5', onGeneralClick && 'cursor-pointer')} onClick={onGeneralClick}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      {!data.length ? (
        <p className={cn('flex flex-1 items-center justify-center py-10 text-xs', muted)}>Sin datos suficientes</p>
      ) : (
        <div className="mt-3" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="edu-evo-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: axis }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: axis }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#edu-evo-grad)"
                dot={<ChartDot onPointClick={onPointClick} r={3} />}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}