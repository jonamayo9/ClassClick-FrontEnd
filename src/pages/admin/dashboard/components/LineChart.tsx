import { AreaChart, Area, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useTheme } from '@/stores/theme'
import type { EvolutionPoint } from '@/types/dashboard'

interface LineChartProps {
  data: EvolutionPoint[]
  title: string
  color?: string
  format?: 'currency' | 'number'
  loading?: boolean
  error?: boolean
  onPointClick?: (point: EvolutionPoint) => void
  onGeneralClick?: () => void
  isSport?: boolean
}

function CustomTooltip({ active, payload, label, sport, format }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  const valueText = typeof val === 'number'
    ? format === 'currency'
      ? `$${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
      : val.toLocaleString('es-AR')
    : val
  if (sport) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-[rgba(120,150,200,0.3)] dark:bg-[#0B1220]">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{valueText}</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{valueText}</p>
    </div>
  )
}

function CustomDot({ cx, cy, r, payload, fill, onPointClick }: any) {
  if (cx == null || cy == null) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke="none"
      className="cursor-pointer transition hover:opacity-60"
      onClick={(e) => { e.stopPropagation(); onPointClick?.(payload) }}
    />
  )
}

export function LineChartWidget({ data, title, color = '#6366f1', format = 'number', loading, error, onPointClick, onGeneralClick, isSport = false }: LineChartProps) {
  const gradientId = `sport-grad-${color.replace('#', '')}`
  const resolved = useTheme((s) => s.resolved)
  const isDark = resolved === 'dark'
  const sportGrid = isDark ? 'rgba(148,163,184,0.12)' : '#e2e8f0'
  const sportAxis = isDark ? '#94A3B8' : '#64748b'

  if (loading) {
    return (
      <div className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800',
        isSport && 'rounded-xl border-slate-200 bg-white dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30]',
      )}>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 h-40 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800',
        isSport && 'rounded-xl border-slate-200 bg-white dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30]',
      )}>
        <h3 className={cn('text-sm font-bold text-slate-800 dark:text-slate-200', isSport && 'text-slate-900 dark:text-white')}>{title}</h3>
        {error ? (
          <p className="mt-8 text-center text-xs text-rose-500">No se pudieron cargar los datos.</p>
        ) : (
          <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">Sin datos suficientes</p>
        )}
      </div>
    )
  }

  if (isSport) {
    return (
      <div
        onClick={onGeneralClick}
        className={cn(
          'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)]',
          onGeneralClick && 'cursor-pointer transition hover:border-slate-300 dark:hover:border-[rgba(150,180,235,0.45)]',
        )}
      >
        <div className="mb-2.5">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <div style={{ height: 185 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={sportGrid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: sportAxis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: sportAxis }} axisLine={false} tickLine={false} width={40}
                tickFormatter={(v: number) => format === 'currency' ? `$${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip content={<CustomTooltip sport format={format} />} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={<CustomDot fill={color} onPointClick={onPointClick} r={2.5} />}
                activeDot={{ r: 5, fill: color }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onGeneralClick}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800',
        onGeneralClick && 'cursor-pointer transition hover:shadow-md',
      )}
    >
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">{title}</h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v: number) => format === 'currency' ? `$${(v / 1000).toFixed(0)}k` : `${v}`} />
            <Tooltip content={<CustomTooltip sport={false} format={format} />} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={<CustomDot fill={color} onPointClick={onPointClick} />} activeDot={{ r: 5 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}