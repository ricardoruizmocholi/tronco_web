import { Link } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'

export default function CheckoutCancelPage() {
  const openCart = useCartStore(s => s.openCart)

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-5xl opacity-50">✕</div>

      <div className="space-y-2">
        <h1 className="font-editorial text-3xl text-ink">Pago cancelado</h1>
        <p className="text-ink/50 text-sm max-w-sm">
          No se realizó ningún cargo. Tus productos siguen en el carrito cuando quieras retomarlo.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={openCart} className="btn-primary px-6 py-2.5">
          Volver al carrito
        </button>
        <Link to="/tienda" className="btn-secondary px-6 py-2.5">
          Ver tienda
        </Link>
      </div>
    </div>
  )
}
