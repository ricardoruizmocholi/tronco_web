import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../api/orders'
import type { Order, OrderStatus } from '../types/order'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-100 text-amber-700' },
  paid:      { label: 'Pagado',     className: 'bg-primary/10 text-primary' },
  failed:    { label: 'Fallido',    className: 'bg-secondary/10 text-secondary' },
  shipped:   { label: 'Enviado',    className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado',  className: 'bg-ink/10 text-ink/50' },
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs uppercase tracking-wide font-medium ${className}`}>
      {label}
    </span>
  )
}

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-ink/50 text-sm">Cargando pedidos…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-ink/50 text-sm">No se pudieron cargar los pedidos.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-editorial text-3xl text-ink mb-8">Mis pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-ink/40 text-sm">Todavía no tienes pedidos.</p>
          <Link to="/tienda" className="text-primary text-sm hover:underline">
            Ir a la tienda →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
            const totalItems = order.items.reduce((n, i) => n + i.quantity, 0)

            return (
              <div
                key={order.id}
                className="bg-white border border-ink/10 overflow-hidden"
              >
                {/* Cabecera del pedido */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-ink/5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink">#{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink">{euros.format(order.total / 100)}</p>
                    <p className="text-xs text-ink/40">{date}</p>
                  </div>
                </div>

                {/* Items del pedido */}
                <div className="px-5 py-3">
                  {order.items.length === 0 ? (
                    <p className="text-xs text-ink/40">Sin artículos</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-8 h-10 flex-shrink-0 overflow-hidden bg-primary/10">
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
                </div>

                {/* Pie del pedido */}
                <div className="px-5 py-3 border-t border-ink/5 flex items-center justify-between">
                  <p className="text-xs text-ink/40">
                    {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
