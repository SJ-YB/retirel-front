import { Navigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout.tsx'
import { useAuthStore } from '../stores/authStore.ts'

export default function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <AuthLayout />
}
