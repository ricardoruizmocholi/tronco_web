import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import type { Product } from '../types/product'

interface Props {
  product: Product
}

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export default function ProductCard({ product }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const { name, slug, price, stock, images } = product
  const hasVariants    = product.variants.length > 0
  const availableSizes = product.variants.filter(v => v.is_active && v.stock > 0)
  const cardSoldOut    = hasVariants ? availableSizes.length === 0 : stock === 0
  const canPreorder    = cardSoldOut && product.allow_preorder

  const img1 = images.find(i => i.position === 1)
  const img2 = images.find(i => i.position === 2)

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addItem({
      productId:    product.id,
      name:         product.name,
      slug:         product.slug,
      price:        product.price,
      stock:        product.stock,
      image:        img1?.url ?? null,
      categorySlug: product.category?.slug ?? null,
    })
  }

  return (
    <div className="group flex flex-col rounded-lg border border-ink/10 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {/* Imagen — enlaza a la ficha */}
      <Link to={`/producto/${slug}`} className="relative h-48 w-full overflow-hidden block flex-shrink-0">
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
            <span className="text-ink font-bold">{euros.format(price / 100)}</span>
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

          {/* Tallas disponibles */}
          {hasVariants && !cardSoldOut && (
            <div className="flex flex-wrap gap-1 mt-2">
              {availableSizes.map(v => (
                <span key={v.id}
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-ink/5 text-ink/60">
                  {v.size}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
