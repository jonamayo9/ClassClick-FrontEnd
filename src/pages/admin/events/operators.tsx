import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { getApiError } from '@/lib/api'
import { formatEventShort } from '@/pages/student/events/hooks'
import { useEvents } from './hooks'
import {
  useEventOperators, useCreateEventOperator, useUpdateEventOperatorAssignments, useToggleEventOperator,
} from './hooks'
import type { EventOperator, OperatorAssignmentInput } from './hooks'

type SelectedMap = Record<string, { canCheckIn: boolean; canSellAtDoor: boolean }>

function EventAssignmentEditor({ value, onChange }: { value: SelectedMap; onChange: (v: SelectedMap) => void }) {
  const { data: events = [], isLoading } = useEvents()

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
  }

  if (events.length === 0) {
    return <p className="text-sm text-slate-400">Todavía no hay eventos para asignar.</p>
  }

  return (
    <div className="space-y-2">
      {events.map((e) => {
        const sel = value[e.id]
        const assigned = !!sel
        return (
          <div key={e.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{e.title}</p>
                <p className="text-xs text-slate-400">{formatEventShort(e.startsAt, e.hasStartTime)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = { ...value }
                  if (assigned) delete next[e.id]
                  else next[e.id] = { canCheckIn: true, canSellAtDoor: false }
                  onChange(next)
                }}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${assigned ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                {assigned ? 'Asignado' : 'Asignar'}
              </button>
            </div>
            {assigned && (
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={sel.canCheckIn}
                    onChange={(ev) => onChange({ ...value, [e.id]: { ...sel, canCheckIn: ev.target.checked } })}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  Control de ingreso
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={sel.canSellAtDoor}
                    onChange={(ev) => onChange({ ...value, [e.id]: { ...sel, canSellAtDoor: ev.target.checked } })}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  Venta en puerta
                </label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function toSelected(assignments: OperatorAssignmentInput[]): SelectedMap {
  const map: SelectedMap = {}
  for (const a of assignments) map[a.eventId] = { canCheckIn: a.canCheckIn, canSellAtDoor: a.canSellAtDoor }
  return map
}

function toInputs(map: SelectedMap): OperatorAssignmentInput[] {
  return Object.entries(map).map(([eventId, p]) => ({ eventId, canCheckIn: p.canCheckIn, canSellAtDoor: p.canSellAtDoor }))
}

export default function EventOperatorsPage() {
  const navigate = useNavigate()
  const { data: operators = [], isLoading } = useEventOperators()
  const createMutation = useCreateEventOperator()
  const updateMutation = useUpdateEventOperatorAssignments()
  const toggleMutation = useToggleEventOperator()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<EventOperator | null>(null)
  const [error, setError] = useState('')

  async function handleCreate(payload: { firstName: string; lastName: string; email: string; password: string; assignments: OperatorAssignmentInput[] }) {
    setError('')
    try {
      await createMutation.mutateAsync(payload)
      setCreateOpen(false)
    } catch (err: unknown) {
      setError(getApiError(err) || 'No se pudo crear el operador.')
    }
  }

  async function handleSaveAssignments(assignments: OperatorAssignmentInput[]) {
    if (!editing) return
    setError('')
    try {
      await updateMutation.mutateAsync({ userId: editing.userId, assignments })
      setEditing(null)
    } catch (err: unknown) {
      setError(getApiError(err) || 'No se pudieron guardar las asignaciones.')
    }
  }

  async function handleToggle(op: EventOperator) {
    try {
      await toggleMutation.mutateAsync(op.userId)
    } catch { /* sin toast: se ignora silenciosamente */ }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => navigate('/admin/events')} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
            ← Volver a eventos
          </button>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">Operadores de eventos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Personas que operan la puerta de uno o varios eventos, con permisos por evento.</p>
        </div>
        <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setCreateOpen(true)}>+ Nuevo operador</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : operators.length === 0 ? (
        <EmptyState
          icon="🪪"
          title="Todavía no creaste operadores."
          description="Creá un operador y asignale los eventos donde va a controlar el ingreso."
          action={{ label: 'Crear operador', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {operators.map((op) => (
            <div key={op.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {op.firstName} {op.lastName}
                    {!op.isActive && <Badge variant="default" className="ml-2">Inactivo</Badge>}
                  </p>
                  <p className="text-xs text-slate-400">{op.email}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(op); setError('') }}>Editar asignaciones</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(op)}>{op.isActive ? 'Desactivar' : 'Activar'}</Button>
                </div>
              </div>

              {op.assignments.length > 0 ? (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {op.assignments.map((a) => (
                    <div key={a.eventId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-300">{a.eventTitle}</span>
                      <span className="flex flex-wrap gap-1">
                        {a.canCheckIn && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Ingreso</span>}
                        {a.canSellAtDoor && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">✓ Venta puerta</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">Sin eventos asignados.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateOperatorModal onClose={() => setCreateOpen(false)} onSubmit={handleCreate} error={error} submitting={createMutation.isPending} />}

      {editing && <AssignModal operator={editing} onClose={() => setEditing(null)} onSubmit={handleSaveAssignments} error={error} submitting={updateMutation.isPending} />}
    </div>
  )
}

function CreateOperatorModal({ onClose, onSubmit, error, submitting }: {
  onClose: () => void
  onSubmit: (p: { firstName: string; lastName: string; email: string; password: string; assignments: OperatorAssignmentInput[] }) => void
  error: string
  submitting: boolean
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState<SelectedMap>({})

  const canSubmit = firstName.trim() && lastName.trim() && email.includes('@') && password.length >= 6

  return (
    <Modal open onClose={onClose} title="Nuevo operador" description="Se creará un usuario que solo accede a los eventos asignados." className="sm:max-w-lg">
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido *</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email *</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@ejemplo.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Contraseña *</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Eventos asignados</label>
          <EventAssignmentEditor value={selected} onChange={setSelected} />
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-700" loading={submitting} disabled={!canSubmit}
            onClick={() => onSubmit({ firstName, lastName, email, password, assignments: toInputs(selected) })}>
            Crear operador
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AssignModal({ operator, onClose, onSubmit, error, submitting }: {
  operator: EventOperator
  onClose: () => void
  onSubmit: (assignments: OperatorAssignmentInput[]) => void
  error: string
  submitting: boolean
}) {
  const [selected, setSelected] = useState<SelectedMap>(() => toSelected(operator.assignments))

  return (
    <Modal open onClose={onClose} title={`Asignar eventos · ${operator.firstName} ${operator.lastName}`} className="sm:max-w-lg">
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Eventos</label>
          <EventAssignmentEditor value={selected} onChange={setSelected} />
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-700" loading={submitting} onClick={() => onSubmit(toInputs(selected))}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
