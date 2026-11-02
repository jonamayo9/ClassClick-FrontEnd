export type LegalDocumentType = 'PrivacyPolicy' | 'TermsOfUse'

export interface LegalDocument {
  id: string
  type: LegalDocumentType
  version: string
  title: string
  contentHtml: string
  contentHash: string
  publishedAtUtc: string
  requiresAcceptance: boolean
}

export interface LegalDocumentStatus {
  id: string
  type: LegalDocumentType
  version: string
  title: string
  publishedAtUtc: string
  requiresAcceptance: boolean
  acceptedAtUtc?: string | null
}

export interface LegalStatus {
  requiresAcceptance: boolean
  current: LegalDocumentStatus[]
  pending: LegalDocumentStatus[]
  accepted: LegalDocumentStatus[]
}

export interface AcceptLegalDocumentsRequest {
  privacyVersion?: string | null
  termsVersion?: string | null
  source?: 'web' | 'pwa' | 'mobile'
  companyId?: string | null
}
