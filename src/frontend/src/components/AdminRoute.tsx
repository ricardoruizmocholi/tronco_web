import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) return null

  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />
}
