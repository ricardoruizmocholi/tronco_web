import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthModal } from '../context/AuthModalContext'

// /login ya no es una página propia — abre el modal de auth en el tab de
// login y vuelve a home. Se mantiene la ruta por si hay enlaces externos.
export default function LoginPage() {
  const { openModal } = useAuthModal()

  useEffect(() => {
    openModal('login')
  }, [])

  return <Navigate to="/" replace />
}
