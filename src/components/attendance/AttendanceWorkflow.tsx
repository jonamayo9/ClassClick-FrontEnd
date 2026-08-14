import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card } from '@/components/ui/card'
import { Filters } from './Filters'
import { MarcarPanel } from './MarcarPanel'
import { HistorialPanel } from './HistorialPanel'
import { QrScanFlow } from './QrScanFlow'
import { useCourseOptions, useDebouncedValue, useWorkflowBase } from './hooks'
import {
  closestValidDate,
  defaultFilters,
  isDateValid,
  validDaysFor,
  type AttendanceFilters,
  type AttendanceRole,
} from './utils'

type Tab = 'marcar' | 'historial'
type MarMode = 'manual' | 'qr'

type PendingChange =
  | { type: 'filter'; partial: Partial<AttendanceFilters> }
  | { type: 'tab'; tab: Tab }
  | { type: 'marMode'; mode: MarMode }

function AttendanceWorkflowInner({ role }: { role: AttendanceRole }) {
  const base = useWorkflowBase(role)
  const { courses, classes, isLoading: loadingOptions } = useCourseOptions(role)

  const [tab, setTab] = useState<Tab>('marcar')
  const [marMode, setMarMode] = useState<MarMode>('manual')
  const [filters, setFilters] = useState<AttendanceFilters>(() => defaultFilters())
  const [searchDraft, setSearchDraft] = useState('')
  const debouncedSearch = useDebouncedValue(searchDraft, 350)

  const dirtyRef = useRef(false)
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Fecha inicial nunca en un día inválido: al cargar las clases accesibles,
  // si hoy no coincide con ningún DayOfWeek válido, saltar a closestValidDate.
  const initializedRef = useRef(false)
  useEffect(() => {
    if (loadingOptions || initializedRef.current) return
    initializedRef.current = true
    setFilters((prev) => {
      const validDays = validDaysFor(classes, prev.courseId, prev.classId)
      if (validDays.length > 0 && !isDateValid(prev.date, validDays)) {
        return { ...prev, date: closestValidDate(validDays) }
      }
      return prev
    })
  }, [loadingOptions, classes])

  const commitChange = useCallback(
    (partial: Partial<AttendanceFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...partial }
        if ('courseId' in partial || 'classId' in partial) {
          const validDays = validDaysFor(classes, next.courseId, next.classId)
          if (!isDateValid(next.date, validDays)) {
            next.date = closestValidDate(validDays)
          }
        }
        return next
      })
      if ('search' in partial) setSearchDraft(partial.search ?? '')
      dirtyRef.current = false
    },
    [classes]
  )

  const requestChange = useCallback(
    (partial: Partial<AttendanceFilters>) => {
      if (dirtyRef.current) {
        setPendingChange({ type: 'filter', partial })
        setConfirmOpen(true)
        return
      }
      commitChange(partial)
    },
    [commitChange]
  )

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      requestChange({ search: debouncedSearch })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const requestTab = (next: Tab) => {
    if (dirtyRef.current) {
      setPendingChange({ type: 'tab', tab: next })
      setConfirmOpen(true)
      return
    }
    setTab(next)
    setMarMode('manual')
  }

  const requestMarMode = (mode: MarMode) => {
    if (dirtyRef.current) {
      setPendingChange({ type: 'marMode', mode })
      setConfirmOpen(true)
      return
    }
    setMarMode(mode)
  }

  const handleConfirm = () => {
    if (pendingChange?.type === 'filter') {
      commitChange(pendingChange.partial)
    } else if (pendingChange?.type === 'tab') {
      setTab(pendingChange.tab)
      setMarMode('manual')
    } else if (pendingChange?.type === 'marMode') {
      setMarMode(pendingChange.mode)
    }
    dirtyRef.current = false
    setConfirmOpen(false)
    setPendingChange(null)
  }

  const handleCancel = () => {
    setSearchDraft(filters.search)
    setConfirmOpen(false)
    setPendingChange(null)
  }

  const panelKey = `${tab}|${marMode}|${filters.date}|${filters.courseId}|${filters.classId}|${filters.search}|${filters.present}|${filters.source}`
  const showFilters = tab === 'marcar' ? marMode === 'manual' : tab === 'historial'

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Asistencias</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Registrá y consultá la asistencia de tus alumnos.
        </p>
      </header>

      <SegmentedControl
        options={[
          { value: 'marcar', label: 'Marcar asistencia' },
          { value: 'historial', label: 'Historial' },
        ]}
        value={tab}
        onChange={(v) => requestTab(v as Tab)}
      />

      {tab === 'marcar' && (
        <SegmentedControl
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'qr', label: 'Escanear QR' },
          ]}
          value={marMode}
          onChange={(v) => requestMarMode(v as MarMode)}
        />
      )}

      {showFilters && (
        <Card className="p-3 sm:p-4">
          <Filters
            mode={tab}
            value={filters}
            searchDraft={searchDraft}
            onSearchDraft={setSearchDraft}
            onChange={requestChange}
            courses={courses}
            classes={classes}
            loadingOptions={loadingOptions}
          />
        </Card>
      )}

      {tab === 'marcar' && marMode === 'manual' && (
        <MarcarPanel
          key={panelKey}
          base={base}
          filters={filters}
          courses={courses}
          classes={classes}
          loadingOptions={loadingOptions}
          onDirtyChange={onDirtyChange}
          onSwitchToHistory={() => requestTab('historial')}
        />
      )}

      {tab === 'marcar' && marMode === 'qr' && <QrScanFlow role={role} embedded />}

      {tab === 'historial' && (
        <HistorialPanel key={panelKey} base={base} filters={filters} onDirtyChange={onDirtyChange} />
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={handleCancel}
        title="Cambios sin guardar"
        message="Tenés marcas o ediciones sin guardar. Si continuás se descartan y se aplica el nuevo modo o filtro."
        confirmText="Descartar y continuar"
        variant="danger"
        onConfirm={handleConfirm}
      />
    </div>
  )
}

export function AttendanceWorkflow({ role }: { role: AttendanceRole }) {
  return (
    <ToastProvider>
      <AttendanceWorkflowInner role={role} />
    </ToastProvider>
  )
}
