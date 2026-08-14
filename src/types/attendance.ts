export interface ScanAttendanceStudent {
  fullName: string
  profilePhotoUrl?: string | null
  cardNumber: string
  courseName: string
}

export interface ScanAttendanceResponse {
  status: string
  message?: string
  attendanceId?: string
  alreadyRegistered?: boolean
  student?: ScanAttendanceStudent
  financialStatus?: string
  attendanceTime?: string
}

// ============ Workflow (Etapa 3) ============

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface PendingAttendanceItem {
  classId: string
  courseId: string
  courseName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  studentId: string
  studentName: string
  dni?: string | null
}

export interface HistoryAttendanceItem {
  attendanceId: string
  classId: string
  courseId: string
  courseName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  studentId: string
  studentName: string
  dni?: string | null
  present: boolean
  source: string
  registeredAtUtc?: string | null
  registeredByName?: string | null
}

export interface SaveAttendanceItem {
  classId: string
  studentId: string
  present: boolean
}

export interface OverdueCharge {
  chargeTypeName: string
  month: number
  year: number
  courseName: string
}

export interface OverdueStudent {
  studentId: string
  studentName: string
  overdueCharges: OverdueCharge[]
}

export interface SaveAttendanceResult {
  created: string[]
  updated: string[]
  skipped: string[]
  qrLocked: string[]
  requiresConfirmation?: boolean
  overdueStudents?: OverdueStudent[]
}

export type MarkState = 'unmarked' | 'present' | 'absent'

// ============ Scan-first (Etapa 4) ============

export interface ScanPendingClass {
  classId: string
  courseId: string
  courseName: string
  dayOfWeek: string
  startTime: string
  endTime: string
}

export interface ScanResolveStudent {
  fullName: string
  profilePhotoUrl?: string | null
  cardNumber: string
}

export interface ScanResolveResponse {
  status: string
  message?: string
  student?: ScanResolveStudent
  financialStatus?: string
  attendanceId?: string
  attendanceTime?: string
  hasClassesToday?: boolean
  pendingClasses?: ScanPendingClass[]
  alreadyRegistered?: ScanPendingClass[]
  registeredClass?: ScanPendingClass
}

export interface ScanRegisterResponse {
  status: string
  message?: string
  registered: string[]
  already: string[]
  notPending: string[]
  attendanceTime?: string
}
