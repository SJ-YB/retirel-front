import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
}
