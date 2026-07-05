import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useScrollDirection } from '../hooks/useScrollDirection'
import { useCartStore } from '../store/cartStore'
import CartDrawer from './CartDrawer'
import MobileDrawer from './MobileDrawer'

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
  const scrollDir = useScrollDirection()
  const { getTotalItems, openCart } = useCartStore()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const totalItems = getTotalItems()

  async function handleLogout() {
    try { await logout() } finally { navigate('/login') }
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-primary font-medium' : 'text-white/70 hover:text-white'}`

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 bg-dark border-b border-white/5
        transition-transform duration-300
        ${scrollDir === 'down' ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo_troncodrilo.PNG" alt="Troncodrilo" className="h-9 w-auto" />
          </Link>

          {/* Nav principal — solo escritorio */}
          <nav className="hidden md:flex items-center gap-6 flex-1">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navCls}>{label}</NavLink>
            ))}
          </nav>

          {/* Derecha: carrito + auth (escritorio) + hamburguesa (móvil) */}
          <div className="ml-auto flex items-center gap-4">
            {/* Carrito — siempre visible */}
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

            {/* Auth — solo escritorio */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <NavLink to="/admin" className={navCls}>Admin</NavLink>
                  )}
                  <NavLink to="/perfil" className={navCls}>
                    {user.name}
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"
                    className="text-sm text-white/70 hover:text-white transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link to="/register"
                    className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg
                      hover:bg-primary/90 transition-colors font-medium">
                    Registrarse
                  </Link>
                </>
              )}
            </div>

            {/* Hamburguesa — solo móvil */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Abrir menú"
              className="md:hidden text-white/70 hover:text-white transition-colors p-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Espaciador: compensa el header fixed (h-16 = 64px) */}
      <div className="h-16 flex-shrink-0" />

      {/* Drawer de navegación móvil */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLogout={handleLogout}
        navLinks={navLinks}
      />

      {/* Drawer del carrito */}
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
