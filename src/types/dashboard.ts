export interface AdminDashboardDto {
  activeStudents: number
  activeTeachers: number
  activeCourses: number
  activeClasses: number
  todayClassesCount: number
  todayAttendancesCount: number
  pendingPaymentReviews: number
  pendingMonthlyCharges: number
  overdueMonthlyCharges: number
  totalDebt: number
  totalCollectedThisMonth: number
  approvedPaymentsThisMonth: number
  rejectedPaymentsThisMonth: number
  // New KPIs
  newStudentsThisMonth: number
  pendingInquiries: number
  monthlyIncome: number
  collectionRate: number
  averageAttendance: number
  documentCompliance: number
  previousStudents?: number | null
  previousIncome?: number | null
}

export interface DonutSegment {
  label: string
  count: number
  percentage: number
  color: string
  navigateTo?: string
}

export interface EvolutionPoint {
  period: string
  value: number
}

export interface AlertItem {
  type: string
  severity: string
  title: string
  message: string
  count: number
  navigateTo?: string
}

export interface UpcomingItem {
  concept: string
  studentName: string
  dueDate: string
  status: string
  navigateTo?: string
}

export interface CoverageByType {
  documentTypeName: string
  totalStudents: number
  completed: number
  percentage: number
}
