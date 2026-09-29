import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminThemeProvider, useAdminTheme } from '../../context/AdminThemeContext'
import AdminSidebar from './AdminSidebar'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" className="w-6 h-6">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function AdminLayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme } = useAdminTheme()

  return (
    <div className={`min-h-dvh flex bg-canvas ${theme === 'dark' ? 'dark' : ''}`}>
      <AdminSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4
          h-14 px-4 md:px-6 border-b border-ink/10 bg-canvas flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú de administración"
            className="btn-admin-icon"
          >
            <MenuIcon />
          </button>
          <span className="hidden md:block label-caps text-ink/40">Panel de administración</span>
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationBell />
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner />
    </AdminThemeProvider>
  )
}
