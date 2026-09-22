import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getMaintenanceStatus } from '../api/maintenance'
import { MAINTENANCE_DETECTED_EVENT } from '../lib/maintenanceEvent'

interface MaintenanceContextValue {
  active: boolean
  loading: boolean
  refetch: () => void
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null)

// Más agresivo que los 60s de AdminNotificationsContext a propósito: el motivo
// de activar mantenimiento suele ser cortar algo YA, no una tarea pendiente que
// puede esperar un minuto.
const POLL_INTERVAL_MS = 15_000

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  const refetch = useCallback(() => {
    getMaintenanceStatus()
      .then(res => setActive(res.active))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Al montar y en cada cambio de ruta — un cliente que navega mientras el
  // mantenimiento se activa lo detecta sin tener que recargar.
  useEffect(() => {
    refetch()
  }, [location.pathname, refetch])

  useEffect(() => {
    const interval = setInterval(refetch, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refetch])

  // Corte instantáneo — ver el comentario en lib/axios.ts
  useEffect(() => {
    function handleDetected() { setActive(true) }
    window.addEventListener(MAINTENANCE_DETECTED_EVENT, handleDetected)
    return () => window.removeEventListener(MAINTENANCE_DETECTED_EVENT, handleDetected)
  }, [])

  return (
    <MaintenanceContext.Provider value={{ active, loading, refetch }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenance(): MaintenanceContextValue {
  const ctx = useContext(MaintenanceContext)
  if (!ctx) throw new Error('useMaintenance must be used inside <MaintenanceProvider>')
  return ctx
}
