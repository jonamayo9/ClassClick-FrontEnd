import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { usePendingAttendance, useSaveWorkflowAttendance } from './hooks'
import { PendingRows } from './Rows'
import { dayNameFromIso, rowKey, type AttendanceFilters, type ClassOption, type CourseOption } from './utils'
import type { MarkState } from '@/types/attendance'

interface MarcarPanelProps {
  base: string
  filters: AttendanceFilters
  courses: CourseOption[]
  classes: ClassOption[]
  loadingOptions: boolean
  onDirtyChange: (dirty: boolean) => void
  onSwitchToHistory: () => void
}

export function MarcarPanel({
  base,
  filters,
  courses,
  classes,
  loadingOptions,
  onDirtyChange,
  onSwitchToHistory,
}: MarcarPanelProps) {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [states, setStates] = useState<Record<string, MarkState>>({})
  const [pendingPage, setPendingPage] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading, isError, refetch } = usePendingAttendance(base, {
    date: filters.date,
    courseId: filters.courseId,
    classId: filters.classId,
    search: filters.search,
    page,
  })

  const saveMutation = useSaveWorkflowAttendance(base)

  const dirty = Object.keys(states).length > 0
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const showCourse = filters.courseId === ''
  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const hasClassesForDate = useMemo(() => {
    const day = dayNameFromIso(filters.date)
    return classes.some(
      (c) =>
        (filters.courseId ? c.courseId === filters.courseId : true) &&
        (filters.classId ? c.id === filters.classId : true) &&
        c.dayOfWeek === day
    )
  }, [classes, filters.date, filters.courseId, filters.classId])

  const setState = (key: string, s: MarkState) => {
    setStates((prev) => {
      const next = { ...prev }
      if (s === 'unmarked') delete next[key]
      else next[key] = s
      return next
    })
  }

  const markAll = (v: 'present' | 'absent') => {
    const next: Record<string, MarkState> = {}
    items.forEach((r) => {
      next[rowKey(r.classId, r.studentId)] = v
    })
    setStates(next)
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
    const itemsToSave = items
      .filter((r) => {
        const s = states[rowKey(r.classId, r.studentId)]
        return s === 'present' || s === 'absent'
      })
      .map((r) => ({
        classId: r.classId,
        studentId: r.studentId,
        present: states[rowKey(r.classId, r.studentId)] === 'present',
      }))

    if (itemsToSave.length === 0) {
      toast('Marcá al menos un alumno como presente o ausente.', 'error')
      return
    }

    try {
      const result = await saveMutation.mutateAsync({ date: filters.date, items: itemsToSave })
      if (result.created?.length) toast(`Asistencia guardada (${result.created.length}).`)
      if (result.updated?.length) toast(`Asistencia actualizada (${result.updated.length}).`)
      if (result.skipped?.length) {
        toast(`${result.skipped.length} registro(s) ya existían (creados por otro usuario).`)
      }
      if (result.qrLocked?.length) {
        toast(`${result.qrLocked.length} asistencia(s) QR no pueden modificarse.`, 'error')
      }
      setStates({})
      setPage(1)
    } catch {
      toast('Error al guardar la asistencia.', 'error')
    }
  }

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-violet-600" />
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        icon="📚"
        title="Sin cursos accesibles"
        description="No hay cursos o clases disponibles para tu usuario."
      />
    )
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
        description="No se pudieron cargar las asistencias pendientes."
        action={{ label: 'Reintentar', onClick: () => refetch() }}
      />
    )
  }

  if (items.length === 0) {
    if (!hasClassesForDate) {
      return (
        <EmptyState
          icon="🗓️"
          title="Sin clases para la fecha"
          description="No hay clases programadas para la fecha seleccionada con los filtros actuales."
        />
      )
    }
    return (
      <EmptyState
        icon="🎉"
        title="Asistencia completa"
        description="Todos los alumnos ya tienen asistencia registrada para esta fecha y filtros."
        action={{ label: 'Ver historial', onClick: onSwitchToHistory }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => markAll('present')}>
          Marcar visibles como presentes
        </Button>
        <Button variant="outline" size="sm" onClick={() => markAll('absent')}>
          Marcar visibles como ausentes
        </Button>
      </div>

      <PendingRows items={items} states={states} onSetState={setState} showCourse={showCourse} />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={saveMutation.isPending}
          className="bg-violet-600 text-white hover:bg-violet-700"
        >
          Guardar asistencia
        </Button>
      </div>

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
        message="Tenés marcas sin guardar en esta página. Si cambiás de página se descartan. ¿Continuar?"
        confirmText="Descartar y continuar"
        variant="danger"
        onConfirm={confirmPage}
      />
    </div>
  )
}
