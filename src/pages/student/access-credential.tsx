import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { apiService, getApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface AccessQrToken {
  token: string
  expiresAtUtc: string
  seconds: number
}

function useCountdown(expiresAtUtc?: string) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!expiresAtUtc) {
      setRemaining(0)
      return
    }

    const update = () => {
      const seconds = Math.max(0, Math.floor((new Date(expiresAtUtc).getTime() - Date.now()) / 1000))
      setRemaining(seconds)
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [expiresAtUtc])

  return remaining
}

export default function StudentAccessCredentialPage() {
  const slug = useAuth((state) => state.activeCompanySlug ?? '')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['student-access-qr', slug],
    queryFn: () => apiService.post<AccessQrToken>(`/api/student/${slug}/access/qr-token`, {}),
    enabled: !!slug,
    refetchInterval: 45000,
    refetchIntervalInBackground: true,
    retry: false,
  })

  const remaining = useCountdown(data?.expiresAtUtc)

  if (!slug) {
    return <Card><p className="text-sm text-slate-500">SeleccionÃ¡ una empresa para ver tu credencial.</p></Card>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Mi credencial de acceso</h1>
            <p className="mt-1 text-sm text-slate-300">QR dinÃ¡mico para presentar en recepciÃ³n. Se renueva automÃ¡ticamente y es de un solo uso.</p>
          </div>
          <Badge variant="success">Access</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-slate-600" /></div>
      ) : error ? (
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-bold">Credencial no disponible</h2>
          <p className="text-sm text-slate-500">{getApiError(error) || 'El mÃ³dulo Access no estÃ¡ habilitado para esta empresa.'}</p>
          <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
        </Card>
      ) : data ? (
        <Card className="space-y-5 text-center">
          <div className="mx-auto w-fit rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <QRCodeSVG value={data.token} size={260} level="M" includeMargin />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {remaining > 0 ? `VÃ¡lido por ${remaining}s` : 'Generando nuevo cÃ³digo...'}
            </p>
            <p className="text-xs text-slate-400">
              {isFetching ? 'Renovando credencial...' : `Se renueva automÃ¡ticamente cada ${data.seconds}s. No compartas una captura: el cÃ³digo es de un solo uso.`}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} loading={isFetching}>Renovar ahora</Button>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="space-y-2">
          <Badge variant="info">QR</Badge>
          <h3 className="text-sm font-bold">Cualquier celular</h3>
          <p className="text-xs text-slate-400">Funciona en Android e iPhone a travÃ©s de la cÃ¡mara del lector o de la recepciÃ³n web.</p>
        </Card>
        <Card className="space-y-2">
          <Badge variant="violet">NFC</Badge>
          <h3 className="text-sm font-bold">Android HCE</h3>
          <p className="text-xs text-slate-400">Si tenÃ©s la app Android complementaria, podÃ©s acercar tu celular al lector de recepciÃ³n. Requiere Android compatible.</p>
        </Card>
        <Card className="space-y-2">
          <Badge variant="default">FÃ­sica</Badge>
          <h3 className="text-sm font-bold">Tarjeta o llavero</h3>
          <p className="text-xs text-slate-400">Para alumnos sin celular, la instituciÃ³n puede entregar una credencial NFC compatible.</p>
        </Card>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        El backend valida empresa, alumno, vigencia, revocaciÃ³n y uso Ãºnico. El QR no contiene datos personales.
      </p>
      
    </div>
  )
}
