import { useState, useEffect } from 'react'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { BackButton } from '@/components/ui/back-button'
import { PageHero } from '@/components/ui/page-hero'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useClothingSettings, useUpdateClothingSettings } from './hooks'

function SettingsPageInner() {
  const { data: settings, isLoading } = useClothingSettings()
  const updateMutation = useUpdateClothingSettings()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [alias, setAlias] = useState('')
  const [holder, setHolder] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (settings) {
      setAlias(settings.paymentAlias ?? '')
      setHolder(settings.paymentAliasHolder ?? '')
    }
  }, [settings])

  function startEdit() {
    setAlias(settings?.paymentAlias ?? '')
    setHolder(settings?.paymentAliasHolder ?? '')
    setError('')
    setEditing(true)
  }

  function cancelEdit() {
    setAlias(settings?.paymentAlias ?? '')
    setHolder(settings?.paymentAliasHolder ?? '')
    setError('')
    setEditing(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateMutation.mutateAsync({
        paymentAlias: alias.trim() || undefined,
        paymentAliasHolder: holder.trim() || undefined,
      })
      toast('Configuración de pagos actualizada.')
      setEditing(false)
    } catch {
      setError('No se pudo guardar la configuración.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <BackButton to="/admin/clothing" label="Volver a Indumentaria" />
      <PageHero
        label="Configuración"
        title="Configuración de pagos"
        description="Alias y titular que se muestran a los alumnos al realizar pagos."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-6 w-6 text-violet-600" />
        </div>
      ) : (
        <Card className="max-w-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Datos de pago</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Los alumnos verán esta información para realizar transferencias.
              </p>
            </div>
            {!editing && (
              <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={startEdit}>
                Editar
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Alias de pago</label>
                <Input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: classclick.mp"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-slate-400">Alias de Mercado Pago o CBU que verá el alumno.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Titular / Referencia</label>
                <Input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Ej: ClassClick S.A."
                  maxLength={120}
                />
                <p className="mt-1 text-xs text-slate-400">Nombre del titular de la cuenta.</p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={updateMutation.isPending} className="bg-violet-600 text-white hover:bg-violet-700">
                  Guardar cambios
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={updateMutation.isPending}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Alias</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {settings?.paymentAlias || <span className="text-slate-400 italic">No configurado</span>}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Titular</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {settings?.paymentAliasHolder || <span className="text-slate-400 italic">No configurado</span>}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsPageInner />
    </ToastProvider>
  )
}
