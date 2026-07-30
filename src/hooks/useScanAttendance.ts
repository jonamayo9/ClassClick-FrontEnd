import { useState, useRef, useCallback } from 'react'
import { apiService } from '@/lib/api'
import type { ScanAttendanceResponse } from '@/types/attendance'

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
