import { useState, useRef, useCallback } from 'react'
import { apiService } from '@/lib/api'
import type { ScanAttendanceResponse, ScanRegisterResponse, ScanResolveResponse } from '@/types/attendance'

export interface UseScanAttendanceResult {
  scan: (qrToken: string, classId: string) => Promise<ScanAttendanceResponse>
  isScanning: boolean
  error: string | null
  resetError: () => void
}

export function useScanAttendance(): UseScanAttendanceResult {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scanningRef = useRef(false)

  const scan = useCallback(async (qrToken: string, classId: string) => {
    if (scanningRef.current) throw new Error('already_scanning')
    scanningRef.current = true
    setIsScanning(true)
    setError(null)
    try {
      const result = await apiService.post<ScanAttendanceResponse>('/api/attendance/scan', { qrToken, classId })
      return result
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: ScanAttendanceResponse; status?: number }; message?: string }
      if (axiosError?.response?.data?.status) {
        return axiosError.response.data as ScanAttendanceResponse
      }
      throw err
    } finally {
      scanningRef.current = false
      setIsScanning(false)
    }
  }, [])

  const resetError = useCallback(() => setError(null), [])

  return { scan, isScanning, error, resetError }
}

export interface UseResolveAttendanceResult {
  resolve: (qrToken: string) => Promise<ScanResolveResponse>
  isResolving: boolean
  error: string | null
  resetError: () => void
}

export function useResolveAttendance(): UseResolveAttendanceResult {
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resolvingRef = useRef(false)

  const resolve = useCallback(async (qrToken: string) => {
    if (resolvingRef.current) throw new Error('already_scanning')
    resolvingRef.current = true
    setIsResolving(true)
    setError(null)
    try {
      const result = await apiService.post<ScanResolveResponse>('/api/attendance/scan/resolve', { qrToken })
      return result
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: ScanResolveResponse; status?: number }; message?: string }
      if (axiosError?.response?.data?.status) {
        return axiosError.response.data as ScanResolveResponse
      }
      throw err
    } finally {
      resolvingRef.current = false
      setIsResolving(false)
    }
  }, [])

  const resetError = useCallback(() => setError(null), [])

  return { resolve, isResolving, error, resetError }
}

export interface UseRegisterAttendanceResult {
  register: (qrToken: string, classIds: string[]) => Promise<ScanRegisterResponse>
  isRegistering: boolean
  error: string | null
  resetError: () => void
}

export function useRegisterAttendance(): UseRegisterAttendanceResult {
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const registeringRef = useRef(false)

  const register = useCallback(async (qrToken: string, classIds: string[]) => {
    if (registeringRef.current) throw new Error('already_scanning')
    registeringRef.current = true
    setIsRegistering(true)
    setError(null)
    try {
      const result = await apiService.post<ScanRegisterResponse>('/api/attendance/scan/register', {
        qrToken,
        classIds,
      })
      return result
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: ScanRegisterResponse; status?: number }; message?: string }
      if (axiosError?.response?.data?.status) {
        return axiosError.response.data as ScanRegisterResponse
      }
      throw err
    } finally {
      registeringRef.current = false
      setIsRegistering(false)
    }
  }, [])

  const resetError = useCallback(() => setError(null), [])

  return { register, isRegistering, error, resetError }
}
