import { useEffect, useMemo, useState } from 'react'
import { getAdminProducts } from '../../api/products'
import {
  createPromotion, deletePromotion, getAdminPromotions, updatePromotion,
} from '../../api/promotions'
import type { Product } from '../../types/product'
import type { DiscountType, Promotion, PromotionStatus } from '../../types/promotion'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

const STATUS_LABEL: Record<PromotionStatus, string> = {
  active:    'Activa',
  scheduled: 'Programada',
  expired:   'Expirada',
  inactive:  'Inactiva',
}

const STATUS_BADGE: Record<PromotionStatus, string> = {
  active:    'bg-primary/10 text-primary',
  scheduled: 'bg-blue-100 text-blue-700',
  expired:   'bg-ink/10 text-ink/50',
  inactive:  'bg-amber-100 text-amber-700',
}

type FormMode = { type: 'create' } | { type: 'edit'; promotion: Promotion } | null

interface FormState {
  product_id:     string
  productSearch:  string
  discount_type:  DiscountType
  discount_value: string // percent: entero (0-100); fixed: euros ("12.50")
  starts_at:      string
  ends_at:        string
  is_active:      boolean
}

const emptyForm: FormState = {
  product_id:     '',
  productSearch:  '',
  discount_type:  'percent',
  discount_value: '',
  starts_at:      '',
  ends_at:        '',
  is_active:      true,
}

function formatDiscount(p: Promotion): string {
  return p.discount_type === 'percent'
    ? `${p.discount_value}%`
    : euros.format(p.discount_value / 100)
}

function formatRange(p: Promotion): string {
  if (!p.starts_at && !p.ends_at) return 'Sin límite'
  const start = p.starts_at ? new Date(p.starts_at).toLocaleDateString('es-ES') : null
  const end   = p.ends_at   ? new Date(p.ends_at).toLocaleDateString('es-ES')   : null
  if (start && end) return `${start} – ${end}`
  if (start) return `Desde ${start}`
  return `Hasta ${end}`
}

// El backend devuelve fechas ISO completas; el input datetime-local espera "YYYY-MM-DDTHH:mm"
function toDatetimeLocal(iso: string | null): string {
  return iso ? iso.slice(0, 16) : ''
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [formMode, setFormMode]     = useState<FormMode>(null)
  const [form, setForm]             = useState<FormState>(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function load() {
    setLoading(true)
    return Promise.all([getAdminPromotions(), getAdminProducts()])
      .then(([p, prods]) => { setPromotions(p); setProducts(prods) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(emptyForm)
    setError(null)
    setFormMode({ type: 'create' })
  }

  function openEdit(promo: Promotion) {
    setForm({
      product_id:     String(promo.product_id),
      productSearch:  promo.product?.name ?? '',
      discount_type:  promo.discount_type,
      discount_value: promo.discount_type === 'percent'
        ? String(promo.discount_value)
        : (promo.discount_value / 100).toFixed(2),
      starts_at: toDatetimeLocal(promo.starts_at),
      ends_at:   toDatetimeLocal(promo.ends_at),
      is_active: promo.is_active,
    })
    setError(null)
    setFormMode({ type: 'edit', promotion: promo })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_id) { setError('Selecciona un producto.'); return }
    const value = parseFloat(form.discount_value)
    if (isNaN(value) || value <= 0) { setError('Introduce un valor de descuento válido.'); return }
    if (form.discount_type === 'percent' && value > 100) {
      setError('El porcentaje no puede superar 100.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        product_id:     parseInt(form.product_id, 10),
        discount_type:  form.discount_type,
        discount_value: form.discount_type === 'percent' ? Math.round(value) : Math.round(value * 100),
        starts_at:      form.starts_at || null,
        ends_at:        form.ends_at || null,
        is_active:      form.is_active,
      }

      if (formMode?.type === 'edit') {
        const updated = await updatePromotion(formMode.promotion.id, payload)
        setPromotions(ps => ps.map(p => (p.id === updated.id ? updated : p)))
      } else {
        const created = await createPromotion(payload)
        setPromotions(ps => [created, ...ps])
      }
      setFormMode(null)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data
      const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
      setError(firstFieldError ?? data?.message ?? 'No se pudo guardar la promoción.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(promo: Promotion) {
    if (!window.confirm(`¿Eliminar la promoción de "${promo.product?.name ?? 'este producto'}"?`)) return
    try {
      await deletePromotion(promo.id)
      setPromotions(ps => ps.filter(p => p.id !== promo.id))
    } catch {
      setError('No se pudo eliminar la promoción.')
    }
  }

  const filteredProducts = useMemo(() => {
    const q = form.productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q))
  }, [products, form.productSearch])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      active:    promotions.filter(p => p.status === 'active').length,
      scheduled: promotions.filter(p => p.status === 'scheduled').length,
      expiredThisMonth: promotions.filter(p => {
        if (p.status !== 'expired' || !p.ends_at) return false
        const d = new Date(p.ends_at)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).length,
    }
  }, [promotions])

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-ink">Promociones</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nueva promoción
        </button>
      </div>
      <p className="text-ink/50 text-sm mb-8">Gestiona descuentos sobre productos del catálogo.</p>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-ink/10 p-5">
          <p className="text-2xl font-bold text-ink">{stats.active}</p>
          <p className="text-xs text-ink/40 mt-1">Activas ahora</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink/10 p-5">
          <p className="text-2xl font-bold text-ink">{stats.scheduled}</p>
          <p className="text-xs text-ink/40 mt-1">Programadas</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink/10 p-5">
          <p className="text-2xl font-bold text-ink">{stats.expiredThisMonth}</p>
          <p className="text-xs text-ink/40 mt-1">Expiradas este mes</p>
        </div>
      </div>

      {/* ── Error global ── */}
      {error && !formMode && (
        <div className="rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Tabla ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : promotions.length === 0 ? (
        <p className="text-center text-ink/40 py-20 text-sm">No hay promociones todavía.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-ink/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium text-right">Descuento</th>
                <th className="px-4 py-3 font-medium text-right">Precio original</th>
                <th className="px-4 py-3 font-medium text-right">Precio final</th>
                <th className="px-4 py-3 font-medium">Vigencia</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {promotions.map(promo => (
                <tr key={promo.id} className="bg-white hover:bg-ink/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-ink max-w-[200px] truncate">
                    {promo.product?.name ?? `Producto #${promo.product_id}`}
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {promo.discount_type === 'percent' ? 'Porcentaje' : 'Fijo'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatDiscount(promo)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink/40 line-through">
                    {euros.format(promo.original_price / 100)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                    {euros.format(promo.discounted_price / 100)}
                  </td>
                  <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{formatRange(promo)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${STATUS_BADGE[promo.status]}`}>
                      {STATUS_LABEL[promo.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(promo)}
                        className="text-xs px-3 py-1 rounded border border-ink/20 text-ink hover:border-primary hover:text-primary transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(promo)}
                        className="text-xs px-3 py-1 rounded border border-secondary/40
                          text-secondary hover:bg-secondary/10 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal crear/editar ── */}
      {formMode && (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setFormMode(null) }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-semibold text-ink mb-1">
              {formMode.type === 'edit' ? 'Editar promoción' : 'Nueva promoción'}
            </h3>
            <p className="text-sm text-ink/50 mb-5">
              Configura el descuento y su vigencia.
            </p>

            <div className="space-y-4">
              {/* Producto */}
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Producto</label>
                <input
                  type="text"
                  value={form.productSearch}
                  onChange={e => setForm(f => ({ ...f, productSearch: e.target.value }))}
                  placeholder="Buscar producto…"
                  className="w-full rounded-xl border border-ink/15 px-4 py-2 text-sm text-ink
                    focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
                />
                <select
                  value={form.product_id}
                  onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                  className="w-full rounded-xl border border-ink/15 px-4 py-2 text-sm text-ink bg-white
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="" disabled>Selecciona un producto…</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {euros.format(p.price / 100)}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de descuento */}
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1.5">Tipo de descuento</label>
                <div className="flex gap-4">
                  {(['percent', 'fixed'] as DiscountType[]).map(type => (
                    <label key={type} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input
                        type="radio"
                        name="discount_type"
                        checked={form.discount_type === type}
                        onChange={() => setForm(f => ({ ...f, discount_type: type }))}
                        className="accent-primary"
                      />
                      {type === 'percent' ? 'Porcentaje (%)' : 'Importe fijo (€)'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">
                  {form.discount_type === 'percent' ? 'Porcentaje de descuento' : 'Descuento (€)'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={form.discount_type === 'percent' ? 100 : undefined}
                  step={form.discount_type === 'percent' ? 1 : 0.01}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  placeholder={form.discount_type === 'percent' ? '20' : '5.00'}
                  className="w-full rounded-xl border border-ink/15 px-4 py-2 text-sm text-ink
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Inicio (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                      focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Fin (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                    className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink
                      focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Toggle activo */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  border transition-colors ${
                    form.is_active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-ink/60 border-ink/15 hover:border-primary/40'
                  }`}
              >
                {form.is_active ? 'Activa' : 'Inactiva'}
              </button>

              {error && <p className="text-xs text-secondary">{error}</p>}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white text-sm rounded-xl
                  hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
