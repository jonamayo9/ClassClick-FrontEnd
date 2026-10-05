import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DonutSegment, ChargeTypeBreakdown, DonutBreakdownRow } from '@/types/dashboard'

interface DonutChartProps {
  data: DonutSegment[]
  title: string
  centerLabel: string
  centerValue?: string | number
  loading?: boolean
  error?: boolean
  breakdown?: ChargeTypeBreakdown[]
  rows?: DonutBreakdownRow[]
  onSeeAll?: () => void
  onGeneralClick?: () => void
  onSegmentClick?: (segment: DonutSegment) => void
  onRowClick?: (row: DonutBreakdownRow) => void
  isSport?: boolean
  icon?: React.ReactNode
  sportColors?: string[]
  emptyTitle?: string
  emptyDescription?: string
  emptyActionTo?: string
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

export function DonutChart({ data, title, centerLabel, centerValue, loading, error, breakdown, rows, onSeeAll, onGeneralClick, onSegmentClick, onRowClick, isSport = false, icon, sportColors, emptyTitle = 'Todavía no registraste asistencias este período.', emptyDescription = 'Comenzá a tomar asistencia para visualizar los datos acá.', emptyActionTo }: DonutChartProps) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<string | null>(null)

  if (loading) {
    return (
      <div className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800',
        isSport && 'rounded-xl border-slate-200 bg-white dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30]',
      )}>
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-4 h-48 w-48 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (isSport && total === 0 && emptyActionTo) {
    return (
      <div className="flex h-[330px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-blue-500/15">
            <CalendarDays className="h-4 w-4 text-blue-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-blue-500/10 dark:bg-indigo-500/15">
            <CalendarDays className="h-7 w-7 text-blue-600 dark:text-indigo-400" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-200">{emptyTitle}</p>
          <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">{emptyDescription}</p>
          <button
            type="button"
            onClick={() => navigate(emptyActionTo)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
          >
            Ir a asistencia
          </button>
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800',
        isSport && 'rounded-xl border-slate-200 bg-white dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30]',
      )}>
        <h3 className={cn('text-sm font-bold text-slate-800 dark:text-slate-200', isSport && 'text-slate-900 dark:text-white')}>{title}</h3>
        <div className="flex h-48 items-center justify-center">
          {error ? (
            <p className="text-xs text-rose-500">No se pudieron cargar los datos.</p>
          ) : (
            <p className="text-xs text-slate-400">Sin datos</p>
          )}
        </div>
      </div>
    )
  }

  const coloredData = data.map((d, i) => {
    if (isSport && sportColors && sportColors.length > 0) {
      return { ...d, color: sportColors[i % sportColors.length] }
    }
    return { ...d, color: d.color || DONUT_COLORS[i % DONUT_COLORS.length] }
  })

  function handleSegmentClick(segment: DonutSegment) {
    if (onSegmentClick) onSegmentClick(segment)
    else if (segment.navigateTo) navigate(segment.navigateTo)
  }

  if (isSport) {
    return (
      <div
        onClick={onGeneralClick}
        className={cn(
          'flex h-[330px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[rgba(120,150,200,0.25)] dark:bg-[#111C30] dark:shadow-[0_1px_6px_rgba(2,8,23,0.45)]',
          onGeneralClick && 'cursor-pointer transition hover:border-slate-300 dark:hover:border-[rgba(150,180,235,0.45)]',
        )}
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-blue-500/15">
              {icon}
            </div>
          )}
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <div className="relative mx-auto mt-1 w-full min-h-[150px] flex-1" style={{ maxHeight: 172 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={coloredData}
                cx="50%" cy="50%"
                innerRadius={46} outerRadius={70}
                paddingAngle={3}
                dataKey="count"
                isAnimationActive={true}
                animationBegin={100}
                animationDuration={600}
                stroke="transparent"
                onMouseEnter={(_, idx) => setHovered(coloredData[idx]?.label ?? null)}
                onMouseLeave={() => setHovered(null)}
                onClick={(_, idx) => { const d = coloredData[idx]; if (d) handleSegmentClick(d) }}
                style={{ cursor: 'pointer' }}
              >
                {coloredData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-extrabold leading-none text-slate-900 dark:text-white">{centerValue ?? total}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{centerLabel}</p>
          </div>
        </div>
        <div className="mt-2 space-y-0.5">
          {coloredData.map((d) => (
            <div key={d.label}
              onClick={(e) => { e.stopPropagation(); handleSegmentClick(d) }}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] transition cursor-pointer ${hovered === d.label ? 'bg-slate-100 dark:bg-white/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="flex-1 truncate text-slate-500 dark:text-slate-400">{d.label}</span>
              <span className="font-bold text-slate-800 dark:text-white">{d.count}</span>
              <span className="w-9 text-right text-slate-400 dark:text-slate-500">({d.percentage.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
        {breakdown && breakdown.length > 0 && (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5 dark:border-[rgba(120,150,200,0.15)]">
            {breakdown.slice(0, 3).map((b) => (
              <div key={b.name} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px]">
                <span className="truncate text-slate-500 dark:text-slate-400">{b.name}</span>
                <span className="font-bold text-slate-800 dark:text-white">{b.total}</span>
              </div>
            ))}
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5 dark:border-[rgba(120,150,200,0.15)]">
            {rows.slice(0, 4).map((r) => (
              <div
                key={r.name}
                onClick={() => { if (onRowClick) onRowClick(r); else if (r.navigateTo) navigate(r.navigateTo) }}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] ${(onRowClick || r.navigateTo) ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5' : ''}`}
              >
                <span className="truncate text-slate-500 dark:text-slate-400">{r.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-white">{r.value}</span>
                  <span className="w-9 text-right text-slate-400 dark:text-slate-500">({Math.round(r.percentage)}%)</span>
                </span>
              </div>
            ))}
            {rows.length > 4 && onSeeAll && (
              <button
                type="button"
                onClick={onSeeAll}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-slate-50 dark:border-[rgba(120,150,200,0.25)] dark:text-blue-400 dark:hover:bg-white/5"
              >
                Ver todos
              </button>
            )}
          </div>
        )}
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
              onClick={(_, idx) => { const d = coloredData[idx]; if (d) handleSegmentClick(d) }}
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
            onClick={(e) => { e.stopPropagation(); handleSegmentClick(d) }}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition cursor-pointer ${hovered === d.label ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-slate-600 dark:text-slate-300">{d.label}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{d.count}</span>
            <span className="text-slate-400 dark:text-slate-500 w-10 text-right">({d.percentage.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
      {breakdown && breakdown.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-700">
          {breakdown.map((b) => (
            <div key={b.name} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400">{b.name}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{b.total}</span>
            </div>
          ))}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-700">
          {rows.slice(0, 5).map((r) => (
            <div
              key={r.name}
              onClick={() => { if (onRowClick) onRowClick(r); else if (r.navigateTo) navigate(r.navigateTo) }}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs ${(onRowClick || r.navigateTo) ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
            >
              <span className="truncate text-slate-500 dark:text-slate-400">{r.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{r.value}</span>
                <span className="w-10 text-right text-slate-400 dark:text-slate-500">({Math.round(r.percentage)}%)</span>
              </span>
            </div>
          ))}
          {rows.length > 5 && onSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-800"
            >
              Ver todos
            </button>
          )}
        </div>
      )}
    </div>
  )
}
