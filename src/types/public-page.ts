export type LogoSize = 'small' | 'medium' | 'large'
export type HeroTextAlignment = 'left' | 'center' | 'right'

export interface PublicPageImage {
  id: string
  imageUrl: string
  altText?: string | null
  caption?: string | null
  sortOrder: number
}

export type FormFieldType = 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'checkbox'

export interface ContactFormField {
  name: string
  label: string
  type: FormFieldType
  enabled: boolean
  required: boolean
  order: number
  options?: string[]
  placeholder?: string
}

export type ContactFormConfig = ContactFormField[]

export interface PublicPageConfig {
  companyId: string
  isEnabled: boolean
  headline?: string
  description?: string
  visualStyle: string
  colorPreset: string
  instagramUrl?: string
  facebookUrl?: string
  whatsAppNumber?: string
  publicEmail?: string
  publicPhone?: string
  publicAddress?: string
  showActivities: boolean
  showContactSection: boolean
  publishedAtUtc?: string
  companySlugLanding?: string
  logoUrl?: string
  bannerImageUrl?: string
  bannerFocalPointX: number
  bannerFocalPointY: number
  logoPositionX: number
  logoPositionY: number
  logoSize: LogoSize
  heroTextAlignment: HeroTextAlignment
  images: PublicPageImage[]
  contactFormConfig?: string
}

export interface UpdatePublicPage {
  headline?: string | null
  description?: string | null
  visualStyle: string
  colorPreset: string
  instagramUrl?: string | null
  facebookUrl?: string | null
  whatsAppNumber?: string | null
  publicEmail?: string | null
  publicPhone?: string | null
  publicAddress?: string | null
  showActivities: boolean
  showContactSection: boolean
  bannerFocalPointX: number
  bannerFocalPointY: number
  logoPositionX: number
  logoPositionY: number
  logoSize: LogoSize
  heroTextAlignment: HeroTextAlignment
  contactFormConfig?: string | null
}

export interface ActivitySchedule {
  day: string
  startTime: string
  endTime: string
}

export interface PublicLandingActivity {
  id: string
  name: string
  description?: string
  teacherName?: string
  teacherPhoto?: string
  schedule?: ActivitySchedule[]
}

export interface PublicLanding {
  company: {
    name: string
    companySlugLanding: string
    logoUrl?: string
    bannerImageUrl?: string
    bannerFocalPointX: number
    bannerFocalPointY: number
    logoPositionX: number
    logoPositionY: number
    logoSize: LogoSize
    heroTextAlignment: HeroTextAlignment
    headline?: string
    description?: string
    visualStyle: string
    colorPreset: string
    contact?: {
      instagram?: string
      facebook?: string
      whatsApp?: string
      email?: string
      phone?: string
      address?: string
    }
  }
  activities: PublicLandingActivity[]
  gallery: Array<{
    imageUrl: string
    altText?: string
    caption?: string
  }>
  contactFormConfig?: string
}

export interface PublicPageInquiry {
  id: string
  status: 'new' | 'contacted' | 'closed'
  responsesJson: string
  createdAtUtc: string
}
