import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getOrder } from '../../api/orders'
import { useCartStore } from '../../store/cartStore'
import type { Order } from '../../types/order'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  paid:      { text: '¡Pago completado!',                  className: 'text-primary' },
  pending:   { text: 'Pago en proceso de confirmación',    className: 'text-amber-600' },
  failed:    { text: 'El pago no se pudo completar',       className: 'text-secondary' },
  cancelled: { text: 'Pedido cancelado',                   className: 'text-ink/50' },
  shipped:   { text: '¡Pedido enviado!',                   className: 'text-primary' },
}

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = Number(searchParams.get('order'))

  const [order, setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  const clearCart = useCartStore(s => s.clearCart)

  // Vacía el carrito al aterrizar en la página de éxito, independientemente del status
  useEffect(() => {
    clearCart()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!orderId) {
      setError(true)
      setLoading(false)
      return
    }
    getOrder(orderId)
      .then(setOrder)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-ink/50 text-sm">Cargando resumen del pedido…</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-ink font-medium">No se pudo cargar el pedido.</p>
        <Link to="/mis-pedidos" className="text-primary text-sm hover:underline">
          Ver mis pedidos →
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending
  const isPaid     = order.status === 'paid'

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Icono + título */}
      <div className="text-center mb-8">
        <div className={`text-5xl mb-4 ${isPaid ? '' : 'opacity-60'}`}>
          {isPaid ? '✓' : '⏳'}
        </div>
        <h1 className={`font-editorial text-3xl mb-2 ${statusInfo.className}`}>
          {statusInfo.text}
        </h1>
        <p className="text-ink/50 text-sm">
          Pedido <span className="font-medium text-ink">#{order.id}</span>
          {order.status === 'pending' && (
            <span className="block mt-1 text-xs">
              Recibirás una confirmación cuando el pago sea procesado.
            </span>
          )}
        </p>
      </div>

      {/* Resumen de items */}
      <div className="bg-white border border-ink/10 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-ink/10">
          <p className="label-caps font-semibold text-ink/40">
            Resumen del pedido
          </p>
        </div>
        <div className="divide-y divide-ink/5">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-10 h-12 flex-shrink-0 overflow-hidden bg-primary/10">
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
                <p className="text-sm font-medium text-ink truncate">
                  {item.product?.name ?? `Producto #${item.product_id}`}
                </p>
                <p className="text-xs text-ink/50">
                  {item.quantity} × {euros.format(item.unit_price / 100)}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink flex-shrink-0">
                {euros.format((item.unit_price * item.quantity) / 100)}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-ink/10 flex justify-between items-baseline">
          <span className="text-sm text-ink/60">Total</span>
          <span className="text-xl font-bold text-ink">{euros.format(order.total / 100)}</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <Link to="/mis-pedidos" className="btn-primary w-full">
          Ver mis pedidos
        </Link>
        <Link to="/tienda" className="btn-secondary w-full">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
