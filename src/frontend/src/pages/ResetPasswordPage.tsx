import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Página a la que apunta el enlace del email de recuperación
// (AppServiceProvider::boot(), ResetPassword::createUrlUsing) —
// /reset-password?token=...&email=...
export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword]         = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [loading, setLoading]           = useState(false)

  const inputCls = `w-full border-0 border-b-2 border-ink/20 bg-transparent px-0 py-2
    text-sm text-ink focus:outline-none focus:border-primary transition-colors`

  if (!token || !email) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center px-4">
        <div className="max-w-[420px] text-center">
          <p className="text-sm text-ink/60 mb-4">
            Este enlace de recuperación no es válido. Solicita uno nuevo desde el inicio de sesión.
          </p>
          <Link to="/" className="btn-secondary">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Mínimo 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, email, password, confirmation)
      setSuccess(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
      const serverMessage = axiosErr.response?.data?.errors?.password?.[0]
        ?? axiosErr.response?.data?.message
      setError(serverMessage ?? 'No se pudo restablecer la contraseña. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center px-4">
      <div className="bg-canvas border border-ink/10 w-full max-w-[420px] p-8">
        <p className="font-editorial text-xl text-ink text-center mb-6">TRONCODRILO</p>
        <hr className="border-ink/10 mb-6" />

        {success ? (
          <p className="text-sm text-ink text-center">
            Contraseña actualizada. Redirigiendo…
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <p className="text-sm text-ink/60">Nueva contraseña para <strong>{email}</strong></p>
            <div>
              <label htmlFor="reset-password" className="label-caps text-ink/50 block mb-1.5">Nueva contraseña</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="reset-confirmation" className="label-caps text-ink/50 block mb-1.5">Confirmar contraseña</label>
              <input
                id="reset-confirmation"
                type="password"
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-sm text-secondary bg-secondary/10 px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Guardando…' : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
