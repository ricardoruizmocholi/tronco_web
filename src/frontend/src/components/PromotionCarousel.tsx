import { useRef } from 'react'
import ProductCard from './ProductCard'
import type { Product } from '../types/product'

interface Props {
  products: Product[]
}

export default function PromotionCarousel({ products }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function scrollBy(dir: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Anterior"
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10
          w-10 h-10 items-center justify-center bg-white border border-ink/20
          hover:bg-ink/5 hover:border-ink transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2
          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map(p => (
          <div key={p.id} className="w-[75%] sm:w-[45%] md:w-[30%] lg:w-[23%] flex-shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Siguiente"
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10
          w-10 h-10 items-center justify-center bg-white border border-ink/20
          hover:bg-ink/5 hover:border-ink transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
