import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { initiateCheckout, type ShippingAddress } from '../api/orders'
import { getProducts } from '../api/products'
import { getPublicShippingRates, type ShippingRate as ShippingRateType } from '../api/shipping'
import ShippingAddressModal from './ShippingAddressModal'
import { useCartStore } from '../store/cartStore'
import { useCurrency } from '../hooks/useCurrency'
import type { Product } from '../types/product'

// El cobro real en Stripe siempre es en EUR — formateador fijo, independiente
// de la divisa seleccionada, usado solo en el aviso bajo el total.
const eurFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export default function CartDrawer() {
  const {
    items, isOpen, closeCart,
    addItem, removeItem, updateQuantity,
    getSubtotal, getTotalItems,
  } = useCartStore()
  const { formatPrice, selectedCurrency } = useCurrency()

  const [recommendations, setRecommendations]   = useState<Product[]>([])
  const [shippingRates, setShippingRates]       = useState<ShippingRateType[]>([])
  const [showShipping, setShowShipping]         = useState(false)
  const [paying, setPaying]                     = useState(false)
  const [payError, setPayError]                 = useState<string | null>(null)

  async function handleConfirmShipping(address: ShippingAddress) {
    setPaying(true)
    setPayError(null)
    try {
      const checkoutItems = items.map(i => ({
        product_id: i.productId,
        variant_id: i.variantId,
        quantity:   i.quantity,
      }))
      const { checkout_url } = await initiateCheckout(checkoutItems, address)
      window.location.href = checkout_url
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: string[] } } }
      const msg = axiosErr?.response?.data?.message ?? 'Error al iniciar el pago. Inténtalo de nuevo.'
      setPayError(msg)
      setPaying(false)
      setShowShipping(false)
    }
  }

  // Bloquea scroll del body mientras el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Fetch tarifas de envío al abrir el drawer
  useEffect(() => {
    if (!isOpen) return
    getPublicShippingRates().then(setShippingRates).catch(() => {})
  }, [isOpen])

  // Fetch recomendaciones al abrir (primera categoría de los items del carrito)
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setRecommendations([])
      return
    }
    const categorySlug = items.find(i => i.categorySlug)?.categorySlug
    if (!categorySlug) return

    const inCart = new Set(items.map(i => i.productId))
    getProducts(categorySlug, 1)
      .then(res => setRecommendations(res.data.filter(p => !inCart.has(p.id)).slice(0, 3)))
      .catch(() => {})
  }, [isOpen])

  const totalItems = getTotalItems()

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
      />

      {/* Panel deslizante */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-canvas shadow-2xl
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10 bg-white flex-shrink-0">
          <h2 className="font-semibold text-ink">
            Tu carrito
            {totalItems > 0 && (
              <span className="ml-2 text-xs font-normal text-ink/50">
                ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
              </span>
            )}
          </h2>
          <button onClick={closeCart} aria-label="Cerrar carrito"
            className="text-ink/40 hover:text-ink transition-colors p-1">
            <XIcon size={20} />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <span className="text-5xl opacity-30">🛒</span>
              <p className="text-ink/50 text-sm">Tu carrito está vacío.</p>
              <button onClick={closeCart}
                className="text-primary text-sm font-medium hover:underline">
                Explorar la tienda →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ink/5">
              {/* Lista de items */}
              {items.map(item => (
                <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex gap-3 p-4">
                  {/* Miniatura */}
                  <Link to={`/producto/${item.slug}`} onClick={closeCart}
                    className="flex-shrink-0 w-16 h-20 overflow-hidden bg-primary/10 block">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="text-primary text-[10px] font-medium text-center px-1">Troncodrilo</span>
                        </div>
                    }
                  </Link>

                  {/* Info + controles */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <Link to={`/producto/${item.slug}`} onClick={closeCart}
                      className="text-sm font-medium text-ink leading-snug hover:text-primary transition-colors line-clamp-2">
                      {item.name}
                    </Link>
                    <p className="text-xs text-ink/50">
                      {formatPrice(item.price)} / ud.
                      {item.size && (
                        <span className="ml-2 font-medium text-ink/70">Talla: {item.size}</span>
                      )}
                    </p>

                    <div className="flex items-center gap-2 mt-auto pt-1">
                      {/* +/- cantidad */}
                      <div className="flex items-center border border-ink/15 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          aria-label="Reducir cantidad"
                          className="px-2.5 py-1 text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors text-sm leading-none"
                        >−</button>
                        <span className="px-3 py-1 text-sm tabular-nums text-ink border-x border-ink/15 min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Aumentar cantidad"
                          className="px-2.5 py-1 text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors text-sm leading-none disabled:opacity-30 disabled:cursor-not-allowed"
                        >+</button>
                      </div>

                      {/* Subtotal del item */}
                      <span className="text-sm font-semibold text-ink ml-auto">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  {/* Eliminar item */}
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    aria-label={`Eliminar ${item.name}`}
                    className="flex-shrink-0 text-ink/25 hover:text-secondary transition-colors self-start mt-0.5 p-0.5"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}

              {/* Recomendaciones */}
              {recommendations.length > 0 && (
                <div className="p-4 bg-ink/[0.02]">
                  <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-widest mb-3">
                    También te puede gustar
                  </p>
                  <div className="flex flex-col gap-1">
                    {recommendations.map(p => {
                      const img = p.images.find(i => i.position === 1)
                      return (
                        <div key={p.id}
                          className="flex items-center gap-3 p-2 hover:bg-white transition-colors group">
                          {/* Miniatura → ficha */}
                          <Link to={`/producto/${p.slug}`} onClick={closeCart}
                            className="w-10 h-12 flex-shrink-0 overflow-hidden bg-primary/10 block">
                            {img
                              ? <img src={img.url} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-primary/20" />
                            }
                          </Link>

                          {/* Nombre + precio */}
                          <div className="flex-1 min-w-0">
                            <Link to={`/producto/${p.slug}`} onClick={closeCart}
                              className="text-xs font-medium text-ink truncate block group-hover:text-primary transition-colors">
                              {p.name}
                            </Link>
                            <p className="text-xs text-ink/50 mt-0.5">
                              {formatPrice(p.price)}
                            </p>
                          </div>

                          {/* Botón añadir */}
                          <button
                            onClick={() => addItem({
                              productId:    p.id,
                              name:         p.name,
                              slug:         p.slug,
                              price:        p.price,
                              stock:        p.stock,
                              image:        img?.url ?? null,
                              categorySlug: p.category?.slug ?? null,
                            })}
                            disabled={p.stock === 0}
                            className="flex-shrink-0 text-[11px] font-medium text-white bg-primary
                              uppercase tracking-wide px-2 py-1 hover:bg-primary/90 transition-colors
                              disabled:bg-ink/10 disabled:text-ink/30 disabled:cursor-not-allowed"
                          >
                            {p.stock === 0 ? 'Agotado' : '+ Añadir'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: subtotal + botones */}
        {items.length > 0 && (
          <div className="border-t border-ink/10 bg-white p-5 space-y-3 flex-shrink-0">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink/60">Subtotal</span>
              <span className="text-xl font-bold text-ink">
                {formatPrice(getSubtotal())}
              </span>
            </div>
            {selectedCurrency.code !== 'EUR' && (
              <p className="text-[10px] text-ink/30 leading-relaxed">
                El cobro se realizará en EUR ({eurFormatter.format(getSubtotal() / 100)}).
                La conversión es orientativa.
              </p>
            )}
            {shippingRates.length > 0 && (
              <div className="space-y-1.5 py-2 border-t border-ink/5">
                <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-widest">
                  Envío estimado
                </p>
                {shippingRates.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs text-ink/60">
                    <span>{r.name}</span>
                    <span className="font-medium text-ink">
                      {r.free_above !== null && getSubtotal() >= r.free_above
                        ? <span className="text-primary">Gratis</span>
                        : formatPrice(r.rate)
                      }
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-ink/30 leading-relaxed">
                  El coste final de envío se calculará según tu país en el checkout.
                </p>
              </div>
            )}
            {payError && (
              <p className="text-xs text-secondary bg-secondary/10 px-3 py-2">
                {payError}
              </p>
            )}
            <button
              onClick={() => { setPayError(null); setShowShipping(true) }}
              disabled={paying}
              className="btn-primary w-full"
            >
              Ir a pagar
            </button>
            <button onClick={closeCart} className="btn-secondary w-full">
              Seguir comprando
            </button>
          </div>
        )}
      </div>
      {showShipping && (
        <ShippingAddressModal
          paying={paying}
          onConfirm={handleConfirmShipping}
          onClose={() => !paying && setShowShipping(false)}
        />
      )}
    </>
  )
}
