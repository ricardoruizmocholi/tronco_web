import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useScrollDirection } from '../hooks/useScrollDirection'
import { useCartStore } from '../store/cartStore'
import { getPendingCount } from '../api/adminOrders'
import { getPendingReturnsCount } from '../api/returns'
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
  const [pendingOrders,  setPendingOrders]  = useState(0)
  const [pendingReturns, setPendingReturns] = useState(0)

  const totalItems = getTotalItems()

  // Polling de pedidos y devoluciones pendientes — solo para admin, cada 60s
  useEffect(() => {
    if (user?.role !== 'admin') return

    getPendingCount().then(setPendingOrders).catch(() => {})
    getPendingReturnsCount().then(setPendingReturns).catch(() => {})

    const interval = setInterval(() => {
      getPendingCount().then(setPendingOrders).catch(() => {})
      getPendingReturnsCount().then(setPendingReturns).catch(() => {})
    }, 60_000)

    return () => clearInterval(interval)
  }, [user?.role])

  async function handleLogout() {
    try { await logout() } finally { navigate('/login') }
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `relative pb-1 text-sm uppercase tracking-wide transition-colors
     after:absolute after:left-0 after:-bottom-px after:h-px after:bg-ink after:transition-all after:duration-150
     ${isActive
       ? 'text-ink font-medium after:w-full'
       : 'text-ink/55 hover:text-ink after:w-0 hover:after:w-full'
     }`

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Header — compacto, fondo sólido, nav centrada (rediseño editorial) */}
      <header className={`fixed top-0 w-full z-50 bg-canvas border-b border-ink/10
        transition-transform duration-300
        ${scrollDir === 'down' ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-6xl mx-auto px-4 h-12 md:h-14 grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center gap-4">
          {/* Logo — wordmark de texto, editorial */}
          <Link to="/" className="flex-shrink-0 font-editorial text-lg md:text-xl text-ink tracking-wide">
            TRONCODRILO
          </Link>

          {/* Nav principal — centrada, solo escritorio */}
          <nav className="hidden md:flex items-center justify-center gap-8">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navCls}>{label}</NavLink>
            ))}
          </nav>

          {/* Derecha: carrito + auth (escritorio) + hamburguesa (móvil) */}
          <div className="flex items-center justify-end gap-4">
            {/* Carrito — siempre visible */}
            <button
              onClick={openCart}
              aria-label={`Abrir carrito (${totalItems} productos)`}
              className="relative text-ink/70 hover:text-ink transition-colors"
            >
              <CartIcon />
              <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                text-white text-[10px] font-bold flex items-center justify-center leading-none
                transition-colors ${totalItems > 0 ? 'bg-primary' : 'bg-ink/20'}`}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            </button>

            {/* Auth — solo escritorio */}
            <div className="hidden md:flex items-center gap-5">
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <span className="inline-flex items-center gap-1">
                      <NavLink to="/admin" className={navCls}>Admin</NavLink>
                      {pendingOrders > 0 && (
                        <span className="min-w-[16px] h-4 px-0.5
                          bg-red-500 text-white text-[10px] font-bold rounded-full
                          flex items-center justify-center leading-none">
                          {pendingOrders > 9 ? '9+' : pendingOrders}
                        </span>
                      )}
                      {pendingReturns > 0 && (
                        <span className="min-w-[16px] h-4 px-0.5
                          text-white text-[10px] font-bold rounded-full
                          flex items-center justify-center leading-none"
                          style={{ backgroundColor: '#8B4A2A' }}>
                          {pendingReturns > 9 ? '9+' : pendingReturns}
                        </span>
                      )}
                    </span>
                  )}
                  <NavLink to="/perfil" className={navCls}>
                    {user.name}
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="text-sm uppercase tracking-wide text-ink/55 hover:text-ink transition-colors"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"
                    className="text-sm uppercase tracking-wide text-ink/55 hover:text-ink transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link to="/register"
                    className="text-sm uppercase tracking-wide bg-primary text-white px-3 py-1.5
                      hover:bg-primary/90 transition-colors font-medium"
                    style={{ borderRadius: '2px' }}>
                    Registrarse
                  </Link>
                </>
              )}
            </div>

            {/* Hamburguesa — solo móvil */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Abrir menú"
              className="md:hidden text-ink/70 hover:text-ink transition-colors p-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Espaciador: compensa el header fixed (48px móvil / 56px escritorio) */}
      <div className="h-12 md:h-14 flex-shrink-0" />

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
