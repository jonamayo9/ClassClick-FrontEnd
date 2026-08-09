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
  id: string
  concept: string
  studentName: string
  dueDate: string
  status: string
  navigateTo?: string
  chargeTypeId?: string | null
  chargeTypeName?: string
  period?: string
  amount?: number
}

export interface UpcomingPage {
  items: UpcomingItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ChargeTypeBreakdown {
  chargeTypeId: string | null
  name: string
  total: number
  paid: number
  pending: number
  overdue: number
}

export interface ChargeDistribution {
  segments: DonutSegment[]
  byType: ChargeTypeBreakdown[]
}

export interface CoverageByType {
  documentTypeName: string
  totalStudents: number
  completed: number
  percentage: number
}
