import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

function useSlug() {
  return useAuth((s) => s.activeCompanySlug ?? '')
}

export interface ClassSchedule {
  id: string
  courseId: string
  courseName?: string
  dayOfWeek: number
  startTime: string
  endTime?: string
  isActive?: boolean
}

export interface AttendanceRecord {
  studentId: string
  studentName?: string
  dni?: string
  present: boolean
}

export function useClasses() {
  const slug = useSlug()
  return useQuery({
    queryKey: ['admin-classes', slug],
    queryFn: () => apiService.get<ClassSchedule[]>(`/api/admin/${slug}/classes`),
    enabled: !!slug,
    select: (data: unknown) => {
      if (Array.isArray(data)) return data as ClassSchedule[]
      const d = data as { items?: ClassSchedule[]; data?: ClassSchedule[] }
      return d.items ?? d.data ?? []
    },
  })
}

export function useClassAttendance(classId: string | null, date: string | null) {
  const slug = useSlug()
  return useQuery({
    queryKey: ['class-attendance', slug, classId, date],
    queryFn: () => apiService.get<AttendanceRecord[]>(`/api/admin/${slug}/attendance/${classId}/${date}`),
    enabled: !!classId && !!date && !!slug,
    select: (data: unknown) => {
      if (Array.isArray(data)) return data as AttendanceRecord[]
      const d = data as { items?: AttendanceRecord[]; data?: AttendanceRecord[] }
      return d.items ?? d.data ?? []
    },
    structuralSharing: true,
  })
}

export function useSaveAttendance() {
  const slug = useSlug()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, date, students }: { classId: string; date: string; students: AttendanceRecord[] }) =>
      apiService.post(`/api/admin/${slug}/attendance`, { classId, date, students }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-attendance'] }),
  })
}
