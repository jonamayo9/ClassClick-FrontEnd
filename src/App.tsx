import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { useAuth } from '@/stores/auth'
import { resolveHomePath } from '@/lib/auth-route'
import { storage } from '@/lib/storage'
import { apiService } from '@/lib/api'
import { PwaInstallPrompt } from '@/components/pwa-install'
import { IosPwaPrompt } from '@/components/ios-pwa-prompt'
import { BiometricAppLock } from '@/components/biometric-app-lock'
import { ModuleGuard } from '@/components/module-guard'
import { PermissionGuard } from '@/components/permission-guard'
import { ClothingSlugBinder } from '@/lib/clothing-context'
import { RootLayout } from '@/components/layouts/root-layout'
import { LandingPage } from '@/pages/landing'
import { PlaceholderPage } from '@/pages/admin/_placeholder'

function lazyDefault(loader: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(loader)
}

function lazyNamed(loader: () => Promise<Record<string, any>>, name: string) {
  return lazy(() => loader().then((module) => ({ default: module[name] as ComponentType<any> })))
}

const AppLayout = lazyNamed(() => import('@/components/layouts/app-layout'), 'AppLayout')

const EducativaLandingPage = lazyNamed(() => import('@/pages/landing/educativa'), 'EducativaLandingPage')
const DeportivaLandingPage = lazyNamed(() => import('@/pages/landing/deportiva'), 'DeportivaLandingPage')
const TrialSignupPage = lazyNamed(() => import('@/pages/landing/trial-signup'), 'TrialSignupPage')
const PrivacyPage = lazyNamed(() => import('@/pages/landing/legal'), 'PrivacyPage')
const TermsPage = lazyNamed(() => import('@/pages/landing/legal'), 'TermsPage')
const LoginPage = lazyNamed(() => import('@/pages/auth/login'), 'LoginPage')
const ForgotPasswordPage = lazyNamed(() => import('@/pages/auth/forgot-password'), 'ForgotPasswordPage')
const ResetPasswordPage = lazyNamed(() => import('@/pages/auth/reset-password'), 'ResetPasswordPage')

const AdminDashboard = lazyNamed(() => import('@/pages/admin/dashboard'), 'AdminDashboard')
const PaymentsPage = lazyDefault(() => import('@/pages/admin/payments/page'))
const StudentsPage = lazyDefault(() => import('@/pages/admin/students/page'))
const CoursesPage = lazyDefault(() => import('@/pages/admin/courses/page'))
const AdminCourseDetailPage = lazyDefault(() => import('@/pages/admin/courses/detail'))
const TeachersPage = lazyDefault(() => import('@/pages/admin/teachers/page'))
const ClassesPage = lazyDefault(() => import('@/pages/admin/classes/page'))
const RecordsPage = lazyDefault(() => import('@/pages/admin/records/page'))
const SiblingsPage = lazyDefault(() => import('@/pages/admin/siblings/page'))
const PricingPage = lazyDefault(() => import('@/pages/admin/pricing/page'))
const ChargeSettingsPage = lazyDefault(() => import('@/pages/admin/charge-settings/page'))
const CompanyPage = lazyDefault(() => import('@/pages/admin/company/page'))
const ProfilePage = lazyDefault(() => import('@/pages/admin/profile/page'))
const SponsorsPage = lazyDefault(() => import('@/pages/admin/sponsors/page'))
const AnnouncementsPage = lazyDefault(() => import('@/pages/admin/announcements/page'))
const EventsPage = lazyDefault(() => import('@/pages/admin/events/page'))
const EventCheckInPage = lazyDefault(() => import('@/pages/admin/events/check-in'))
const EventReportPage = lazyDefault(() => import('@/pages/admin/events/report'))
const AdminEventManagementPage = lazyDefault(() => import('@/pages/admin/events/manage'))
const EventOperatorsPage = lazyDefault(() => import('@/pages/admin/events/operators'))
const OperatorLayout = lazyNamed(() => import('@/pages/event-operator/layout'), 'OperatorLayout')
const OperatorEventsPage = lazyDefault(() => import('@/pages/event-operator/events'))
const OperatorProfilePage = lazyDefault(() => import('@/pages/event-operator/profile'))
const ClothingPage = lazyDefault(() => import('@/pages/admin/clothing/page'))
const CategoriesPage = lazyDefault(() => import('@/pages/admin/clothing/categories/page'))
const ProductsPage = lazyDefault(() => import('@/pages/admin/clothing/products/page'))
const StockPage = lazyDefault(() => import('@/pages/admin/clothing/stock/page'))
const OrdersPage = lazyDefault(() => import('@/pages/admin/clothing/orders/page'))
const PaymentProofsPage = lazyDefault(() => import('@/pages/admin/clothing/payment-proofs/page'))
const CancellationsPage = lazyDefault(() => import('@/pages/admin/clothing/cancellations/page'))
const SettingsPage = lazyDefault(() => import('@/pages/admin/clothing/settings/page'))
const DeliveryZonesPage = lazyDefault(() => import('@/pages/admin/clothing/delivery-zones/page'))
const PublicClothingStorePage = lazyDefault(() => import('@/pages/public/clothing-store/page'))
const PublicClothingOrderPage = lazyDefault(() => import('@/pages/public/clothing-store/order'))
const AttendancePage = lazyDefault(() => import('@/pages/admin/attendance/page'))
const AdminQrScanPage = lazyDefault(() => import('@/pages/admin/attendance/qr-scan'))
const StaffAttendancePage = lazyDefault(() => import('@/pages/admin/attendance/staff'))
const TeacherAttendancePage = lazyDefault(() => import('@/pages/teacher/attendance/page'))
const TeacherQrScanPage = lazyDefault(() => import('@/pages/teacher/attendance/qr-scan'))
const TeacherHomePage = lazyDefault(() => import('@/pages/teacher/home'))
const TeacherCoursesPage = lazyDefault(() => import('@/pages/teacher/courses'))
const TeacherCourseDetailPage = lazyDefault(() => import('@/pages/teacher/course-detail'))
const TeacherProfilePage = lazyDefault(() => import('@/pages/teacher/profile'))
const RegistrationPage = lazyDefault(() => import('@/pages/student/registration/page'))
const DelegateHomePage = lazyDefault(() => import('@/pages/delegate/home'))
const DelegateStudentsPage = lazyDefault(() => import('@/pages/delegate/students/page'))
const DelegateStudentDetailPage = lazyDefault(() => import('@/pages/delegate/students/detail'))
const DelegateDocumentsPage = lazyDefault(() => import('@/pages/delegate/documents/page'))
const DelegatePaymentsPage = lazyDefault(() => import('@/pages/delegate/payments/page'))
const DelegateAttendancePage = lazyDefault(() => import('@/pages/delegate/attendance/page'))
const StudentHome = lazyNamed(() => import('@/pages/student/home'), 'StudentHome')
const StudentCoursesPage = lazyDefault(() => import('@/pages/student/courses/page'))
const CourseDetailPage = lazyDefault(() => import('@/pages/student/courses/detail'))
const StudentEventsPage = lazyDefault(() => import('@/pages/student/events/page'))
const StudentEventDetailPage = lazyDefault(() => import('@/pages/student/events/detail'))
const StudentEventPaymentResultPage = lazyDefault(() => import('@/pages/student/events/payment-result'))
const StudentEventsHistoryPage = lazyDefault(() => import('@/pages/student/events/history'))
const StudentPaymentsPage = lazyDefault(() => import('@/pages/student/payments/page'))
const MercadoPagoResultPage = lazyDefault(() => import('@/pages/student/payments/result'))
const StudentProfilePage = lazyDefault(() => import('@/pages/student/profile/page'))
const StudentSiblingsPage = lazyDefault(() => import('@/pages/student/siblings/page'))
const StudentDocumentsPage = lazyDefault(() => import('@/pages/student/documents/page'))
const StudentClothingCatalog = lazyDefault(() => import('@/pages/student/clothing/page'))
const StudentClothingOrders = lazyDefault(() => import('@/pages/student/clothing/orders/page'))
const StudentClothingOrderDetail = lazyDefault(() => import('@/pages/student/clothing/order-detail'))
const PublicPageAdmin = lazyDefault(() => import('@/pages/admin/public-page/page'))
const PublicEventPage = lazyDefault(() => import('@/pages/public-events/event'))
const PublicEventAccessPage = lazyDefault(() => import('@/pages/public-events/access'))
const AdminBillingPage = lazyDefault(() => import('@/pages/admin/billing/page'))
const PublicLandingPage = lazyDefault(() => import('@/pages/public/landing'))
const SuperAdminDashboard = lazyNamed(() => import('@/pages/superadmin/dashboard'), 'SuperAdminDashboard')
const SuperAdminCompaniesPage = lazyDefault(() => import('@/pages/superadmin/companies'))
const SuperAdminAdminsPage = lazyDefault(() => import('@/pages/superadmin/admins'))
const SuperAdminBillingPage = lazyDefault(() => import('@/pages/superadmin/billing'))
const SuperAdminBillingInvoicesPage = lazyDefault(() => import('@/pages/superadmin/billing-invoices'))
const SuperAdminBillingSettingsPage = lazyDefault(() => import('@/pages/superadmin/billing-settings'))
const SuperAdminDocumentTypesPage = lazyDefault(() => import('@/pages/superadmin/document-types'))
const SuperAdminNewsPage = lazyDefault(() => import('@/pages/superadmin/news'))
const SuperAdminPriceIncreasesPage = lazyDefault(() => import('@/pages/superadmin/price-increases'))
const GroupAdminPage = lazyNamed(() => import('@/pages/group-admin/page'), 'GroupAdminPage')
const EducativaCommissionsPage = lazyNamed(() => import('@/pages/educativa/commissions/page'), 'EducativaCommissionsPage')
const EducativaEnrollmentsPage = lazyNamed(() => import('@/pages/educativa/enrollments/page'), 'EducativaEnrollmentsPage')
const EducativaEnrollmentDetailPage = lazyNamed(() => import('@/pages/educativa/enrollment-detail/page'), 'EducativaEnrollmentDetailPage')
const EstudianteHomePage = lazyNamed(() => import('@/pages/estudiante/home/page'), 'EstudianteHomePage')
const EstudianteFormacionesPage = lazyNamed(() => import('@/pages/estudiante/formaciones/page'), 'EstudianteFormacionesPage')
const EstudianteFormacionDetailPage = lazyNamed(() => import('@/pages/estudiante/formaciones/[enrollmentId]/page'), 'EstudianteFormacionDetailPage')
const EstudiantePagosPage = lazyNamed(() => import('@/pages/estudiante/pagos/page'), 'EstudiantePagosPage')
const EstudianteMercadoPagoResultPage = lazyNamed(() => import('@/pages/estudiante/pagos/mercadopago-result'), 'EstudianteMercadoPagoResultPage')
const EstudianteCertificacionesPage = lazyNamed(() => import('@/pages/estudiante/certificaciones/page'), 'EstudianteCertificacionesPage')
const EducativaDashboardPage = lazyNamed(() => import('@/pages/educativa/dashboard/page'), 'EducativaDashboardPage')
const EducativaCertificacionesPage = lazyNamed(() => import('@/pages/educativa/certificaciones/page'), 'EducativaCertificacionesPage')
const EducativaFormacionesPage = lazyNamed(() => import('@/pages/educativa/formaciones/page'), 'EducativaFormacionesPage')
const EducativaCommissionClassesPage = lazyNamed(() => import('@/pages/educativa/commissions/classes/page'), 'EducativaCommissionClassesPage')
const EducativaAsistenciasPage = lazyNamed(() => import('@/pages/educativa/asistencias/page'), 'EducativaAsistenciasPage')
const PagosPage = lazyDefault(() => import('@/pages/educativa/pagos/page'))
const AlumnosPage = lazyDefault(() => import('@/pages/educativa/alumnos/page'))
const DocentesPage = lazyDefault(() => import('@/pages/educativa/docentes/page'))
const EducativaClasesPage = lazyNamed(() => import('@/pages/educativa/clases/page'), 'EducativaClasesPage')
const ConfigPagosPage = lazyDefault(() => import('@/pages/educativa/config-pagos/page'))
const ConfigCuotasPage = lazyDefault(() => import('@/pages/educativa/config-cuotas/page'))
const GraduadosPage = lazyDefault(() => import('@/pages/educativa/graduados/page'))
const PromocionesPage = lazyDefault(() => import('@/pages/educativa/promociones/page'))
const EducativaPermissionsPage = lazyNamed(() => import('@/pages/educativa/permissions/page'), 'EducativaPermissionsPage')
const DocenteMisClasesPage = lazyNamed(() => import('@/pages/docente/mis-clases/page'), 'DocenteMisClasesPage')

const queryClient = new QueryClient()

function AuthGate() {
  const hydrate = useAuth((s) => s.hydrate)
  const invalidateLocalSession = useAuth((s) => s.invalidateLocalSession)
  useEffect(() => {
    hydrate()
    function onStorage(event: StorageEvent) {
      if (event.key !== 'classclick_browser_session_id') return
      if (storage.isSessionReplaced()) {
        queryClient.clear()
        invalidateLocalSession()
        window.location.replace('/login?reason=session-replaced')
        return
      }
      hydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [hydrate, invalidateLocalSession])
  return null
}

function RoleRedirect() {
  const { token, user } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  // Resolución única de la ruta de inicio (Group / Child Deportiva / Child Educativa / Individual).
  return <Navigate to={resolveHomePath()} replace />
}

function LandingRoute() {
  const { token, user } = useAuth()
  if (token && user) return <Navigate to={resolveHomePath()} replace />
  return <LandingPage />
}

function GuardedRoute({ moduleCode, children }: { moduleCode?: string; children: React.ReactNode }) {
  return <ModuleGuard moduleCode={moduleCode}>{children}</ModuleGuard>
}

function PermissionedRoute({ code, children }: { code: string; children: React.ReactNode }) {
  return <PermissionGuard code={code}>{children}</PermissionGuard>
}

function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { token, user, activeRole } = useAuth()
  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '') as string
  if (!token || !user) return <Navigate to="/login" replace />
  if (!roles.includes(role)) return <Navigate to={`/${role}`} replace />
  return <>{children}</>
}

/**
 * Evita que un Admin con contexto Group o empresa Educativa renderice /admin
 * (Dashboard Deportivo). Redirige al área correcta. El SuperAdmin no se restringe.
 */
function CompanyContextGuard({ children }: { children: React.ReactNode }) {
  const { activeCompanySlug, companies, mode, activeRole, user } = useAuth()
  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '') as string
  const company = (companies ?? []).find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
  const isWrongContext = role === 'admin' && (
    mode === 'group' || company?.structureType === 'Group' || company?.vertical === 'Educativa'
  )
  if (isWrongContext) return <Navigate to={resolveHomePath()} replace />
  return <>{children}</>
}

function StudentVerticalGate({ children }: { children: React.ReactNode }) {
  const { activeCompanySlug, companies, token, user, activeRole } = useAuth()
  const company = (companies ?? []).find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '')

  const isEducativa = company?.vertical === 'Educativa'

  const statusQuery = useQuery({
    queryKey: ['registration-status', activeCompanySlug],
    queryFn: () => apiService.get<{ registrationCompleted?: boolean }>(
      `/api/student/${activeCompanySlug}/registration/status`,
    ),
    enabled: !isEducativa && !!token && !!user && role === 'student' && !!activeCompanySlug,
    retry: false,
  })

  if (isEducativa) return <Navigate to="/estudiante" replace />

  // Registro obligatorio del alumno (Deportiva): fuera de /register no se accede a /student/*
  // con el registro incompleto. El estado se comparte con RegistrationGate y StudentHome.
  if (statusQuery.isLoading && !statusQuery.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Validando registro...
      </div>
    )
  }
  if (statusQuery.data?.registrationCompleted === false) return <Navigate to="/register" replace />

  return <>{children}</>
}

function RegistrationGate() {
  const { token, user, activeRole, activeCompanySlug, companies } = useAuth()
  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '')
  const statusQuery = useQuery({
    queryKey: ['registration-status', activeCompanySlug],
    queryFn: () => apiService.get<{ registrationCompleted?: boolean }>(
      `/api/student/${activeCompanySlug}/registration/status`,
    ),
    enabled: !!token && !!user && role === 'student' && !!activeCompanySlug,
    retry: false,
  })

  if (!token || !user) return <Navigate to="/login" replace />
  if (role !== 'student') return <Navigate to="/home" replace />
  if (!activeCompanySlug) return <Navigate to="/login" replace />
  if (statusQuery.isLoading) {
    return <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Validando registro...</div>
  }
  if (statusQuery.isError) return <Navigate to="/login" replace />
  if (statusQuery.data?.registrationCompleted) {
    const company = (companies ?? []).find((c) => (c.slug ?? c.companySlug) === activeCompanySlug)
    return <Navigate to={company?.vertical === 'Educativa' ? '/estudiante' : '/student'} replace />
  }
  return <RegistrationPage />
}

function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
    </div>
  )
}

export default function App() {
  const hydrated = useAuth((s) => s.hydrated)
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate />
        {hydrated ? (
          <>
            <BiometricAppLock />
            <PwaInstallPrompt />
            <IosPwaPrompt />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingRoute />} />
                <Route path="educativa" element={<EducativaLandingPage />} />
                <Route path="deportiva" element={<DeportivaLandingPage />} />

                <Route element={<RootLayout />}>
                  <Route path="home" element={<RoleRedirect />} />
                  <Route path="prueba-gratis" element={<TrialSignupPage />} />
                  <Route path="privacidad" element={<PrivacyPage />} />
                  <Route path="terminos" element={<TermsPage />} />
                </Route>

                <Route path="login" element={<LoginPage />} />
                <Route path="e/:publicSlug" element={<PublicEventPage />} />
                <Route path="e/access/:token" element={<PublicEventAccessPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="register" element={<RegistrationGate />} />
                <Route path="c/:companySlug" element={<PublicLandingPage />} />
                <Route path="tienda/:companySlug" element={<PublicClothingStorePage />} />
                <Route path="tienda/:companySlug/pedido/:publicToken" element={<PublicClothingOrderPage />} />

                <Route path="admin" element={<RoleGuard roles={['admin', 'superadmin']}><CompanyContextGuard><AppLayout /></CompanyContextGuard></RoleGuard>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="records" element={<GuardedRoute moduleCode="documents"><RecordsPage /></GuardedRoute>} />
                  <Route path="teachers" element={<TeachersPage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="courses/:id" element={<AdminCourseDetailPage />} />
                  <Route path="classes" element={<ClassesPage />} />
                  <Route path="payments" element={<GuardedRoute moduleCode="payments"><PaymentsPage /></GuardedRoute>} />
                  <Route path="siblings" element={<GuardedRoute moduleCode="payments"><SiblingsPage /></GuardedRoute>} />
                  <Route path="pricing" element={<GuardedRoute moduleCode="payments"><PricingPage /></GuardedRoute>} />
                  <Route path="charge-settings" element={<GuardedRoute moduleCode="payments"><ChargeSettingsPage /></GuardedRoute>} />
                  <Route path="matches" element={<GuardedRoute moduleCode="matches"><PlaceholderPage title="Partidos" description="Programación de partidos" /></GuardedRoute>} />
                  <Route path="tournaments" element={<GuardedRoute moduleCode="tournaments"><PlaceholderPage title="Torneos" description="Gestión de torneos" /></GuardedRoute>} />
                  <Route path="teams" element={<GuardedRoute moduleCode="tournaments"><PlaceholderPage title="Equipos" description="Formación de equipos" /></GuardedRoute>} />
                  <Route path="clothing" element={<GuardedRoute moduleCode="clothing"><Outlet /></GuardedRoute>}>
                    <Route index element={<ClothingPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="stock" element={<StockPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="payment-proofs" element={<PaymentProofsPage />} />
                    <Route path="cancellations" element={<CancellationsPage />} />
                    <Route path="delivery-zones" element={<DeliveryZonesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="announcements" element={<GuardedRoute moduleCode="news"><AnnouncementsPage /></GuardedRoute>} />
                  <Route path="sponsors" element={<GuardedRoute moduleCode="sponsors"><SponsorsPage /></GuardedRoute>} />
                  <Route path="events" element={<GuardedRoute moduleCode="events"><EventsPage /></GuardedRoute>} />
                  <Route path="events/operators" element={<GuardedRoute moduleCode="events"><EventOperatorsPage /></GuardedRoute>} />
                  <Route path="events/:id" element={<GuardedRoute moduleCode="events"><AdminEventManagementPage /></GuardedRoute>} />
                  <Route path="events/:id/check-in" element={<GuardedRoute moduleCode="events"><EventCheckInPage /></GuardedRoute>} />
                  <Route path="events/:id/report" element={<GuardedRoute moduleCode="events"><EventReportPage /></GuardedRoute>} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="attendance/staff" element={<StaffAttendancePage />} />
                  <Route path="attendance/students" element={<Navigate to="/admin/attendance" replace />} />
                  <Route path="attendance/qr-scan" element={<AdminQrScanPage />} />
                  <Route path="attendance/qr-scan/:classId" element={<AdminQrScanPage />} />
                  <Route path="company" element={<CompanyPage />} />
                  <Route path="public-page" element={<PublicPageAdmin />} />
                  <Route path="billing" element={<AdminBillingPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                <Route path="student" element={<RoleGuard roles={['student']}><StudentVerticalGate><AppLayout /></StudentVerticalGate></RoleGuard>}>
                  <Route index element={<StudentHome />} />
                  <Route path="courses" element={<StudentCoursesPage />} />
                  <Route path="courses/:id" element={<CourseDetailPage />} />
                  <Route path="payments" element={<GuardedRoute moduleCode="payments"><StudentPaymentsPage /></GuardedRoute>} />
                  <Route path="payments/mercadopago/result" element={<MercadoPagoResultPage />} />
                  <Route path="profile" element={<StudentProfilePage />} />
                  <Route path="siblings" element={<GuardedRoute moduleCode="payments"><StudentSiblingsPage /></GuardedRoute>} />
                  <Route path="documents" element={<GuardedRoute moduleCode="documents"><StudentDocumentsPage /></GuardedRoute>} />
                  <Route path="clothing" element={<GuardedRoute moduleCode="clothing"><StudentClothingCatalog /></GuardedRoute>} />
                  <Route path="clothing/orders" element={<GuardedRoute moduleCode="clothing"><StudentClothingOrders /></GuardedRoute>} />
                  <Route path="clothing/order/:id" element={<GuardedRoute moduleCode="clothing"><StudentClothingOrderDetail /></GuardedRoute>} />
                  <Route path="matches" element={<GuardedRoute moduleCode="matches"><PlaceholderPage title="Partidos" /></GuardedRoute>} />
                  <Route path="events" element={<GuardedRoute moduleCode="events"><StudentEventsPage /></GuardedRoute>} />
                  <Route path="events/history" element={<GuardedRoute moduleCode="events"><StudentEventsHistoryPage /></GuardedRoute>} />
                  <Route path="events/:id" element={<GuardedRoute moduleCode="events"><StudentEventDetailPage /></GuardedRoute>} />
                  <Route path="events/payment-result" element={<GuardedRoute moduleCode="events"><StudentEventPaymentResultPage /></GuardedRoute>} />
                </Route>

                <Route path="estudiante" element={<RoleGuard roles={['student']}><AppLayout /></RoleGuard>}>
                  <Route index element={<EstudianteHomePage />} />
                  <Route path="formaciones" element={<EstudianteFormacionesPage />} />
                  <Route path="formaciones/:enrollmentId" element={<EstudianteFormacionDetailPage />} />
                  <Route path="pagos" element={<EstudiantePagosPage />} />
                  <Route path="pagos/mercadopago/result" element={<EstudianteMercadoPagoResultPage />} />
                  <Route path="certificaciones" element={<EstudianteCertificacionesPage />} />
                  <Route path="perfil" element={<StudentProfilePage />} />
                  <Route path="tienda" element={<GuardedRoute moduleCode="clothing"><ClothingSlugBinder><StudentClothingCatalog /></ClothingSlugBinder></GuardedRoute>} />
                  <Route path="tienda/pedidos" element={<GuardedRoute moduleCode="clothing"><ClothingSlugBinder><StudentClothingOrders /></ClothingSlugBinder></GuardedRoute>} />
                  <Route path="tienda/pedido/:id" element={<GuardedRoute moduleCode="clothing"><ClothingSlugBinder><StudentClothingOrderDetail /></ClothingSlugBinder></GuardedRoute>} />
                </Route>

                <Route path="superadmin" element={<RoleGuard roles={['superadmin']}><AppLayout /></RoleGuard>}>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="companies" element={<SuperAdminCompaniesPage />} />
                  <Route path="admins" element={<SuperAdminAdminsPage />} />
                  <Route path="billing" element={<SuperAdminBillingPage />} />
                  <Route path="billing/invoices" element={<SuperAdminBillingInvoicesPage />} />
                  <Route path="billing/settings" element={<SuperAdminBillingSettingsPage />} />
                  <Route path="document-types" element={<SuperAdminDocumentTypesPage />} />
                  <Route path="news" element={<SuperAdminNewsPage />} />
                  <Route path="price-increases" element={<SuperAdminPriceIncreasesPage />} />
                </Route>

                <Route path="group-admin/:companySlug" element={<RoleGuard roles={['admin', 'superadmin']}><AppLayout /></RoleGuard>}>
                  <Route index element={<GroupAdminPage />} />
                </Route>

                <Route path="educativa/:companySlug" element={<RoleGuard roles={['admin', 'superadmin']}><AppLayout /></RoleGuard>}>
                  <Route index element={<PermissionedRoute code="dashboard"><EducativaDashboardPage /></PermissionedRoute>} />
                  <Route path="commissions" element={<PermissionedRoute code="commissions"><EducativaCommissionsPage /></PermissionedRoute>} />
                  <Route path="commissions/:commissionId/classes" element={<PermissionedRoute code="commissions"><EducativaCommissionClassesPage /></PermissionedRoute>} />
                  <Route path="commissions/:commissionId/enrollments" element={<PermissionedRoute code="commissions"><EducativaEnrollmentsPage /></PermissionedRoute>} />
                  <Route path="commissions/:commissionId/enrollments/:enrollmentId" element={<PermissionedRoute code="commissions"><EducativaEnrollmentDetailPage /></PermissionedRoute>} />
                  <Route path="formaciones" element={<PermissionedRoute code="trainings"><EducativaFormacionesPage /></PermissionedRoute>} />
                  <Route path="asistencias" element={<PermissionedRoute code="attendance"><EducativaAsistenciasPage /></PermissionedRoute>} />
                  <Route path="alumnos" element={<PermissionedRoute code="students"><AlumnosPage /></PermissionedRoute>} />
                  <Route path="records" element={<PermissionedRoute code="records"><RecordsPage /></PermissionedRoute>} />
                  <Route path="docentes" element={<PermissionedRoute code="teachers"><DocentesPage /></PermissionedRoute>} />
                  <Route path="classes" element={<PermissionedRoute code="commissions"><EducativaClasesPage /></PermissionedRoute>} />
                  <Route path="config-pagos" element={<PermissionedRoute code="institution-settings"><ConfigPagosPage /></PermissionedRoute>} />
                  <Route path="config-cuotas" element={<PermissionedRoute code="institution-settings"><ConfigCuotasPage /></PermissionedRoute>} />
                  <Route path="graduados" element={<PermissionedRoute code="graduates"><GraduadosPage /></PermissionedRoute>} />
                  <Route path="promociones" element={<PermissionedRoute code="promotions"><PromocionesPage /></PermissionedRoute>} />
                  <Route path="certificaciones" element={<PermissionedRoute code="certifications"><EducativaCertificacionesPage /></PermissionedRoute>} />
                  <Route path="pagos" element={<PermissionedRoute code="cuotas"><PagosPage /></PermissionedRoute>} />
                  <Route path="permissions" element={<PermissionedRoute code="admin-management"><EducativaPermissionsPage /></PermissionedRoute>} />
                  <Route path="company" element={<PermissionedRoute code="institution-settings"><CompanyPage /></PermissionedRoute>} />
                  <Route path="public-page" element={<PermissionedRoute code="institution-settings"><PublicPageAdmin /></PermissionedRoute>} />
                  <Route path="billing" element={<PermissionedRoute code="billing"><AdminBillingPage /></PermissionedRoute>} />
                  <Route path="announcements" element={<PermissionedRoute code="news"><AnnouncementsPage /></PermissionedRoute>} />
                  <Route path="clothing" element={<GuardedRoute moduleCode="clothing"><ClothingSlugBinder><Outlet /></ClothingSlugBinder></GuardedRoute>}>
                    <Route index element={<ClothingPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="stock" element={<StockPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="payment-proofs" element={<PaymentProofsPage />} />
                    <Route path="cancellations" element={<CancellationsPage />} />
                    <Route path="delivery-zones" element={<DeliveryZonesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                <Route path="docente" element={<RoleGuard roles={['docente', 'teacher']}><AppLayout /></RoleGuard>}>
                  <Route index element={<DocenteMisClasesPage />} />
                </Route>

                <Route path="event-operator" element={<RoleGuard roles={['eventoperator']}><OperatorLayout /></RoleGuard>}>
                  <Route index element={<OperatorEventsPage />} />
                  <Route path="events/:eventId/check-in" element={<GuardedRoute moduleCode="events"><EventCheckInPage backPath="/event-operator" /></GuardedRoute>} />
                  <Route path="profile" element={<OperatorProfilePage />} />
                </Route>

                <Route path="teacher" element={<RoleGuard roles={['teacher']}><AppLayout /></RoleGuard>}>
                  <Route index element={<TeacherHomePage />} />
                  <Route path="courses" element={<TeacherCoursesPage />} />
                  <Route path="courses/:id" element={<TeacherCourseDetailPage />} />
                  <Route path="attendance" element={<TeacherAttendancePage />} />
                  <Route path="attendance/qr-scan" element={<TeacherQrScanPage />} />
                  <Route path="attendance/qr-scan/:classId" element={<TeacherQrScanPage />} />
                  <Route path="profile" element={<TeacherProfilePage />} />
                </Route>

                <Route path="delegate" element={<RoleGuard roles={['delegate']}><AppLayout /></RoleGuard>}>
                  <Route index element={<DelegateHomePage />} />
                  <Route path="students" element={<DelegateStudentsPage />} />
                  <Route path="students/:id" element={<DelegateStudentDetailPage />} />
                  <Route path="documents" element={<DelegateDocumentsPage />} />
                  <Route path="payments" element={<DelegatePaymentsPage />} />
                  <Route path="attendance" element={<DelegateAttendancePage />} />
                  <Route path="profile" element={<PlaceholderPage title="Mi perfil" description="Próximamente: perfil del delegado" />} />
                </Route>

                <Route path="src/pages/student/home/index.html" element={<Navigate to="/student" replace />} />
                <Route path="src/pages/student/profile/index.html" element={<Navigate to="/student/siblings" replace />} />
                <Route path="src/pages/student/payments/index.html" element={<Navigate to="/student/payments" replace />} />
                <Route path="src/pages/student/documents/index.html" element={<Navigate to="/student/documents" replace />} />
                <Route path="src/pages/student/files/index.html" element={<Navigate to="/student/documents" replace />} />
                <Route path="src/pages/admin/payments/index.html" element={<Navigate to="/admin/payments" replace />} />
                <Route path="src/pages/admin/student-files/index.html" element={<Navigate to="/admin/records" replace />} />
                <Route path="src/pages/admin/students/sibling-links/index.html" element={<Navigate to="/admin/siblings" replace />} />
                <Route path="*" element={<RoleRedirect />} />
              </Routes>
            </Suspense>
          </>
        ) : (
          <SplashScreen />
        )}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
