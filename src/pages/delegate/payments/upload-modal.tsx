import { useState } from 'react'
import { apiService, getApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { money } from '@/pages/admin/payments/hooks'
import type { DelegateCharge } from './types'

export function UploadProofModal({
  slug, charge, onClose, onDone,
}: {
  slug: string
  charge: DelegateCharge
  onClose: () => void
  onDone: () => void
}) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function submit() {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await apiService.postForm(`/api/delegate/${slug}/payments/charges/${charge.monthlyChargeId}/proof`, fd)
      toast('Comprobante enviado. Queda en revisión.')
      onDone()
      onClose()
    } catch (err) {
      toast(getApiError(err), 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Subir comprobante de transferencia" className="sm:max-w-md">
      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <div className="font-bold">{charge.studentFullName}</div>
          <div className="text-slate-500">{charge.courseName} · {charge.month}/{charge.year} · {charge.chargeTypeName}</div>
          <div className="mt-1 font-bold">{money(charge.finalAmount)}</div>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 dark:text-slate-300 dark:file:bg-blue-950 dark:file:text-blue-300"
        />
        <p className="text-xs text-slate-400">El comprobante queda en revisión. El pago se confirma solo con aprobación del administrador.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button loading={uploading} disabled={!file} className="bg-blue-600 text-white hover:bg-blue-700" onClick={submit}>
            Enviar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
