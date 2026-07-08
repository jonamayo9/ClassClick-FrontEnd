import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/stores/auth'
import { storage } from '@/lib/storage'
import { apiService } from '@/lib/api'
import { PwaInstallPrompt } from '@/components/pwa-install'
import { IosPwaPrompt } from '@/components/ios-pwa-prompt'
import { BiometricAppLock } from '@/components/biometric-app-lock'
import { ModuleGuard } from '@/components/module-guard'
import { RootLayout } from '@/components/layouts/root-layout'
import { AppLayout } from '@/components/layouts/app-layout'
import { LandingPage } from '@/pages/landing'
import { TrialSignupPage } from '@/pages/landing/trial-signup'
import { PrivacyPage, TermsPage } from '@/pages/landing/legal'
import { LoginPage } from '@/pages/auth/login'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password'
import { ResetPasswordPage } from '@/pages/auth/reset-password'
import { AdminDashboard } from '@/pages/admin/dashboard'
import PaymentsPage from '@/pages/admin/payments/page'
import StudentsPage from '@/pages/admin/students/page'
import CoursesPage from '@/pages/admin/courses/page'
import AdminCourseDetailPage from '@/pages/admin/courses/detail'
import TeachersPage from '@/pages/admin/teachers/page'
import ClassesPage from '@/pages/admin/classes/page'

import RecordsPage from '@/pages/admin/records/page'
import SiblingsPage from '@/pages/admin/siblings/page'
import PricingPage from '@/pages/admin/pricing/page'
import ChargeSettingsPage from '@/pages/admin/charge-settings/page'
import CompanyPage from '@/pages/admin/company/page'
import ProfilePage from '@/pages/admin/profile/page'
import SponsorsPage from '@/pages/admin/sponsors/page'
import AnnouncementsPage from '@/pages/admin/announcements/page'
import ClothingPage from '@/pages/admin/clothing/page'
import CategoriesPage from '@/pages/admin/clothing/categories/page'
import ProductsPage from '@/pages/admin/clothing/products/page'
import StockPage from '@/pages/admin/clothing/stock/page'
import OrdersPage from '@/pages/admin/clothing/orders/page'
import PaymentProofsPage from '@/pages/admin/clothing/payment-proofs/page'
import CancellationsPage from '@/pages/admin/clothing/cancellations/page'
import SettingsPage from '@/pages/admin/clothing/settings/page'
import AttendancePage from '@/pages/admin/attendance/page'
import TeacherAttendancePage from '@/pages/teacher/attendance/page'
import TeacherHomePage from '@/pages/teacher/home'
import TeacherCoursesPage from '@/pages/teacher/courses'
import TeacherCourseDetailPage from '@/pages/teacher/course-detail'
import TeacherProfilePage from '@/pages/teacher/profile'
import RegistrationPage from '@/pages/student/registration/page'
import { PlaceholderPage } from '@/pages/admin/_placeholder'
import { StudentHome } from '@/pages/student/home'
import StudentCoursesPage from '@/pages/student/courses/page'
import CourseDetailPage from '@/pages/student/courses/detail'
import StudentPaymentsPage from '@/pages/student/payments/page'
import StudentProfilePage from '@/pages/student/profile/page'
import StudentSiblingsPage from '@/pages/student/siblings/page'
import StudentDocumentsPage from '@/pages/student/documents/page'
import StudentClothingCatalog from '@/pages/student/clothing/page'
import StudentClothingOrders from '@/pages/student/clothing/orders/page'
import StudentClothingOrderDetail from '@/pages/student/clothing/order-detail'
import { SuperAdminDashboard } from '@/pages/superadmin/dashboard'
import SuperAdminCompaniesPage from '@/pages/superadmin/companies'
import SuperAdminAdminsPage from '@/pages/superadmin/admins'
import SuperAdminBillingPage from '@/pages/superadmin/billing'
import SuperAdminDocumentTypesPage from '@/pages/superadmin/document-types'
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
  const { token, user, activeRole } = useAuth()
  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '') as string
  if (!token || !user) return <Navigate to="/login" replace />
  if (role === 'superadmin') return <Navigate to="/superadmin" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'teacher') return <Navigate to="/teacher" replace />
  if (role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/login" replace />
}

function GuardedRoute({ moduleCode, children }: { moduleCode?: string; children: React.ReactNode }) {
  return <ModuleGuard moduleCode={moduleCode}>{children}</ModuleGuard>
}

function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { token, user, activeRole } = useAuth()
  const role = (activeRole?.toLowerCase() ?? user?.systemRole?.toLowerCase() ?? '') as string
  if (!token || !user) return <Navigate to="/login" replace />
  if (!roles.includes(role)) return <Navigate to={`/${role}`} replace />
  return <>{children}</>
}

function RegistrationGate() {
  const { token, user, activeRole, activeCompanySlug } = useAuth()
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
  if (statusQuery.data?.registrationCompleted) return <Navigate to="/student" replace />
  return <RegistrationPage />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate />
        <BiometricAppLock />
        <PwaInstallPrompt />
        <IosPwaPrompt />
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="home" element={<RoleRedirect />} />
            <Route path="prueba-gratis" element={<TrialSignupPage />} />
            <Route path="privacidad" element={<PrivacyPage />} />
            <Route path="terminos" element={<TermsPage />} />
          </Route>

          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="register" element={<RegistrationGate />} />

          <Route path="admin" element={<RoleGuard roles={['admin', 'superadmin']}><AppLayout /></RoleGuard>}>
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
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="announcements" element={<GuardedRoute moduleCode="news"><AnnouncementsPage /></GuardedRoute>} />
            <Route path="sponsors" element={<GuardedRoute moduleCode="sponsors"><SponsorsPage /></GuardedRoute>} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="company" element={<CompanyPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="student" element={<RoleGuard roles={['student']}><AppLayout /></RoleGuard>}>
            <Route index element={<StudentHome />} />
            <Route path="courses" element={<StudentCoursesPage />} />
            <Route path="courses/:id" element={<CourseDetailPage />} />
            <Route path="payments" element={<GuardedRoute moduleCode="payments"><StudentPaymentsPage /></GuardedRoute>} />
            <Route path="profile" element={<StudentProfilePage />} />
            <Route path="siblings" element={<GuardedRoute moduleCode="payments"><StudentSiblingsPage /></GuardedRoute>} />
            <Route path="documents" element={<GuardedRoute moduleCode="documents"><StudentDocumentsPage /></GuardedRoute>} />
            <Route path="clothing" element={<GuardedRoute moduleCode="clothing"><StudentClothingCatalog /></GuardedRoute>} />
            <Route path="clothing/orders" element={<GuardedRoute moduleCode="clothing"><StudentClothingOrders /></GuardedRoute>} />
            <Route path="clothing/order/:id" element={<GuardedRoute moduleCode="clothing"><StudentClothingOrderDetail /></GuardedRoute>} />
            <Route path="matches" element={<GuardedRoute moduleCode="matches"><PlaceholderPage title="Partidos" /></GuardedRoute>} />
          </Route>

          <Route path="superadmin" element={<RoleGuard roles={['superadmin']}><AppLayout /></RoleGuard>}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="companies" element={<SuperAdminCompaniesPage />} />
            <Route path="admins" element={<SuperAdminAdminsPage />} />
            <Route path="billing" element={<SuperAdminBillingPage />} />
            <Route path="document-types" element={<SuperAdminDocumentTypesPage />} />
          </Route>

          <Route path="teacher" element={<RoleGuard roles={['teacher']}><AppLayout /></RoleGuard>}>
            <Route index element={<TeacherHomePage />} />
            <Route path="courses" element={<TeacherCoursesPage />} />
            <Route path="courses/:id" element={<TeacherCourseDetailPage />} />
            <Route path="attendance" element={<TeacherAttendancePage />} />
            <Route path="profile" element={<TeacherProfilePage />} />
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}
