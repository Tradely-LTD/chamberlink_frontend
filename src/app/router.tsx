import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@pages/LoginPage';
import { RegisterPage } from '@pages/RegisterPage';
import { SsoHandoffPage } from '@pages/SsoHandoffPage';
import { VerifyEmailPage } from '@pages/VerifyEmailPage';
import { MfaVerifyPage } from '@pages/MfaVerifyPage';
import { ForgotPasswordPage } from '@pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@pages/ResetPasswordPage';
import { UnauthorizedPage } from '@pages/UnauthorizedPage';
import { ProtectedRoute } from '@shared/guards/ProtectedRoute';
import { DashboardShell } from '@features/dashboard/components/DashboardShell';
import { OverviewPage } from '@pages/dashboard/OverviewPage';
import { ProfilePage } from '@pages/dashboard/ProfilePage';
import { MembershipPage } from '@pages/dashboard/MembershipPage';
import { MyConnectionsPage } from '@pages/dashboard/MyConnectionsPage';
import { ChamberNetworkPage } from '@pages/dashboard/ChamberNetworkPage';
import { EcoPage } from '@pages/dashboard/EcoPage';
import { EcoApplyPage } from '@pages/dashboard/EcoApplyPage';
import { EcoDetailPage } from '@pages/dashboard/EcoDetailPage';
import { DocumentsPage } from '@pages/dashboard/DocumentsPage';
import { TradeFairPage } from '@pages/dashboard/TradeFairPage';
import { TradeFairBoothsPage } from '@pages/dashboard/TradeFairBoothsPage';
import { AcademyPage } from '@pages/dashboard/AcademyPage';
import { AnalyticsPage } from '@pages/dashboard/AnalyticsPage';
import { AdminPage } from '@pages/dashboard/AdminPage';
import { TradeCorrridorsPage } from '@pages/dashboard/TradeCorrridorsPage';
import { ExporterVisibilityPage } from '@pages/dashboard/ExporterVisibilityPage';
import { BankVerificationPage } from '@pages/dashboard/BankVerificationPage';
import { ExportDocumentsPage } from '@pages/dashboard/ExportDocumentsPage';
import { ExportDocGeneratorPage } from '@pages/dashboard/ExportDocGeneratorPage';
import { TradeDataApiPage } from '@pages/dashboard/TradeDataApiPage';
import { WhiteLabelPage } from '@pages/dashboard/WhiteLabelPage';
import { MemberManagementPage } from '@pages/dashboard/MemberManagementPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/sso', element: <SsoHandoffPage /> },
  { path: '/auth/verify-email', element: <VerifyEmailPage /> },
  { path: '/auth/mfa-verify', element: <MfaVerifyPage /> },
  { path: '/auth/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardShell />,
        children: [
          { path: '/dashboard', element: <OverviewPage /> },
          { path: '/dashboard/profile', element: <ProfilePage /> },

          // Chamber connections — every authenticated user (no role restriction on
          // the backend; e.g. a staff_operator can also personally be a member of
          // a different chamber).
          { path: '/dashboard/connections', element: <MyConnectionsPage /> },
          { path: '/dashboard/chamber-network', element: <ChamberNetworkPage /> },

          // Member-only routes (members + patron members)
          {
            path: '/dashboard/membership',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <MembershipPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/documents',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <DocumentsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/eco/apply',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <EcoApplyPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/eco/apply/:certId',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <EcoApplyPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/trade-fair/booths',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <TradeFairBoothsPage />
              </ProtectedRoute>
            ),
          },

          // eCO: all authenticated users (members see their certs, admins see the queue)
          { path: '/dashboard/eco', element: <EcoPage /> },
          { path: '/dashboard/eco/:id', element: <EcoDetailPage /> },

          // Institutional-only routes
          {
            path: '/dashboard/bank-verification',
            element: (
              <ProtectedRoute allowedRoles={['institutional_subscriber', 'chamber_admin', 'super_admin', 'staff_operator']}>
                <BankVerificationPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/trade-data-api',
            element: (
              <ProtectedRoute allowedRoles={['institutional_subscriber', 'chamber_admin', 'super_admin', 'chamber_executive']}>
                <TradeDataApiPage />
              </ProtectedRoute>
            ),
          },

          // Shared routes (members + admins)
          { path: '/dashboard/trade-fair', element: <TradeFairPage /> },
          { path: '/dashboard/academy', element: <AcademyPage /> },
          { path: '/dashboard/trade-corridors', element: <TradeCorrridorsPage /> },
          { path: '/dashboard/exporter-visibility', element: <ExporterVisibilityPage /> },
          { path: '/dashboard/export-documents', element: <ExportDocumentsPage /> },
          // Generator routes — BEFORE /:id patterns (more-specific paths first)
          {
            path: '/dashboard/export-documents/generate',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <ExportDocGeneratorPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/export-documents/generate/:draftId',
            element: (
              <ProtectedRoute allowedRoles={['member']}>
                <ExportDocGeneratorPage />
              </ProtectedRoute>
            ),
          },

          // Admin-only routes
          {
            path: '/dashboard/analytics',
            element: (
              <ProtectedRoute allowedRoles={['chamber_admin', 'chamber_executive', 'super_admin']}>
                <AnalyticsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/admin',
            element: (
              <ProtectedRoute allowedRoles={['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator']}>
                <AdminPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/members',
            element: (
              <ProtectedRoute allowedRoles={['chamber_admin', 'staff_operator', 'super_admin']}>
                <MemberManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/white-label',
            element: (
              <ProtectedRoute allowedRoles={['super_admin']}>
                <WhiteLabelPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
