import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
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
import { PhoneCountrySelect } from '@/components/ui/phone-country-select'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { formatDateOnly } from '@/lib/date'
import { createWhatsAppUrl } from '@/lib/whatsapp'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/stores/theme'
import { BiometricToggle } from '@/components/biometric-toggle'
import { useStudentProfile, useProfilePhotoUrl } from '../student.hooks'
import type { ThemeMode } from '@/types/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface Guardian { id?: string; firstName: string; lastName: string; email?: string; phone?: string; whatsAppNumber?: string; documentNumber?: string; relationshipType?: number; canPayCharges?: boolean; isPrimary?: boolean }

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
  const [whatsApp, setWhatsApp] = useState('')
  const [whatsAppError, setWhatsAppError] = useState('')
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
  const [photoPreviewModal, setPhotoPreviewModal] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

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
      setWhatsApp((profile as any).whatsAppNumber ?? '')
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

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file)
      return apiService.postForm('/api/profile/upload-photo', fd)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-profile'] }); qc.invalidateQueries({ queryKey: ['student-profile-photo'] }); setPhotoPreviewModal(false); toast('Foto actualizada.') },
    onError: () => toast('Error al actualizar la foto.', 'error'),
  })

  const deletePhotoMutation = useMutation({
    mutationFn: () => apiService.del('/api/profile/photo'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-profile'] }); qc.invalidateQueries({ queryKey: ['student-profile-photo'] }); setPhotoPreviewModal(false); toast('Foto eliminada.') },
    onError: () => toast('Error al eliminar la foto.', 'error'),
  })

  const initialValues = useRef<Record<string, unknown>>({})

  function enterEditMode() {
    initialValues.current = {
      firstName, lastName, phone, whatsApp, address, dateOfBirth,
      hasInsurance, insuranceName, insuranceMember, insurancePlan,
      emergencyName, emergencyPhone, notes,
    }
    setWhatsAppError('')
    setEditMode(true)
  }

  function cancelEdit() {
    setFirstName(initialValues.current.firstName as string ?? '')
    setLastName(initialValues.current.lastName as string ?? '')
    setPhone(initialValues.current.phone as string ?? '')
    setWhatsApp(initialValues.current.whatsApp as string ?? '')
    setAddress(initialValues.current.address as string ?? '')
    setDateOfBirth(initialValues.current.dateOfBirth as string ?? '')
    setHasInsurance(initialValues.current.hasInsurance as boolean ?? false)
    setInsuranceName(initialValues.current.insuranceName as string ?? '')
    setInsuranceMember(initialValues.current.insuranceMember as string ?? '')
    setInsurancePlan(initialValues.current.insurancePlan as string ?? '')
    setEmergencyName(initialValues.current.emergencyName as string ?? '')
    setEmergencyPhone(initialValues.current.emergencyPhone as string ?? '')
    setNotes(initialValues.current.notes as string ?? '')
    setWhatsAppError('')
    setEditMode(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setWhatsAppError('')

    if (whatsApp.trim() && !isValidPhoneNumber(whatsApp.trim())) {
      setWhatsAppError('Ingresá un número de WhatsApp válido.')
      return
    }

    const body: Record<string, unknown> = {
      firstName: firstName.trim(), lastName: lastName.trim(),
      phone: phone.trim() || null, whatsAppNumber: whatsApp.trim() || null,
      address: address.trim() || null,
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
          <button type="button" onClick={() => setPhotoPreviewModal(true)}
            className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 shadow-md hover:ring-2 hover:ring-violet-400 transition dark:bg-slate-800">
            {photoUrl ? <img src={photoUrl} className="h-full w-full object-cover" /> : <span className="text-xl font-bold text-slate-400">{initials}</span>}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900 dark:text-white truncate">{name}</p>
            <p className="text-xs text-slate-500">{profile?.email}</p>
            {profile?.dni && <p className="text-xs text-slate-400">DNI: {profile.dni}</p>}
            {profile?.memberNumber && <Badge variant="violet" className="mt-1">N° de carnet: {profile.memberNumber}</Badge>}
          </div>
        </div>
      </Card>

      {/* Personal data */}
      <form onSubmit={handleSave}>
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Datos personales</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={firstName} onChange={setFirstName} disabled={!editMode} />
            <Field label="Apellido" value={lastName} onChange={setLastName} disabled={!editMode} />
            <Field label="Teléfono" value={phone} onChange={setPhone} disabled={!editMode} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp</label>
              {editMode ? (
                <>
                  <PhoneInput
                    defaultCountry="AR"
                    international
                    countryCallingCodeEditable={false}
                    countrySelectComponent={PhoneCountrySelect}
                    value={whatsApp}
                    onChange={(v) => { setWhatsApp(v ?? ''); setWhatsAppError('') }}
                    numberInputProps={{ autoComplete: 'tel', placeholder: '11 1234-5678' }}
                    className="flex min-h-11 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-blue-400 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:py-3 [&_.PhoneInputInput]:pr-4 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-slate-900 [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0 dark:[&_.PhoneInputInput]:text-white [&_.PhoneInputInput]:placeholder:text-slate-400 dark:[&_.PhoneInputInput]:placeholder:text-slate-500"
                  />
                  {whatsAppError && <p className="mt-0.5 text-xs text-red-500">{whatsAppError}</p>}
                </>
              ) : (
                <p className="min-h-11 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {whatsApp || '-'}
                </p>
              )}
            </div>
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
            {editMode ? (
              <>
                <Button type="submit" loading={saveMutation.isPending} className="bg-violet-600 text-white hover:bg-violet-700">
                  Guardar cambios
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={saveMutation.isPending}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button type="button" onClick={enterEditMode} className="bg-violet-600 text-white hover:bg-violet-700">
                Editar perfil
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
            {guardians.map((g) => {
              const waUrl = createWhatsAppUrl(g.whatsAppNumber || null, `Hola ${g.firstName}, te contactamos desde ${(profile as any)?.companyName || 'ClassClick'} por ${firstName}.`)
              return (
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
                    {g.whatsAppNumber && <span className="text-xs text-slate-400">WA: {g.whatsAppNumber}</span>}
                  </div>
                  {waUrl && (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                  )}
                </div>
              )
            })}
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
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp</label>
              <PhoneInput
                defaultCountry="AR"
                international
                countryCallingCodeEditable={false}
                countrySelectComponent={PhoneCountrySelect}
                value={guardianModal.whatsAppNumber ?? ''}
                onChange={(v) => setGuardianModal({ ...guardianModal, whatsAppNumber: v ?? '' })}
                numberInputProps={{ autoComplete: 'tel', placeholder: '11 1234-5678' }}
                className="flex min-h-11 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-blue-400 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:py-3 [&_.PhoneInputInput]:pr-4 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-slate-900 [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0 dark:[&_.PhoneInputInput]:text-white [&_.PhoneInputInput]:placeholder:text-slate-400 dark:[&_.PhoneInputInput]:placeholder:text-slate-500"
              />
            </div>
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

      {/* Photo preview modal */}
      {photoPreviewModal && (
        <Modal open={photoPreviewModal} onClose={() => setPhotoPreviewModal(false)} title="Foto de perfil" className="sm:max-w-sm">
          <div className="p-5 flex flex-col items-center gap-4">
            <div className="h-48 w-48 overflow-hidden rounded-full bg-slate-100 shadow-md dark:bg-slate-800">
              {photoUrl ? <img src={photoUrl} alt="Foto" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-400">{initials}</div>}
            </div>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhotoMutation.mutate(f) }} />
            <div className="flex gap-3 w-full">
              <Button onClick={() => photoInputRef.current?.click()} loading={uploadPhotoMutation.isPending} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
                Cambiar foto
              </Button>
              {photoUrl && (
                <Button onClick={() => deletePhotoMutation.mutate()} loading={deletePhotoMutation.isPending} variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, value, onChange, disabled, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string }) {
  const displayValue = type === 'date' && value ? formatDateOnly(value) : value
  if (disabled) {
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">{displayValue || '-'}</p>
      </div>
    )
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      {type === 'date'
        ? <DatePicker variant="birthDate" value={value} onChange={onChange} placeholder={placeholder ?? 'Elegir fecha'} yearRange={{ from: 1920, to: new Date().getFullYear() }} />
        : <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  )
}
