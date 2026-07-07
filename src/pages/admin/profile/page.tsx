import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BiometricToggle } from '@/components/biometric-toggle'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { apiService } from '@/lib/api'

function ProfileInner() {
  const { user } = useAuth()
  const toast = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const photoMutation = useMutation({
    mutationFn: (fd: FormData) => apiService.postForm<{ imageUrl?: string }>('/api/admin/profile/upload-photo', fd),
    onSuccess: (data) => { setCurrentPhotoUrl(data?.imageUrl ?? null); setSelectedFile(null); toast('Foto actualizada.') },
    onError: () => toast('Error al subir foto.', 'error'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => apiService.put('/api/admin/profile/password', { currentPassword, newPassword, confirmNewPassword: confirmPassword }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); toast('Contraseña actualizada.') },
    onError: () => toast('Error al cambiar contraseña.', 'error'),
  })

  function handleFileSelect(files: FileList | null) {
    const file = files?.[0]; if (!file) return
    setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file))
  }

  function handleUpload() {
    if (!selectedFile) { toast('Seleccioná una foto primero.', 'error'); return }
    const fd = new FormData(); fd.append('file', selectedFile)
    photoMutation.mutate(fd)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Mi perfil</h1>
        <p className="mt-1 text-sm text-indigo-200">Datos de usuario y preferencias</p>
      </div>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-black">Datos personales</h2>
        <div className="space-y-3">
          <Row label="Nombre" value={user?.name ?? user?.email ?? '-'} />
          <Row label="Email" value={user?.email ?? '-'} />
          <Row label="Rol" value={user?.systemRole ?? '-'} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-black">Foto de perfil</h2>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 overflow-hidden dark:border-slate-700 dark:bg-slate-800">
            {(previewUrl || currentPhotoUrl) ? (
              <img src={previewUrl || currentPhotoUrl!} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl text-slate-300">👤</span>
            )}
          </div>
          <div className="space-y-3 flex-1">
            <p className="text-sm text-slate-500">JPG, PNG o WEBP. Máx 5 MB.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
            {previewUrl ? (
              <div className="flex gap-2">
                <Button loading={photoMutation.isPending} onClick={handleUpload} className="bg-indigo-600 text-white hover:bg-indigo-700">Guardar foto</Button>
                <Button variant="outline" onClick={() => { setPreviewUrl(null); setSelectedFile(null) }}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                {currentPhotoUrl ? 'Cambiar foto' : 'Seleccionar foto'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-black">Cambiar contraseña</h2>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Contraseña actual</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nueva contraseña</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Confirmar nueva contraseña</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
          )}
          <Button onClick={() => passwordMutation.mutate()} loading={passwordMutation.isPending}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
            className="bg-indigo-600 text-white hover:bg-indigo-700">Cambiar contraseña</Button>
        </div>
      </Card>

      <BiometricToggle />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"><span className="text-sm text-slate-500">{label}</span><span className="text-sm font-medium">{value}</span></div>
}

export default function ProfilePage() { return <ToastProvider><ProfileInner /></ToastProvider> }
