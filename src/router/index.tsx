import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout.tsx'
import AuthLayout from '../layouts/AuthLayout.tsx'
import DashboardPage from '../pages/DashboardPage.tsx'
import AccountsPage from '../pages/AccountsPage.tsx'
import TransactionsPage from '../pages/TransactionsPage.tsx'
import AssetsPage from '../pages/AssetsPage.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'assets', element: <AssetsPage /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [],
  },
])

export default router
