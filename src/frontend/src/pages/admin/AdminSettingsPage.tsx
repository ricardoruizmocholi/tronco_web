import { useEffect, useState } from 'react'
import { getMaintenanceStatus, setMaintenanceStatus } from '../../api/maintenance'

export default function AdminSettingsPage() {
  const [active, setActive]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    getMaintenanceStatus()
      .then(res => setActive(res.active))
      .catch(() => setError('No se pudo cargar el estado del modo mantenimiento.'))
      .finally(() => setLoading(false))
  }, [])

  async function apply(next: boolean) {
    setSaving(true)
    setError(null)
    try {
      const res = await setMaintenanceStatus(next)
      setActive(res.active)
      setConfirming(false)
    } catch {
      setError('No se pudo actualizar el modo mantenimiento. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Desactivar no pide confirmación — solo activar, porque apaga la tienda
  // para todos los clientes.
  function handleToggleClick() {
    if (active) apply(false)
    else setConfirming(true)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Ajustes</h1>
      <p className="text-ink/50 text-sm mb-10">Configuración global de Troncodrilo Shop.</p>

      <div className="bg-white rounded-2xl border border-ink/10 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-semibold text-ink mb-1">Modo mantenimiento</p>
            <p className="text-sm text-ink/50 leading-relaxed max-w-md">
              Con el modo mantenimiento activo, todos los clientes ven una pantalla
              de mantenimiento (con el minijuego de Troncodrilo) en vez de la tienda.
              El panel de administrador sigue siendo accesible para poder
              desactivarlo.
            </p>
            {!loading && (
              <p className={`text-xs font-medium mt-3 ${active ? 'text-secondary' : 'text-primary'}`}>
                {active
                  ? '● Activo — la tienda no es visible para clientes ahora mismo'
                  : '● Inactivo — la tienda funciona con normalidad'}
              </p>
            )}
          </div>

          {loading ? (
            <div className="w-12 h-7 flex-shrink-0 bg-ink/5 rounded-full animate-pulse" />
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label="Modo mantenimiento"
              onClick={handleToggleClick}
              disabled={saving}
              className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                active ? 'bg-secondary' : 'bg-ink/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>

        {confirming && (
          <div className="mt-5 pt-5 border-t border-ink/10 -mx-6 -mb-6 px-6 pb-6 bg-secondary/5 rounded-b-2xl">
            <p className="text-sm text-ink font-medium mb-1">¿Seguro que quieres activarlo?</p>
            <p className="text-sm text-ink/60 mb-4">
              Esto apaga la tienda para todos los clientes ahora mismo, hasta que
              vuelvas a desactivarlo desde aquí.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="text-sm text-ink/60 hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => apply(true)}
                disabled={saving}
                className="btn-primary"
                style={{ backgroundColor: '#8B4A2A' }}
              >
                {saving ? 'Activando…' : 'Sí, activar mantenimiento'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2 mt-4">{error}</p>
        )}
      </div>
    </div>
  )
}
