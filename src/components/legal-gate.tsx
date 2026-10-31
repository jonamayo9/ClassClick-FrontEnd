import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth'
import { apiService } from '@/lib/api'
import type { LegalStatus } from '@/types/legal'

const publicPaths = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/prueba-gratis',
  '/privacidad',
  '/terminos',
  '/legal/accept',
  '/educativa',
  '/deportiva',
]

const publicPrefixes = ['/e/', '/c/', '/tienda/', '/access/']

function isPublicPath(pathname: string) {
  if (publicPaths.includes(pathname)) return true
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix))
}

export function LegalGate() {
  const { token, user, setLegalStatus } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const enabled = !!token && !!user && !isPublicPath(pathname)

  const statusQuery = useQuery({
    queryKey: ['legal-status'],
    queryFn: () => apiService.get<LegalStatus>('/api/legal/status'),
    enabled,
    retry: false,
    staleTime: 0,
  })

  useEffect(() => {
    if (!enabled || !statusQuery.data) return

    setLegalStatus(statusQuery.data.requiresAcceptance, statusQuery.data.pending)

    if (statusQuery.data.requiresAcceptance && pathname !== '/legal/accept') {
      const redirect = `${pathname}${location.search}`
      navigate(`/legal/accept?redirect=${encodeURIComponent(redirect)}`, { replace: true })
    }
  }, [enabled, location.search, navigate, pathname, setLegalStatus, statusQuery.data])

  if (!enabled) return null

  if (statusQuery.isLoading || (statusQuery.data?.requiresAcceptance && pathname !== '/legal/accept')) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-cc-bg px-4 text-cc-text">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src="/icons/icon-512.png"
            alt="ClassClick"
            className="h-16 w-16 rounded-2xl border border-cc-border bg-white p-1 shadow-2xl"
          />
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-cc-border border-t-cc-blue" />
          <p className="text-sm font-semibold text-cc-muted">Verificando documentos legales...</p>
        </div>
      </div>
    )
  }

  return null
}
