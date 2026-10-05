import type { TrackerStep } from './order-tracker-steps'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function OrderTracker({
  steps,
  size = 'md',
}: {
  steps: TrackerStep[]
  size?: 'sm' | 'md'
}) {
  const circleCls =
    size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const connectorTop = size === 'sm' ? 'top-3' : 'top-4'
  const labelCls =
    size === 'sm'
      ? 'mt-1.5 text-[9px] font-semibold leading-tight text-center max-w-[70px]'
      : 'mt-2 text-[10px] font-semibold leading-tight text-center max-w-[84px] md:text-[11px]'
  const hintCls =
    size === 'sm'
      ? 'mt-0.5 text-[8px] text-center max-w-[70px] leading-tight'
      : 'mt-0.5 text-[9px] text-center max-w-[84px] leading-tight'

  return (
    <div className="w-full">
      <div className="relative flex">
        {steps.map((step, i) => {
          const prevCompleted = i > 0 && steps[i - 1].state === 'completed'
          const completed = step.state === 'completed'
          const current = step.state === 'current'
          return (
            <div key={step.key} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <div
                  className={`absolute -left-1/2 right-1/2 ${connectorTop} -translate-y-1/2 h-0.5 ${
                    prevCompleted ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
              <div
                className={`relative z-10 flex items-center justify-center rounded-full ${circleCls} ${
                  completed
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                    : current
                      ? 'bg-violet-600 text-white ring-4 ring-violet-200 shadow-md shadow-violet-500/30 dark:ring-violet-900/60'
                      : 'bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700'
                }`}
              >
                {completed ? (
                  <CheckIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
                ) : (
                  <span className={size === 'sm' ? 'text-[10px] font-bold' : 'text-xs font-bold'}>{i + 1}</span>
                )}
              </div>
              <p
                className={`${labelCls} ${
                  completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : current
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-slate-400 dark:text-slate-500'
                } ${current ? 'font-black' : ''}`}
              >
                {step.label}
              </p>
              {step.hint && (
                <p className={`${hintCls} ${
                  step.hintTone === 'warn'
                    ? 'text-amber-600 dark:text-amber-400'
                    : current
                      ? 'text-violet-500/80 dark:text-violet-400/80'
                      : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {step.hint}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
