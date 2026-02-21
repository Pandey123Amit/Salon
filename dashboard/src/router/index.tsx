import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { ROUTES } from './routes'

import LoginPage from '@/pages/auth/login'
import RegisterPage from '@/pages/auth/register'

// Lazy-load protected pages
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const DashboardPage = lazy(() => import('@/pages/dashboard'))
const ServicesPage = lazy(() => import('@/pages/services'))
const StaffPage = lazy(() => import('@/pages/staff'))
const AppointmentsPage = lazy(() => import('@/pages/appointments'))
const CustomersPage = lazy(() => import('@/pages/customers'))
const CustomerDetailPage = lazy(() => import('@/pages/customers/customer-detail'))
const AnalyticsPage = lazy(() => import('@/pages/analytics'))
const SettingsPage = lazy(() => import('@/pages/settings'))

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function withSuspense(Component: React.LazyExoticComponent<() => React.ReactElement>) {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  // Public routes
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.REGISTER, element: <RegisterPage /> },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: withSuspense(DashboardPage) },
          { path: ROUTES.APPOINTMENTS, element: withSuspense(AppointmentsPage) },
          { path: ROUTES.SERVICES, element: withSuspense(ServicesPage) },
          { path: ROUTES.STAFF, element: withSuspense(StaffPage) },
          { path: ROUTES.CUSTOMERS, element: withSuspense(CustomersPage) },
          { path: ROUTES.CUSTOMER_DETAIL, element: withSuspense(CustomerDetailPage) },
          { path: ROUTES.ANALYTICS, element: withSuspense(AnalyticsPage) },
          { path: ROUTES.SETTINGS, element: withSuspense(SettingsPage) },
        ],
      },
    ],
  },
])
