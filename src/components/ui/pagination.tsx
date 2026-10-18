import { Button } from './button'
import { Select } from './select'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  loading?: boolean
  pageSizeOptions?: number[]
  onPageSizeChange?: (pageSize: number) => void
  showPageNumbers?: boolean
}

function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const wanted = [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages)
  const unique = [...new Set(wanted)].sort((a, b) => a - b)
  const items: (number | 'gap')[] = []
  let prev = 0
  for (const p of unique) {
    if (prev && p - prev > 1) items.push('gap')
    items.push(p)
    prev = p
  }
  return items
}

export function Pagination({
  page, pageSize, totalCount, onPageChange, loading,
  pageSizeOptions, onPageSizeChange, showPageNumbers,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  if (!pageSizeOptions && !showPageNumbers) {
    return (
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mostrando {start}–{end} de {totalCount}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="min-w-[2.5rem] text-center text-xs font-medium text-slate-600 dark:text-slate-300">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Mostrando {start}–{end} de {totalCount}
      </p>

      {showPageNumbers && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          {pageItems(page, totalPages).map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={loading}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition disabled:opacity-50',
                  item === page
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {item}
              </button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {pageSizeOptions && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Por página</span>
          <div className="w-20">
            <Select value={String(pageSize)} onChange={(e) => onPageSizeChange?.(Number(e.target.value))}>
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
