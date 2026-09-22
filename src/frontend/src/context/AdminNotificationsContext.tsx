import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getAdminNotifications } from '../api/adminNotifications'
import type { AdminNotificationItem } from '../types/adminNotification'

interface AdminNotificationsContextValue {
  items: AdminNotificationItem[]
  total: number
  refetch: () => void
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null)

// Único punto de sondeo de tareas pendientes de admin (pedidos/devoluciones/
// preorders) — lo consumen tanto NotificationBell (panel admin) como los badges
// del header público en Layout.tsx, para no pollear el mismo tipo de dato dos
// veces por separado.
export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<AdminNotificationItem[]>([])

  const refetch = useCallback(() => {
    if (user?.role !== 'admin') return
    getAdminNotifications().then(res => setItems(res.items)).catch(() => {})
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'admin') return
    refetch()
    const interval = setInterval(refetch, 60_000)
    return () => clearInterval(interval)
  }, [user?.role, refetch])

  return (
    <AdminNotificationsContext.Provider value={{ items, total: items.length, refetch }}>
      {children}
    </AdminNotificationsContext.Provider>
  )
}

export function useAdminNotifications(): AdminNotificationsContextValue {
  const ctx = useContext(AdminNotificationsContext)
  if (!ctx) throw new Error('useAdminNotifications must be used inside <AdminNotificationsProvider>')
  return ctx
}
