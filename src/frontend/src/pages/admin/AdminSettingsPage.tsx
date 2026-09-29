import { useEffect, useState } from 'react'
import { getMaintenanceStatus, setMaintenanceStatus } from '../../api/maintenance'
import { getBillingSettings, updateBillingSettings, type CompanyBillingInfo } from '../../api/billingSettings'

const EMPTY_BILLING: CompanyBillingInfo = {
  legal_name: '', tax_id: '', address_line1: '', address_line2: '',
  postal_code: '', city: '', province: '', country: 'ES', tax_rate: 21,
}

function BillingSettingsCard() {
  const [form, setForm]       = useState<CompanyBillingInfo>(EMPTY_BILLING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    getBillingSettings()
      .then(setForm)
      .catch(() => setError('No se pudieron cargar los datos de facturación.'))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof CompanyBillingInfo>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
  }

  function setTaxRate(v: string) {
    setForm(f => ({ ...f, tax_rate: v === '' ? 0 : parseFloat(v) }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await updateBillingSettings(form)
      setForm(res)
      setSaved(true)
    } catch {
      setError('No se pudieron guardar los datos. Revisa los campos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xs border border-ink/15 px-3 py-2 text-sm text-ink ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/40'

  if (loading) {
    return (
      <div className="bg-white rounded-xs border border-ink/10 p-6 mt-6">
        <div className="h-5 w-48 bg-ink/5 rounded-xs animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xs border border-ink/10 p-6 mt-6">
      <p className="font-semibold text-ink mb-1">Datos de facturación</p>
      <p className="text-sm text-ink/50 leading-relaxed max-w-md mb-5">
        Datos fiscales del emisor que aparecen en todas las facturas generadas.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Razón social</label>
          <input type="text" required value={form.legal_name}
            onChange={e => set('legal_name', e.target.value)}
            placeholder="Troncodrilo Shop S.L." className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">NIF / CIF</label>
          <input type="text" required value={form.tax_id}
            onChange={e => set('tax_id', e.target.value)}
            placeholder="B12345678" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Dirección</label>
          <input type="text" required value={form.address_line1}
            onChange={e => set('address_line1', e.target.value)}
            placeholder="Calle Mayor, 42" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">
            Dirección (línea 2) <span className="text-ink/30">(opcional)</span>
          </label>
          <input type="text" value={form.address_line2}
            onChange={e => set('address_line2', e.target.value)}
            placeholder="Piso, puerta…" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Código postal</label>
            <input type="text" required value={form.postal_code}
              onChange={e => set('postal_code', e.target.value)}
              placeholder="28001" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Ciudad</label>
            <input type="text" required value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Madrid" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Provincia</label>
            <input type="text" required value={form.province}
              onChange={e => set('province', e.target.value)}
              placeholder="Madrid" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">País (ISO-2)</label>
            <input type="text" required maxLength={2} value={form.country}
              onChange={e => set('country', e.target.value.toUpperCase())}
              placeholder="ES" className={inputCls + ' font-mono'} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Tipo de IVA (%)</label>
          <input type="number" required min={0} max={100} step={0.01} value={form.tax_rate}
            onChange={e => setTaxRate(e.target.value)}
            className={inputCls + ' max-w-[140px]'} />
          <p className="text-xs text-ink/40 mt-1">
            Tipo aplicado al desglosar el IVA de cada factura (España: 21% general).
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-admin-primary">
            {saving ? 'Guardando…' : 'Guardar datos de facturación'}
          </button>
          {saved && <span className="text-xs font-medium text-primary">✓ Guardado</span>}
        </div>

        {error && (
          <p className="text-sm text-secondary bg-secondary/10 rounded-xs px-3 py-2">{error}</p>
        )}
      </form>
    </div>
  )
}

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
      <div className="bg-white rounded-xs border border-ink/10 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-semibold text-ink mb-1">Modo mantenimiento</p>
            <p className="text-sm text-ink/50 leading-relaxed max-w-md">
              Con el modo mantenimiento activo, la página de <strong>Tienda</strong> y
              la sección de <strong>Novedades</strong> de la portada muestran una
              pantalla de mantenimiento (con el minijuego de Troncodrilo) en vez de
              los productos. El resto del sitio — artistas, mapa, fichas de producto
              ya enlazadas, checkout, el panel de admin — sigue funcionando con
              normalidad.
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
          <div className="mt-5 pt-5 border-t border-ink/10 -mx-6 -mb-6 px-6 pb-6 bg-secondary/5 rounded-b-xs">
            <p className="text-sm text-ink font-medium mb-1">¿Seguro que quieres activarlo?</p>
            <p className="text-sm text-ink/60 mb-4">
              Esto oculta la Tienda y las Novedades de la portada a todos los
              clientes ahora mismo, hasta que vuelvas a desactivarlo desde aquí.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="btn-admin-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => apply(true)}
                disabled={saving}
                className="btn-admin-danger-solid"
              >
                {saving ? 'Activando…' : 'Sí, activar mantenimiento'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-secondary bg-secondary/10 rounded-xs px-3 py-2 mt-4">{error}</p>
        )}
      </div>

      <BillingSettingsCard />
    </div>
  )
}
