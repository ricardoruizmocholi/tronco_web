import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCartStore } from '../store/cartStore'
import CartDrawer from './CartDrawer'

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

const navLinks = [
  { to: '/tienda',           label: 'Tienda' },
  { to: '/artistas',         label: 'Artistas' },
  { to: '/bola-troncodrilo', label: 'Bola Troncodrilo' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { getTotalItems, openCart } = useCartStore()

  const totalItems = getTotalItems()

  async function handleLogout() {
    try { await logout() } finally { navigate('/login') }
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-primary font-medium' : 'text-white/70 hover:text-white'}`

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo_troncodrilo.PNG" alt="Troncodrilo" className="h-9 w-auto" />
          </Link>

          {/* Nav principal */}
          <nav className="hidden md:flex items-center gap-6 flex-1">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navCls}>{label}</NavLink>
            ))}
          </nav>

          {/* Derecha: carrito + auth */}
          <div className="ml-auto flex items-center gap-4">
            {/* Carrito */}
            <button
              onClick={openCart}
              aria-label={`Abrir carrito (${totalItems} productos)`}
              className="relative text-white/70 hover:text-white transition-colors"
            >
              <CartIcon />
              <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                text-white text-[10px] font-bold flex items-center justify-center leading-none
                transition-colors ${totalItems > 0 ? 'bg-primary' : 'bg-white/20'}`}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            </button>

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={navCls}>
                    Admin
                  </NavLink>
                )}
                <span className="text-white/70 text-sm hidden sm:inline">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="text-sm text-white/70 hover:text-white transition-colors">
                  Iniciar sesión
                </Link>
                <Link to="/register"
                  className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg
                    hover:bg-primary/90 transition-colors font-medium">
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Drawer del carrito (portal implícito — fuera del flujo del main) */}
      <CartDrawer />

      {/* Contenido de la página */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-dark border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col items-center gap-6">
          <Link to="/">
            <img src="/logo_troncodrilo.PNG" alt="Troncodrilo" className="h-8 w-auto opacity-80" />
          </Link>
          <nav className="flex flex-wrap justify-center gap-6">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to}
                className="text-sm text-white/50 hover:text-white/80 transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <p className="text-white/30 text-xs">
            © 2025 Troncodrilo. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
