import { useState, useEffect, useRef, useCallback } from 'react'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface QrTokenResponse {
  token: string
  expiresAt: string
}

export interface UseQrTokenResult {
  token: string | null
  secondsRemaining: number
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

const REFRESH_BEFORE_SECONDS = 30
const INTERVAL_MS = 1000

export function useQrToken(): UseQrTokenResult {
  const slug = useAuth((s) => s.activeCompanySlug)
  const [token, setToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshingRef = useRef(false)
  const mountedRef = useRef(true)

  const fetchToken = useCallback(async () => {
    if (!slug) return
    try {
      setIsRefreshing(true)
      setError(null)
      const res = await apiService.post<QrTokenResponse>(`/api/student/${slug}/card/qr-token`)
      setToken(res.token)
      setExpiresAt(res.expiresAt)
      setIsLoading(false)
    } catch {
      if (!token) {
        setError('No pudimos generar el código QR.')
      } else {
        setError('No pudimos actualizar el código. Reintentaremos automáticamente.')
      }
    } finally {
      setIsRefreshing(false)
      refreshingRef.current = false
    }
  }, [slug, token])

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    await fetchToken()
  }, [fetchToken])

  useEffect(() => {
    mountedRef.current = true
    fetchToken()
    return () => { mountedRef.current = false }
  }, [slug])

  useEffect(() => {
    const update = () => {
      if (!expiresAt) {
        setSecondsRemaining(0)
        return
      }
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsRemaining(remaining)

      if (remaining <= 0 && token) {
        setToken(null)
        setError('El código QR venció.')
        refresh()
        return
      }

      if (remaining <= REFRESH_BEFORE_SECONDS && token && !refreshingRef.current) {
        refresh()
      }
    }

    update()
    timerRef.current = setInterval(update, INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [expiresAt, token, refresh])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!expiresAt) return
        const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setSecondsRemaining(remaining)
        if (remaining <= 0) {
          refresh()
        } else if (remaining <= REFRESH_BEFORE_SECONDS && !refreshingRef.current) {
          refresh()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [expiresAt, refresh])

  return { token, secondsRemaining, isLoading, isRefreshing, error, refresh }
}
