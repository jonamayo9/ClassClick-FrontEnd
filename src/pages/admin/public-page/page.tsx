import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ToastProvider } from '@/components/ui/toast'
import { useAuth } from '@/stores/auth'
import { apiService } from '@/lib/api'
import { GalleryCarousel } from '@/components/ui/gallery-carousel'
import { usePublicPage, useUpdatePublicPage, usePublishPage, useUnpublishPage } from '@/hooks/usePublicPage'

const VISUAL_STYLES = [
  { id: 'modern', label: 'Moderno', desc: 'Espacios amplios y limpios' },
  { id: 'classic', label: 'Clásico', desc: 'Diseño institucional' },
  { id: 'sport', label: 'Deportivo', desc: 'Dinámico y energético' },
  { id: 'minimal', label: 'Minimalista', desc: 'Simple, al grano' },
]

const COLOR_PRESETS = [
  { id: 'blue', colors: ['#1e40af', '#3b82f6', '#60a5fa'] },
  { id: 'purple', colors: ['#7c3aed', '#a78bfa', '#c4b5fd'] },
  { id: 'green', colors: ['#059669', '#34d399', '#6ee7b7'] },
  { id: 'red', colors: ['#dc2626', '#f87171', '#fca5a5'] },
  { id: 'orange', colors: ['#ea580c', '#fb923c', '#fdba74'] },
  { id: 'dark', colors: ['#1e293b', '#475569', '#94a3b8'] },
]

const PRESET_CSS: Record<string, Record<string, string>> = {
  blue: { primary: '#1e40af', secondary: '#3b82f6', accent: '#60a5fa', bg: '#eff6ff', text: '#1e293b' },
  purple: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#c4b5fd', bg: '#f5f3ff', text: '#1e293b' },
  green: { primary: '#059669', secondary: '#34d399', accent: '#6ee7b7', bg: '#ecfdf5', text: '#1e293b' },
  red: { primary: '#dc2626', secondary: '#f87171', accent: '#fca5a5', bg: '#fef2f2', text: '#1e293b' },
  orange: { primary: '#ea580c', secondary: '#fb923c', accent: '#fdba74', bg: '#fff7ed', text: '#1e293b' },
  dark: { primary: '#1e293b', secondary: '#475569', accent: '#94a3b8', bg: '#0f172a', text: '#f1f5f9' },
}

function PublicPageInner() {
  const toast = useToast()
  const { activeCompanySlug } = useAuth()
  const slug = activeCompanySlug ?? ''

  const { data: config, isLoading } = usePublicPage(slug)
  const updateMutation = useUpdatePublicPage(slug)
  const publishMutation = usePublishPage(slug)
  const unpublishMutation = useUnpublishPage(slug)

  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [visualStyle, setVisualStyle] = useState('modern')
  const [colorPreset, setColorPreset] = useState('blue')
  const [whatsApp, setWhatsApp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [showActivities, setShowActivities] = useState(true)
  const [showContact, setShowContact] = useState(true)
  const [isEnabled, setIsEnabled] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [companySlugLanding, setCompanySlugLanding] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState('general')

  // Contact form config
  const [formConfigStr, setFormConfigStr] = useState<string | null>(null)

  // Banner
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerFocalX, setBannerFocalX] = useState(50)
  const [bannerFocalY, setBannerFocalY] = useState(50)

  // Logo position
  const [logoPosX, setLogoPosX] = useState(50)
  const [logoPosY, setLogoPosY] = useState(50)
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')

  // Gallery
  const { data: galleryImages = [], refetch: refetchGallery } = useQuery({
    queryKey: ['public-page-gallery', slug],
    queryFn: () => apiService.get<any[]>(`/api/admin/${slug}/public-page/images`),
    enabled: !!slug,
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryFileRef = useRef<HTMLInputElement>(null)

  // Courses
  const { data: allCourses = [] } = useQuery({
    queryKey: ['admin-courses', slug],
    queryFn: () => apiService.get<any[]>(`/api/admin/${slug}/courses`),
    enabled: !!slug,
  })
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const visibleCourses = allCourses.filter((c: any) => c.isActive && selectedCourseIds.includes(c.id))

  // Logo upload
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoFile(file: File | null) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      return toast('Formato no válido. Usá PNG, JPG, WebP o SVG.', 'error')
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast('El archivo es demasiado grande. Máximo 10 MB.', 'error')
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleUploadLogo() {
    if (!logoFile) return
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', logoFile)
      const res = await apiService.postForm<{ logoUrl: string }>(`/api/admin/${slug}/public-page/logo`, fd)
      setLogoUrl(res.logoUrl)
      setLogoFile(null)
      setLogoPreview(null)
      toast('Logo actualizado.')
    } catch {
      toast('Error al subir el logo.', 'error')
    }
    setLogoUploading(false)
  }

  // Banner handlers
  function handleBannerFile(file: File | null) {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) return toast('Formato no válido. Usá JPG, PNG o WebP.', 'error')
    if (file.size > 8 * 1024 * 1024) return toast('Máximo 8 MB.', 'error')
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function handleUploadBanner() {
    if (!bannerFile) return
    setBannerUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', bannerFile)
      const res = await apiService.postForm<{ bannerImageUrl: string }>(`/api/admin/${slug}/public-page/banner`, fd)
      setBannerUrl(res.bannerImageUrl)
      setBannerFile(null)
      setBannerPreview(null)
      toast('Banner actualizado.')
    } catch { toast('Error al subir el banner.', 'error') }
    setBannerUploading(false)
  }

  function handleBannerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setBannerFocalX(Math.min(100, Math.max(0, x)))
    setBannerFocalY(Math.min(100, Math.max(0, y)))
    setDirty(true)
  }

  // Gallery handlers
  function handleGalleryFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const valid = newFiles.filter(f => allowed.includes(f.type))
    if (valid.length !== newFiles.length) toast('Algunos archivos no son válidos.', 'error')
    setSelectedFiles((prev) => [...prev, ...valid])
    setGalleryPreviews((prev) => [...prev, ...valid.map(f => URL.createObjectURL(f))])
  }

  async function handleUploadGallery() {
    if (selectedFiles.length === 0) return
    setUploadingGallery(true)
    try {
      const fd = new FormData()
      selectedFiles.forEach(f => fd.append('files', f))
      await apiService.postForm(`/api/admin/${slug}/public-page/images`, fd)
      setSelectedFiles([])
      setGalleryPreviews([])
      refetchGallery()
      toast('Imágenes subidas.')
    } catch { toast('Error al subir imágenes.', 'error') }
    setUploadingGallery(false)
  }

  useEffect(() => {
    if (!config || dirty) return
    setHeadline(config.headline ?? '')
    setDescription(config.description ?? '')
    setVisualStyle(config.visualStyle)
    setColorPreset(config.colorPreset)
    setWhatsApp(config.whatsAppNumber ?? '')
    setInstagram(config.instagramUrl ?? '')
    setFacebook(config.facebookUrl ?? '')
    setEmail(config.publicEmail ?? '')
    setPhone(config.publicPhone ?? '')
    setAddress(config.publicAddress ?? '')
    setShowActivities(config.showActivities)
    setShowContact(config.showContactSection)
    setIsEnabled(config.isEnabled)
    if (!logoFile && config.logoUrl) setLogoUrl(config.logoUrl)
    setPublishedAt(config.publishedAtUtc ?? null)
    setCompanySlugLanding(config.companySlugLanding ?? null)
    if (!bannerFile && config.bannerImageUrl) setBannerUrl(config.bannerImageUrl)
    setBannerFocalX(config.bannerFocalPointX ?? 50)
    setBannerFocalY(config.bannerFocalPointY ?? 50)
    setLogoPosX(config.logoPositionX ?? 50)
    setLogoPosY(config.logoPositionY ?? 50)
    setLogoSize((config.logoSize as any) ?? 'medium')
    setTextAlign((config.heroTextAlignment as any) ?? 'center')
    if (config.contactFormConfig) setFormConfigStr(config.contactFormConfig)
  }, [config])

  useEffect(() => {
    const visible = allCourses.filter((c: any) => c.isPubliclyVisible).map((c: any) => c.id)
    setSelectedCourseIds(visible)
  }, [allCourses])

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        headline: headline || null,
        description: description || null,
        visualStyle,
        colorPreset,
        whatsAppNumber: whatsApp || null,
        instagramUrl: instagram || null,
        facebookUrl: facebook || null,
        publicEmail: email || null,
        publicPhone: phone || null,
        publicAddress: address || null,
        showActivities,
        showContactSection: showContact,
        bannerFocalPointX: bannerFocalX,
        bannerFocalPointY: bannerFocalY,
        logoPositionX: logoPosX,
        logoPositionY: logoPosY,
        logoSize,
        heroTextAlignment: textAlign,
        contactFormConfig: formConfigStr,
      })
      await apiService.put(`/api/admin/${slug}/public-page/courses`, { courseIds: selectedCourseIds })
      setDirty(false)
      toast('Guardado.')
    } catch {
      toast('Error al guardar.', 'error')
    }
  }

  async function handlePublish() {
    try {
      await handleSave()
      const result: any = await publishMutation.mutateAsync()
      toast('Página publicada.')
      setPublishedAt(result.publishedAtUtc)
      setIsEnabled(true)
      setDirty(false)
    } catch (err: any) {
      toast(err?.message || 'Error al publicar.', 'error')
    }
  }

  function handleUnpublish() {
    if (!confirm('¿Despublicar la página?')) return
    unpublishMutation.mutate(undefined, {
      onSuccess: () => { toast('Página despublicada.'); setIsEnabled(false) },
      onError: () => toast('Error al despublicar.', 'error'),
    })
  }

  const colors = PRESET_CSS[colorPreset] ?? PRESET_CSS.blue

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'diseno', label: 'Diseño' },
    { id: 'banner-logo', label: 'Banner y logo' },
    { id: 'actividades', label: 'Actividades' },
    { id: 'galeria', label: 'Galería' },
    { id: 'contacto', label: 'Contacto y redes' },
    { id: 'consultas', label: 'Consultas' },
    { id: 'publicacion', label: 'Publicación' },
  ]

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-6 w-6 text-indigo-600" /></div>

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Página pública</h1>
          <p className="mt-1 text-sm text-slate-400">Mostrá tu institución y recibí nuevas consultas.</p>
        </div>
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">Publicada</span>
          ) : (
            <span className="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-bold text-slate-300">Borrador</span>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${activeTab === 'consultas' ? '' : 'lg:grid-cols-5'}`}>
        {/* Left: Configuration */}
        <div className={`space-y-5 ${activeTab === 'consultas' ? '' : 'lg:col-span-2'}`}>
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* General */}
          {activeTab === 'general' && (
            <Card className="p-5 space-y-5">
              <h2 className="text-sm font-bold">Información principal</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Título principal</label>
                <Input value={headline} onChange={(e) => { setHeadline(e.target.value); setDirty(true) }}
                  placeholder="Formando deportistas dentro y fuera de la cancha" maxLength={200} />
                <p className="mt-1 text-xs text-slate-400">{headline.length}/200</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Descripción</label>
                <textarea value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" rows={3}
                  placeholder="Contá brevemente qué ofrece tu institución." maxLength={2000} />
                <p className="mt-1 text-xs text-slate-400">{description.length}/2000</p>
              </div>
            </Card>
          )}

          {/* Banner y logo */}
          {activeTab === 'banner-logo' && (
            <>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Logo de la página pública</h2>
                <div className="flex flex-col items-center gap-3">
                  {(logoPreview || logoUrl) ? (
                    <img src={logoPreview || logoUrl} alt="Logo" className="h-20 w-20 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 dark:border-slate-600 dark:bg-slate-800">
                      Sin logo
                    </div>
                  )}
                  {logoPreview && logoPreview !== logoUrl && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUploadLogo} loading={logoUploading} className="bg-indigo-600 text-white">Subir logo</Button>
                      <Button size="sm" variant="outline" onClick={() => { setLogoFile(null); setLogoPreview(null) }}>Cancelar</Button>
                    </div>
                  )}
                  {!logoPreview && (
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                      {logoUrl ? 'Cambiar logo' : 'Seleccionar archivo'}
                    </Button>
                  )}
                  <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden"
                    onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} />
                  <p className="text-xs text-slate-400">PNG, JPG, WebP o SVG. Máximo 10 MB.</p>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Posición del logo</h2>
                <p className="text-xs text-slate-400">Arrastrá el logo para ubicarlo donde mejor se vea.</p>
                <div className="grid grid-cols-3 gap-1">
                  {[['Arriba izq.', 15, 20], ['Arriba centro', 50, 20], ['Arriba der.', 85, 20],
                    ['Centro izq.', 15, 50], ['Centro', 50, 50], ['Centro der.', 85, 50],
                    ['Abajo izq.', 15, 80], ['Abajo centro', 50, 80], ['Abajo der.', 85, 80]].map(([label, x, y]) => (
                    <button key={label as string} onClick={() => { setLogoPosX(x as number); setLogoPosY(y as number); setDirty(true) }}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${logoPosX === x && logoPosY === y ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'}`}>
                      {label as string}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Tamaño:</span>
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button key={s} onClick={() => { setLogoSize(s); setDirty(true) }}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${logoSize === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {s === 'small' ? 'Pequeño' : s === 'medium' ? 'Mediano' : 'Grande'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Alineación del texto</label>
                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((a) => (
                      <button key={a} onClick={() => { setTextAlign(a); setDirty(true) }}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${textAlign === a ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {a === 'left' ? 'Izquierda' : a === 'center' ? 'Centro' : 'Derecha'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setLogoPosX(50); setLogoPosY(50); setLogoSize('medium'); setDirty(true) }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Restablecer posición</button>
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Imagen de portada</h2>
                <p className="text-xs text-slate-400">Subí una foto horizontal para la cabecera. Recomendado: 1600 × 600 px.</p>
                <div className="flex flex-col items-center gap-3">
                  {(bannerPreview || bannerUrl) ? (
                    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '21/9', maxHeight: 300 }}>
                      <img src={bannerPreview || bannerUrl} alt="Banner" className="h-full w-full object-cover"
                        style={{ objectPosition: `${bannerFocalX}% ${bannerFocalY}%` }}
                        onClick={handleBannerClick} />
                      <div className="absolute inset-0 cursor-crosshair" onClick={handleBannerClick}>
                        <div className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40 shadow-md"
                          style={{ left: `${bannerFocalX}%`, top: `${bannerFocalY}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-xs text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                      style={{ aspectRatio: '21/9' }}>Sin imagen de portada</div>
                  )}
                  <p className="text-xs text-slate-400">Mové el punto para elegir qué parte destacar.</p>
                  {bannerPreview && bannerPreview !== bannerUrl && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUploadBanner} loading={bannerUploading} className="bg-indigo-600 text-white">Subir banner</Button>
                      <Button size="sm" variant="outline" onClick={() => { setBannerFile(null); setBannerPreview(null) }}>Cancelar</Button>
                    </div>
                  )}
                  {!bannerPreview && (
                    <Button size="sm" variant="outline" onClick={() => document.getElementById('banner-input')?.click()}>
                      {bannerUrl ? 'Cambiar banner' : 'Seleccionar archivo'}
                    </Button>
                  )}
                  <input id="banner-input" type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={(e) => handleBannerFile(e.target.files?.[0] ?? null)} />
                </div>
              </Card>
            </>
          )}

          {/* Diseño */}
          {activeTab === 'diseno' && (
            <>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Estilo visual</h2>
                <div className="grid grid-cols-2 gap-2">
                  {VISUAL_STYLES.map((s) => (
                    <button key={s.id} onClick={() => { setVisualStyle(s.id); setDirty(true) }}
                      className={`rounded-xl border-2 p-3 text-left transition text-sm ${
                        visualStyle === s.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-700'
                      }`}>
                      <p className="font-bold">{s.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Colores</h2>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PRESETS.map((p) => (
                    <button key={p.id} onClick={() => { setColorPreset(p.id); setDirty(true) }}
                      className={`flex gap-1 rounded-xl border-2 p-2 transition ${colorPreset === p.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 dark:border-slate-700'}`}>
                      {p.colors.map((c, i) => (
                        <div key={i} className="h-6 w-6 rounded-lg" style={{ backgroundColor: c }} />
                      ))}
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* Actividades */}
          {activeTab === 'actividades' && (
            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-bold">Actividades disponibles</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showActivities} onChange={(e) => { setShowActivities(e.target.checked); setDirty(true) }}
                  className="rounded border-slate-300" />
                Mostrar actividades disponibles
              </label>
              {showActivities && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allCourses.length === 0 && <p className="text-xs text-slate-400">No hay cursos creados.</p>}
                  {allCourses.filter((c: any) => c.isActive).map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={selectedCourseIds.includes(c.id)}
                        onChange={(e) => {
                          setSelectedCourseIds((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))
                          setDirty(true)
                        }} className="rounded border-slate-300" />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Galería */}
          {activeTab === 'galeria' && (
            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-bold">Galería de imágenes</h2>
              <p className="text-xs text-slate-400">Mostrá fotos de tu institución, eventos o actividades. Máximo 10 imágenes.</p>
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((img: any) => (
                    <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      <img src={img.imageUrl} alt="" className="h-24 w-full object-cover" loading="lazy" />
                      <button onClick={async () => {
                        if (confirm('¿Eliminar esta imagen?')) {
                          try {
                            await apiService.del(`/api/admin/${slug}/public-page/images/${img.id}`)
                            refetchGallery()
                          } catch { toast('Error al eliminar.', 'error') }
                        }
                      }}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition group-hover:opacity-100">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {galleryPreviews.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} alt="" className="h-16 w-full rounded-lg object-cover" />
                        <button onClick={() => {
                          setSelectedFiles((prev) => prev.filter((_, j) => j !== i))
                          setGalleryPreviews((prev) => prev.filter((_, j) => j !== i))
                        }} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUploadGallery} loading={uploadingGallery} className="bg-indigo-600 text-white">Subir {selectedFiles.length} imagen(es)</Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedFiles([]); setGalleryPreviews([]) }}>Cancelar</Button>
                  </div>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => galleryFileRef.current?.click()}>
                {galleryImages.length > 0 ? 'Agregar imágenes' : 'Seleccionar imágenes'}
              </Button>
              <input ref={galleryFileRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden"
                onChange={(e) => handleGalleryFiles(e.target.files)} />
            </Card>
          )}

          {/* Contacto y redes */}
          {activeTab === 'contacto' && (
            <>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Contacto</h2>
                <label className="flex items-center gap-2 text-sm mb-3">
                  <input type="checkbox" checked={showContact} onChange={(e) => { setShowContact(e.target.checked); setDirty(true) }}
                    className="rounded border-slate-300" />
                  Mostrar sección de contacto
                </label>
                {showContact && (
                  <div className="space-y-3">
                    <div><label className="mb-1 block text-xs font-semibold text-slate-600">WhatsApp</label><Input value={whatsApp} onChange={(e) => { setWhatsApp(e.target.value); setDirty(true) }} placeholder="+54 11 5555-1234" /></div>
                    <div><label className="mb-1 block text-xs font-semibold text-slate-600">Instagram</label><Input value={instagram} onChange={(e) => { setInstagram(e.target.value); setDirty(true) }} placeholder="@club" /></div>
                    <div><label className="mb-1 block text-xs font-semibold text-slate-600">Facebook</label><Input value={facebook} onChange={(e) => { setFacebook(e.target.value); setDirty(true) }} placeholder="facebook.com/club" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="mb-1 block text-xs font-semibold text-slate-600">Email</label><Input value={email} onChange={(e) => { setEmail(e.target.value); setDirty(true) }} placeholder="contacto@club.com" /></div>
                      <div><label className="mb-1 block text-xs font-semibold text-slate-600">Teléfono</label><Input value={phone} onChange={(e) => { setPhone(e.target.value); setDirty(true) }} placeholder="011 5555-1234" /></div>
                    </div>
                    <div><label className="mb-1 block text-xs font-semibold text-slate-600">Dirección</label><Input value={address} onChange={(e) => { setAddress(e.target.value); setDirty(true) }} placeholder="Av. Siempre Viva 123" /></div>
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-bold">Formulario de consultas</h2>
                <p className="text-xs text-slate-400">Configurá los campos del formulario. Los visitantes completan estos campos antes de enviar un WhatsApp.</p>

                {/* WhatsApp field - always required, always present */}
                {(() => {
                  const fields: any[] = (() => { try { return formConfigStr ? JSON.parse(formConfigStr) : [] } catch { return [] } })()
                  const whatsappField = fields.find((f: any) => f.name === 'whatsapp')
                  const whatsappLabel = whatsappField?.label ?? 'WhatsApp'
                  const customFields = fields.filter((f: any) => f.name !== 'whatsapp')

                  function writeFields(arr: any[]) {
                    const withWhatsapp = arr.some((f: any) => f.name === 'whatsapp') ? arr : [{ name: 'whatsapp', label: 'WhatsApp', type: 'tel', enabled: true, required: true, order: -1 }, ...arr]
                    setFormConfigStr(JSON.stringify(withWhatsapp))
                    setDirty(true)
                  }

                  function addField() {
                    const newField = { name: `field_${Date.now()}`, label: 'Nuevo campo', type: 'text', enabled: true, required: false, order: customFields.length, options: [] }
                    writeFields([...fields, newField])
                  }

                  function removeField(name: string) {
                    writeFields(fields.filter((f: any) => f.name !== name))
                  }

                  function moveField(idx: number, dir: -1 | 1) {
                    const arr = [...customFields]
                    const target = idx + dir
                    if (target < 0 || target >= arr.length) return
                    const tmp = arr[idx].order; arr[idx].order = arr[target].order; arr[target].order = tmp
                    arr.sort((a, b) => a.order - b.order)
                    writeFields([...(whatsappField ? [{ ...whatsappField, order: -1 }] : []), ...arr.map((f, i) => ({ ...f, order: i }))])
                  }

                  return (
                    <>
                      {/* Permanent WhatsApp field */}
                      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <svg className="h-4 w-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">WhatsApp (obligatorio)</span>
                            <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300">FIJO</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="mb-0.5 block text-[10px] text-slate-500">Label visible</label>
                            <Input value={whatsappLabel} onChange={(e) => {
                              const arr = [...fields]
                              const f = arr.find((x: any) => x.name === 'whatsapp')
                              if (f) f.label = e.target.value
                              else arr.push({ name: 'whatsapp', label: e.target.value, type: 'tel', enabled: true, required: true, order: -1 })
                              writeFields(arr)
                            }} className="h-7 text-xs" placeholder="WhatsApp" />
                          </div>
                        </div>
                        <p className="mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">Campo obligatorio. El visitante selecciona su país e ingresa su número.</p>
                      </div>

                      {/* Custom fields */}
                      {customFields.sort((a, b) => a.order - b.order).map((field: any, idx: number) => (
                        <div key={field.name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5">▲</button>
                              <button onClick={() => moveField(idx, 1)} disabled={idx === customFields.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5">▼</button>
                              <span className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{field.label || 'Nuevo campo'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="flex items-center gap-1 text-xs text-slate-500">
                                <input type="checkbox" checked={field.enabled} onChange={(e) => {
                                  const arr = [...fields]; const f = arr.find((x: any) => x.name === field.name); if (f) f.enabled = e.target.checked; writeFields(arr)
                                }} className="rounded border-slate-300" />
                                Activo
                              </label>
                              <button onClick={() => removeField(field.name)} className="text-red-400 hover:text-red-600 p-0.5" title="Eliminar campo">✕</button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="mb-0.5 block text-[10px] text-slate-500">Label</label>
                                <Input value={field.label} onChange={(e) => {
                                  const arr = [...fields]; const f = arr.find((x: any) => x.name === field.name); if (f) f.label = e.target.value; writeFields(arr)
                                }} className="h-7 text-xs" placeholder="Nombre del campo" />
                              </div>
                              <div className="w-28">
                                <label className="mb-0.5 block text-[10px] text-slate-500">Tipo</label>
                                <select value={field.type} onChange={(e) => {
                                  const arr = [...fields]; const f = arr.find((x: any) => x.name === field.name); if (f) f.type = e.target.value; writeFields(arr)
                                }} className="h-7 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                                  <option value="text">Texto</option>
                                  <option value="textarea">Texto largo</option>
                                  <option value="number">Número</option>
                                  <option value="email">Email</option>
                                  <option value="date">Fecha</option>
                                  <option value="select">Select</option>
                                  <option value="checkbox">Checkbox</option>
                                </select>
                              </div>
                              <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                                <input type="checkbox" checked={field.required} onChange={(e) => {
                                  const arr = [...fields]; const f = arr.find((x: any) => x.name === field.name); if (f) f.required = e.target.checked; writeFields(arr)
                                }} className="rounded border-slate-300" disabled={!field.enabled} />
                                Oblig.
                              </label>
                            </div>
                            {field.type === 'select' && (
                              <div>
                                <label className="mb-0.5 block text-[10px] text-slate-500">Opciones (una por línea)</label>
                                <textarea value={(field.options || []).join('\n')} onChange={(e) => {
                                  const arr = [...fields]; const f = arr.find((x: any) => x.name === field.name); if (f) f.options = e.target.value.split('\n').filter(Boolean); writeFields(arr)
                                }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" rows={3} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={addField} className="w-full text-xs">+ Agregar campo personalizado</Button>
                    </>
                  )
                })()}
              </Card>
            </>
          )}

          {/* Consultas recibidas */}
          {activeTab === 'consultas' && (
            <ConsultasSection slug={slug} />
          )}

          {/* Publicación */}
          {activeTab === 'publicacion' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-3 text-sm font-bold">Estado de publicación</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Estado:</span>
                  {isEnabled ? (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">Publicada</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-500">Borrador</span>
                  )}
                </div>
                {publishedAt && (
                  <p className="text-xs text-slate-400">Publicada el {new Date(publishedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {companySlugLanding && (
                  <p className="text-xs text-slate-500">
                    Vista pública: <a href={`/c/${companySlugLanding}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">/{companySlugLanding}</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Always visible: save / publish / unpublish */}
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={updateMutation.isPending} className="bg-slate-800 text-white" disabled={!dirty}>Guardar cambios</Button>
            {isEnabled ? (
              <Button variant="outline" onClick={handleUnpublish} loading={unpublishMutation.isPending} className="text-red-600 border-red-200">Despublicar</Button>
            ) : (
              <Button onClick={handlePublish} loading={publishMutation.isPending} className="bg-emerald-600 text-white">Publicar página</Button>
            )}
          </div>

          {companySlugLanding && (
            <p className="text-xs text-slate-500">
              Tu página: <a href={`/c/${companySlugLanding}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">/{companySlugLanding}</a>
            </p>
          )}
        </div>

        {/* Right: Preview - Sticky on desktop */}
        <div className={`${activeTab === 'consultas' ? 'hidden' : 'lg:col-span-3'}`}>
          <div className="lg:sticky lg:top-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">Vista previa</h2>
              <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                <button onClick={() => setPreviewMode('desktop')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${previewMode === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Desktop</button>
                <button onClick={() => setPreviewMode('mobile')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${previewMode === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Celular</button>
              </div>
            </div>
            <div className={previewMode === 'mobile' ? 'mx-auto max-w-[380px]' : ''}>
              <PublicLandingPreview
                headline={headline} description={description}
                colors={colors} visualStyle={visualStyle}
                whatsApp={whatsApp} instagram={instagram} facebook={facebook}
                email={email} phone={phone} address={address}
                showContact={showContact}
                companySlug={companySlugLanding}
                logoUrl={logoPreview || logoUrl || undefined}
                courses={showActivities ? visibleCourses : []}
                bannerUrl={bannerPreview || bannerUrl || undefined}
                bannerFocalX={bannerFocalX} bannerFocalY={bannerFocalY}
                logoPosX={logoPosX} logoPosY={logoPosY}
                logoSize={logoSize} textAlign={textAlign}
                galleryImages={galleryImages}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PublicLandingPreview({
  headline, description, colors, visualStyle,
  whatsApp, instagram, facebook, email, phone, address, showContact,
  companySlug, logoUrl, courses, bannerUrl, bannerFocalX, bannerFocalY,
  logoPosX, logoPosY, logoSize, textAlign, galleryImages,
}: {
  headline: string; description: string; colors: Record<string, string>; visualStyle: string
  whatsApp: string; instagram: string; facebook: string
  email: string; phone: string; address: string; showContact: boolean
  companySlug: string | null; logoUrl?: string; courses?: any[]
  bannerUrl?: string; bannerFocalX?: number; bannerFocalY?: number
  logoPosX?: number; logoPosY?: number; logoSize?: string; textAlign?: string
  galleryImages?: any[]
}) {
  const isSport = visualStyle === 'sport'
  const isMinimal = visualStyle === 'minimal'
  const isClassic = visualStyle === 'classic'
  const [modalCourse, setModalCourse] = useState<any | null>(null)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700"
      style={{ backgroundColor: colors.bg }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: bannerUrl ? 300 : undefined }}>
        {bannerUrl ? (
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: `${bannerFocalX ?? 50}% ${bannerFocalY ?? 50}%`,
          }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.2),rgba(0,0,0,0.45))' }} />
          </div>
        ) : null}
        <div className="relative px-6 py-12 sm:px-10 sm:py-16" style={{ background: bannerUrl ? undefined : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
          {logoUrl && (
            <img src={logoUrl} alt="" className="absolute rounded-2xl border-2 border-white/20 object-cover shadow-lg"
              style={{
                left: `${logoPosX ?? 50}%`,
                top: `${logoPosY ?? 50}%`,
                transform: 'translate(-50%, -50%)',
                width: logoSize === 'small' ? 64 : logoSize === 'large' ? 136 : 96,
                height: logoSize === 'small' ? 64 : logoSize === 'large' ? 136 : 96,
              }} />
          )}
          <div className="mx-auto max-w-2xl" style={{ textAlign: (textAlign as any) ?? 'center' }}>
            <h1 className={`text-white font-black ${isSport ? 'text-4xl sm:text-5xl uppercase tracking-tight' : isClassic ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-4xl'}`}
              style={{ fontFamily: isClassic ? 'serif' : undefined }}>
              {headline || 'Tu institución'}
            </h1>
            {description && <p className={`mt-4 text-white/80 ${isMinimal ? 'text-sm' : 'text-base'}`}>{description}</p>}
          <div className="mt-6 flex justify-center gap-3">
            {whatsApp && (
              <a href={`https://wa.me/${whatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero recibir información sobre las actividades.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: colors.accent }}>
                Consultar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Description */}
      {description && !isMinimal && (
        <div className="px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-base leading-relaxed" style={{ color: colors.text }}>{description}</p>
          </div>
        </div>
      )}

      {/* Activities */}
      {courses && courses.length > 0 && (
        <div className="border-t border-white/10 px-6 py-8 sm:px-10" style={{ borderColor: `${colors.primary}20` }}>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-lg font-bold text-center mb-6" style={{ color: colors.text }}>Actividades</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {courses.map((c: any) => (
                <button key={c.id} onClick={() => setModalCourse(c)}
                  className="rounded-xl border p-4 text-center transition hover:shadow-md" style={{ borderColor: `${colors.primary}20`, backgroundColor: `${colors.primary}08` }}>
                  <p className="text-sm font-bold" style={{ color: colors.text }}>{c.name}</p>
                  {c.teacherName && <p className="mt-1 text-xs" style={{ color: `${colors.text}99` }}>{c.teacherName}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      <Modal open={!!modalCourse} onClose={() => setModalCourse(null)} title={modalCourse?.name}>
        {modalCourse && (
          <div className="space-y-4 p-5 sm:p-6">
            {modalCourse.description && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{modalCourse.description}</p>
              </div>
            )}
            {modalCourse.teacherName && (
              <div className="flex items-center gap-3">
                {modalCourse.teacherPhoto ? (
                  <img src={modalCourse.teacherPhoto} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">{modalCourse.teacherName.charAt(0)}</div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Profesor</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{modalCourse.teacherName}</p>
                </div>
              </div>
            )}
            {modalCourse.schedule && modalCourse.schedule.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horarios</h3>
                <div className="mt-1 space-y-1">
                  {modalCourse.schedule.map((s: any, i: number) => (
                    <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
                      {s.day === 'Monday' ? 'Lunes' : s.day === 'Tuesday' ? 'Martes' : s.day === 'Wednesday' ? 'Miércoles' : s.day === 'Thursday' ? 'Jueves' : s.day === 'Friday' ? 'Viernes' : s.day === 'Saturday' ? 'Sábado' : 'Domingo'}
                      {' '}{s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {modalCourse.additionalInfo && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Información adicional</h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{modalCourse.additionalInfo}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Gallery - Carousel */}
      {galleryImages && galleryImages.length > 0 && (
        <div className="border-t px-6 py-8 sm:px-10" style={{ borderColor: `${colors.primary}20` }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-bold text-center mb-6" style={{ color: colors.text }}>Galería</h2>
            <GalleryCarousel images={galleryImages} />
          </div>
        </div>
      )}

      {/* Contact icons */}
      {showContact && (whatsApp || instagram || facebook || email || phone) && (
        <div className="border-t px-6 py-8 sm:px-10" style={{ borderColor: `${colors.primary}20` }}>
          <div className="mx-auto flex max-w-md items-center justify-center gap-4">
            {whatsApp && (
              <a href={`https://wa.me/${whatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp" title="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#25D366', color: '#fff' }}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
            {instagram && (
              <a href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir Instagram" title="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#E4405F', color: '#fff' }}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {facebook && (
              <a href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir Facebook" title="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#1877F2', color: '#fff' }}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} aria-label="Enviar email" title="Email"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#EA4335', color: '#fff' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\D/g, '')}`} aria-label="Llamar por teléfono" title="Teléfono"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-90 hover:scale-110" style={{ backgroundColor: '#34A853', color: '#fff' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t px-6 py-4 text-center" style={{ borderColor: `${colors.primary}20` }}>
        <p className="text-xs" style={{ color: `${colors.text}80` }}>Gestionado con ClassClick</p>
      </div>
    </div>
  )
}

function ConsultasSection({ slug }: { slug: string; whatsApp?: string }) {
  const toast = useToast()
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiService.get<any[]>(`/api/admin/${slug}/public-page/inquiries`)
      setInquiries(data)
    } catch { toast('Error al cargar consultas.', 'error') }
    setLoading(false)
  }, [slug, toast])

  useEffect(() => { fetchInquiries() }, [fetchInquiries])

  async function updateStatus(id: string, status: string) {
    try {
      await apiService.put(`/api/admin/${slug}/public-page/inquiries/${id}/status`, { status })
      setInquiries((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status }))
      toast('Estado actualizado.')
      return true
    } catch {
      toast('Error al actualizar el estado.', 'error')
      return false
    }
  }

  function getResponse(inquiry: any, name: string): string {
    try {
      const resp = JSON.parse(inquiry.responsesJson || '{}')
      return resp[name] || ''
    } catch { return '' }
  }

  function getPhoneNumber(inquiry: any): string {
    const resp = (() => { try { return JSON.parse(inquiry.responsesJson || '{}') } catch { return {} } })()
    const e164 = resp['whatsappE164']
    if (e164 && e164.replace(/\D/g, '').length >= 8) return e164.replace(/\D/g, '')
    const number = resp['whatsappNumber']
    if (number && number.replace(/\D/g, '').length >= 8) return number.replace(/\D/g, '')
    const candidates = ['Teléfono', 'tel', 'Tel', 'phone', 'Phone', 'WhatsApp', 'whatsapp', 'Celular', 'celular']
    for (const key of candidates) {
      const val = resp[key]
      if (val && val.replace(/\D/g, '').length >= 8) return val.replace(/\D/g, '')
    }
    return ''
  }

  function getAllResponses(inquiry: any): Record<string, string> {
    try { return JSON.parse(inquiry.responsesJson || '{}') } catch { return {} }
  }

  async function handleContact(inquiry: any) {
    const phone = getPhoneNumber(inquiry)
    if (!phone) { toast('No hay número de WhatsApp disponible.', 'error'); return }
    const msg = encodeURIComponent(`Hola, te contactamos desde nuestra institución con respecto a tu consulta.`)
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    if (inquiry.status !== 'contacted') {
      await updateStatus(inquiry.id, 'contacted')
    }
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    closed: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  }
  const statusLabels: Record<string, string> = { new: 'Nueva', contacted: 'Contactada', closed: 'Cerrada' }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-5 w-5 text-indigo-600" /></div>

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-bold">Consultas recibidas</h2>
        {inquiries.length === 0 ? (
          <p className="text-xs text-slate-400">No hay consultas todavía.</p>
        ) : selected ? (
          <div className="space-y-3">
            <button onClick={() => setSelected(null)} className="text-xs text-blue-600 hover:underline">&larr; Volver al listado</button>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="space-y-2 text-sm">
                {Object.entries(getAllResponses(selected)).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-xs text-slate-500 capitalize">{key}:</span>
                    <p className="text-slate-800 dark:text-slate-200">{String(val)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Recibida el {new Date(selected.createdAtUtc).toLocaleString('es-AR')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {getPhoneNumber(selected) && (
                <button onClick={() => handleContact(selected)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Contactar por WhatsApp
                </button>
              )}
              {['new', 'contacted', 'closed'].map((s) => (
                <button key={s} onClick={() => updateStatus(selected.id, s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selected.status === s ? statusColors[s] + ' ring-2 ring-slate-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {inquiries.map((inq) => (
              <button key={inq.id} onClick={() => setSelected(inq)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-200">
                      {getResponse(inq, 'name') || getResponse(inq, 'Nombre y apellido') || getResponse(inq, 'Nombre') || 'Anónimo'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {getPhoneNumber(inq) || ''}
                      {Object.values(getAllResponses(inq)).some(v => v.includes('actividad') || v.includes('fútbol') || v.includes('club'))
                        ? ` · ${getResponse(inq, 'activity') || getResponse(inq, 'Actividad de interés') || getResponse(inq, 'Actividad') || ''}` : ''}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{new Date(inq.createdAtUtc).toLocaleString('es-AR')}</p>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[inq.status] || ''}`}>
                    {statusLabels[inq.status] || inq.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function PublicPageRoute() {
  return <ToastProvider><PublicPageInner /></ToastProvider>
}
