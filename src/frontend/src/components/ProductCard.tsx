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
  // product.attributes solo se carga en algunos endpoints (listados con swatches de
  // color) — nunca debe asumirse presente, o un producto sin ese eager load rompería
  // toda la página.
  const colorAttribute = (product.attributes ?? []).find(a => a.type === 'color')

  const img1 = images.find(i => i.position === 1)

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
    <div className="flex flex-col border border-ink/10 bg-white">
      {/* Imagen — punto → expansión al hover. CSS puro, sin JS. */}
      <Link to={`/producto/${slug}`} className="group relative block aspect-[3/4] w-full overflow-hidden">
        {promotion && (
          <span className="absolute top-2 left-2 z-20 bg-primary text-white text-[10px]
            font-semibold uppercase tracking-wide px-2 py-1">
            Oferta
          </span>
        )}

        {img1 ? (
          <img
            src={img1.url}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover
              transition-transform duration-300 ease-in-out scale-[0.85] group-hover:scale-100"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20
            transition-transform duration-300 ease-in-out scale-[0.85] group-hover:scale-100">
            <span className="text-primary font-semibold text-lg tracking-wide">Troncodrilo</span>
          </div>
        )}

        {/* Overlay "colapsado" — sensación de imagen contraída en reposo */}
        <div
          className="absolute inset-0 transition-opacity duration-300 ease-in-out opacity-100 group-hover:opacity-0"
          style={{ backgroundColor: 'rgba(250,250,248,0.15)' }}
          aria-hidden="true"
        />

        {/* Punto central — desaparece al expandirse la imagen */}
        <div
          className="absolute inset-0 flex items-center justify-center
            transition-opacity duration-300 ease-in-out opacity-80 group-hover:opacity-0"
          aria-hidden="true"
        >
          <span className="w-2 h-2 rounded-full bg-canvas" />
        </div>

        {/* Overlay oscuro + CTA — solo visible con la imagen expandida */}
        <div
          className="absolute inset-0 flex items-center justify-center
            transition-opacity duration-300 ease-in-out opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
        >
          <span className="text-canvas text-xs uppercase tracking-widest">Ver producto</span>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-1 p-4 flex-1">
        <Link to={`/producto/${slug}`}
          className="font-editorial text-base text-ink leading-snug hover:text-primary transition-colors">
          {name}
        </Link>
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between">
            {promotion ? (
              <span className="flex items-center gap-1.5">
                <span className="text-ink/40 text-xs line-through">{euros.format(promotion.original_price / 100)}</span>
                <span className="text-primary text-sm font-medium">{euros.format(promotion.discounted_price / 100)}</span>
              </span>
            ) : (
              <span className="text-ink text-sm font-medium">{euros.format(price / 100)}</span>
            )}
            {cardSoldOut && canPreorder ? (
              <span className="text-[10px] font-medium text-white uppercase tracking-wide bg-ink px-2 py-0.5">
                Preorder
              </span>
            ) : cardSoldOut ? (
              <span className="text-[10px] font-medium text-white uppercase tracking-wide bg-secondary px-2 py-0.5">
                Agotado
              </span>
            ) : !hasVariants ? (
              <button
                onClick={handleAddToCart}
                className="text-[10px] font-medium text-white uppercase tracking-wide bg-primary px-2.5 py-1
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
                    className="text-[11px] font-medium px-1.5 py-0.5 bg-ink/5 text-ink/60">
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
