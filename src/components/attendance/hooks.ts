import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import type {
  PagedResult,
  PendingAttendanceItem,
  HistoryAttendanceItem,
  SaveAttendanceItem,
  SaveAttendanceResult,
} from '@/types/attendance'
import type { AttendanceRole, ClassOption, CourseOption } from './utils'

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function useWorkflowBase(role: AttendanceRole): string {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')
  if (role === 'admin') return `/api/admin/${slug}/attendance/workflow`
  if (role === 'delegate') return `/api/delegate/${slug}/attendance/workflow`
  return '/api/teacher/attendance/workflow'
}

export function useCourseOptions(role: AttendanceRole): {
  courses: CourseOption[]
  classes: ClassOption[]
  isLoading: boolean
} {
  const slug = useAuth((s) => s.activeCompanySlug ?? '')

  const adminClasses = useQuery({
    queryKey: ['admin-classes', slug],
    queryFn: () => apiService.get<ClassOption[]>(`/api/admin/${slug}/classes`),
    enabled: role === 'admin' && !!slug,
  })

  const teacherCourses = useQuery({
    queryKey: ['teacher-courses', slug],
    queryFn: () => apiService.get<CourseOption[]>(`/api/teacher/courses`),
    enabled: role === 'teacher' && !!slug,
  })

  const teacherClasses = useQuery({
    queryKey: ['teacher-classes', slug],
    queryFn: () => apiService.get<ClassOption[]>(`/api/teacher/classes`),
    enabled: role === 'teacher' && !!slug,
  })

  const delegateCourses = useQuery({
    queryKey: ['delegate-courses', slug],
    queryFn: () => apiService.get<CourseOption[]>(`/api/delegate/${slug}/courses`),
    enabled: role === 'delegate' && !!slug,
  })

  const delegateClasses = useQuery({
    queryKey: ['delegate-classes', slug],
    queryFn: () => apiService.get<ClassOption[]>(`/api/delegate/${slug}/attendance/classes`),
    enabled: role === 'delegate' && !!slug,
  })

  // Referencias ESTABLES: evita que clases/cursos cambien de identidad en cada render
  // y hagan re-disparar effects que los usan como dependencia (loop de renders).
  const classes = useMemo<ClassOption[]>(() => {
    if (role === 'delegate') return delegateClasses.data ?? []
    if (role === 'admin') return adminClasses.data ?? []
    return teacherClasses.data ?? []
  }, [role, adminClasses.data, teacherClasses.data, delegateClasses.data])

  const courses = useMemo<CourseOption[]>(() => {
    if (role === 'delegate') return delegateCourses.data ?? []
    if (role === 'admin') {
      const map = new Map<string, string>()
      classes.forEach((c) => {
        if (c.courseId && c.courseName) map.set(c.courseId, c.courseName)
      })
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
    }
    return teacherCourses.data ?? []
  }, [role, classes, delegateCourses.data, teacherCourses.data])

  const isLoading =
    role === 'delegate'
      ? delegateCourses.isLoading || delegateClasses.isLoading
      : role === 'admin'
        ? adminClasses.isLoading
        : teacherCourses.isLoading || teacherClasses.isLoading

  return { courses, classes, isLoading }
}

export interface PendingQueryArgs {
  date: string
  courseId: string
  classId: string
  search: string
  page: number
}

export function usePendingAttendance(base: string, args: PendingQueryArgs) {
  return useQuery({
    queryKey: ['attendance-pending', base, args.date, args.courseId, args.classId, args.search, args.page],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('date', args.date)
      params.set('page', String(args.page))
      params.set('pageSize', '20')
      if (args.courseId) params.set('courseId', args.courseId)
      if (args.classId) params.set('classId', args.classId)
      if (args.search) params.set('search', args.search)
      return apiService.get<PagedResult<PendingAttendanceItem>>(`${base}/pending?${params.toString()}`)
    },
    enabled: !!base && !!args.date,
    placeholderData: (prev) => prev,
  })
}

export interface HistoryQueryArgs extends PendingQueryArgs {
  present: string
  source: string
}

export function useAttendanceHistory(base: string, args: HistoryQueryArgs) {
  return useQuery({
    queryKey: ['attendance-history', base, args.date, args.courseId, args.classId, args.search, args.present, args.source, args.page],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('date', args.date)
      params.set('page', String(args.page))
      params.set('pageSize', '20')
      if (args.courseId) params.set('courseId', args.courseId)
      if (args.classId) params.set('classId', args.classId)
      if (args.search) params.set('search', args.search)
      if (args.present === 'true' || args.present === 'false') params.set('present', args.present)
      if (args.source) params.set('source', args.source)
      return apiService.get<PagedResult<HistoryAttendanceItem>>(`${base}/history?${params.toString()}`)
    },
    enabled: !!base && !!args.date,
    placeholderData: (prev) => prev,
  })
}

export function useSaveWorkflowAttendance(base: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { date: string; items: SaveAttendanceItem[]; authorizedOverdueStudentIds?: string[] }) =>
      apiService.post<SaveAttendanceResult>(`${base}/save`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-pending'] })
      qc.invalidateQueries({ queryKey: ['attendance-history'] })
    },
  })
}
