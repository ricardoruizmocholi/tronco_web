import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import ColorSwatch from './ColorSwatch'
import type { Product, ProductVariant } from '../types/product'

interface Props {
  product: Product
}

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const MAX_SWATCHES = 4

// Talla legacy si existe, si no la combinación de atributos (p.ej. "Rojo / S")
function variantLabel(v: ProductVariant): string | null {
  if (v.size) return v.size
  const labels = v.attribute_values.map(av => av.label)
  return labels.length > 0 ? labels.join(' / ') : null
}

export default function ProductCard({ product }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const { name, slug, price, stock, images } = product
  const hasVariants    = product.variants.length > 0
  const availableSizes = product.variants.filter(v => v.is_active && v.stock > 0)
  const cardSoldOut    = hasVariants ? availableSizes.length === 0 : stock === 0
  const canPreorder    = cardSoldOut && product.allow_preorder
  const promotion      = product.promotion ?? null
  const colorAttribute = product.attributes.find(a => a.type === 'color')

  const img1 = images.find(i => i.position === 1)
  const img2 = images.find(i => i.position === 2)

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addItem({
      productId:    product.id,
      name:         product.name,
      slug:         product.slug,
      price:        promotion?.discounted_price ?? product.price,
      stock:        product.stock,
      image:        img1?.url ?? null,
      categorySlug: product.category?.slug ?? null,
    })
  }

  return (
    <div className="group flex flex-col rounded-lg border border-ink/10 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {/* Imagen — enlaza a la ficha */}
      <Link to={`/producto/${slug}`} className="relative h-48 w-full overflow-hidden block flex-shrink-0">
        {promotion && (
          <span className="absolute top-2 left-2 z-10 bg-primary text-white text-[10px]
            font-semibold uppercase tracking-wide px-2 py-1">
            Oferta
          </span>
        )}
        {img1 ? (
          <>
            <img
              src={img1.url}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
            />
            {img2 && (
              <img
                src={img2.url}
                alt={name}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="h-full w-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold text-lg tracking-wide">Troncodrilo</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-1 p-4 flex-1">
        <Link to={`/producto/${slug}`}
          className="text-ink font-medium leading-snug hover:text-primary transition-colors">
          {name}
        </Link>
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between">
            {promotion ? (
              <span className="flex items-center gap-1.5">
                <span className="text-ink/40 text-xs line-through">{euros.format(promotion.original_price / 100)}</span>
                <span className="text-primary font-bold">{euros.format(promotion.discounted_price / 100)}</span>
              </span>
            ) : (
              <span className="text-ink font-bold">{euros.format(price / 100)}</span>
            )}
            {cardSoldOut && canPreorder ? (
              <span className="text-xs font-medium text-white bg-ink rounded px-2 py-0.5">
                Preorder
              </span>
            ) : cardSoldOut ? (
              <span className="text-xs font-medium text-white bg-secondary rounded px-2 py-0.5">
                Agotado
              </span>
            ) : !hasVariants ? (
              <button
                onClick={handleAddToCart}
                className="text-xs font-medium text-white bg-primary rounded px-2.5 py-1
                  hover:bg-primary/90 transition-colors"
              >
                + Añadir
              </button>
            ) : null}
          </div>

          {/* Swatches de color */}
          {colorAttribute && colorAttribute.values.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {colorAttribute.values.slice(0, MAX_SWATCHES).map(v => (
                <ColorSwatch key={v.id} color={v.value} label={v.label} size={16} />
              ))}
              {colorAttribute.values.length > MAX_SWATCHES && (
                <span className="text-[11px] text-ink/40 font-medium">
                  +{colorAttribute.values.length - MAX_SWATCHES}
                </span>
              )}
            </div>
          )}

          {/* Tallas disponibles */}
          {hasVariants && !cardSoldOut && (
            <div className="flex flex-wrap gap-1 mt-2">
              {availableSizes.map(v => {
                const label = variantLabel(v)
                return label ? (
                  <span key={v.id}
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-ink/5 text-ink/60">
                    {label}
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
