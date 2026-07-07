import { useBiometric } from '@/hooks/useBiometric'
import { Button } from '@/components/ui/button'

export function BiometricToggle() {
  const { isAvailable, isEnabled, isRegistering, error, register, disable, clearError } = useBiometric()

  if (!isAvailable) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Biometría</h3>
          <p className="text-xs text-slate-500">
            {isEnabled ? 'Usá tu huella o rostro para iniciar sesión' : 'Activá el acceso con huella o reconocimiento facial'}
          </p>
        </div>
        {isEnabled ? (
          <Button variant="outline" size="sm" onClick={() => { void disable() }}>Desactivar</Button>
        ) : (
          <Button variant="primary" size="sm" onClick={async () => { clearError(); await register() }}
            loading={isRegistering}>
            Activar
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
