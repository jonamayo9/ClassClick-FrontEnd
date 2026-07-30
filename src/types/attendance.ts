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
