import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-ink mb-1">Troncodrilo Shop</h1>
        <p className="text-sm text-ink/50 mb-8">Home — pendiente</p>

        {user && (
          <>
            <p className="text-sm text-ink mb-6">
              Hola, <span className="font-medium">{user.name}</span>
              {' '}·{' '}
              <span className="text-ink/50">{user.role}</span>
            </p>
            <button
              onClick={handleLogout}
              className="w-full border border-ink/20 text-ink font-medium py-2 rounded-sm text-sm hover:bg-ink/5 transition-colors"
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </div>
  )
}
