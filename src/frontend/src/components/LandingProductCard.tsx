import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAuthModal } from '../context/AuthModalContext'
import { useCurrency } from '../hooks/useCurrency'
import ColorSwatch from './ColorSwatch'
import type { Product, ProductVariant } from '../types/product'

interface Props {
  product: Product
}

const MAX_SWATCHES = 4
const FAVORITES_KEY = 'troncodrilo_favorites'

function getFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function toggleFavorite(id: number): number[] {
  const current = getFavorites()
  const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  return next
}

// Talla legacy si existe, si no la combinación de atributos (p.ej. "Rojo / S")
function variantLabel(v: ProductVariant): string | null {
  if (v.size) return v.size
  const labels = v.attribute_values.map(av => av.label)
  return labels.length > 0 ? labels.join(' / ') : null
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 20.25c-.3 0-.6-.1-.84-.3C7.7 17.1 3 13.3 3 9.15 3 6.3 5.2 4 8 4c1.6 0 3 .75 4 2 1-1.25 2.4-2 4-2 2.8 0 5 2.3 5 5.15 0 4.15-4.7 7.95-8.16 10.8-.24.2-.54.3-.84.3z" />
    </svg>
  )
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

export default function LandingProductCard({ product }: Props) {
  const { user } = useAuth()
  const { openModal } = useAuthModal()
  const { formatPrice } = useCurrency()
  const { name, slug, price, stock, images } = product
  const hasVariants    = product.variants.length > 0
  const availableSizes = product.variants.filter(v => v.is_active && v.stock > 0)
  const canPreorder    = product.allow_preorder && stock === 0
  const promotion      = product.promotion ?? null
  const colorAttribute = (product.attributes ?? []).find(a => a.type === 'color')

  const sortedImages = [...images].sort((a, b) => a.position - b.position)

  const [imgIndex, setImgIndex]       = useState(0)
  const [imageHovered, setImageHovered] = useState(false)
  const [infoHovered, setInfoHovered] = useState(false)
  const [isFavorite, setIsFavorite]   = useState(() => getFavorites().includes(product.id))

  function handleImageEnter() {
    setImageHovered(true)
    if (sortedImages.length > 1) setImgIndex(1)
  }

  function handleImageLeave() {
    setImageHovered(false)
    setImgIndex(0)
  }

  function goToImage(e: React.MouseEvent, delta: number) {
    e.preventDefault()
    e.stopPropagation()
    setImgIndex(i => (i + delta + sortedImages.length) % sortedImages.length)
  }

  function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      openModal('login')
      return
    }
    const next = toggleFavorite(product.id)
    setIsFavorite(next.includes(product.id))
  }

  return (
    <div className="relative w-full flex flex-col border border-ink/10 bg-white
      transition-transform duration-200 hover:-translate-y-1">
      {/* Imagen — ratio 3:4 propio (ya no depende de un % de altura del contenedor padre,
          para que la sección de info pueda crecer sin recortar el nombre del producto) */}
      <Link
        to={`/producto/${slug}`}
        className="relative block w-full aspect-[3/4] overflow-hidden flex-shrink-0"
        onMouseEnter={handleImageEnter}
        onMouseLeave={handleImageLeave}
      >
        {sortedImages.length > 0 ? (
          sortedImages.map((img, i) => (
            <img
              key={img.id}
              src={img.url}
              alt={name}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                i === imgIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
            <span className="text-primary font-semibold text-sm tracking-wide">Troncodrilo</span>
          </div>
        )}

        {/* Badge preorder */}
        {canPreorder && (
          <span className="absolute top-2 left-2 z-20 bg-ink text-white text-[10px]
            font-medium uppercase tracking-wide px-2 py-1">
            Preorder
          </span>
        )}

        {/* Favorito */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          aria-pressed={isFavorite}
          className={`absolute top-2 right-2 z-20 p-1.5 transition-colors ${
            isFavorite ? 'text-secondary' : 'text-canvas hover:text-secondary'
          }`}
        >
          <HeartIcon filled={isFavorite} />
        </button>

        {/* Flechas de navegación — solo con hover y más de 1 imagen */}
        {imageHovered && sortedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={e => goToImage(e, -1)}
              aria-label="Imagen anterior"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 p-1 text-canvas"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={e => goToImage(e, 1)}
              aria-label="Imagen siguiente"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 p-1 text-canvas"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <ArrowIcon direction="right" />
            </button>
          </>
        )}
      </Link>

      {/* Info — altura mínima garantizada para 2 líneas de nombre + precio + variantes,
          en vez de un % fijo de la altura del card (que se quedaba corto en viewports
          estrechos y forzaba el nombre a una sola línea truncada) */}
      <div
        className="relative w-full min-h-[92px] overflow-hidden px-2.5 py-2 flex flex-col justify-between gap-1"
        onMouseEnter={() => setInfoHovered(true)}
        onMouseLeave={() => setInfoHovered(false)}
      >
        <Link to={`/producto/${slug}`}
          className="font-editorial text-sm text-ink leading-tight line-clamp-2 hover:text-primary transition-colors">
          {name}
        </Link>

        <div className="flex items-center justify-between gap-2">
          {promotion ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-ink/40 text-[10px] line-through">{formatPrice(promotion.original_price)}</span>
              <span className="text-primary text-xs font-medium">{formatPrice(promotion.discounted_price)}</span>
            </span>
          ) : (
            <span className="text-ink text-xs font-medium">{formatPrice(price)}</span>
          )}
        </div>

        {/* Swatches (reposo) / tallas (hover) */}
        <div className="relative h-4">
          <div className={`absolute inset-0 flex items-center gap-1.5 transition-opacity duration-150 ${
            infoHovered ? 'opacity-0' : 'opacity-100'
          }`}>
            {colorAttribute && colorAttribute.values.slice(0, MAX_SWATCHES).map(v => (
              <ColorSwatch key={v.id} color={v.value} label={v.label} size={12} />
            ))}
          </div>
          {hasVariants && (
            <div className={`absolute inset-0 flex items-center gap-1.5 transition-opacity duration-150 ${
              infoHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              {availableSizes.map(v => {
                const label = variantLabel(v)
                return label ? (
                  <span key={v.id} className="text-[10px] font-medium text-ink/60 uppercase">
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
