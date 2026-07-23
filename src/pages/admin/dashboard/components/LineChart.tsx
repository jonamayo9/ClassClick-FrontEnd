import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { EvolutionPoint } from '@/types/dashboard'

interface LineChartProps {
  data: EvolutionPoint[]
  title: string
  color?: string
  format?: 'currency' | 'number'
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {typeof val === 'number' ? `$${val.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : val}
      </p>
    </div>
  )
}

export function LineChartWidget({ data, title, color = '#6366f1', format = 'number', loading }: LineChartProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 h-40 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="mt-8 text-center text-xs text-slate-400">Sin datos suficientes</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">{title}</h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLine data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v: number) => format === 'currency' ? `$${(v / 1000).toFixed(0)}k` : `${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
          </RechartsLine>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
