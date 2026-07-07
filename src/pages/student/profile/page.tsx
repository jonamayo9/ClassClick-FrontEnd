import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DatePicker } from '@/components/ui/date-picker'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/stores/theme'
import { BiometricToggle } from '@/components/biometric-toggle'
import { useStudentProfile, useProfilePhotoUrl } from '../student.hooks'
import type { ThemeMode } from '@/types/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface Guardian { id?: string; firstName: string; lastName: string; email?: string; phone?: string; documentNumber?: string; relationshipType?: number; canPayCharges?: boolean; isPrimary?: boolean }

const relationshipOptions = [
  { value: 1, label: 'Madre' }, { value: 2, label: 'Padre' }, { value: 3, label: 'Tutor' }, { value: 4, label: 'Otro' },
]

export default function StudentProfilePage() {
  return <ToastProvider><ProfilePageInner /></ToastProvider>
}

function ProfilePageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: profile, isLoading } = useStudentProfile()
  const { data: photoView } = useProfilePhotoUrl()
  const { mode, setMode } = useTheme()
  const user = useAuth((s) => s.user)

  const [editMode, setEditMode] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [hasInsurance, setHasInsurance] = useState(false)
  const [insuranceName, setInsuranceName] = useState('')
  const [insuranceMember, setInsuranceMember] = useState('')
  const [insurancePlan, setInsurancePlan] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const { data: guardians = [] } = useQuery({
    queryKey: ['student-guardians', slug()],
    queryFn: () => apiService.get<Guardian[]>(`/api/student/${slug()}/guardians`),
    enabled: !!slug(),
    select: (d: unknown) => { if (Array.isArray(d)) return d as Guardian[]; const r = d as { items?: Guardian[]; data?: Guardian[] }; return r.items ?? r.data ?? [] },
  })
  const [guardianModal, setGuardianModal] = useState<Guardian | null>(null)
  const [deleteGuardianId, setDeleteGuardianId] = useState<string | null>(null)

  const [pwModal, setPwModal] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '')
      setLastName(profile.lastName ?? '')
      setPhone(profile.phone ?? '')
      setAddress((profile as any).address ?? '')
      setDateOfBirth((profile as any).dateOfBirth ?? '')
      setHasInsurance((profile as any).hasHealthInsurance ?? false)
      setInsuranceName((profile as any).healthInsuranceName ?? '')
      setInsuranceMember((profile as any).healthInsuranceMemberNumber ?? '')
      setInsurancePlan((profile as any).healthInsurancePlan ?? '')
      setEmergencyName((profile as any).emergencyContactName ?? '')
      setEmergencyPhone((profile as any).emergencyContactPhone ?? '')
      setNotes((profile as any).notes ?? '')
    }
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiService.put('/api/profile/me', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-profile'] }); toast('Perfil actualizado.'); setEditMode(false) },
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const body: Record<string, unknown> = {
      firstName: firstName.trim(), lastName: lastName.trim(),
      phone: phone.trim() || null, address: address.trim() || null,
      dateOfBirth: dateOfBirth || null,
      hasHealthInsurance: hasInsurance,
      healthInsuranceName: hasInsurance ? insuranceName.trim() || null : null,
      healthInsuranceMemberNumber: hasInsurance ? insuranceMember.trim() || null : null,
      healthInsurancePlan: hasInsurance ? insurancePlan.trim() || null : null,
      emergencyContactName: emergencyName.trim() || null,
      emergencyContactPhone: emergencyPhone.trim() || null,
      notes: notes.trim() || null,
    }
    try {
      await saveMutation.mutateAsync(body)
      if (photoFile) {
        const fd = new FormData(); fd.append('file', photoFile)
        await apiService.postForm('/api/profile/upload-photo', fd)
        qc.invalidateQueries({ queryKey: ['student-profile'] })
        setPhotoPreview(null); setPhotoFile(null)
      }
    } catch { toast('Error al guardar.', 'error') }
  }

  const photoUrl = imgUrl(photoView?.url || profile?.profileImageUrl)
  const name = profile?.fullName || `${firstName} ${lastName}`.trim() || user?.name || 'Alumno'
  const initials = name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'AL'

  async function handleSaveGuardian() {
    if (!guardianModal?.firstName?.trim() || !guardianModal?.lastName?.trim()) { toast('Nombre y apellido obligatorios.', 'error'); return }
    try {
      if (guardianModal.id) { await apiService.put(`/api/student/${slug()}/guardians/${guardianModal.id}`, guardianModal) }
      else { await apiService.post(`/api/student/${slug()}/guardians`, guardianModal) }
      qc.invalidateQueries({ queryKey: ['student-guardians'] }); setGuardianModal(null); toast('Tutor guardado.')
    } catch { toast('Error al guardar tutor.', 'error') }
  }

  async function handleDeleteGuardian(id: string) {
    try { await apiService.del(`/api/student/${slug()}/guardians/${id}`); qc.invalidateQueries({ queryKey: ['student-guardians'] }); toast('Tutor eliminado.') }
    catch { toast('Error al eliminar.', 'error') }
    setDeleteGuardianId(null)
  }

  async function handleChangePassword() {
    if (!pwCurrent || pwNew.length < 6 || pwNew !== pwConfirm) { toast('Verificá los datos.', 'error'); return }
    try { await apiService.post('/api/profile/change-password', { currentPassword: pwCurrent, newPassword: pwNew, confirmNewPassword: pwConfirm }); toast('Contraseña cambiada.'); setPwModal(false); setPwCurrent(''); setPwNew(''); setPwConfirm('') }
    catch { toast('Error al cambiar contraseña.', 'error') }
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-violet-600" /></div>

  const themeIcons: Record<ThemeMode, string> = { light: '☀️', dark: '🌙', system: '💻' }

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        label="Perfil"
        title="Mi perfil"
        description="Tus datos personales, tutores y preferencias."
      />

      {/* Profile photo + name card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 shadow-md dark:bg-slate-800">
            {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" /> : photoUrl ? <img src={photoUrl} className="h-full w-full object-cover" /> : <span className="text-xl font-bold text-slate-400">{initials}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900 dark:text-white truncate">{name}</p>
            <p className="text-xs text-slate-500">{profile?.email}</p>
            {profile?.dni && <p className="text-xs text-slate-400">DNI: {profile.dni}</p>}
            {profile?.memberNumber && <Badge variant="violet" className="mt-1">N° {profile.memberNumber}</Badge>}
          </div>
          <div className="flex flex-col gap-2">
            {!editMode && <Button size="sm" onClick={() => setEditMode(true)} className="bg-violet-600 text-white hover:bg-violet-700">Editar</Button>}
          </div>
        </div>
        {editMode && (
          <input type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700" />
        )}
      </Card>

      {/* Personal data */}
      <form onSubmit={handleSave}>
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Datos personales</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={firstName} onChange={setFirstName} disabled={!editMode} />
            <Field label="Apellido" value={lastName} onChange={setLastName} disabled={!editMode} />
            <Field label="Teléfono" value={phone} onChange={setPhone} disabled={!editMode} />
            <Field label="Dirección" value={address} onChange={setAddress} disabled={!editMode} />
            <Field label="Fecha de nacimiento" type="date" value={dateOfBirth} onChange={setDateOfBirth} disabled={!editMode} />
          </div>

          {editMode && (
            <>
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <input type="checkbox" checked={hasInsurance} onChange={(e) => setHasInsurance(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tengo obra social / prepaga</span>
                </label>
                {hasInsurance && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Nombre" value={insuranceName} onChange={setInsuranceName} disabled={!editMode} />
                    <Field label="N° Afiliado" value={insuranceMember} onChange={setInsuranceMember} disabled={!editMode} />
                    <Field label="Plan" value={insurancePlan} onChange={setInsurancePlan} disabled={!editMode} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Contacto de emergencia" value={emergencyName} onChange={setEmergencyName} placeholder="Nombre" />
                <Field label="Tel. emergencia" value={emergencyPhone} onChange={setEmergencyPhone} placeholder="Teléfono" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Notas</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            {editMode && (
              <Button type="submit" loading={saveMutation.isPending} className="bg-violet-600 text-white hover:bg-violet-700">
                Guardar cambios
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setPwModal(true)}>Cambiar contraseña</Button>
          </div>
        </Card>
      </form>

      {/* Theme */}
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Apariencia</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
            <button key={t} onClick={() => setMode(t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                mode === t ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              }`}>
              <span>{themeIcons[t]}</span>
              {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Sistema'}
            </button>
          ))}
        </div>
      </Card>

      {/* Guardians */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Tutores</h2>
            <p className="text-xs text-slate-400">Responsables de pago autorizados</p>
          </div>
          <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setGuardianModal({ firstName: '', lastName: '' })}>Agregar</Button>
        </div>
        {guardians.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            No hay tutores cargados. Agregá un responsable de pago.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {guardians.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-sm font-bold text-violet-600 dark:from-violet-900/40 dark:to-fuchsia-900/40 dark:text-violet-300">
                      {g.firstName.charAt(0)}{g.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{g.firstName} {g.lastName}</p>
                      <p className="text-xs text-slate-400 truncate">{g.email || g.phone || 'Sin contacto'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setGuardianModal(g)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteGuardianId(g.id!)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-rose-400 hover:bg-rose-50 dark:border-slate-600 dark:hover:bg-rose-950/30">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.relationshipType && <Badge variant="violet">{relationshipOptions.find(o => o.value === g.relationshipType)?.label || 'Otro'}</Badge>}
                  {g.canPayCharges && <Badge variant="success">Puede pagar</Badge>}
                  {g.isPrimary && <Badge variant="info">Principal</Badge>}
                  {g.documentNumber && <Badge variant="default">Doc: {g.documentNumber}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Biometric */}
      <BiometricToggle />

      {/* Guardian modal */}
      {guardianModal && (
        <Modal open={!!guardianModal} onClose={() => setGuardianModal(null)} title={guardianModal.id ? 'Editar tutor' : 'Agregar tutor'} className="sm:max-w-md">
          <div className="space-y-3 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label><Input value={guardianModal.firstName} onChange={(e) => setGuardianModal({ ...guardianModal, firstName: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Apellido</label><Input value={guardianModal.lastName} onChange={(e) => setGuardianModal({ ...guardianModal, lastName: e.target.value })} /></div>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label><Input value={guardianModal.email ?? ''} onChange={(e) => setGuardianModal({ ...guardianModal, email: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Teléfono</label><Input value={guardianModal.phone ?? ''} onChange={(e) => setGuardianModal({ ...guardianModal, phone: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Documento</label><Input value={guardianModal.documentNumber ?? ''} onChange={(e) => setGuardianModal({ ...guardianModal, documentNumber: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Parentesco</label>
              <Select value={String(guardianModal.relationshipType ?? '')} onChange={(e) => setGuardianModal({ ...guardianModal, relationshipType: Number(e.target.value) || undefined })}>
                <option value="">Seleccionar</option>
                {relationshipOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <input type="checkbox" checked={guardianModal.canPayCharges ?? false} onChange={(e) => setGuardianModal({ ...guardianModal, canPayCharges: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Puede pagar cuotas</span>
            </label>
            <div className="flex gap-3">
              <Button onClick={handleSaveGuardian} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">Guardar</Button>
              <Button variant="outline" onClick={() => setGuardianModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal open={!!deleteGuardianId} onClose={() => setDeleteGuardianId(null)} title="Eliminar tutor" message="¿Eliminar este tutor?" onConfirm={() => handleDeleteGuardian(deleteGuardianId!)} />

      {/* Password modal */}
      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Cambiar contraseña" className="sm:max-w-md">
        <div className="space-y-3 p-5">
          <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Contraseña actual" />
          <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Nueva (mín 6 caracteres)" />
          <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Confirmar" />
          <div className="flex gap-3">
            <Button onClick={handleChangePassword} className="bg-violet-600 text-white hover:bg-violet-700">Cambiar</Button>
            <Button variant="outline" onClick={() => setPwModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Field({ label, value, onChange, disabled, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string }) {
  if (disabled) {
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">{value || '-'}</p>
      </div>
    )
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      {type === 'date'
        ? <DatePicker value={value} onChange={onChange} placeholder={placeholder ?? 'Elegir fecha'} />
        : <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  )
}
