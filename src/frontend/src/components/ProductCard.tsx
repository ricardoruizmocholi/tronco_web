import { Link } from 'react-router-dom'
import type { Product } from '../types/product'

interface Props {
  product: Product
}

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export default function ProductCard({ product }: Props) {
  const { name, slug, price, stock, images } = product

  const img1 = images.find(i => i.position === 1)
  const img2 = images.find(i => i.position === 2)

  return (
    <Link
      to={`/producto/${slug}`}
      className="group flex flex-col rounded-lg border border-ink/10 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Imagen con efecto hover */}
      <div className="relative h-48 w-full overflow-hidden">
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
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-4 flex-1">
        <p className="text-ink font-medium leading-snug group-hover:text-primary transition-colors">
          {name}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-ink font-bold">{euros.format(price / 100)}</span>
          {stock === 0 && (
            <span className="text-xs font-medium text-white bg-secondary rounded px-2 py-0.5">
              Agotado
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
