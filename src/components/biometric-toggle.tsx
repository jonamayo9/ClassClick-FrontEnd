import { useEffect, useState } from 'react'
import { useBiometric } from '@/hooks/useBiometric'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface BiometricCredential {
  id: string
  deviceName: string
  createdAtUtc: string
  lastUsedAtUtc?: string | null
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin uso reciente'
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function BiometricToggle() {
  const {
    isAvailable,
    isEnabled,
    credentialId,
    isRegistering,
    error,
    register,
    disable,
    clearError,
  } = useBiometric()
  const [credentials, setCredentials] = useState<BiometricCredential[]>([])
  const [loadingCredentials, setLoadingCredentials] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadCredentials = async () => {
    setLoadingCredentials(true)
    try {
      const data = await apiService.get<BiometricCredential[]>('/api/auth/webauthn/credentials')
      setCredentials(Array.isArray(data) ? data : [])
    } catch {
      setCredentials([])
    } finally {
      setLoadingCredentials(false)
    }
  }

  useEffect(() => {
    if (!isAvailable) return
    void loadCredentials()
  }, [isAvailable, isEnabled])

  if (!isAvailable) return null

  const revoke = async (id: string) => {
    setRevokingId(id)
    try {
      if (id === credentialId) {
        await disable()
      } else {
        await apiService.del(`/api/auth/webauthn/credentials/${id}`)
      }
      await loadCredentials()
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Biometría</h3>
          <p className="text-xs text-slate-500">
            {isEnabled
              ? 'Este dispositivo usa huella o rostro para proteger la sesión.'
              : 'Activá el acceso con huella o reconocimiento facial en este dispositivo.'}
          </p>
        </div>
        {isEnabled ? (
          <Button variant="outline" size="sm" onClick={() => { void revoke(credentialId!) }}>
            Desactivar
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              clearError()
              const ok = await register()
              if (ok) await loadCredentials()
            }}
            loading={isRegistering}
          >
            Activar
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Dispositivos registrados
          </p>
          {loadingCredentials && <span className="text-xs text-slate-400">Actualizando...</span>}
        </div>

        {credentials.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">
            No hay dispositivos biométricos registrados.
          </p>
        ) : (
          credentials.map((item) => {
            const isCurrent = item.id === credentialId
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.deviceName || 'Dispositivo'}
                    {isCurrent && <span className="ml-2 text-xs text-emerald-500">Este</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    Último uso: {formatDate(item.lastUsedAtUtc)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={revokingId === item.id}
                  onClick={() => { void revoke(item.id) }}
                >
                  Revocar
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
