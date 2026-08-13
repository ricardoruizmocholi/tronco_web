import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthModal } from '../context/AuthModalContext'

// /register ya no es una página propia — abre el modal de auth en el tab de
// registro y vuelve a home. Se mantiene la ruta por si hay enlaces externos.
export default function RegisterPage() {
  const { openModal } = useAuthModal()

  useEffect(() => {
    openModal('register')
  }, [])

  return <Navigate to="/" replace />
}
