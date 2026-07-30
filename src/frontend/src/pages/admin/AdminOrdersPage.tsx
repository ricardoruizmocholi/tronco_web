import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  exportOrders,
  getAdminOrder,
  getAdminOrders,
  getOrderStats,
  updateOrderStatus,
} from '../../api/adminOrders'
import type {
  AdminOrder,
  AdminOrderDetail,
  AdminOrdersFilters,
  OrderStats,
} from '../../types/adminOrder'
import type { OrderStatus } from '../../types/order'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'Todos los estados' },
  { value: 'pending',   label: 'Pendiente' },
  { value: 'paid',      label: 'Pagado' },
  { value: 'shipped',   label: 'Enviado' },
  { value: 'failed',    label: 'Fallido' },
  { value: 'cancelled', label: 'Cancelado' },
]

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-primary/10 text-primary',
  shipped:   'bg-blue-100 text-blue-700',
  failed:    'bg-red-100 text-red-700',
  cancelled: 'bg-ink/10 text-ink/50',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  shipped:   'Enviado',
  failed:    'Fallido',
  cancelled: 'Cancelado',
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-ink/10 text-ink/50'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Stats cards ─────────────────────────────────────────────────────────────

function StatsCards({ stats, loading }: { stats: OrderStats | null; loading: boolean }) {
  const cards = [
    {
      label: 'Ingresos del mes',
      value: loading ? '—' : euros.format((stats?.total_revenue ?? 0) / 100),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        </svg>
      ),
    },
    {
      label: 'Pedidos este mes',
      value: loading ? '—' : String(stats?.order_count ?? 0),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h13a1.125 1.125 0 011.119 1.007z" />
        </svg>
      ),
    },
    {
      label: 'Producto estrella',
      value: loading ? '—' : (stats?.top_product?.name ?? '—'),
      sub:   loading ? '' : (stats?.top_product ? `${stats.top_product.units_sold} uds.` : ''),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-2xl border border-ink/10 p-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink/50 mb-0.5">{card.label}</p>
            <p className="text-lg font-bold text-ink truncate">{card.value}</p>
            {card.sub && <p className="text-xs text-ink/40">{card.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Modal de detalle ─────────────────────────────────────────────────────────

function OrderDetailModal({
  orderId,
  onClose,
  onStatusChange,
}: {
  orderId: number
  onClose: () => void
  onStatusChange: (id: number, status: string) => void
}) {
  const [order, setOrder]     = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    getAdminOrder(orderId)
      .then(o => { setOrder(o); setNewStatus(o.status) })
      .finally(() => setLoading(false))
  }, [orderId])

  async function handleSaveStatus() {
    if (!order || newStatus === order.status) return
    setSaving(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      onStatusChange(order.id, newStatus)
      setOrder(prev => prev ? { ...prev, status: newStatus as OrderStatus } : prev)
    } finally {
      setSaving(false)
    }
  }

  const addr = order?.shipping_address

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
          <div>
            <h3 className="font-semibold text-ink">
              Pedido #{orderId}
            </h3>
            {order && (
              <p className="text-xs text-ink/40 mt-0.5">
                {order.user?.name} · {order.user?.email}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink/30 hover:text-ink transition-colors rounded-lg hover:bg-ink/5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : order ? (
          <div className="px-6 py-5 space-y-6">

            {/* Cambiar estado */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-ink/50 mb-1.5">Estado del pedido</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full border border-ink/20 rounded-xl px-3 py-2 text-sm text-ink
                    bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {STATUS_OPTIONS.filter(o => o.value !== '').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveStatus}
                disabled={saving || newStatus === order.status}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl
                  hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-medium text-ink/50 mb-3">Artículos</p>
              <div className="space-y-2">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-2
                    border-b border-ink/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-ink/40">
                        Talla: {item.variant_size ?? '—'} · {euros.format(item.unit_price / 100)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink flex-shrink-0">
                      {euros.format(item.subtotal / 100)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="bg-ink/[0.03] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-ink/60">
                <span>Envío</span>
                <span>{euros.format((order.shipping_cost ?? 0) / 100)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-ink border-t border-ink/10 pt-2 mt-2">
                <span>Total</span>
                <span>{euros.format(order.total / 100)}</span>
              </div>
            </div>

            {/* Dirección */}
            {addr && (
              <div>
                <p className="text-xs font-medium text-ink/50 mb-2">Dirección de envío</p>
                <div className="text-sm text-ink/70 leading-relaxed">
                  {addr.name        && <p>{addr.name}</p>}
                  {addr.address_line1 && <p>{addr.address_line1}</p>}
                  {addr.address_line2 && <p>{addr.address_line2}</p>}
                  {(addr.postal_code || addr.city) && (
                    <p>{[addr.postal_code, addr.city].filter(Boolean).join(' ')}</p>
                  )}
                  {addr.state   && <p>{addr.state}</p>}
                  {addr.phone   && <p>{addr.phone}</p>}
                </div>
              </div>
            )}

          </div>
        ) : (
          <p className="text-center text-ink/40 py-16 text-sm">No se pudo cargar el pedido.</p>
        )}
      </div>
    </div>
  )
}

// ─── Paginación ───────────────────────────────────────────────────────────────

function Pagination({
  current, last, onPage,
}: { current: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPage(current - 1)}
        disabled={current === 1}
        className="px-3 py-1.5 rounded-lg text-sm border border-ink/15 text-ink/60
          hover:border-primary/40 hover:text-ink disabled:opacity-30 transition-colors"
      >
        ← Anterior
      </button>
      <span className="text-sm text-ink/50 px-2">
        {current} / {last}
      </span>
      <button
        onClick={() => onPage(current + 1)}
        disabled={current === last}
        className="px-3 py-1.5 rounded-lg text-sm border border-ink/15 text-ink/60
          hover:border-primary/40 hover:text-ink disabled:opacity-30 transition-colors"
      >
        Siguiente →
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState<AdminOrder[]>([])
  const [page, setPage]         = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters]   = useState<AdminOrdersFilters>({})
  const [draft, setDraft]       = useState<AdminOrdersFilters>({})

  const [stats, setStats]         = useState<OrderStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Abre directamente el detalle si se llega con ?order=ID (p.ej. desde el panel de devoluciones)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const orderParam = searchParams.get('order')
    if (orderParam) setSelectedId(Number(orderParam))
  }, [searchParams])

  // Cargar stats al montar
  useEffect(() => {
    getOrderStats()
      .then(setStats)
      .finally(() => setStatsLoading(false))
  }, [])

  // Cargar pedidos cuando cambian filtros o página
  useEffect(() => {
    setLoading(true)
    getAdminOrders(filters, page)
      .then(data => {
        setOrders(data.data)
        setLastPage(data.last_page)
      })
      .finally(() => setLoading(false))
  }, [filters, page])

  function applyFilters() {
    setFilters({ ...draft })
    setPage(1)
  }

  function clearFilters() {
    const empty: AdminOrdersFilters = {}
    setDraft(empty)
    setFilters(empty)
    setPage(1)
  }

  function handleStatusChange(id: number, status: string) {
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status: status as OrderStatus } : o)
    )
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportOrders(filters)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const inputCls = 'border border-ink/15 bg-white rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pedidos</h1>
          <p className="text-ink/50 text-sm mt-1">Gestión y seguimiento de todos los pedidos.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium
            rounded-xl hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {exporting ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8">
        <StatsCards stats={stats} loading={statsLoading} />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-ink/10 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-ink/50 mb-1">Estado</label>
            <select
              value={draft.status ?? ''}
              onChange={e => setDraft(d => ({ ...d, status: e.target.value || undefined }))}
              className={inputCls}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Desde</label>
            <input
              type="date"
              value={draft.date_from ?? ''}
              onChange={e => setDraft(d => ({ ...d, date_from: e.target.value || undefined }))}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Hasta</label>
            <input
              type="date"
              value={draft.date_to ?? ''}
              onChange={e => setDraft(d => ({ ...d, date_to: e.target.value || undefined }))}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Email usuario</label>
            <input
              type="email"
              value={draft.user_email ?? ''}
              onChange={e => setDraft(d => ({ ...d, user_email: e.target.value || undefined }))}
              placeholder="usuario@email.com"
              className={`${inputCls} min-w-44`}
            />
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Importe mín. (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.min_amount ?? ''}
              onChange={e => setDraft(d => ({ ...d, min_amount: e.target.value || undefined }))}
              placeholder="0.00"
              className={`${inputCls} w-28`}
            />
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Importe máx. (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.max_amount ?? ''}
              onChange={e => setDraft(d => ({ ...d, max_amount: e.target.value || undefined }))}
              placeholder="0.00"
              className={`${inputCls} w-28`}
            />
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl text-sm text-ink/60 border border-ink/15
                hover:border-ink/30 hover:text-ink transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white
                hover:bg-primary/90 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-ink/40 py-20 text-sm">No hay pedidos con esos filtros.</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs text-ink/40 uppercase tracking-wide">
                  <th className="text-left px-5 py-3.5">ID</th>
                  <th className="text-left px-5 py-3.5">Usuario</th>
                  <th className="text-left px-5 py-3.5">Fecha</th>
                  <th className="text-left px-5 py-3.5">Estado</th>
                  <th className="text-right px-5 py-3.5">Importe</th>
                  <th className="text-right px-5 py-3.5">Artículos</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-ink/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-ink/50">#{order.id}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink truncate max-w-[180px]">
                        {order.user?.name ?? '—'}
                      </p>
                      <p className="text-xs text-ink/40 truncate max-w-[180px]">
                        {order.user?.email ?? '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-ink/60 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-ink tabular-nums">
                      {euros.format(order.total / 100)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-ink/60">
                      {order.items_count}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedId(order.id)}
                        className="px-3 py-1.5 bg-ink/5 text-ink text-xs rounded-lg font-medium
                          hover:bg-primary hover:text-white transition-colors"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination current={page} last={lastPage} onPage={setPage} />
        </>
      )}

      {/* Modal de detalle */}
      {selectedId !== null && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
