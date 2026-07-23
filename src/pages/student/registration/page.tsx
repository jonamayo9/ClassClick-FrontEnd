import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { PhoneCountrySelect } from '@/components/ui/phone-country-select'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { DatePicker } from '@/components/ui/date-picker'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

interface Guardian { firstName: string; lastName: string; email?: string; phone?: string; whatsApp?: string; documentNumber?: string; relationshipType?: number; canPayCharges?: boolean; isPrimary?: boolean }

const RELATIONSHIP_OPTIONS = [
  { value: 1, label: 'Madre' },
  { value: 2, label: 'Padre' },
  { value: 3, label: 'Tutor' },
  { value: 4, label: 'Otro' },
]

function RegistrationInner() {
  const navigate = useNavigate()
  const toast = useToast()

  // Check registration status
  const { data: status, isLoading: checkLoading } = useQuery({
    queryKey: ['registration-status', slug()],
    queryFn: () => apiService.get<{ registrationCompleted?: boolean }>(`/api/student/${slug()}/registration/status`),
    enabled: !!slug(),
    retry: false,
  })

  useEffect(() => {
    if (status?.registrationCompleted) navigate('/student')
  }, [status, navigate])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dni, setDni] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [address, setAddress] = useState('')
  const [hasInsurance, setHasInsurance] = useState(false)
  const [insName, setInsName] = useState('')
  const [insMember, setInsMember] = useState('')
  const [insPlan, setInsPlan] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [guardians, setGuardians] = useState<Guardian[]>([{ firstName: '', lastName: '' }])

  const [error, setError] = useState('')
  const [whatsAppError, setWhatsAppError] = useState('')

  const completeMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiService.post(`/api/student/${slug()}/registration/complete`, body),
    onSuccess: () => {
      toast('Registro completado correctamente.')
      navigate('/student')
    },
  })

  function updateGuardian(i: number, data: Partial<Guardian>) {
    setGuardians((prev) => prev.map((g, idx) => idx === i ? { ...g, ...data } : g))
  }

  function addGuardian() {
    setGuardians((prev) => [...prev, { firstName: '', lastName: '' }])
  }

  function removeGuardian(i: number) {
    setGuardians((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setWhatsAppError('')

    if (whatsApp.trim() && !isValidPhoneNumber(whatsApp.trim())) {
      setWhatsAppError('Ingresá un número de WhatsApp válido.')
      return
    }

    if (!firstName.trim() || !lastName.trim() || !dni.trim() || !dateOfBirth || !phone.trim() || !address.trim() || !emergencyName.trim() || !emergencyPhone.trim()) {
      setError('Completá todos los campos obligatorios.')
      return
    }
    if (hasInsurance && (!insName.trim() || !insMember.trim())) {
      setError('Completá el nombre y número de afiliado de la obra social.')
      return
    }

    const validGuardians = guardians.filter((g) => g.firstName.trim() && g.lastName.trim()).map((g) => ({
      firstName: g.firstName.trim(),
      lastName: g.lastName.trim(),
      email: g.email?.trim() || null,
      phone: g.phone?.trim() || null,
      whatsAppNumber: g.whatsApp?.trim() || null,
      documentNumber: g.documentNumber?.trim() || null,
      relationshipType: g.relationshipType ?? 0,
      canPayCharges: g.canPayCharges ?? false,
      isPrimary: g.isPrimary ?? false,
    }))

    completeMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dni: dni.trim(),
      dateOfBirth,
      phone: phone.trim(),
      whatsAppNumber: whatsApp.trim() || null,
      address: address.trim(),
      emergencyContactName: emergencyName.trim(),
      emergencyContactPhone: emergencyPhone.trim(),
      hasHealthInsurance: hasInsurance,
      healthInsuranceName: hasInsurance ? insName.trim() || null : null,
      healthInsuranceMemberNumber: hasInsurance ? insMember.trim() || null : null,
      healthInsurancePlan: hasInsurance ? insPlan.trim() || null : null,
      guardians: validGuardians.length > 0 ? validGuardians : undefined,
    })
  }

  if (checkLoading) return <div className="flex items-center justify-center min-h-dvh"><Spinner className="h-8 w-8 text-violet-600" /></div>
  if (status?.registrationCompleted) return null

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-lg">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl text-white shadow-md">
              📋
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Completá tu registro</h1>
            <p className="mt-1 text-sm text-slate-500">Necesitamos algunos datos para activar tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" value={firstName} onChange={setFirstName} required />
              <Field label="Apellido" value={lastName} onChange={setLastName} required />
            </div>

            <Field label="DNI" value={dni} onChange={setDni} required />
            <Field label="Fecha de nacimiento" type="date" value={dateOfBirth} onChange={setDateOfBirth} required />
            <Field label="Teléfono" value={phone} onChange={setPhone} required placeholder="Ej: 11 1234-5678" />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp</label>
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
            </div>
            <Field label="Dirección" value={address} onChange={setAddress} required />

            {/* Health insurance */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <input type="checkbox" checked={hasInsurance} onChange={(e) => { setHasInsurance(e.target.checked); if (!e.target.checked) { setInsName(''); setInsMember(''); setInsPlan('') } }}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tengo obra social / prepaga</span>
              </label>
              {hasInsurance && (
                <div className="mt-3 space-y-3">
                  <Field label="Nombre de obra social" value={insName} onChange={setInsName} />
                  <Field label="N° de afiliado" value={insMember} onChange={setInsMember} />
                  <Field label="Plan" value={insPlan} onChange={setInsPlan} />
                </div>
              )}
            </div>

            {/* Emergency contact */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Contacto de emergencia</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" value={emergencyName} onChange={setEmergencyName} required />
                <Field label="Teléfono" value={emergencyPhone} onChange={setEmergencyPhone} required />
              </div>
            </div>

            {/* Guardians (optional) */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tutores</h3>
                  <p className="text-xs text-slate-400">Opcional — responsables de pago</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addGuardian}>Agregar</Button>
              </div>
              {guardians.map((g, i) => (
                <div key={i} className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tutor {i + 1}</p>
                    {guardians.length > 1 && (
                      <button type="button" onClick={() => removeGuardian(i)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-500">Eliminar</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
                      <Input value={g.firstName} onChange={(e) => updateGuardian(i, { firstName: e.target.value })} placeholder="Nombre" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-400">Apellido</label>
                      <Input value={g.lastName} onChange={(e) => updateGuardian(i, { lastName: e.target.value })} placeholder="Apellido" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input value={g.documentNumber ?? ''} onChange={(e) => updateGuardian(i, { documentNumber: e.target.value })} placeholder="DNI (opcional)" />
                    <Select value={g.relationshipType ?? 0} onChange={(e) => updateGuardian(i, { relationshipType: Number(e.target.value) })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value={0}>Parentesco</option>
                      {RELATIONSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input value={g.email ?? ''} onChange={(e) => updateGuardian(i, { email: e.target.value })} placeholder="Email (opcional)" />
                    <Input value={g.phone ?? ''} onChange={(e) => updateGuardian(i, { phone: e.target.value })} placeholder="Teléfono (opcional)" />
                  </div>
                  <div className="mt-2">
                    <label className="mb-0.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-400">WhatsApp</label>
                    <PhoneInput
                      defaultCountry="AR"
                      international
                      countryCallingCodeEditable={false}
                      countrySelectComponent={PhoneCountrySelect}
                      value={g.whatsApp ?? ''}
                      onChange={(v) => updateGuardian(i, { whatsApp: v ?? '' })}
                      numberInputProps={{ autoComplete: 'tel', placeholder: '11 1234-5678' }}
                      className="flex min-h-11 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-blue-400 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:py-3 [&_.PhoneInputInput]:pr-4 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-slate-900 [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0 dark:[&_.PhoneInputInput]:text-white [&_.PhoneInputInput]:placeholder:text-slate-400 dark:[&_.PhoneInputInput]:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={g.canPayCharges ?? false} onChange={(e) => updateGuardian(i, { canPayCharges: e.target.checked })}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                      Puede pagar
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={g.isPrimary ?? false} onChange={(e) => updateGuardian(i, { isPrimary: e.target.checked })}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                      Principal
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <Button type="submit" loading={completeMutation.isPending} className="w-full bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20">
              Guardar y comenzar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, required, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === 'date'
        ? <DatePicker variant="birthDate" value={value} onChange={onChange} placeholder={placeholder ?? 'Elegir fecha'} yearRange={{ from: 1920, to: new Date().getFullYear() }} />
        : <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} />}
    </div>
  )
}

export default function RegistrationPage() {
  return <ToastProvider><RegistrationInner /></ToastProvider>
}
