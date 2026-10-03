import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { ReactNode } from 'react'

export interface EduDonutSegment {
  label: string
  count: number
  color: string
}

interface EduDonutProps {
  segments: EduDonutSegment[]
  centerValue: ReactNode
  centerSub?: ReactNode
  /** Diámetro exterior del donut en px. */
  size?: number
  onClickSegment?: (segment: EduDonutSegment) => void
  onClick?: () => void
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as EduDonutSegment
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-white/10 dark:bg-[#0B1220]">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{d.label}</p>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{d.count} registros</p>
    </div>
  )
}

export function EduDonut({ segments, centerValue, centerSub, size = 168, onClickSegment, onClick }: EduDonutProps) {
  const usable = segments.filter((s) => s.count > 0)

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={usable.length > 0 ? usable : [{ label: 'Sin datos', count: 1, color: '#94a3b8' }]}
            cx="50%"
            cy="50%"
            innerRadius={(size * 0.62) / 2}
            outerRadius={(size * 0.78) / 2}
            paddingAngle={3}
            cornerRadius={4}
            dataKey="count"
            stroke="transparent"
            isAnimationActive
            animationDuration={700}
            onClick={(_, idx) => {
              const s = usable[idx]
              if (s && onClickSegment) onClickSegment(s)
            }}
            style={{ cursor: onClickSegment || onClick ? 'pointer' : 'default' }}
          >
            {usable.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerValue}
        {centerSub}
      </div>
    </div>
  )
}