import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, cancelOrder } from '../api/orders'
import type { Order, OrderStatus } from '../types/order'
import CancelOrderModal from './CancelOrderModal'
import ReturnRequestModal from './ReturnRequestModal'
import ReturnStatusBadge from './ReturnStatusBadge'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending:          { label: 'Pendiente',           className: 'text-ink/50' },
  paid:             { label: 'Pagado',               className: 'text-primary' },
  failed:           { label: 'Fallido',              className: 'text-secondary' },
  shipped:          { label: 'Enviado',              className: 'text-ink' },
  cancelled:        { label: 'Cancelado',            className: 'text-ink/30' },
  delivered:        { label: 'Entregado',            className: 'text-primary' },
  return_requested: { label: 'Devolución solicitada', className: 'text-secondary' },
  return_approved:  { label: 'Devolución aprobada',  className: 'text-primary' },
  return_rejected:  { label: 'Devolución rechazada', className: 'text-secondary' },
  return_received:  { label: 'Devuelto recibido',    className: 'text-ink/50' },
  refunded:         { label: 'Reembolsado',          className: 'text-primary' },
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={`text-xs font-medium uppercase tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

interface OrderCardProps {
  order: Order
  onCancel: (order: Order) => void
  onReturn: (order: Order) => void
}

function OrderCard({ order, onCancel, onReturn }: OrderCardProps) {
  const [open, setOpen] = useState(false)

  const date = new Date(order.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const totalItems = order.items.reduce((n, i) => n + i.quantity, 0)
  const addr = order.shipping_address

  const canCancel = ['pending', 'paid'].includes(order.status)
  const canReturn  = ['shipped', 'delivered'].includes(order.status) && !order.return_request

  return (
    <div className="bg-white rounded-none border border-ink/10 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-ink/5 text-left hover:bg-ink/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary">#{order.id}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-ink">{euros.format(order.total / 100)}</p>
            <p className="text-xs text-ink/40">{date}</p>
          </div>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"
            className={`w-4 h-4 text-ink/30 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-4">
          {order.items.length === 0 ? (
            <p className="text-xs text-ink/40">Sin artículos</p>
          ) : (
            <div className="flex flex-col gap-2">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-8 h-10 flex-shrink-0 rounded overflow-hidden bg-primary/10">
                    {item.product?.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.product ? (
                      <Link
                        to={`/producto/${item.product.slug}`}
                        className="text-xs font-medium text-ink hover:text-primary transition-colors truncate block"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <p className="text-xs text-ink/40">Producto no disponible</p>
                    )}
                  </div>
                  <p className="text-xs text-ink/50 flex-shrink-0">
                    {item.quantity} × {euros.format(item.unit_price / 100)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {addr && (
            <div className="pt-3 border-t border-ink/5">
              <p className="text-xs font-medium text-ink/50 mb-1">Dirección de envío</p>
              <p className="text-xs text-ink/70 leading-relaxed">
                {addr.name && <span className="block">{addr.name}</span>}
                {addr.address_line1 && <span className="block">{addr.address_line1}</span>}
                {addr.address_line2 && <span className="block">{addr.address_line2}</span>}
                {(addr.postal_code || addr.city) && (
                  <span className="block">{[addr.postal_code, addr.city].filter(Boolean).join(' ')}</span>
                )}
                {addr.state && <span className="block">{addr.state}</span>}
              </p>
            </div>
          )}

          {order.return_request && (
            <div className="pt-3 border-t border-ink/5">
              <p className="text-xs font-medium text-ink/50 mb-1">Estado de devolución</p>
              <ReturnStatusBadge status={order.return_request.status} />
            </div>
          )}

          <div className="pt-2 border-t border-ink/5 flex items-center justify-between">
            <p className="text-xs text-ink/40">
              {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
            </p>
            <div className="flex gap-2">
              {canReturn && (
                <button
                  onClick={() => onReturn(order)}
                  className="text-xs text-secondary hover:underline"
                >
                  Solicitar devolución
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => onCancel(order)}
                  className="text-xs text-ink/40 hover:text-secondary hover:underline"
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfileOrdersSection() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [returnTarget, setReturnTarget] = useState<Order | null>(null)

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  function handleCancelled(orderId: number) {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o)
    )
    setCancelTarget(null)
  }

  function handleRequested(orderId: number) {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'return_requested' as OrderStatus,
              return_request: {
                id: 0, order_id: orderId, user_id: 0,
                reason: 'otro' as const,
                description: null, image_url: null,
                status: 'pending' as const,
                admin_notes: null, stripe_refund_id: null, refund_amount: null,
                requested_at: null, approved_at: null, rejected_at: null,
                received_at: null, refunded_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                history: [],
              },
            }
          : o
      )
    )
    setReturnTarget(null)
  }

  if (loading) return <p className="text-ink/50 text-sm py-6">Cargando pedidos…</p>
  if (error)   return <p className="text-ink/50 text-sm py-6">No se pudieron cargar los pedidos.</p>

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-ink/40 text-sm">Todavía no tienes pedidos.</p>
        <Link to="/tienda" className="text-primary text-sm hover:underline">Ir a la tienda →</Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onCancel={setCancelTarget}
            onReturn={setReturnTarget}
          />
        ))}
      </div>

      {cancelTarget && (
        <CancelOrderModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => handleCancelled(cancelTarget.id)}
          cancelFn={cancelOrder}
        />
      )}

      {returnTarget && (
        <ReturnRequestModal
          order={returnTarget}
          onClose={() => setReturnTarget(null)}
          onRequested={() => handleRequested(returnTarget.id)}
        />
      )}
    </>
  )
}
