export interface DocRow {
  studentId: string
  fullName: string
  dni: string | null
  memberNumber: string | null
  email: string | null
  courseNames: string[]
  isActive: boolean
  pendingCount: number
  submittedCount: number
  approvedCount: number
  rejectedCount: number
  expiredCount: number
}

export interface DocType {
  id: string
  name: string
  isRequired: boolean
  hasExpiration: boolean
  maxValidityDays: number | null
}

export interface DocFile {
  id: string
  fileName: string
  mimeType: string
  uploadedAtUtc: string
}

export interface DocItem {
  assignmentId: string
  documentTypeId: string
  documentTypeName: string
  isRequired: boolean
  status: string
  requestNote: string | null
  reviewNote: string | null
  assignedAtUtc: string
  dueDateUtc: string | null
  submittedAtUtc: string | null
  reviewedAtUtc: string | null
  expirationDateUtc: string | null
  currentFileId: string | null
  currentFileName: string | null
  currentFileMimeType: string | null
  files: DocFile[]
}

export interface DocDetail {
  studentId: string
  fullName: string
  dni: string | null
  memberNumber: string | null
  email: string | null
  visibleCourses: { id: string; name: string }[]
  documents: DocItem[]
}
