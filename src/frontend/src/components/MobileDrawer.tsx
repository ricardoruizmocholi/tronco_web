import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

interface NavLink {
  to: string
  label: string
}

interface User {
  name: string
  role: string
}

interface Props {
  isOpen:    boolean
  onClose:   () => void
  user:      User | null
  onLogout:  () => void
  navLinks:  NavLink[]
}

export default function MobileDrawer({ isOpen, onClose, user, onLogout, navLinks }: Props) {
  const location = useLocation()

  // Cierra el drawer al navegar a otra página
  useEffect(() => {
    onClose()
  }, [location.pathname])

  // Bloquea el scroll del body mientras el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary/15 text-primary'
        : 'text-white/70 hover:text-white hover:bg-white/5'
    }`

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-dark border-r border-white/5
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Cabecera del drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <Link to="/" onClick={onClose}>
            <img src="/logo_troncodrilo.PNG" alt="Troncodrilo" className="h-8 w-auto" />
          </Link>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkCls}>
              {label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <NavLink to="/admin" className={linkCls}>
              Panel admin
            </NavLink>
          )}
        </nav>

        {/* Separador + sección auth */}
        <div className="flex-shrink-0 border-t border-white/5 px-3 py-4 space-y-1">
          {user ? (
            <>
              <NavLink to="/perfil" className={linkCls}>
                Mi perfil
              </NavLink>
              <button
                onClick={() => { onLogout(); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm
                  font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center justify-center gap-2 mx-1 py-2.5 rounded-xl
                  text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
