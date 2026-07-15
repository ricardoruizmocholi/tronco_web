import { useState } from 'react'
import { cancelOrder } from '../api/orders'
import type { Order } from '../types/order'

interface Props {
  order: Order
  onClose: () => void
  onCancelled: (orderId: number) => void
}

export default function CancelOrderModal({ order, onClose, onCancelled }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const isPaid = order.status === 'paid'

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await cancelOrder(order.id)
      onCancelled(order.id)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'No se pudo cancelar el pedido. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
      <div className="bg-canvas w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="text-xs font-medium text-ink/50 uppercase tracking-widest mb-1">Cancelar pedido</p>
        <h2 className="text-lg font-bold text-ink mb-6">Pedido #{order.id}</h2>

        <p className="text-sm text-ink/70 leading-relaxed mb-4">
          ¿Confirmas que quieres cancelar este pedido?
        </p>

        {isPaid && (
          <div className="border border-secondary/30 bg-secondary/5 p-4 mb-6">
            <p className="text-xs font-semibold text-secondary mb-1.5">Aviso sobre comisiones Stripe</p>
            <p className="text-xs text-ink/60 leading-relaxed">
              Tu pedido ya fue cobrado. El importe total será reembolsado, pero las comisiones de
              procesamiento de Stripe (≈1,4 % + 0,25 €) no son recuperables y corren a cargo del negocio.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-secondary mb-4">{error}</p>
        )}

        <div className="h-px bg-ink/10 w-full mb-6" />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm text-ink/40 hover:text-ink transition-colors disabled:opacity-50"
          >
            Mantener pedido
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="text-white text-sm tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50"
            style={{ backgroundColor: loading ? '#b36a3a' : '#8B4A2A' }}
          >
            {loading ? 'Cancelando…' : 'Cancelar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
