import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { updateProfile } from '../api/user'
import ProfileOrdersSection from '../components/ProfileOrdersSection'
import type { AuthUser } from '../context/AuthContext'

type Section = 'datos' | 'password' | 'pedidos' | 'comunidad'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'datos',     label: 'Datos personales' },
  { id: 'password',  label: 'Contraseña' },
  { id: 'pedidos',   label: 'Mis pedidos' },
  { id: 'comunidad', label: 'Comunidad' },
]

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs tracking-widest uppercase text-ink/40 mb-2.5">
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-sm text-red-600">{message}</p>
}

const inputCls =
  'w-full bg-transparent border-b border-ink/20 pb-2.5 pt-1 px-0 text-sm text-ink ' +
  'placeholder:text-ink/25 focus:outline-none focus:border-primary transition-colors'

const inputReadOnlyCls =
  'w-full bg-transparent border-b border-ink/10 pb-2.5 pt-1 px-0 text-sm text-ink/35 ' +
  'focus:outline-none cursor-not-allowed'

const btnCls =
  'bg-primary text-white text-sm tracking-wide px-6 py-2.5 ' +
  'hover:bg-primary/90 disabled:opacity-50 transition-colors'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [active, setActive] = useState<Section>('datos')

  const initials = (user?.name ?? '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // — Datos personales —
  const [name, setName]               = useState(user?.name ?? '')
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameErrors, setNameErrors]   = useState<Record<string, string>>({})
  const [nameSaving, setNameSaving]   = useState(false)

  // — Contraseña —
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [pwSuccess, setPwSuccess]   = useState('')
  const [pwErrors, setPwErrors]     = useState<Record<string, string>>({})
  const [pwSaving, setPwSaving]     = useState(false)

  function extractErrors(err: unknown): Record<string, string> {
    const data = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
      ?.response?.data?.errors
    if (!data) return {}
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    )
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameErrors({})
    setNameSuccess('')
    setNameSaving(true)
    try {
      const updated = await updateProfile({ name })
      setUser(updated as AuthUser)
      setNameSuccess('Nombre actualizado correctamente.')
    } catch (err) {
      setNameErrors(extractErrors(err))
    } finally {
      setNameSaving(false)
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErrors({})
    setPwSuccess('')
    setPwSaving(true)
    try {
      await updateProfile({
        name:                  user?.name ?? name,
        current_password:      currentPw,
        password:              newPw,
        password_confirmation: confirmPw,
      })
      setPwSuccess('Contraseña actualizada correctamente.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setPwErrors(extractErrors(err))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas">
      <div className="max-w-5xl mx-auto px-4 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-16 lg:items-start">

          {/* ─── SIDEBAR ESCRITORIO ─── */}
          <aside className="hidden lg:flex lg:flex-col">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5 flex-shrink-0"
              style={{ backgroundColor: '#1C1F1A' }}
              aria-hidden="true"
            >
              <span className="text-2xl font-bold text-primary leading-none select-none">
                {initials}
              </span>
            </div>

            <p className="text-base font-medium text-ink leading-snug">{user?.name}</p>
            <p className="text-xs mt-1" style={{ color: '#8B4A2A' }}>{user?.email}</p>

            {/* Firma — la única línea decorativa de la página */}
            <div className="h-px bg-primary w-full my-5" />

            {/* Navegación entre secciones */}
            <nav aria-label="Secciones del perfil">
              {SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`w-full text-left text-sm py-2.5 transition-colors ${
                    active === id
                      ? 'text-ink font-medium'
                      : 'text-ink/35 hover:text-ink/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ─── CONTENIDO ─── */}
          <div>

            {/* Identidad compacta — solo móvil */}
            <div className="lg:hidden flex items-center gap-3 mb-7">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#1C1F1A' }}
                aria-hidden="true"
              >
                <span className="text-sm font-bold text-primary leading-none select-none">
                  {initials}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
                <p className="text-xs truncate" style={{ color: '#8B4A2A' }}>{user?.email}</p>
              </div>
            </div>

            {/* Tabs — solo móvil */}
            <div
              className="lg:hidden flex gap-0 mb-10 border-b border-ink/10 -mx-4 px-4 overflow-x-auto"
              role="tablist"
              aria-label="Secciones del perfil"
            >
              {SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active === id}
                  onClick={() => setActive(id)}
                  className={`flex-shrink-0 text-xs tracking-wide pb-3 mr-7 border-b-2 transition-colors ${
                    active === id
                      ? 'border-primary text-ink font-medium'
                      : 'border-transparent text-ink/35 hover:text-ink/60'
                  }`}
                  style={{ marginBottom: '-1px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Sección: Datos personales ── */}
            {active === 'datos' && (
              <section aria-label="Datos personales">
                <h2 className="font-editorial text-2xl text-ink mb-9">Datos personales</h2>
                <form onSubmit={handleSaveName} noValidate className="space-y-8 max-w-xs">
                  <div>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="name"
                      className={inputCls}
                    />
                    <FieldError message={nameErrors.name} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <input
                      id="email"
                      type="email"
                      value={user?.email ?? ''}
                      readOnly
                      disabled
                      className={inputReadOnlyCls}
                    />
                    <p className="mt-2 text-xs text-ink/25">No se puede cambiar.</p>
                  </div>

                  {nameSuccess && (
                    <p className="text-sm text-primary">— {nameSuccess}</p>
                  )}
                  {nameErrors.general && (
                    <p className="text-sm text-red-600">{nameErrors.general}</p>
                  )}

                  <button type="submit" disabled={nameSaving} className={btnCls}>
                    {nameSaving ? 'Guardando…' : 'Guardar'}
                  </button>
                </form>
              </section>
            )}

            {/* ── Sección: Contraseña ── */}
            {active === 'password' && (
              <section aria-label="Cambiar contraseña">
                <h2 className="font-editorial text-2xl text-ink mb-9">Cambiar contraseña</h2>
                <form onSubmit={handleSavePassword} noValidate className="space-y-8 max-w-xs">
                  <div>
                    <FieldLabel htmlFor="current_password">Contraseña actual</FieldLabel>
                    <input
                      id="current_password"
                      type="password"
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={inputCls}
                    />
                    <FieldError message={pwErrors.current_password} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="new_password">Nueva contraseña</FieldLabel>
                    <input
                      id="new_password"
                      type="password"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={inputCls}
                    />
                    <FieldError message={pwErrors.password} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="password_confirmation">Confirmar contraseña</FieldLabel>
                    <input
                      id="password_confirmation"
                      type="password"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={inputCls}
                    />
                    <FieldError message={pwErrors.password_confirmation} />
                  </div>

                  {pwSuccess && (
                    <p className="text-sm text-primary">— {pwSuccess}</p>
                  )}

                  <button type="submit" disabled={pwSaving} className={btnCls}>
                    {pwSaving ? 'Actualizando…' : 'Actualizar'}
                  </button>
                </form>
              </section>
            )}

            {/* ── Sección: Pedidos ── */}
            {active === 'pedidos' && (
              <section aria-label="Mis pedidos">
                <h2 className="font-editorial text-2xl text-ink mb-9">Mis pedidos</h2>
                <ProfileOrdersSection />
              </section>
            )}

            {/* ── Sección: Comunidad ── */}
            {active === 'comunidad' && (
              <section aria-label="Comunidad">
                <h2 className="font-editorial text-2xl text-ink mb-9">Comunidad</h2>
                <div
                  className="flex items-center justify-between gap-6 p-7"
                  style={{ backgroundColor: '#1C1F1A' }}
                >
                  <div>
                    <p className="text-sm font-medium text-canvas leading-snug">
                      Mi Troncodrilo en el mapa
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(250,250,248,0.45)' }}>
                      Sube tu fanfic a la Bola Troncodrilo.
                    </p>
                  </div>
                  <Link
                    to="/mi-fanfic"
                    className="flex-shrink-0 text-sm font-medium text-primary hover:text-primary/70 transition-colors whitespace-nowrap"
                  >
                    Ver / subir →
                  </Link>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
