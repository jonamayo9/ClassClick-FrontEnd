import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { ActionMenu } from '@/components/ui/action-menu'
import { StudentDetailModal } from '../components/StudentDetailModal'
import { fmtDate, EducativaStudentListItem, EducativaFinancialPage, EducativaCommission } from '../types'

interface StudentRow extends EducativaStudentListItem {}

interface StudentForm {
  firstName: string
  lastName: string
  email: string
  password?: string
  dni?: string
  phone?: string
  whatsAppNumber?: string
  dateOfBirth?: string
  country?: string
  province?: string
}

function AlumnosInner() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const slug = companySlug ?? ''
  const toast = useToast()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [regFilter, setRegFilter] = useState('')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StudentRow | null>(null)
  const [form, setForm] = useState<StudentForm>({ firstName: '', lastName: '', email: '', password: '', dni: '', phone: '', whatsAppNumber: '', dateOfBirth: '', country: '', province: '' })
  const [saving, setSaving] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; enrolled: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [enrollTarget, setEnrollTarget] = useState<StudentRow | null>(null)
  const [enrollCommissionId, setEnrollCommissionId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<StudentRow | null>(null)
  const [toggling, setToggling] = useState(false)
  const [detailStudent, setDetailStudent] = useState<StudentRow | null>(null)

  const params = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (search) params.set('search', search)

  const query = useQuery({
    queryKey: ['educativa-alumnos', slug, search, page],
    queryFn: () => apiService.get<EducativaFinancialPage<StudentRow>>(`/api/educativa/${slug}/students?${params}`),
    enabled: !!slug,
    retry: false,
    placeholderData: (prev) => prev,
  })
  const rawStudents = query.data?.items ?? []
  const students = rawStudents.filter((s) => !regFilter || (regFilter === 'true' ? s.registrationCompleted : !s.registrationCompleted))
  const total = query.data?.total ?? 0
  const secondaryActiveCount = regFilter ? 1 : 0
  const resetFilters = () => { setRegFilter(''); setSearch(''); setSearchInput(''); setPage(1) }

  const commissionsQ = useQuery({
    queryKey: ['educativa-commissions', slug],
    queryFn: () => apiService.get<EducativaCommission[]>(`/api/educativa/${slug}/commissions`),
    enabled: !!slug,
    retry: false,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['educativa-alumnos', slug] })

  const openCreate = () => {
    setEditing(null)
    setForm({ firstName: '', lastName: '', email: '', password: '', dni: '', phone: '', whatsAppNumber: '', dateOfBirth: '', country: '', province: '' })
    setShowForm(false)
    nameRef.current?.focus()
  }

  const openEdit = (s: StudentRow) => {
    setEditing(s)
    setForm({
      firstName: s.firstName, lastName: s.lastName, email: s.email, dni: s.dni ?? '',
      phone: s.phone ?? '', whatsAppNumber: s.whatsAppNumber ?? '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '', country: s.country ?? '', province: s.province ?? '',
    })
    setShowForm(true)
  }

  async function save(forceCreate = false) {
    setSaving(true)
    try {
      const payload = {
        firstName: form.firstName, lastName: form.lastName, email: form.email,
        password: form.password || null, dni: form.dni || null, phone: form.phone || null,
        whatsAppNumber: form.whatsAppNumber || null,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
        country: form.country || null, province: form.province || null,
      }
      if (editing && !forceCreate) {
        await apiService.put(`/api/educativa/${slug}/students/${editing.userId}`, payload)
        toast('Alumno actualizado.')
      } else {
        await apiService.post(`/api/educativa/${slug}/students`, payload)
        toast('Alumno creado.')
        setForm({ firstName: '', lastName: '', email: '', password: '', dni: '', phone: '', whatsAppNumber: '', dateOfBirth: '', country: '', province: '' })
      }
      setShowForm(false)
      setEditing(null)
      invalidate()
    } catch (err) {
      toast(getApiError(err) || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function downloadTemplate() {
    const blob = await apiService.getBlob(`/api/educativa/${slug}/students/import-template`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla-importacion-alumnos-educativa.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  async function importFile(f: File) {
    const fd = new FormData(); fd.append('file', f)
    try {
      const res = await apiService.postForm<{ totalRows: number; created: number; enrolled: number; skipped: number; errors: string[] }>(`/api/educativa/${slug}/students/import-excel`, fd)
      setImportResult(res)
      invalidate()
      toast(`Importación: ${res.created} creados, ${res.skipped} omitidos.`)
    } catch (err) {
      setImportResult({ created: 0, enrolled: 0, skipped: 0, errors: [getApiError(err)] })
      toast('Error al importar.', 'error')
    }
  }

  async function enroll() {
    if (!enrollTarget || !enrollCommissionId) return
    setEnrolling(true)
    try {
      await apiService.post(`/api/educativa/${slug}/commissions/${enrollCommissionId}/enrollments`, { userId: enrollTarget.userId })
      toast(`${enrollTarget.fullName} inscripto en la comisión.`)
      setEnrollTarget(null)
      setEnrollCommissionId('')
      qc.invalidateQueries({ queryKey: ['educativa-commissions', slug] })
    } catch (err) {
      toast(getApiError(err) || 'No se pudo inscribir.', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  async function toggleActive() {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await apiService.patch(`/api/educativa/${slug}/students/${toggleTarget.userId}/active`, { isActive: !toggleTarget.isActive })
      toast(toggleTarget.isActive ? `${toggleTarget.fullName} fue desactivado.` : `${toggleTarget.fullName} fue reactivado.`)
      setToggleTarget(null)
      invalidate()
    } catch (err) {
      toast(getApiError(err) || 'No se pudo actualizar el estado.', 'error')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Alumnos</h1>
            <p className="mt-1 text-sm text-blue-200">Alta individual, alta masiva y gestión de alumnos</p>
          </div>
          <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={openCreate}>+ Nuevo alumno</Button>
        </div>
      </div>

      {/* Alta masiva por Excel */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">Nuevo alumno</h2>
        <p className="mb-4 text-sm text-slate-500">Alta inicial — luego completa su perfil desde la app</p>
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <h3 className="text-sm font-bold">Alta masiva por Excel</h3>
          <p className="mt-0.5 text-xs text-slate-500">Cargá varios alumnos desde un archivo .xlsx. Los datos adicionales (teléfono, fecha de nacimiento, país, etc.) se completan desde el perfil del alumno.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>Descargar plantilla</Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Importar Excel</Button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f) }} />
          </div>
          {importResult && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Importación: {importResult.created} creados · {importResult.enrolled} inscriptos · {importResult.skipped} omitidos</p>
              {importResult.errors.map((e, i) => <p key={i} className="mt-1 text-xs text-rose-600 dark:text-rose-400">{e}</p>)}
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save(true) }} autoComplete="off" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nombre *"><Input ref={nameRef} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Apellido *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="DNI *"><Input value={form.dni ?? ''} onChange={(e) => setForm({ ...form, dni: e.target.value })} /></Field>
            <Field label="Email *"><Input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Contraseña *"><Input type="password" autoComplete="new-password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving} className="bg-blue-600 text-white hover:bg-blue-700">Crear alumno</Button>
            <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ firstName: '', lastName: '', email: '', password: '', dni: '', phone: '', whatsAppNumber: '', dateOfBirth: '', country: '', province: '' }) }}>Limpiar</Button>
            <p className="text-xs text-slate-400">El alumno completa el resto de sus datos desde su perfil.</p>
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black">Listado</h2>
            <span className="text-xs text-slate-400">({total} alumnos)</span>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input placeholder="Buscar nombre, DNI o email..." autoComplete="off" className="sm:max-w-xs"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput) } }} />
          <Button variant="outline" onClick={() => { setPage(1); setSearch(searchInput) }}>Buscar</Button>
          <Button variant="outline" size="sm" className="inline-flex items-center gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros{secondaryActiveCount > 0 ? ` (${secondaryActiveCount})` : ''}
          </Button>
        </div>

        {filtersOpen && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={regFilter} onChange={(e) => { setRegFilter(e.target.value); setPage(1) }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="">Todos los registros</option>
                <option value="true">Registrados</option>
                <option value="false">Pendientes</option>
              </Select>
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar filtros</Button>
            </div>
          </div>
        )}

        {query.isLoading && <div className="flex justify-center py-12 text-slate-400"><Spinner /></div>}
        {!query.isLoading && query.isError && (
          <EmptyState icon="👥" title="No se pudieron cargar los alumnos" description="Intentá nuevamente." />
        )}
        {!query.isLoading && !query.isError && students.length === 0 && (
          <EmptyState icon="👥" title="Sin alumnos" description="Creá alumnos o importá un Excel." />
        )}
        {!query.isLoading && !query.isError && students.length > 0 && (
          <>
            <div className="hidden overflow-x-auto scrollbar-hide md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-3 py-3">Alumno</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">DNI</th>
                    <th className="px-3 py-3">Nacimiento</th>
                    <th className="px-3 py-3 text-center">Registro</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {students.map((s) => (
                    <tr key={s.userId} className="cursor-pointer bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50" onClick={() => setDetailStudent(s)}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{s.fullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{s.email}</td>
                      <td className="px-3 py-3 text-slate-500">{s.dni || '—'}</td>
                      <td className="px-3 py-3 text-slate-500">{s.dateOfBirth ? fmtDate(s.dateOfBirth) : '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${s.registrationCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>{s.registrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${s.isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu actions={[
                          { label: 'Inscribir', onClick: () => { setEnrollTarget(s); setEnrollCommissionId('') } },
                          { label: 'Editar', onClick: () => openEdit(s) },
                          { label: s.isActive ? 'Desactivar' : 'Activar', onClick: () => setToggleTarget(s) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {students.map((s) => (
                <div key={s.userId} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" onClick={() => setDetailStudent(s)}>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.fullName}</div>
                      <div className="truncate text-xs text-slate-400">{s.email}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${s.isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${s.registrationCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>{s.registrationCompleted ? 'Registrado' : 'Pendiente'}</span>
                      <ActionMenu actions={[
                        { label: 'Inscribir', onClick: () => { setEnrollTarget(s); setEnrollCommissionId('') } },
                        { label: 'Editar', onClick: () => openEdit(s) },
                        { label: s.isActive ? 'Desactivar' : 'Activar', onClick: () => setToggleTarget(s) },
                      ]} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Pagination page={page} pageSize={20} totalCount={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <Modal open={!!enrollTarget} onClose={() => setEnrollTarget(null)} title={`Inscribir · ${enrollTarget?.fullName ?? ''}`} className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <Field label="Comisión *">
            <Select value={enrollCommissionId} onChange={(e) => setEnrollCommissionId(e.target.value)}>
              <option value="">Seleccionar comisión…</option>
              {(commissionsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.trainingName} ({c.activeEnrollments}/{c.capacity})</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEnrollTarget(null)}>Cancelar</Button>
            <Button loading={enrolling} className="bg-blue-600 text-white hover:bg-blue-700" onClick={enroll} disabled={!enrollCommissionId}>Inscribir</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!toggleTarget} onClose={() => setToggleTarget(null)} title={toggleTarget?.isActive ? 'Desactivar alumno' : 'Activar alumno'} className="sm:max-w-md">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {toggleTarget?.isActive ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                ¿Desactivar a <strong>{toggleTarget.fullName}</strong>? Perderá el acceso al portal de inmediato. Su
                histórico (inscripciones, pagos, obligaciones, asistencia, certificados y graduación) se conserva intacto
                y podrá reactivarlo cuando lo necesite.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancelar</Button>
                <Button loading={toggling} className="bg-red-600 text-white hover:bg-red-700" onClick={toggleActive}>Desactivar</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                ¿Reactivar a <strong>{toggleTarget?.fullName}</strong>? Recuperará el acceso al portal de inmediato.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancelar</Button>
                <Button loading={toggling} className="bg-blue-600 text-white hover:bg-blue-700" onClick={toggleActive}>Activar</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null) }} title="Editar alumno" className="sm:max-w-xl">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Apellido *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email *"><Input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label={editing ? 'Contraseña (opcional)' : 'Contraseña *'}><Input type="password" autoComplete="new-password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="DNI"><Input value={form.dni ?? ''} onChange={(e) => setForm({ ...form, dni: e.target.value })} /></Field>
            <Field label="Teléfono"><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={form.whatsAppNumber ?? ''} onChange={(e) => setForm({ ...form, whatsAppNumber: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha de nacimiento"><DatePicker value={form.dateOfBirth ?? ''} onChange={(v) => setForm({ ...form, dateOfBirth: v })} variant="birthDate" /></Field>
            <Field label="País"><Input value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
            <Field label="Provincia"><Input value={form.province ?? ''} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button loading={saving} className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => save()}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      <StudentDetailModal
        open={!!detailStudent}
        onClose={() => setDetailStudent(null)}
        slug={slug}
        userId={detailStudent?.userId ?? ''}
        onDataChanged={invalidate}
      />
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-500">{error}</p>}</div>
}

export default function AlumnosPage() { return <ToastProvider><AlumnosInner /></ToastProvider> }