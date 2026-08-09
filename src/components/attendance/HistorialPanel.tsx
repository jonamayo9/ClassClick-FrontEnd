import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAttendanceHistory, useSaveWorkflowAttendance } from './hooks'
import { HistoryRows } from './Rows'
import type { AttendanceFilters } from './utils'

interface HistorialPanelProps {
  base: string
  filters: AttendanceFilters
  onDirtyChange: (dirty: boolean) => void
}

export function HistorialPanel({ base, filters, onDirtyChange }: HistorialPanelProps) {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [edits, setEdits] = useState<Record<string, boolean>>({})
  const [pendingPage, setPendingPage] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useAttendanceHistory(base, {
    date: filters.date,
    courseId: filters.courseId,
    classId: filters.classId,
    search: filters.search,
    present: filters.present,
    source: filters.source,
    page,
  })

  const saveMutation = useSaveWorkflowAttendance(base)

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const dirty = Object.keys(edits).length > 0
  const showCourse = filters.courseId === ''

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const toggle = (attendanceId: string, present: boolean) => {
    setEdits((prev) => ({ ...prev, [attendanceId]: present }))
  }

  const requestPage = (p: number) => {
    if (dirty) {
      setPendingPage(p)
      setConfirmOpen(true)
      return
    }
    setPage(p)
  }

  const confirmPage = () => {
    if (pendingPage != null) setPage(pendingPage)
    setConfirmOpen(false)
    setPendingPage(null)
  }

  const handleSave = async () => {
    const dirtyRows = items.filter((r) => edits[r.attendanceId] !== undefined && edits[r.attendanceId] !== r.present)

    if (dirtyRows.length === 0) {
      toast('No hay cambios para guardar.', 'error')
      return
    }

    const itemsToSave = dirtyRows.map((r) => ({
      classId: r.classId,
      studentId: r.studentId,
      present: edits[r.attendanceId] ?? r.present,
    }))

    try {
      const result = await saveMutation.mutateAsync({ date: filters.date, items: itemsToSave })

      if (result.updated?.length) toast(`Cambios guardados (${result.updated.length}).`)
      if (result.skipped?.length) toast(`${result.skipped.length} registro(s) ya fueron actualizados por otro usuario.`)
      if (result.qrLocked?.length) {
        setEdits((prev) => {
          const next = { ...prev }
          result.qrLocked.forEach((id) => delete next[id])
          return next
        })
        toast(`${result.qrLocked.length} asistencia(s) QR no pueden cambiarse a ausente.`, 'error')
      } else {
        setEdits({})
      }
    } catch {
      toast('Error al guardar los cambios.', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-violet-600" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error al consultar"
        description="No se pudo cargar el historial de asistencias."
        action={{ label: 'Reintentar', onClick: () => refetch() }}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="Sin registros para la fecha"
        description="No existen asistencias registradas para la fecha y filtros seleccionados."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {dirty && (
          <Button
            onClick={handleSave}
            loading={saveMutation.isPending}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            Guardar cambios ({Object.keys(edits).length})
          </Button>
        )}
      </div>

      <HistoryRows items={items} edits={edits} onToggle={toggle} showCourse={showCourse} />

      <Pagination
        page={page}
        pageSize={20}
        totalCount={totalCount}
        onPageChange={requestPage}
        loading={isLoading}
      />

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cambios sin guardar"
        message="Tenés ediciones sin guardar. Si cambiás de página se descartan. ¿Continuar?"
        confirmText="Descartar y continuar"
        variant="danger"
        onConfirm={confirmPage}
      />
    </div>
  )
}
