import { Button } from './button'

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  loading?: boolean
}

export function Pagination({ page, pageSize, totalCount, onPageChange, loading }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

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
