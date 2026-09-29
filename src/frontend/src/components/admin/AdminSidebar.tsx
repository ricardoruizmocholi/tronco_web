import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ADMIN_NAV_ITEMS } from '../../lib/adminNav'

interface Props {
  isOpen: boolean
  onClose: () => void
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" className="w-5 h-5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export default function AdminSidebar({ isOpen, onClose }: Props) {
  const location = useLocation()

  // Cierra el sidebar móvil al navegar a otra sección
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-ink/60 hover:text-ink hover:bg-ink/5'
    }`

  return (
    <>
      {/* Overlay — solo móvil */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 flex-shrink-0
          bg-canvas border-r border-ink/10 flex flex-col
          transform transition-transform duration-300 ease-in-out md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de administración"
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-ink/10 flex-shrink-0">
          <Link to="/" className="font-editorial text-lg text-ink tracking-wide">TRONCODRILO</Link>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="btn-admin-icon"
          >
            <XIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {ADMIN_NAV_ITEMS.map(item => (
            <NavLink key={item.href} to={item.href} className={linkCls}>
              {({ isActive }) => (
                <>
                  <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.title}</span>
                  {isActive && (
                    <span aria-hidden="true" className="text-primary font-thin text-2xl leading-none">
                      &rsaquo;
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-ink/10 flex-shrink-0">
          <Link to="/" className="text-xs text-ink/40 hover:text-ink transition-colors">
            ← Volver a la tienda
          </Link>
        </div>
      </aside>
    </>
  )
}
