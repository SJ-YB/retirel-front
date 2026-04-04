import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout.tsx'
import ProtectedRoute from '../components/ProtectedRoute.tsx'
import AuthGuard from '../components/AuthGuard.tsx'
import DashboardPage from '../pages/DashboardPage.tsx'
import AccountsPage from '../pages/AccountsPage.tsx'
import TransactionsPage from '../pages/TransactionsPage.tsx'
import AssetsPage from '../pages/AssetsPage.tsx'
import LoginPage from '../pages/LoginPage.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <RootLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'accounts', element: <AccountsPage /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'assets', element: <AssetsPage /> },
        ],
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthGuard />,
    children: [
      { path: 'login', element: <LoginPage /> },
    ],
  },
])

export default router
