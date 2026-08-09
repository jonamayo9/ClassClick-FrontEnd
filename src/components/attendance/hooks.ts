import { useEffect, useState } from 'react'
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
  return role === 'admin'
    ? `/api/admin/${slug}/attendance/workflow`
    : '/api/teacher/attendance/workflow'
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

  if (role === 'admin') {
    const classes = (adminClasses.data ?? []) as ClassOption[]
    const coursesMap = new Map<string, string>()
    classes.forEach((c) => {
      if (c.courseId && c.courseName) coursesMap.set(c.courseId, c.courseName)
    })
    const courses = Array.from(coursesMap.entries()).map(([id, name]) => ({ id, name }))
    return { courses, classes, isLoading: adminClasses.isLoading }
  }

  const courses = (teacherCourses.data ?? []) as CourseOption[]
  const classes = (teacherClasses.data ?? []) as ClassOption[]
  return { courses, classes, isLoading: teacherCourses.isLoading || teacherClasses.isLoading }
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
    mutationFn: (body: { date: string; items: SaveAttendanceItem[] }) =>
      apiService.post<SaveAttendanceResult>(`${base}/save`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-pending'] })
      qc.invalidateQueries({ queryKey: ['attendance-history'] })
    },
  })
}
