import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct } from '../api/products'
import { useCartStore } from '../store/cartStore'
import { useCurrency } from '../hooks/useCurrency'
import PreorderModal from '../components/PreorderModal'
import AttributeSelector from '../components/AttributeSelector'
import type { Product, ProductImage, ProductVariant } from '../types/product'

// Etiqueta legible para el carrito: talla legacy si existe, si no la combinación de atributos
function variantCartLabel(variant: ProductVariant | null): string | undefined {
  if (!variant) return undefined
  if (variant.size) return variant.size
  const labels = variant.attribute_values.map(av => av.label)
  return labels.length > 0 ? labels.join(' / ') : undefined
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct]       = useState<Product | null>(null)
  const [activeImg, setActiveImg]   = useState<ProductImage | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]       = useState(false)
  // attribute_id -> attribute_value_id seleccionado
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({})
  const [showPreorder, setShowPreorder]         = useState(false)
  const [descOpen, setDescOpen]                 = useState(false)

  // Hooks llamados incondicionalmente — antes de cualquier early return
  const addItem = useCartStore(s => s.addItem)
  const { formatPrice } = useCurrency()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)
    getProduct(slug)
      .then(p => {
        setProduct(p)
        setActiveImg(p.images.find(i => i.position === 1) ?? p.images[0] ?? null)
        setSelectedValues({})
        setDescOpen(false)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  // Derivados seguros con `product` potencialmente null — deben calcularse ANTES
  // de cualquier return condicional: los hooks de abajo (useMemo/useEffect) dependen
  // de ellos, y las Rules of Hooks no permiten hooks después de un return temprano.
  const attributes     = product?.attributes ?? []
  const hasVariants    = (product?.variants.length ?? 0) > 0
  const hasAttributes  = attributes.length > 0
  const activeVariants = product?.variants.filter(v => v.is_active) ?? []

  // Variante activa: sin atributos, la única variante posible (si existe); con
  // atributos, la que combina exactamente con todos los valores seleccionados.
  const activeVariant = useMemo<ProductVariant | null>(() => {
    if (!product || !hasVariants) return null
    if (!hasAttributes) return activeVariants[0] ?? null
    if (Object.keys(selectedValues).length !== attributes.length) return null

    return activeVariants.find(v =>
      attributes.every(attr =>
        v.attribute_values.some(
          av => av.attribute_id === attr.id && av.attribute_value_id === selectedValues[attr.id]
        )
      )
    ) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedValues, hasVariants, hasAttributes])

  // Cambia la imagen principal si la variante seleccionada tiene una propia
  useEffect(() => {
    if (product && activeVariant?.image_url) {
      setActiveImg({ id: -activeVariant.id, product_id: product.id, url: activeVariant.image_url, position: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariant?.id, activeVariant?.image_url])

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
  const isSoldOut      = hasVariants
    ? !activeVariants.some(v => v.stock > 0)
    : stock === 0
  // Sin stock específico de la combinación seleccionada — distinto de isSoldOut,
  // que solo indica que TODO el producto está agotado.
  const selectedSoldOut = hasVariants && !!activeVariant && activeVariant.stock === 0
  const canPreorder    = isSoldOut && product.allow_preorder
  const promotion      = product.promotion ?? null

  function handleSelectValue(attributeId: number, valueId: number | null) {
    setSelectedValues(prev => {
      if (valueId === null) {
        const next = { ...prev }
        delete next[attributeId]
        return next
      }
      return { ...prev, [attributeId]: valueId }
    })
  }

  // Valores sin stock disponible dada la selección actual del resto de atributos
  function unavailableValueIds(attributeId: number): number[] {
    const attribute = attributes.find(a => a.id === attributeId)
    if (!attribute) return []

    return attribute.values
      .filter(value => {
        const matching = activeVariants.filter(v => {
          const hasThisValue = v.attribute_values.some(av => av.attribute_value_id === value.id)
          if (!hasThisValue) return false
          return attributes.every(attr => {
            if (attr.id === attributeId) return true
            const sel = selectedValues[attr.id]
            if (sel === undefined) return true
            return v.attribute_values.some(av => av.attribute_id === attr.id && av.attribute_value_id === sel)
          })
        })
        return matching.length === 0 || matching.every(v => v.stock === 0)
      })
      .map(v => v.id)
  }

  // No se usa activeVariant.effective_price aquí: ese accessor siempre devuelve
  // un valor (price_override ?? product.price), así que el `??` nunca llegaría
  // a la promoción. La precedencia correcta (igual que en CheckoutController) es
  // price_override de la variante > promoción del producto > precio base.
  const originalPrice = price
  const displayPrice   = activeVariant
    ? (activeVariant.price_override ?? promotion?.discounted_price ?? price)
    : (promotion?.discounted_price ?? price)
  const hasDiscount = displayPrice < originalPrice

  function handleAddToCart() {
    addItem({
      productId:    product.id,
      variantId:    activeVariant?.id,
      size:         variantCartLabel(activeVariant),
      name:         product.name,
      slug:         product.slug,
      price:        displayPrice,
      stock:        hasVariants ? (activeVariant?.stock ?? 0) : product.stock,
      image:        images.find(i => i.position === 1)?.url ?? null,
      categorySlug: product.category?.slug ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-canvas">
      {showPreorder && (
        <PreorderModal
          product={product}
          variant={activeVariant}
          onClose={() => setShowPreorder(false)}
        />
      )}
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
            {/* Imagen principal — sin border-radius */}
            <div className="aspect-[3/4] overflow-hidden bg-primary/10">
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

            {/* Miniaturas — 60×80, borde ink si seleccionada */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map(img => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(img)}
                    style={{ width: 60, height: 80 }}
                    className={`overflow-hidden border transition-colors flex-shrink-0 ${
                      activeImg?.id === img.id
                        ? 'border-ink'
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
                className="label-caps font-medium text-primary hover:underline"
              >
                {category.name}
              </Link>
            )}

            <h1 className="font-editorial text-2xl md:text-3xl text-ink leading-tight">{name}</h1>

            {hasDiscount ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-ink/40 line-through">{formatPrice(originalPrice)}</p>
                <p className="text-sm font-medium text-primary">{formatPrice(displayPrice)}</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-ink">{formatPrice(displayPrice)}</p>
            )}

            {/* Stock / combinación seleccionada */}
            <div className="flex items-center gap-2">
              {isSoldOut || selectedSoldOut ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary">
                  <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                  Agotado
                </span>
              ) : hasVariants && activeVariant ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {activeVariant.stock} disponibles
                  {variantCartLabel(activeVariant) && ` — ${variantCartLabel(activeVariant)}`}
                </span>
              ) : !hasVariants ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {stock} disponibles
                </span>
              ) : null}
            </div>

            {/* Descripción — acordeón minimalista */}
            <div className="border-t border-ink/10">
              <button
                type="button"
                onClick={() => setDescOpen(o => !o)}
                aria-expanded={descOpen}
                className="w-full flex items-center justify-between py-3 text-left"
              >
                <span className="label-caps font-medium text-ink">Descripción</span>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className={`w-4 h-4 text-ink/50 transition-transform duration-200 ${descOpen ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div
                className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out"
                style={{ gridTemplateRows: descOpen ? '1fr' : '0fr' }}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="text-ink/70 text-sm leading-relaxed pb-4">{description}</p>
                </div>
              </div>
            </div>

            {/* Selectores por atributo (Color, Talla, ...) */}
            {hasVariants && hasAttributes && (
              <div className="flex flex-col gap-4">
                {attributes.map(attribute => (
                  <AttributeSelector
                    key={attribute.id}
                    attribute={attribute}
                    selectedValueId={selectedValues[attribute.id] ?? null}
                    onSelect={valueId => handleSelectValue(attribute.id, valueId)}
                    unavailableValueIds={unavailableValueIds(attribute.id)}
                  />
                ))}
              </div>
            )}

            {/* Botón añadir al carrito / preorder */}
            {canPreorder ? (
              <button
                onClick={() => setShowPreorder(true)}
                className="btn-primary mt-2 w-full"
                style={{ backgroundColor: '#1A1A1A' }}
              >
                Reservar plaza
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut || selectedSoldOut || (hasVariants && !activeVariant)}
                className="btn-primary mt-2 w-full disabled:bg-ink/10 disabled:text-ink/30"
              >
                {isSoldOut || selectedSoldOut
                  ? 'No disponible'
                  : hasVariants && !activeVariant
                    ? 'Selecciona una opción'
                    : 'Añadir al carrito'}
              </button>
            )}

            <Link to="/tienda" className="text-sm text-ink/50 hover:text-primary transition-colors text-center">
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
