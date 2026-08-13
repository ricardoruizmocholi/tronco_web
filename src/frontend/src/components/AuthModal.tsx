import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAuthModal, type AuthModalTab } from '../context/AuthModalContext'
import api from '../lib/axios'

interface RegisterErrors {
  name?: string
  email?: string
  password?: string
  confirmation?: string
  general?: string
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" className="w-5 h-5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
        s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
        s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
        l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
        c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.003-0.002
        l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )
}

// Contenedor siempre montado: decide visibilidad y bloquea el scroll del body.
// El contenido real vive en AuthModalContent, que solo se monta mientras el
// modal está abierto — así cada apertura arranca con un formulario limpio,
// sin necesidad de un efecto que resetee el estado a mano.
export default function AuthModal() {
  const { isOpen, defaultTab, closeModal } = useAuthModal()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) closeModal()
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-ink/60 backdrop-blur flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        className="bg-canvas border border-ink/10 w-full max-w-[420px] max-h-[90vh] overflow-y-auto p-8"
        role="dialog"
        aria-modal="true"
        aria-label="Iniciar sesión o registrarse"
      >
        <AuthModalContent defaultTab={defaultTab} closeModal={closeModal} />
      </div>
    </div>
  )
}

interface ContentProps {
  defaultTab: AuthModalTab
  closeModal: () => void
}

function AuthModalContent({ defaultTab, closeModal }: ContentProps) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<AuthModalTab>(defaultTab)

  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError]       = useState('')
  const [loginLoading, setLoginLoading]   = useState(false)

  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [regErrors, setRegErrors]       = useState<RegisterErrors>({})
  const [regLoading, setRegLoading]     = useState(false)

  const [googleError, setGoogleError] = useState('')

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail || !loginPassword) {
      setLoginError('Todos los campos son obligatorios.')
      return
    }
    setLoginLoading(true)
    try {
      await login(loginEmail, loginPassword)
      closeModal()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } }
      setLoginError(
        axiosErr.response?.status === 401
          ? 'Email o contraseña incorrectos.'
          : 'Error al iniciar sesión. Inténtalo de nuevo.'
      )
    } finally {
      setLoginLoading(false)
    }
  }

  function validateRegister(): boolean {
    const next: RegisterErrors = {}
    if (!name.trim()) next.name = 'El nombre es obligatorio.'
    if (!email.trim()) next.email = 'El email es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Introduce un email válido.'
    if (!password) next.password = 'La contraseña es obligatoria.'
    else if (password.length < 8) next.password = 'Mínimo 8 caracteres.'
    if (password !== confirmation) next.confirmation = 'Las contraseñas no coinciden.'
    setRegErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateRegister()) return
    setRegLoading(true)
    try {
      await register(name, email, password, confirmation)
      closeModal()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }
      if (axiosErr.response?.status === 422) {
        const serverErrors = axiosErr.response.data?.errors ?? {}
        setRegErrors(
          Object.fromEntries(
            Object.entries(serverErrors).map(([k, v]) => [k, v[0]])
          )
        )
      } else {
        setRegErrors({ general: 'Error al registrarse. Inténtalo de nuevo.' })
      }
    } finally {
      setRegLoading(false)
    }
  }

  async function handleGoogleClick() {
    setGoogleError('')
    try {
      const { data } = await api.get<{ url: string }>('/auth/google')
      window.location.href = data.url
    } catch {
      setGoogleError('No se pudo conectar con Google. Inténtalo de nuevo.')
    }
  }

  const inputCls = `w-full border-0 border-b-2 border-ink/20 bg-transparent px-0 py-2
    text-sm text-ink focus:outline-none focus:border-primary transition-colors`

  const tabCls = (active: boolean) =>
    `flex-1 label-caps py-3 text-center border-b-2 -mb-px transition-colors ${
      active ? 'border-primary text-ink' : 'border-transparent text-ink/40 hover:text-ink/70'
    }`

  return (
    <>
      {/* Cabecera */}
      <div className="relative">
        <button
          onClick={closeModal}
          aria-label="Cerrar"
          className="absolute right-0 top-0 p-1.5 -mr-1.5 -mt-1.5 text-ink/40 hover:text-ink transition-colors"
        >
          <XIcon />
        </button>
        <p className="font-editorial text-xl text-ink text-center">TRONCODRILO</p>
      </div>

      <hr className="border-ink/10 my-6" />

      {/* Tabs */}
      <div className="flex border-b border-ink/10 mb-6">
        <button type="button" onClick={() => setTab('login')} className={tabCls(tab === 'login')}>
          Iniciar sesión
        </button>
        <button type="button" onClick={() => setTab('register')} className={tabCls(tab === 'register')}>
          Registrarse
        </button>
      </div>

      {/* Contenido del tab activo — key={tab} dispara el fade al cambiar */}
      <div key={tab} className="animate-[fade-in_150ms_ease-in-out]">
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="auth-login-email" className="label-caps text-ink/50 block mb-1.5">Email</label>
              <input
                id="auth-login-email"
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="auth-login-password" className="label-caps text-ink/50 block mb-1.5">Contraseña</label>
              <input
                id="auth-login-password"
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                className={inputCls}
              />
            </div>

            {loginError && (
              <p className="text-sm text-secondary bg-secondary/10 px-3 py-2">{loginError}</p>
            )}

            <button type="submit" disabled={loginLoading} className="btn-primary w-full">
              {loginLoading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="auth-reg-name" className="label-caps text-ink/50 block mb-1.5">Nombre</label>
              <input
                id="auth-reg-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                autoFocus
                className={inputCls}
              />
              {regErrors.name && <p className="text-xs text-secondary mt-1">{regErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="auth-reg-email" className="label-caps text-ink/50 block mb-1.5">Email</label>
              <input
                id="auth-reg-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className={inputCls}
              />
              {regErrors.email && <p className="text-xs text-secondary mt-1">{regErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="auth-reg-password" className="label-caps text-ink/50 block mb-1.5">Contraseña</label>
              <input
                id="auth-reg-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
              {regErrors.password && <p className="text-xs text-secondary mt-1">{regErrors.password}</p>}
            </div>
            <div>
              <label htmlFor="auth-reg-confirmation" className="label-caps text-ink/50 block mb-1.5">Confirmar contraseña</label>
              <input
                id="auth-reg-confirmation"
                type="password"
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
              {regErrors.confirmation && <p className="text-xs text-secondary mt-1">{regErrors.confirmation}</p>}
            </div>

            {regErrors.general && (
              <p className="text-sm text-secondary bg-secondary/10 px-3 py-2">{regErrors.general}</p>
            )}

            <button type="submit" disabled={regLoading} className="btn-primary w-full">
              {regLoading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {/* Separador + Google — común a ambos tabs */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-ink/10" />
          <span className="text-xs text-ink/40">— O —</span>
          <div className="flex-1 border-t border-ink/10" />
        </div>

        {googleError && (
          <p className="text-sm text-secondary bg-secondary/10 px-3 py-2 mb-3">{googleError}</p>
        )}

        <button
          type="button"
          onClick={handleGoogleClick}
          className="w-full flex items-center justify-center gap-3 border border-ink bg-white text-ink
            px-8 py-3 text-sm font-medium transition-colors hover:bg-ink/5"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </div>
    </>
  )
}
