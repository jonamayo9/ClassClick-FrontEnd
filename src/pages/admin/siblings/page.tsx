import { useState, useRef, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/stores/auth'
import {
  useSearchStudents, useFamilyGroups, useSiblingRequests, useRequestDetail,
  useRequestDocuments, useViewDocument, useLinkStudents, useUnlinkStudent,
  useBreakFamilyGroup, useRequestDocumentsAction, useApproveSiblingRequest,
  useRejectSiblingRequest, useUpdateFamilyGroupBilling, formatDate, formatDateShort,
  getRequestStatusLabel, getRequestStatusBadgeClass, isRequestActionable,
} from './hooks'
import type { SearchStudent, FamilyMember } from './hooks'

export default function SiblingsPage() {
  const companySlug = useAuth((state) => state.activeCompanySlug)
  const [studentA, setStudentA] = useState<SearchStudent | null>(null)
  const [studentB, setStudentB] = useState<SearchStudent | null>(null)
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [showDetailId, setShowDetailId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<{ url: string; fileName: string; isImage: boolean; isPdf: boolean } | null>(null)
  const [showReview, setShowReview] = useState<{ action: 'approve' | 'reject' | 'request-docs'; requestId: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; confirmText: string; onConfirm: () => void } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const toastId = useRef(0)
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current
    setToasts((p) => [...p, { id, message: msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])

  const searchResultsA = useSearchStudents(searchA, null)
  const searchResultsB = useSearchStudents(searchB, studentA?.studentId ?? null)
  const {
    data: allGroups = [],
    refetch: refetchAllGroups,
    isFetching: allGroupsFetching,
    isLoading: allGroupsLoading,
    isError: allGroupsError,
  } = useFamilyGroups(null)
  const groupedStudentIds = new Set(
    allGroups.flatMap(g => g.members.map((m: FamilyMember) => m.studentId)),
  )

  const {
    data: requests = [],
    isLoading: requestsLoading,
    isFetching: requestsFetching,
    isError: requestsError,
    refetch: refetchRequests,
  } = useSiblingRequests('')

  const {
    data: requestDetail,
    isLoading: requestDetailLoading,
    isError: requestDetailError,
    refetch: refetchRequestDetail,
  } = useRequestDetail(showDetailId)
  const {
    data: requestDocuments = [],
    isLoading: requestDocumentsLoading,
    isError: requestDocumentsError,
    refetch: refetchRequestDocuments,
  } = useRequestDocuments(showDetailId)

  const linkMutation = useLinkStudents()
  const unlinkMutation = useUnlinkStudent()
  const breakMutation = useBreakFamilyGroup()
  const updateFamilyBillingMutation = useUpdateFamilyGroupBilling()
  const requestDocsMutation = useRequestDocumentsAction()
  const approveMutation = useApproveSiblingRequest()
  const rejectMutation = useRejectSiblingRequest()
  const viewDocMutation = useViewDocument()
  const previousCompanySlug = useRef(companySlug)

  useEffect(() => {
    if (previousCompanySlug.current === companySlug) return

    previousCompanySlug.current = companySlug
    setStudentA(null)
    setStudentB(null)
    setSearchA('')
    setSearchB('')
    setShowDetailId(null)
    setShowPreview(null)
    setShowReview(null)
    setMessage(null)
  }, [companySlug])

  const selectedFamilyGroup = studentA
    ? allGroups.find((group) => group.members.some((member) => member.studentId === studentA.studentId))
    : undefined
  const currentGroup = selectedFamilyGroup?.members ?? []

  function selectStudentA(student: SearchStudent) {
    setStudentA(student)
    setSearchA(student.fullName)
    setStudentB(null)
    setSearchB('')
    setMessage(null)
  }

  function selectStudentB(student: SearchStudent) {
    setStudentB(student)
    setSearchB(student.fullName)
    setMessage(null)
  }

  function clearSelection() {
    setStudentA(null)
    setStudentB(null)
    setSearchA('')
    setSearchB('')
    setMessage(null)
  }

  function clearSearchA() {
    const val = searchA.trim()
    if (!val || (studentA && val !== studentA.fullName)) {
      setStudentA(null)
      setStudentB(null)
      setSearchB('')
      if (!val) setSearchA('')
    }
  }

  async function handleLink() {
    if (!studentA || !studentB) return
    if (studentA.studentId === studentB.studentId) {
      setMessage({ text: 'No podés vincular el mismo alumno con sí mismo.', type: 'error' })
      return
    }
    try {
      await linkMutation.mutateAsync({ studentId: studentA.studentId, siblingStudentId: studentB.studentId })
      setStudentB(null)
      setSearchB('')
      setMessage({ text: `Hermano agregado correctamente: ${studentB.fullName}.`, type: 'success' })
    } catch (err: any) {
      setMessage({ text: err?.message || 'No se pudo vincular a los alumnos.', type: 'error' })
    }
  }

  async function handleUnlink(studentId: string) {
    const member = currentGroup.find((m) => m.studentId === studentId)
    const memberName = member?.fullName || 'el alumno'

    if (currentGroup.length <= 2) {
      setConfirmAction({
        title: 'Romper grupo',
        message: `Este grupo tiene 2 integrantes. Si quitás a ${memberName}, se rompe el grupo completo. ¿Querés continuar?`,
        confirmText: 'Romper grupo',
        onConfirm: async () => {
          try {
            await breakMutation.mutateAsync(studentA!.studentId)
            toast('Grupo familiar eliminado correctamente.')
            setConfirmAction(null)
          } catch { toast('Error al romper el grupo.', 'error'); setConfirmAction(null) }
        },
      })
      return
    }

    setConfirmAction({
      title: 'Quitar del grupo',
      message: `¿Querés quitar a ${memberName} del grupo familiar?`,
      confirmText: 'Quitar',
      onConfirm: async () => {
        try {
          await unlinkMutation.mutateAsync(studentId)
          toast(`${memberName} fue quitado del grupo familiar.`)
          setConfirmAction(null)
        } catch { toast('Error al quitar del grupo.', 'error'); setConfirmAction(null) }
      },
    })
  }

  async function handleBreakGroup() {
    setConfirmAction({
      title: 'Romper grupo',
      message: 'Se van a desvincular todos los integrantes del grupo. ¿Querés continuar?',
      confirmText: 'Romper grupo',
      onConfirm: async () => {
        try {
          await breakMutation.mutateAsync(studentA!.studentId)
          toast('Grupo familiar eliminado correctamente.')
          setConfirmAction(null)
        } catch { toast('Error al romper el grupo.', 'error'); setConfirmAction(null) }
      },
    })
  }

  async function handleShareCharges(familyGroupId: string, shareCharges: boolean) {
    try {
      await updateFamilyBillingMutation.mutateAsync({ familyGroupId, shareCharges })
      toast(shareCharges
        ? 'Las cuotas ahora se comparten entre los hermanos del grupo.'
        : 'Cada alumno volverá a ver únicamente sus propias cuotas.')
    } catch {
      toast('No se pudo actualizar la configuración de cuotas del grupo.', 'error')
    }
  }

  async function handleRefresh() {
    await Promise.all([
      refetchRequests(),
      refetchAllGroups(),
    ])
  }

  async function handleReview({ action, requestId }: { action: 'approve' | 'reject' | 'request-docs'; requestId: string }) {
    setShowReview({ action, requestId })
  }

  async function handleReviewSubmit(note: string | null) {
    if (!showReview) return
    try {
      if (showReview.action === 'approve') {
        await approveMutation.mutateAsync({ requestId: showReview.requestId, note })
        toast('Solicitud aprobada correctamente.')
      } else if (showReview.action === 'reject') {
        await rejectMutation.mutateAsync({ requestId: showReview.requestId, note })
        toast('Solicitud rechazada correctamente.')
      } else {
        await requestDocsMutation.mutateAsync({ requestId: showReview.requestId, note: note! })
        toast('Se solicitó documentación correctamente.')
      }
      setShowReview(null)
    } catch { toast('Error al procesar la solicitud.', 'error') }
  }

  async function handleViewDocument(documentId: string) {
    if (!showDetailId) return
    const doc = requestDocuments.find((d) => String(d.id) === String(documentId))
    try {
      const result = await viewDocMutation.mutateAsync({ requestId: showDetailId, documentId })
      setShowPreview({
        url: result.url, fileName: doc?.fileName || 'Documento',
        isImage: doc?.isImage ?? false, isPdf: doc?.isPdf ?? false,
      })
    } catch { toast('No se pudo abrir el documento.', 'error') }
  }

  function handleViewGroup(requestedId: string, targetId: string) {
    const studentIdInGroup = groupedStudentIds.has(String(requestedId)) ? requestedId : targetId
    const group = allGroups.find(g => g.members.some(m => String(m.studentId) === String(studentIdInGroup)))
    const member = group?.members.find(m => String(m.studentId) === String(studentIdInGroup)) || group?.members[0]
    if (member) {
      setStudentA({
        studentId: member.studentId,
        fullName: member.fullName,
        email: member.email || '',
        dni: member.dni,
        isActive: member.isActive,
      })
      setSearchA(member.fullName)
      setStudentB(null)
      setSearchB('')
      setMessage(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-indigo-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Hermanos</h1>
            <p className="mt-1 text-sm text-indigo-200 sm:mt-1.5 sm:text-base">Administrá grupos familiares y solicitudes de vinculación</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" className="shadow-lg"
              loading={requestsFetching || allGroupsFetching}
              onClick={() => void handleRefresh()}>
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      {/* VINCULAR HERMANOS */}
      <Card className="p-5 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Vinculación directa</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">El administrador selecciona dos alumnos y los vincula inmediatamente, sin crear una solicitud.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Alumno base</label>
            <SearchInput value={searchA} onChange={(v) => { setSearchA(v); if (!v.trim()) { setStudentA(null); setStudentB(null); setSearchB('') } }}
              onSelect={selectStudentA} results={searchResultsA.data ?? []} selected={studentA}
              onBlur={clearSearchA} placeholder="Buscar por DNI, mail o nombre" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Agregar al grupo</label>
            <SearchInput value={searchB} onChange={setSearchB}
              onSelect={selectStudentB} results={searchResultsB.data ?? []} selected={studentB}
              onBlur={() => { const v = searchB.trim(); if (!v || (studentB && v !== studentB.fullName)) { setStudentB(null); if (!v) setSearchB('') } }}
              placeholder="Buscar por DNI, mail o nombre" disabled={!studentA} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!studentA || !studentB || linkMutation.isPending}
            loading={linkMutation.isPending} onClick={handleLink}>
            Agregar hermano
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>Limpiar selección</Button>
        </div>

        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
              : message.type === 'error'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {message.text}
          </div>
        )}
      </Card>

      {/* GRUPO FAMILIAR */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Grupos familiares vinculados</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Todos los grupos activos de la empresa permanecen visibles.</p>
          </div>
          {studentA && currentGroup.length > 0 && (
            <Button variant="outline" size="sm" className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              onClick={handleBreakGroup}>Romper grupo</Button>
          )}
        </div>

        {allGroupsLoading && (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        )}

        {allGroupsError && (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <span>No se pudieron cargar los grupos familiares.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleRefresh()}>
              Reintentar
            </Button>
          </div>
        )}

        {!allGroupsLoading && !allGroupsError && !allGroups.length && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No hay grupos familiares asignados en esta empresa.</p>
        )}

        {!allGroupsLoading && !allGroupsError && studentA && !currentGroup.length && allGroups.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            El alumno seleccionado todavía no pertenece a un grupo. Los grupos existentes se muestran debajo.
          </div>
        )}

        {allGroups.length > 0 && (
          <div className="space-y-4">
            {allGroups.map((group, groupIndex) => {
              const isSelectedGroup = selectedFamilyGroup?.familyGroupId === group.familyGroupId
              return (
              <section key={group.familyGroupId}
                className={`overflow-hidden rounded-lg border ${
                  isSelectedGroup
                    ? 'border-indigo-400 ring-2 ring-indigo-100 dark:border-indigo-500 dark:ring-indigo-950'
                    : 'border-slate-200 dark:border-slate-700'
                }`}>
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Grupo familiar #{groupIndex + 1}
                      {isSelectedGroup ? <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">Seleccionado</span> : null}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {group.members.length} integrantes. Las cuotas no se duplican.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={group.shareCharges}
                      disabled={updateFamilyBillingMutation.isPending}
                      onChange={(event) => handleShareCharges(group.familyGroupId, event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">Compartir cuotas</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">Todos podrán ver y pagar las cuotas del grupo.</span>
                    </span>
                  </label>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.members.map((member) => {
                    const isBase = Boolean(studentA && member.studentId === studentA.studentId)
                    return (
                      <div key={member.studentId} className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center ${isBase ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            {member.fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('') || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{member.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              DNI {member.dni || '-'} {isBase ? ' · Alumno base' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className={member.isActive ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-400' : 'text-xs font-semibold text-rose-600 dark:text-rose-400'}>
                            {member.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                          {studentA && !isBase && (
                            <Button variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              onClick={() => handleUnlink(member.studentId)}>Quitar</Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )})}
          </div>
        )}
      </Card>

      {/* SOLICITUDES */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Solicitudes enviadas por alumnos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Estas solicitudes sí requieren revisión, aprobación o rechazo del administrador.</p>
        </div>

        {requestsLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {!requestsLoading && requests.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No hay solicitudes para mostrar.</p>
        )}

        {requestsError && (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <span>No se pudieron cargar las solicitudes.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchRequests()}>
              Reintentar
            </Button>
          </div>
        )}

        {requests.length > 0 && (
          <>
          <div className="space-y-3 sm:hidden">
            {requests.map((req) => {
              const canAct = isRequestActionable(req.status)
              const belongsToGroup =
                groupedStudentIds.has(String(req.requestedByStudentId)) ||
                groupedStudentIds.has(String(req.targetStudentId))

              return (
                <article key={req.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Solicitud de alumno</p>
                      <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{req.requestedByStudentFullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Vincular con {req.targetStudentFullName}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getRequestStatusBadgeClass(req.status)}`}>
                      {getRequestStatusLabel(req.status)}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{formatDateShort(req.createdAtUtc)}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowDetailId(req.id)}>
                      Ver detalle
                    </Button>
                    {belongsToGroup && (
                      <Button type="button" variant="outline" size="sm"
                        className="border-indigo-200 text-indigo-700 dark:border-indigo-900/50 dark:text-indigo-400"
                        onClick={() => handleViewGroup(req.requestedByStudentId, req.targetStudentId)}>
                        Ver grupo
                      </Button>
                    )}
                    {canAct && (
                      <>
                        <Button type="button" variant="outline" size="sm"
                          className="border-orange-200 text-orange-700 dark:border-orange-900/50 dark:text-orange-400"
                          onClick={() => handleReview({ action: 'request-docs', requestId: req.id })}>
                          Pedir documentación
                        </Button>
                        <Button type="button" variant="outline" size="sm"
                          className="border-rose-200 text-rose-600 dark:border-rose-900/50 dark:text-rose-400"
                          onClick={() => handleReview({ action: 'reject', requestId: req.id })}>
                          Rechazar
                        </Button>
                        <Button type="button" size="sm"
                          className="col-span-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => handleReview({ action: 'approve', requestId: req.id })}>
                          Aprobar solicitud
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-slate-200 sm:block dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Solicita</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req, i) => {
                  const bg = i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                  const canAct = isRequestActionable(req.status)
                  return (
                    <tr key={req.id} className={bg}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{req.requestedByStudentFullName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{req.requestedByDni || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{req.targetStudentFullName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{req.targetDni || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getRequestStatusBadgeClass(req.status)}`}>
                          {getRequestStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 dark:text-slate-400 sm:table-cell">
                        {formatDateShort(req.createdAtUtc)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5"
                            onClick={() => setShowDetailId(req.id)}>Ver detalle</Button>
                          {(groupedStudentIds.has(String(req.requestedByStudentId)) ||
                            groupedStudentIds.has(String(req.targetStudentId))) && (
                            <Button variant="outline" size="sm"
                              className="text-[11px] px-2.5 py-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                              onClick={() => handleViewGroup(req.requestedByStudentId, req.targetStudentId)}>
                              Ver grupo
                            </Button>
                          )}
                          {canAct && (
                            <>
                              <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                                onClick={() => handleReview({ action: 'request-docs', requestId: req.id })}>Pedir docs</Button>
                              <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                onClick={() => handleReview({ action: 'approve', requestId: req.id })}>Aprobar</Button>
                              <Button variant="outline" size="sm" className="text-[11px] px-2.5 py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                onClick={() => handleReview({ action: 'reject', requestId: req.id })}>Rechazar</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {/* MODALS */}
      {showDetailId && (
        <RequestDetailModal request={requestDetail ?? null}
          documents={requestDocuments} onViewDocument={handleViewDocument}
          isViewingDocument={viewDocMutation.isPending}
          detailLoading={requestDetailLoading}
          detailError={requestDetailError}
          documentsLoading={requestDocumentsLoading}
          documentsError={requestDocumentsError}
          onRetry={() => {
            void Promise.all([refetchRequestDetail(), refetchRequestDocuments()])
          }}
          onReview={(action) => handleReview({ action, requestId: showDetailId })}
          onClose={() => { setShowDetailId(null) }} />
      )}

      {showPreview && (
        <DocumentPreviewModal url={showPreview.url} fileName={showPreview.fileName}
          isImage={showPreview.isImage} isPdf={showPreview.isPdf}
          onClose={() => setShowPreview(null)} />
      )}

      {showReview && (
        <ReviewModal action={showReview.action}
          isPending={approveMutation.isPending || rejectMutation.isPending || requestDocsMutation.isPending}
          onSubmit={handleReviewSubmit} onClose={() => setShowReview(null)} />
      )}

      {confirmAction && (
        <ConfirmModal title={confirmAction.title} message={confirmAction.message}
          confirmText={confirmAction.confirmText} onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)} />
      )}

      {/* TOASTS */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:right-4 sm:left-auto sm:top-4 sm:bottom-auto sm:items-end sm:p-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── SearchInput ─── */
function SearchInput({ value, onChange, onSelect, results, selected, onBlur, placeholder, disabled }: {
  value: string; onChange: (v: string) => void
  onSelect: (s: SearchStudent) => void
  results: SearchStudent[]; selected: SearchStudent | null
  onBlur?: () => void; placeholder?: string; disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)

  function handleBlur() {
    setTimeout(() => {
      setFocused(false)
      onBlur?.()
    }, 200)
  }

  return (
    <div className="relative">
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={handleBlur}
        placeholder={placeholder} disabled={disabled} />
      {selected && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{selected.fullName}</p>
          <p className="text-xs text-slate-500">{selected.dni || '-'}{selected.email ? ` · ${selected.email}` : ''}</p>
        </div>
      )}
      {focused && !selected && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {results.map((r) => (
            <button key={r.studentId} type="button"
              onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect(r)}
              className="flex w-full flex-col border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700">
              <span className="text-sm font-medium text-slate-900 dark:text-white">{r.fullName}</span>
              <span className="text-xs text-slate-500">{r.dni || '-'}{r.email ? ` · ${r.email}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── RequestDetailModal ─── */
function RequestDetailModal({
  request,
  documents,
  onViewDocument,
  isViewingDocument,
  detailLoading,
  detailError,
  documentsLoading,
  documentsError,
  onRetry,
  onReview,
  onClose,
}: {
  request: import('./hooks').RequestDetail | null; documents: import('./hooks').RequestDocument[]
  onViewDocument: (id: string) => void
  isViewingDocument: boolean
  detailLoading: boolean
  detailError: boolean
  documentsLoading: boolean
  documentsError: boolean
  onRetry: () => void
  onReview: (action: 'approve' | 'reject' | 'request-docs') => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:h-auto sm:min-h-[620px] sm:max-h-[88vh] sm:max-w-3xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Detalle de solicitud</h2>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Revisá participantes, notas y documentación adjunta.</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-5">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-8 w-8 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cargando solicitud...</p>
              </div>
            </div>
          ) : detailError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">No se pudo cargar el detalle de la solicitud.</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
            </div>
          ) : !request ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              La solicitud no está disponible.
            </div>
          ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Solicita</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{request.requestedByStudentFullName || '-'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">DNI: {request.requestedByDni || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Destino</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{request.targetStudentFullName || '-'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">DNI: {request.targetDni || '-'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Estado</p>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getRequestStatusBadgeClass(request.status)}`}>
                {getRequestStatusLabel(request.status)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Creada</p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatDate(request.createdAtUtc)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Revisada</p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatDate(request.reviewedAtUtc)}</p>
            </div>
          </div>

          {request.note && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nota original</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{request.note}</p>
            </div>
          )}

          {request.documentsRequestNote && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">Documentación solicitada</p>
              <p className="mt-2 text-sm text-orange-800 dark:text-orange-300">{request.documentsRequestNote}</p>
            </div>
          )}

          {request.adminReviewNote && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nota del administrador</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{request.adminReviewNote}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Documentos adjuntos</p>
              <p className="text-xs text-slate-400">{documents.length} archivo(s)</p>
            </div>
            {documentsLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-400">
                Cargando documentación...
              </div>
            ) : documentsError ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
                <p className="text-sm text-rose-700 dark:text-rose-300">No se pudo cargar la documentación.</p>
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-500">
                No hay documentación cargada.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{doc.fileName || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.isPdf ? 'PDF' : doc.isImage ? 'Imagen' : 'Archivo'} · {formatDateShort(doc.uploadedAtUtc)}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" loading={isViewingDocument} onClick={() => onViewDocument(doc.id)}>Ver</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}
        </div>
        {request && isRequestActionable(request.status) && (
          <div className="grid grid-cols-1 gap-2 border-t border-slate-200 px-5 py-4 sm:grid-cols-3 sm:px-6 dark:border-slate-700">
            <Button type="button" variant="outline" size="sm"
              className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-950/30"
              onClick={() => onReview('request-docs')}>
              Pedir documentación
            </Button>
            <Button type="button" variant="outline" size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              onClick={() => onReview('reject')}>
              Rechazar
            </Button>
            <Button type="button" size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onReview('approve')}>
              Aprobar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── DocumentPreviewModal ─── */
function DocumentPreviewModal({ url, fileName, isImage, isPdf, onClose }: {
  url: string; fileName: string; isImage: boolean; isPdf: boolean; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{fileName}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" download
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Descargar</a>
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {isPdf ? (
            <iframe src={url} className="h-[60vh] w-full rounded-xl border border-slate-200 dark:border-slate-700" title={fileName} />
          ) : isImage ? (
            <div className="flex max-h-[60vh] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <img src={url} alt={fileName} className="max-h-[55vh] w-auto max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay vista previa disponible.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" download
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600">Descargar archivo</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── ReviewModal ─── */
function ReviewModal({ action, isPending, onSubmit, onClose }: {
  action: 'approve' | 'reject' | 'request-docs'; isPending: boolean
  onSubmit: (note: string | null) => void; onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const titles = { approve: 'Aprobar solicitud', reject: 'Rechazar solicitud', 'request-docs': 'Solicitar documentación' }
  const descriptions = {
    approve: 'Podés dejar una nota opcional para registrar la aprobación.',
    reject: 'Podés dejar una nota explicando el rechazo.',
    'request-docs': 'Indicá qué documentación debe presentar el alumno.',
  }
  const confirmTexts = { approve: 'Aprobar', reject: 'Rechazar', 'request-docs': 'Solicitar documentación' }
  const confirmColors = {
    approve: 'bg-emerald-600 text-white hover:bg-emerald-700',
    reject: 'bg-rose-600 text-white hover:bg-rose-700',
    'request-docs': 'bg-orange-600 text-white hover:bg-orange-700',
  }
  const requireNote = action === 'request-docs'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (requireNote && !note.trim()) { setError('Debés completar una nota.'); return }
    onSubmit(note.trim() || null)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full animate-slide-up rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{titles[action]}</h2>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">{descriptions[action]}</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 sm:px-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nota</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
              placeholder={action === 'request-docs' ? 'Describí qué documentación se necesita...' : 'Opcional'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" size="sm" loading={isPending} className={confirmColors[action]}>{confirmTexts[action]}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── ConfirmModal ─── */
function ConfirmModal({ title, message, confirmText, onConfirm, onClose }: {
  title: string; message: string; confirmText: string; onConfirm: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full animate-slide-up rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}
