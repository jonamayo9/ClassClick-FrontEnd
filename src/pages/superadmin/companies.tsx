import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { apiService } from '@/lib/api'

interface Company { id: string; name: string; slug: string; email?: string; phone?: string; whatsapp?: string; description?: string; addressLine1?: string; addressLine2?: string; city?: string; stateOrProvince?: string; postalCode?: string; country?: string; isActive: boolean; isMatchOrganizationEnabled?: boolean; emailNotificationsEnabled?: boolean; companySlugLanding?: string; createdAtUtc: string }

function CompaniesInner() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: () => apiService.get<Company[]>('/api/superadmin/companies'),
  })

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', description: '', email: '', phone: '', whatsapp: '',
    addressLine1: '', addressLine2: '', city: '', stateOrProvince: '', postalCode: '', country: '',
    isMatchOrganizationEnabled: false, isActive: true, emailNotificationsEnabled: false,
    companySlugLanding: '',
  })
  const [modules, setModules] = useState<Record<string, boolean>>({
    payments: true, documents: true, news: true, sponsors: false,
    matches: false, clothing: false, tournaments: false, notifications: true,
  })
  const [clothing, setClothing] = useState({ manualProof: true, mercadoPago: false, alias: '', aliasHolder: '' })
  const [paymentMethods, setPaymentMethods] = useState<Record<string, { enabled: boolean; autoCollection: boolean }>>({
    Transfer: { enabled: false, autoCollection: false },
    DebitCard: { enabled: false, autoCollection: false },
    CreditCard: { enabled: false, autoCollection: false },
    MercadoPago: { enabled: false, autoCollection: false },
    Cash: { enabled: false, autoCollection: false },
  })
  const [detailTarget, setDetailTarget] = useState<Company | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Company | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)

  // Slug validation for landing page
  const [slugStatus, setSlugStatus] = useState<'idle' | 'invalid' | 'checking' | 'available' | 'unavailable'>('idle')
  const [slugMsg, setSlugMsg] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const originalSlug = useRef('')

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugStatus('idle'); setSlugMsg(''); return }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setSlugStatus('invalid'); setSlugMsg('Usá letras minúsculas, números y guiones.'); return }
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSlugStatus('checking')
    try {
      const res = await apiService.get<any>(`/api/superadmin/companies/landing-slug-availability?landingSlug=${slug}&excludeCompanyId=${editId ?? ''}`)
      if (controller.signal.aborted) return
      if (res.available) { setSlugStatus('available'); setSlugMsg('Dirección disponible') }
      else { setSlugStatus('unavailable'); setSlugMsg('Esta dirección ya está siendo utilizada.') }
    } catch { if (!controller.signal.aborted) { setSlugStatus('idle'); setSlugMsg('') } }
  }, [editId])

  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function buildPayload() {
    const p: Record<string, unknown> = { ...form, isMatchOrganizationEnabled: form.isMatchOrganizationEnabled }
    // Send null for empty optional strings to avoid [EmailAddress] validation errors
    for (const key of ['email', 'phone', 'whatsapp', 'description', 'addressLine1', 'addressLine2', 'city', 'stateOrProvince', 'postalCode', 'country']) {
      if (p[key] === '') p[key] = null
    }
    return p
  }

  const createMutation = useMutation({
    mutationFn: () => apiService.post('/api/superadmin/companies', buildPayload()),
    onSuccess: async (data: unknown) => {
      const companyId = (data as Record<string, unknown>)?.id as string
      // Save modules
      await apiService.put(`/api/superadmin/companies/${companyId}/clothing/modules`, { modules })
      // Save clothing settings
      await apiService.put(`/api/superadmin/companies/${companyId}/clothing/settings`, {
        allowsManualProof: clothing.manualProof, allowsMercadoPago: clothing.mercadoPago,
        paymentAlias: clothing.alias || null, paymentAliasHolder: clothing.aliasHolder || null,
      })
      // Save payment methods
      const pmValues: Record<string, number> = { Transfer: 1, DebitCard: 2, CreditCard: 3, MercadoPago: 4, Cash: 5 }
      const pmList = Object.entries(paymentMethods).map(([key, val]) => ({
        paymentMethod: pmValues[key] ?? 0,
        enabledBySuperAdmin: val.enabled,
        autoCollectionEnabledBySuperAdmin: val.autoCollection,
      }))
      await apiService.put(`/api/superadmin/companies/${companyId}/payment-methods`, pmList)
      // Upload logo if selected
      if (logoFile) {
        const fd = new FormData(); fd.append('file', logoFile)
        await apiService.postForm(`/api/superadmin/companies/${companyId}/logo`, fd)
      }
      qc.invalidateQueries({ queryKey: ['superadmin-companies'] }); closeForm(); toast('Empresa creada.')
    },
    onError: () => toast('Error al crear.', 'error'),
  })
  const updateMutation = useMutation({
    mutationFn: () => apiService.put(`/api/superadmin/companies/${editId}`, { ...buildPayload(), isActive: form.isActive }),
    onSuccess: async () => {
      if (editId) {
        await apiService.put(`/api/superadmin/companies/${editId}/clothing/modules`, { modules })
        await apiService.put(`/api/superadmin/companies/${editId}/clothing/settings`, {
          allowsManualProof: clothing.manualProof, allowsMercadoPago: clothing.mercadoPago,
          paymentAlias: clothing.alias, paymentAliasHolder: clothing.aliasHolder,
        })
        const pmValues: Record<string, number> = { Transfer: 1, DebitCard: 2, CreditCard: 3, MercadoPago: 4, Cash: 5 }
        const pmList = Object.entries(paymentMethods).map(([key, val]) => ({
          paymentMethod: pmValues[key] ?? 0,
          enabledBySuperAdmin: val.enabled,
          autoCollectionEnabledBySuperAdmin: val.autoCollection,
        }))
        await apiService.put(`/api/superadmin/companies/${editId}/payment-methods`, pmList)
        if (logoFile) {
          const fd = new FormData(); fd.append('file', logoFile)
          await apiService.postForm(`/api/superadmin/companies/${editId}/logo`, fd)
        }
      }
      qc.invalidateQueries({ queryKey: ['superadmin-companies'] }); closeForm(); toast('Empresa actualizada.')
    },
    onError: () => toast('Error al actualizar.', 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.del(`/api/superadmin/companies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin-companies'] }); setDeleteTarget(null); toast('Empresa eliminada.') },
    onError: () => toast('Error al eliminar.', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiService.post(`/api/superadmin/companies/${id}/status`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin-companies'] }); setToggleTarget(null); toast('Estado actualizado.') },
    onError: () => toast('Error al cambiar estado.', 'error'),
  })

  function closeForm() { setShowForm(false); setEditId(null); setSlugTouched(false); setLogoFile(null); setLogoPreview(null) }
  function resetForm() {
    setForm({ name: '', slug: '', description: '', email: '', phone: '', whatsapp: '', addressLine1: '', addressLine2: '', city: '', stateOrProvince: '', postalCode: '', country: '', isMatchOrganizationEnabled: false, isActive: true, emailNotificationsEnabled: false, companySlugLanding: '' })
    setModules({ payments: true, documents: true, news: true, sponsors: false, matches: false, clothing: false, tournaments: false, notifications: true })
    setClothing({ manualProof: true, mercadoPago: false, alias: '', aliasHolder: '' })
    setPaymentMethods({
      Transfer: { enabled: false, autoCollection: false },
      DebitCard: { enabled: false, autoCollection: false },
      CreditCard: { enabled: false, autoCollection: false },
      MercadoPago: { enabled: false, autoCollection: false },
      Cash: { enabled: false, autoCollection: false },
    })
    setSlugTouched(false); setLogoFile(null); setLogoPreview(null)
  }

  function openEdit(c: Company) {
    setEditId(c.id)
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', email: c.email ?? '', phone: c.phone ?? '', whatsapp: c.whatsapp ?? '', addressLine1: c.addressLine1 ?? '', addressLine2: c.addressLine2 ?? '', city: c.city ?? '', stateOrProvince: c.stateOrProvince ?? '', postalCode: c.postalCode ?? '', country: c.country ?? '', isMatchOrganizationEnabled: c.isMatchOrganizationEnabled ?? false, isActive: c.isActive, emailNotificationsEnabled: c.emailNotificationsEnabled ?? false, companySlugLanding: c.companySlugLanding ?? '' })
    setShowForm(true)
    // Load existing payment methods
    apiService.get<{ paymentMethod: string | number; enabledBySuperAdmin: boolean }[]>(`/api/superadmin/companies/${c.id}/payment-methods`).then((pms) => {
      const nameMap: Record<string, string> = { 'Transfer': 'Transfer', 'DebitCard': 'DebitCard', 'CreditCard': 'CreditCard', 'MercadoPago': 'MercadoPago', 'Cash': 'Cash' }
      const intMap: Record<number, string> = { 1: 'Transfer', 2: 'DebitCard', 3: 'CreditCard', 4: 'MercadoPago', 5: 'Cash' }
      setPaymentMethods((prev) => {
        const updated = { ...prev }
        for (const pm of pms) {
          const key = typeof pm.paymentMethod === 'string' ? nameMap[pm.paymentMethod] : intMap[pm.paymentMethod]
          if (key) updated[key] = { ...updated[key], enabled: pm.enabledBySuperAdmin }
        }
        return updated
      })
    }).catch(() => {})
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({ ...prev, name }))
    if (!slugTouched && !editId) {
      const slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      setForm((prev) => ({ ...prev, slug }))
    }
  }

  function handleSlugChange(slug: string) {
    setSlugTouched(true)
    const clean = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
    setForm((prev) => ({ ...prev, slug: clean }))
  }

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8 text-slate-600" /></div>

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Empresas</h1>
        <p className="mt-1 text-sm text-slate-400">Gestión de empresas registradas</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Listado</h2>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} className="bg-slate-800 text-white hover:bg-slate-700">Nueva empresa</Button>
        </div>
        {companies.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin empresas registradas.</p>
        ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((c) => (
                <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setDetailTarget(c)}>Ver detalle</Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => setToggleTarget(c)}>
                      {c.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => setDeleteTarget(c)}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
        )}
      </Card>

      {showForm && (
        <Modal open={true} onClose={closeForm} title={editId ? 'Editar empresa' : 'Nueva empresa'} className="sm:max-w-2xl">
          <div className="px-5 py-4 sm:px-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre *</label><Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Slug *</label><Input value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} /></div>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Teléfono</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp</label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">País</label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Dirección</label><Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Dirección 2</label><Input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Ciudad</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Provincia / Estado</label><Input value={form.stateOrProvince} onChange={(e) => setForm({ ...form, stateOrProvince: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Código postal</label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
            </div>
            {editId && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Estado</label>
                <Select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </Select>
              </div>
            )}
            {editId && (
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={!!(form as any).emailNotificationsEnabled}
                  onChange={(e) => setForm({ ...form, emailNotificationsEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
                Notificaciones por email habilitadas
              </label>
            )}

             {editId && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-sm font-bold mb-3">Presencia Digital</h3>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Dirección de la página pública</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">classclick.com.ar/</span>
                    <Input value={(form as any).companySlugLanding ?? ''} onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+/, '').replace(/-+/g, '-')
                      setForm({ ...form, companySlugLanding: val })
                      clearTimeout(debounceRef.current)
                      if (!val || val.length < 3) { setSlugStatus('idle'); setSlugMsg(''); return }
                      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)) { setSlugStatus('invalid'); setSlugMsg('Usá letras minúsculas, números y guiones.'); return }
                      setSlugStatus('checking')
                      debounceRef.current = setTimeout(() => checkSlug(val), 500)
                    }} onBlur={() => {
                      const val = (form as any).companySlugLanding ?? ''
                      if (val && val.length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)) checkSlug(val)
                    }} placeholder="la-florida-fc" className="font-mono text-sm" />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 min-h-5">
                    {slugStatus === 'checking' && <Spinner className="h-3.5 w-3.5 text-indigo-600" />}
                    {slugStatus === 'available' && <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    {slugStatus === 'unavailable' && <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                    {slugStatus === 'invalid' && <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
                    <span className={`text-xs ${slugStatus === 'available' ? 'text-emerald-600' : slugStatus === 'unavailable' ? 'text-red-600' : slugStatus === 'invalid' ? 'text-amber-600' : 'text-slate-400'}`}>
                      {slugStatus === 'checking' ? 'Comprobando disponibilidad...' : slugMsg || 'Elegí una dirección corta y fácil de compartir.'}
                    </span>
                  </div>
                  {slugStatus === 'available' && (form as any).companySlugLanding && (
                    <p className="mt-0.5 text-xs text-slate-400">Tu página será: /c/{(form as any).companySlugLanding}</p>
                  )}
                </div>
              </div>
            )}

            {/* Logo */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Logo</label>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.svg" onChange={(e) => {
                const f = e.target.files?.[0] ?? null; setLogoFile(f)
                if (f) setLogoPreview(URL.createObjectURL(f)); else setLogoPreview(null)
              }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:file:bg-slate-700" />
              {logoPreview && <img src={logoPreview} alt="Preview" className="mt-2 h-16 w-32 rounded-lg border object-cover" />}
            </div>

            {/* Modules */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-sm font-bold mb-3">Módulos habilitados</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(modules).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={val} onChange={(e) => setModules({ ...modules, [key]: e.target.checked })}
                      className="rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
                    <span className="text-xs font-medium capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clothing settings */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-sm font-bold mb-3">Configuración de indumentaria</h3>
              <p className="text-xs text-slate-400 mb-3">Aplica solo si el módulo de indumentaria está habilitado.</p>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={clothing.manualProof} onChange={(e) => setClothing({ ...clothing, manualProof: e.target.checked })} className="rounded border-slate-300 text-slate-800" /> Comprobantes manuales</label>
                  <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={clothing.mercadoPago} onChange={(e) => setClothing({ ...clothing, mercadoPago: e.target.checked })} className="rounded border-slate-300 text-slate-800" /> MercadoPago</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alias indumentaria</label><Input value={clothing.alias} onChange={(e) => setClothing({ ...clothing, alias: e.target.value })} /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titular / referencia</label><Input value={clothing.aliasHolder} onChange={(e) => setClothing({ ...clothing, aliasHolder: e.target.value })} /></div>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="text-sm font-bold mb-3">Medios de pago habilitados</h3>
              <p className="text-xs text-slate-400 mb-3">Definí qué medios podrá configurar esta empresa.</p>
              <div className="space-y-2">
                {Object.entries(paymentMethods).map(([key, val]) => {
                  const labels: Record<string, string> = { Transfer: 'Transferencia', DebitCard: 'Tarjeta de débito', CreditCard: 'Tarjeta de crédito', MercadoPago: 'Mercado Pago', Cash: 'Efectivo' }
                  return (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                      <div>
                        <p className="text-sm font-medium">{labels[key] || key}</p>
                        <p className="text-xs text-slate-400">{key}</p>
                        {key === 'MercadoPago' && val.enabled && (
                          <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <input type="checkbox" checked={val.autoCollection} onChange={(e) => setPaymentMethods({ ...paymentMethods, [key]: { ...val, autoCollection: e.target.checked } })}
                              className="rounded border-slate-300 text-slate-800" />
                            Permitir cobro automático
                          </label>
                        )}
                      </div>
                      <input type="checkbox" checked={val.enabled} onChange={(e) => setPaymentMethods({ ...paymentMethods, [key]: { ...val, enabled: e.target.checked } })}
                        className="h-5 w-5 rounded border-slate-300 text-slate-800" />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button loading={createMutation.isPending || updateMutation.isPending}
                onClick={() => editId ? updateMutation.mutate() : createMutation.mutate()}
                className="bg-slate-800 text-white hover:bg-slate-700">{editId ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {detailTarget && (
        <Modal open={true} onClose={() => setDetailTarget(null)} title={detailTarget.name} className="sm:max-w-lg">
          <div className="px-5 py-4 sm:px-6 space-y-3">
            <Row label="Slug" value={detailTarget.slug} />
            <Row label="Email" value={detailTarget.email} />
            <Row label="Teléfono" value={detailTarget.phone} />
            <Row label="WhatsApp" value={detailTarget.whatsapp} />
            <Row label="Descripción" value={detailTarget.description} />
            <Row label="Dirección" value={detailTarget.addressLine1} />
            <Row label="Ciudad" value={detailTarget.city} />
            <Row label="Provincia" value={detailTarget.stateOrProvince} />
            <Row label="País" value={detailTarget.country} />
            <Row label="CP" value={detailTarget.postalCode} />
            <Row label="Estado" value={detailTarget.isActive ? 'Activa' : 'Inactiva'} />
          </div>
        </Modal>
      )}

      <ConfirmModal open={!!toggleTarget} onClose={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? 'Desactivar empresa' : 'Activar empresa'}
        message={toggleTarget ? `¿${toggleTarget.isActive ? 'Desactivar' : 'Activar'} ${toggleTarget.name}?` : ''}
        confirmText={toggleTarget?.isActive ? 'Desactivar' : 'Activar'} variant="danger"
        loading={toggleMutation.isPending}
        onConfirm={() => { if (toggleTarget) toggleMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive }) }} />

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Eliminar empresa"
        message={deleteTarget ? `¿Eliminar permanentemente "${deleteTarget.name}"? Se borrarán todos los datos asociados (alumnos, cursos, pagos, etc.). Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar empresa" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800"><span className="text-xs text-slate-500">{label}</span><span className="text-xs font-medium text-right">{value ?? '-'}</span></div>
}

export default function CompaniesPage() { return <ToastProvider><CompaniesInner /></ToastProvider> }
