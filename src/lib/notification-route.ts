type NotificationData = Record<string, unknown>

const legacyRoutes: Record<string, string> = {
  '/src/pages/student/home/index.html': '/student',
  '/src/pages/student/profile/index.html': '/student/siblings',
  '/src/pages/student/payments/index.html': '/student/payments',
  '/src/pages/student/documents/index.html': '/student/documents',
  '/src/pages/student/files/index.html': '/student/documents',
  '/src/pages/admin/payments/index.html': '/admin/payments',
  '/src/pages/admin/student-files/index.html': '/admin/records',
  '/src/pages/admin/students/sibling-links/index.html': '/admin/siblings',
  '/src/pages/admin/payment-settings/index.html': '/admin/company',
}

function roleHome(role?: string | null) {
  const normalizedRole = role?.toLowerCase()
  if (normalizedRole === 'superadmin') return '/superadmin'
  if (normalizedRole === 'admin') return '/admin'
  if (normalizedRole === 'teacher') return '/teacher'
  return '/student'
}

export function normalizeNotificationUrl(
  value: string | null | undefined,
  role?: string | null,
): string | null {
  const raw = value?.trim()
  if (!raw) return null

  let path = raw
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path)
      path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return roleHome(role)
    }
  }

  if (!path.startsWith('/')) path = `/${path}`

  const queryIndex = path.search(/[?#]/)
  const pathname = (queryIndex >= 0 ? path.slice(0, queryIndex) : path)
    .replace(/\/+$/, '')
    .toLowerCase()
  const suffix = queryIndex >= 0 ? path.slice(queryIndex) : ''
  const legacyTarget = legacyRoutes[pathname]

  if (legacyTarget) return `${legacyTarget}${suffix}`
  if (pathname.startsWith('/src/pages/student/')) return '/student'
  if (pathname.startsWith('/src/pages/admin/')) return '/admin'
  if (pathname.startsWith('/src/pages/teacher/')) return '/teacher'
  if (pathname.startsWith('/src/pages/superadmin/')) return '/superadmin'

  return path
}

export function resolveNotificationRoute({
  type,
  data,
  url,
  role,
}: {
  type?: string
  data?: NotificationData
  url?: string
  role?: string | null
}) {
  const explicitUrl = normalizeNotificationUrl(
    url ?? String(data?.url ?? data?.Url ?? ''),
    role,
  )
  if (explicitUrl) return explicitUrl

  const notificationType = type?.toLowerCase() ?? ''
  const normalizedRole = role?.toLowerCase() ?? 'student'
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin'

  if (notificationType.includes('sibling')) {
    return isAdmin ? '/admin/siblings' : '/student/siblings'
  }

  if (notificationType.includes('document')) {
    return isAdmin ? '/admin/records' : '/student/documents'
  }

  if (notificationType.includes('financing')) {
    return isAdmin ? '/admin/charge-settings?tab=financing' : '/student/payments'
  }

  if (
    notificationType.includes('payment') ||
    notificationType.includes('charge') ||
    notificationType.includes('refund')
  ) {
    return isAdmin ? '/admin/payments' : '/student/payments'
  }

  if (notificationType.includes('clothing')) {
    const orderId = data?.orderId ?? data?.OrderId
    if (!isAdmin && orderId) return `/student/clothing/order/${orderId}`
    return isAdmin ? '/admin/clothing/orders' : '/student/clothing/orders'
  }

  if (notificationType.includes('course_message')) {
    const courseId = data?.courseId ?? data?.CourseId
    if (courseId) {
      const rolePrefix = normalizedRole === 'teacher' ? 'teacher' : isAdmin ? 'admin' : 'student'
      return `/${rolePrefix}/courses/${courseId}?tab=muro`
    }
  }

  if (notificationType.includes('tournament')) {
    return isAdmin ? '/admin/tournaments' : '/student/matches'
  }

  if (notificationType.includes('match')) {
    return isAdmin ? '/admin/matches' : '/student/matches'
  }

  return roleHome(role)
}
