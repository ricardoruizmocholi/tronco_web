import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!name.trim())
      next.name = 'El nombre es obligatorio.'
    if (!email.trim())
      next.email = 'El email es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Introduce un email válido.'
    if (!password)
      next.password = 'La contraseña es obligatoria.'
    else if (password.length < 8)
      next.password = 'Mínimo 8 caracteres.'
    if (password !== confirmation)
      next.confirmation = 'Las contraseñas no coinciden.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await register(name, email, password, confirmation)
      navigate('/')
    } catch (err: any) {
      if (err.response?.status === 422) {
        const serverErrors = err.response.data?.errors ?? {}
        setErrors(
          Object.fromEntries(
            Object.entries(serverErrors).map(([k, v]) => [k, (v as string[])[0]])
          )
        )
      } else {
        setErrors({ general: 'Error al registrarse. Inténtalo de nuevo.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <h1 className="text-3xl font-bold text-ink mb-1">Crear cuenta</h1>
        <p className="text-sm text-ink/50 mb-8">Únete a la comunidad Troncodrilo</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmation" className="block text-sm font-medium text-ink mb-1">
              Repetir contraseña
            </label>
            <input
              id="confirmation"
              type="password"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.confirmation && <p className="text-xs text-red-600 mt-1">{errors.confirmation}</p>}
          </div>

          {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium py-2 rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-8 text-sm text-ink/50 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entra aquí
          </Link>
        </p>

      </div>
    </div>
  )
}
