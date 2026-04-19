/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout.tsx'
import ProtectedRoute from '../components/ProtectedRoute.tsx'
import AuthGuard from '../components/AuthGuard.tsx'
import PageFallback from '../components/ui/PageFallback.tsx'

const DashboardPage = lazy(() => import('../pages/DashboardPage.tsx'))
const AccountsPage = lazy(() => import('../pages/AccountsPage.tsx'))
const TransactionsPage = lazy(() => import('../pages/TransactionsPage.tsx'))
const AssetsPage = lazy(() => import('../pages/AssetsPage.tsx'))
const LoginPage = lazy(() => import('../pages/LoginPage.tsx'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'accounts',
            element: (
              <Suspense fallback={<PageFallback />}>
                <AccountsPage />
              </Suspense>
            ),
          },
          {
            path: 'transactions',
            element: (
              <Suspense fallback={<PageFallback />}>
                <TransactionsPage />
              </Suspense>
            ),
          },
          {
            path: 'assets',
            element: (
              <Suspense fallback={<PageFallback />}>
                <AssetsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthGuard />,
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
])

export default router
