import { useEffect, useState } from 'react'
import {
  createShippingRate, deleteShippingRate, getAdminShippingRates,
  updateShippingRate, type ShippingRate, type ShippingRatePayload,
} from '../../api/shipping'

const EMPTY: ShippingRatePayload = {
  name: '', country_code: null, min_order_amount: 0,
  free_above: null, rate: 0, is_active: true,
}

function fmt(cents: number | null) {
  if (cents === null) return '—'
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function AdminShippingPage() {
  const [rates, setRates]         = useState<ShippingRate[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState<number | 'new' | null>(null)
  const [form, setForm]           = useState<ShippingRatePayload>(EMPTY)
  const [error, setError]         = useState<string | null>(null)

  function load() {
    setLoading(true)
    getAdminShippingRates()
      .then(setRates)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm(EMPTY)
    setEditId('new')
    setError(null)
  }

  function openEdit(r: ShippingRate) {
    setForm({
      name:             r.name,
      country_code:     r.country_code,
      min_order_amount: r.min_order_amount,
      free_above:       r.free_above,
      rate:             r.rate,
      is_active:        r.is_active,
    })
    setEditId(r.id)
    setError(null)
  }

  function cancel() { setEditId(null); setError(null) }

  function setField<K extends keyof ShippingRatePayload>(k: K, v: ShippingRatePayload[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editId === 'new') {
        await createShippingRate(form)
      } else if (editId !== null) {
        await updateShippingRate(editId, form)
      }
      setEditId(null)
      load()
    } catch {
      setError('Error al guardar la tarifa. Comprueba los datos.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar la tarifa "${name}"? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    try { await deleteShippingRate(id); load() } finally { setSaving(false) }
  }

  async function handleToggle(r: ShippingRate) {
    setSaving(true)
    try {
      await updateShippingRate(r.id, { ...r, is_active: !r.is_active })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-ink">Tarifas de envío</h1>
        {editId === null && (
          <button onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium
              px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva tarifa
          </button>
        )}
      </div>
      <p className="text-ink/50 text-sm mb-8">
        Define costes por país y umbrales de envío gratuito. Los valores se introducen en euros.
      </p>

      {/* ── Formulario crear / editar ── */}
      {editId !== null && (
        <form onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-ink/10 p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-ink">
            {editId === 'new' ? 'Nueva tarifa' : 'Editar tarifa'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink/60 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="España estándar"
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                  focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* País */}
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Código de país <span className="text-ink/30">(ISO-3166-1 α-2, vacío = internacional)</span>
              </label>
              <input
                type="text"
                maxLength={2}
                value={form.country_code ?? ''}
                onChange={e => setField('country_code', e.target.value.toUpperCase() || null)}
                placeholder="ES"
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                  font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Tarifa */}
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Coste de envío (€)</label>
              <input
                type="number"
                required
                min={0}
                step={0.01}
                value={(form.rate / 100).toFixed(2)}
                onChange={e => setField('rate', Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                  focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Pedido mínimo */}
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Pedido mínimo (€) <span className="text-ink/30">(0 = siempre aplica)</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step={0.01}
                value={(form.min_order_amount / 100).toFixed(2)}
                onChange={e => setField('min_order_amount', Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                  focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Gratis a partir de */}
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Gratis a partir de (€) <span className="text-ink/30">(vacío = nunca gratis)</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.free_above !== null ? (form.free_above / 100).toFixed(2) : ''}
                onChange={e => {
                  const val = e.target.value
                  setField('free_above', val === '' ? null : Math.round(parseFloat(val) * 100))
                }}
                placeholder="50.00"
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                  focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Activo */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setField('is_active', !form.is_active)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  form.is_active ? 'bg-primary' : 'bg-ink/20'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow
                  transition-transform ${form.is_active ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-sm text-ink/70">
                {form.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-secondary bg-secondary/10 rounded-xl px-4 py-3">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={cancel}
              className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl
                hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* ── Tabla de tarifas ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rates.length === 0 ? (
        <p className="text-center text-ink/40 py-20 text-sm">
          No hay tarifas configuradas. Crea una con el botón superior.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/8 bg-ink/[0.02]">
                <th className="text-left px-5 py-3 font-medium text-ink/50">Nombre</th>
                <th className="text-left px-5 py-3 font-medium text-ink/50">País</th>
                <th className="text-right px-5 py-3 font-medium text-ink/50">Coste</th>
                <th className="text-right px-5 py-3 font-medium text-ink/50">Gratis desde</th>
                <th className="text-right px-5 py-3 font-medium text-ink/50">Mín. pedido</th>
                <th className="text-center px-5 py-3 font-medium text-ink/50">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rates.map(r => (
                <tr key={r.id} className={`transition-colors ${
                  r.is_active ? 'hover:bg-ink/[0.015]' : 'opacity-50 hover:bg-ink/[0.015]'
                }`}>
                  <td className="px-5 py-3.5 font-medium text-ink">{r.name}</td>
                  <td className="px-5 py-3.5 font-mono text-ink/70">
                    {r.country_code ?? <span className="text-ink/30 italic">Internacional</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right text-ink">{fmt(r.rate)}</td>
                  <td className="px-5 py-3.5 text-right text-ink/60">{fmt(r.free_above)}</td>
                  <td className="px-5 py-3.5 text-right text-ink/60">
                    {r.min_order_amount > 0 ? fmt(r.min_order_amount) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(r)}
                      disabled={saving}
                      className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
                        r.is_active ? 'bg-primary' : 'bg-ink/20'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full
                        shadow transition-transform ${r.is_active ? 'translate-x-4' : ''}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(r)}
                        disabled={saving || editId !== null}
                        className="p-1.5 text-ink/40 hover:text-primary transition-colors
                          disabled:opacity-30"
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={saving}
                        className="p-1.5 text-ink/40 hover:text-secondary transition-colors
                          disabled:opacity-30"
                        title="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
