import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { apiService } from '@/lib/api'
import { imgUrl } from '@/lib/media'
import { useAuth } from '@/stores/auth'

interface CompanySettings {
  name: string
  description?: string
  slug?: string
  isActive?: boolean
  whatsapp?: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  stateOrProvince?: string
  postalCode?: string
  country?: string
  logoUrl?: string
}

function slug() { return useAuth.getState().activeCompanySlug ?? '' }

function unwrapSettings(raw: unknown): CompanySettings {
  const d = raw as Record<string, unknown>
  const source = (d?.data ?? d?.item ?? d) as Record<string, unknown>
  return {
    name: (source.name ?? '') as string,
    description: (source.description ?? '') as string,
    slug: (source.slug ?? '') as string,
    isActive: (source.isActive ?? true) as boolean,
    whatsapp: (source.whatsapp ?? source.whatsApp ?? '') as string,
    email: (source.email ?? '') as string,
    phone: (source.phone ?? '') as string,
    addressLine1: (source.addressLine1 ?? source.address ?? '') as string,
    addressLine2: (source.addressLine2 ?? '') as string,
    city: (source.city ?? '') as string,
    stateOrProvince: (source.stateOrProvince ?? source.state ?? '') as string,
    postalCode: (source.postalCode ?? source.zipCode ?? '') as string,
    country: (source.country ?? '') as string,
    logoUrl: (source.logoUrl ?? source.logo ?? '') as string,
  }
}

function LogoImg({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false)
  const resolved = src && !failed ? src : null
  if (!resolved) return null
  return <img src={resolved} alt={alt} onError={() => setFailed(true)} className={className} />
}

function CompanyPageInner() {
  const toast = useToast()
  const qc = useQueryClient()
  const activeCompany = useAuth((s) => {
    const slug = s.activeCompanySlug
    return slug ? (s.companies ?? []).find((c) => (c.slug ?? c.companySlug) === slug) ?? null : null
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings', slug()],
    queryFn: () => apiService.get<unknown>(`/api/admin/${slug()}/company-settings`).then(unwrapSettings),
    enabled: !!slug(),
  })

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiService.put(`/api/admin/${slug()}/company-settings`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-settings'] }),
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiService.postForm(`/api/admin/${slug()}/company-settings/logo`, fd)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-settings'] }),
  })

  const [form, setForm] = useState<CompanySettings>({
    name: '', description: '', whatsapp: '', email: '', phone: '',
    addressLine1: '', addressLine2: '', city: '', stateOrProvince: '',
    postalCode: '', country: '', logoUrl: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings])

  const logoUrl = form.logoUrl || activeCompany?.logoUrl || activeCompany?.LogoUrl || ''
  const displayLogo = logoPreview || imgUrl(logoUrl)

  const isSaving = saveMutation.isPending || logoMutation.isPending

  function handleLogoFile(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('La imagen no puede superar los 5 MB.', 'error')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function patch(key: keyof CompanySettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('El nombre de la empresa es obligatorio.')
      return
    }
    try {
      await saveMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        addressLine1: form.addressLine1?.trim() || null,
        addressLine2: form.addressLine2?.trim() || null,
        city: form.city?.trim() || null,
        stateOrProvince: form.stateOrProvince?.trim() || null,
        postalCode: form.postalCode?.trim() || null,
        country: form.country?.trim() || null,
      })

      if (logoFile) {
        await logoMutation.mutateAsync(logoFile)
        setLogoFile(null)
        setLogoPreview(null)
      }

      toast('Datos de la empresa guardados.')
    } catch {
      setError('No se pudieron guardar los datos.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <PageHero
        label="Configuración"
        title="Mi empresa"
        description="Administrá la información de tu institución."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-violet-600" /></div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                {displayLogo ? (
                  <LogoImg src={displayLogo} alt={form.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-slate-500">{form.name?.charAt(0).toUpperCase() ?? 'E'}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{form.name}</p>
                {settings?.slug && <p className="text-xs text-slate-500">Slug: {settings.slug}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre</label>
                <Input value={form.name} onChange={(e) => patch('name', e.target.value)} maxLength={120} placeholder="Nombre de la institución" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
                <Textarea rows={3} value={form.description ?? ''} onChange={(e) => patch('description', e.target.value)} maxLength={1500} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp</label>
                <Input value={form.whatsapp ?? ''} onChange={(e) => patch('whatsapp', e.target.value)} placeholder="Ej: 541123456789" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label>
                <Input type="email" value={form.email ?? ''} onChange={(e) => patch('email', e.target.value)} placeholder="ejemplo@institucion.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Teléfono</label>
                <Input value={form.phone ?? ''} onChange={(e) => patch('phone', e.target.value)} placeholder="Ej: 11 1234-5678" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">País</label>
                <Input value={form.country ?? ''} onChange={(e) => patch('country', e.target.value)} placeholder="Argentina" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Dirección</label>
                <Input value={form.addressLine1 ?? ''} onChange={(e) => patch('addressLine1', e.target.value)} placeholder="Calle y número" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Dirección adicional</label>
                <Input value={form.addressLine2 ?? ''} onChange={(e) => patch('addressLine2', e.target.value)} placeholder="Piso, depto, etc." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Ciudad</label>
                <Input value={form.city ?? ''} onChange={(e) => patch('city', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Provincia / Estado</label>
                <Input value={form.stateOrProvince ?? ''} onChange={(e) => patch('stateOrProvince', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Código postal</label>
                <Input value={form.postalCode ?? ''} onChange={(e) => patch('postalCode', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Logo de la empresa</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleLogoFile(e.target.files)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700 dark:file:text-slate-300"
              />
              {(logoPreview || logoUrl) && (
                <div className="mt-3 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                  <LogoImg
                    src={logoPreview ?? imgUrl(logoUrl)}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {logoFile ? logoFile.name : 'Logo actual'}
                    </p>
                    <p className="text-xs text-slate-400">JPG, PNG o WEBP. Máx 5 MB.</p>
                  </div>
                  {logoPreview && (
                    <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => { setLogoFile(null); setLogoPreview(null) }}>
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSaving} className="bg-violet-600 text-white hover:bg-violet-700">
                Guardar cambios
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}

export default function CompanyPage() {
  return (
    <ToastProvider>
      <CompanyPageInner />
    </ToastProvider>
  )
}
