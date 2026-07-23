export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5 sm:p-6 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      {/* Donuts row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )
}
