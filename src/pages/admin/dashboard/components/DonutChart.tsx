import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { DonutSegment } from '@/types/dashboard'

interface DonutChartProps {
  data: DonutSegment[]
  title: string
  centerLabel: string
  centerValue?: string | number
  loading?: boolean
}

const DONUT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6']

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as DonutSegment
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{d.label}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {d.count} ({d.percentage.toFixed(1)}%)
      </p>
    </div>
  )
}

export function DonutChart({ data, title, centerLabel, centerValue, loading }: DonutChartProps) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-4 h-48 w-48 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="flex h-48 items-center justify-center">
          <p className="text-xs text-slate-400">Sin datos</p>
        </div>
      </div>
    )
  }

  const coloredData = data.map((d, i) => ({ ...d, color: d.color || DONUT_COLORS[i % DONUT_COLORS.length] }))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="relative mx-auto mt-1" style={{ height: 210, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={coloredData}
              cx="50%" cy="50%"
              innerRadius={62} outerRadius={88}
              paddingAngle={3}
              dataKey="count"
              isAnimationActive={true}
              animationBegin={100}
              animationDuration={600}
              onMouseEnter={(_, idx) => setHovered(coloredData[idx]?.label ?? null)}
              onMouseLeave={() => setHovered(null)}
              onClick={(_, idx) => { const d = coloredData[idx]; if (d?.navigateTo) navigate(d.navigateTo) }}
              style={{ cursor: 'pointer' }}
            >
              {coloredData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: -6 }}>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{centerValue ?? total}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{centerLabel}</p>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {coloredData.map((d) => (
          <div key={d.label}
            onClick={() => d.navigateTo && navigate(d.navigateTo)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition cursor-pointer ${hovered === d.label ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-slate-600 dark:text-slate-300">{d.label}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{d.count}</span>
            <span className="text-slate-400 dark:text-slate-500 w-10 text-right">({d.percentage.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
