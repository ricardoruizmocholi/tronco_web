import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAuthModal } from '../context/AuthModalContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { openModal } = useAuthModal()

  useEffect(() => {
    if (!loading && !user) openModal('login')
  }, [loading, user])

  if (loading) return null

  return user ? <Outlet /> : <Navigate to="/" replace />
}
