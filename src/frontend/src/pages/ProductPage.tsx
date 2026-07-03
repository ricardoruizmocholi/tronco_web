import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct } from '../api/products'
import { useCartStore } from '../store/cartStore'
import type { Product, ProductImage, ProductVariant } from '../types/product'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct]       = useState<Product | null>(null)
  const [activeImg, setActiveImg]   = useState<ProductImage | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Hook llamado incondicionalmente — antes de cualquier early return
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)
    getProduct(slug)
      .then(p => {
        setProduct(p)
        setActiveImg(p.images.find(i => i.position === 1) ?? p.images[0] ?? null)
        setSelectedVariant(null)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-ink/50 text-sm">Cargando producto…</p>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4">
        <p className="text-ink font-medium">Producto no encontrado.</p>
        <Link to="/tienda" className="text-primary text-sm hover:underline">
          ← Volver a la tienda
        </Link>
      </div>
    )
  }

  const { name, description, price, stock, category, images } = product
  const hasVariants    = product.variants.length > 0
  const activeVariants = product.variants.filter(v => v.is_active)
  const isSoldOut      = hasVariants
    ? !activeVariants.some(v => v.stock > 0)
    : stock === 0

  function handleAddToCart() {
    addItem({
      productId:    product.id,
      variantId:    selectedVariant?.id,
      size:         selectedVariant?.size,
      name:         product.name,
      slug:         product.slug,
      price:        product.price,
      stock:        hasVariants ? (selectedVariant?.stock ?? 0) : product.stock,
      image:        images.find(i => i.position === 1)?.url ?? null,
      categorySlug: product.category?.slug ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-ink/50 mb-6 flex gap-2">
          <Link to="/tienda" className="hover:text-primary transition-colors">Tienda</Link>
          {category && (
            <>
              <span>/</span>
              <Link
                to={`/tienda?category=${category.slug}`}
                className="hover:text-primary transition-colors"
              >
                {category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-ink">{name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Columna izquierda: imágenes */}
          <div className="flex flex-col gap-4">
            {/* Imagen principal */}
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-primary/10">
              {activeImg ? (
                <img
                  src={activeImg.url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-primary font-semibold text-xl tracking-wide">Troncodrilo</span>
                </div>
              )}
            </div>

            {/* Miniaturas */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map(img => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(img)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                      activeImg?.id === img.id
                        ? 'border-primary'
                        : 'border-transparent hover:border-ink/20'
                    }`}
                  >
                    <img src={img.url} alt={`Vista ${img.position}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Columna derecha: info */}
          <div className="flex flex-col gap-5 pt-2">
            {category && (
              <Link
                to={`/tienda?category=${category.slug}`}
                className="text-xs font-medium text-primary uppercase tracking-widest hover:underline"
              >
                {category.name}
              </Link>
            )}

            <h1 className="text-2xl font-bold text-ink leading-tight">{name}</h1>

            <p className="text-3xl font-bold text-ink">{euros.format(price / 100)}</p>

            {/* Stock / talla seleccionada */}
            <div className="flex items-center gap-2">
              {isSoldOut ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary">
                  <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                  Agotado
                </span>
              ) : hasVariants && selectedVariant ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {selectedVariant.stock} disponibles en talla {selectedVariant.size}
                </span>
              ) : !hasVariants ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {stock} disponibles
                </span>
              ) : null}
            </div>

            <p className="text-ink/70 text-sm leading-relaxed">{description}</p>

            {/* Selector de talla */}
            {hasVariants && (
              <div>
                <p className="text-xs font-medium text-ink/60 mb-2 uppercase tracking-wide">Talla</p>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map(v => {
                    const outOfStock = v.stock === 0
                    const selected   = selectedVariant?.id === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-colors
                          ${selected
                            ? 'border-primary bg-primary text-white'
                            : outOfStock
                              ? 'border-ink/10 text-ink/25 bg-ink/[0.02] cursor-not-allowed line-through'
                              : 'border-ink/20 text-ink hover:border-primary hover:text-primary'
                          }`}
                      >
                        {v.size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Botón añadir al carrito */}
            <button
              onClick={handleAddToCart}
              disabled={isSoldOut || (hasVariants && !selectedVariant)}
              className="mt-2 w-full py-3 rounded-lg font-semibold text-sm transition-colors
                bg-primary text-white hover:bg-primary/90
                disabled:bg-ink/10 disabled:text-ink/30 disabled:cursor-not-allowed"
            >
              {isSoldOut
                ? 'No disponible'
                : hasVariants && !selectedVariant
                  ? 'Selecciona una talla'
                  : 'Añadir al carrito'}
            </button>

            <Link to="/tienda" className="text-sm text-ink/50 hover:text-primary transition-colors text-center">
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
