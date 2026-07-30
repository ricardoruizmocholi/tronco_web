import { useEffect, useState } from 'react'
import { getActivePromotions, getNewProducts } from '../api/promotions'
import PromotionCarousel from './PromotionCarousel'
import type { Product } from '../types/product'

type TabKey = 'offers' | 'new'

export default function CarouselSection() {
  const [offers, setOffers]   = useState<Product[]>([])
  const [news, setNews]       = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<TabKey>('offers')

  useEffect(() => {
    Promise.all([
      getActivePromotions().catch(() => []),
      getNewProducts().catch(() => []),
    ]).then(([offerResults, newResults]) => {
      setOffers(offerResults)
      setNews(newResults)
      setTab(offerResults.length > 0 ? 'offers' : 'new')
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const tabs: { key: TabKey; label: string; products: Product[] }[] = [
    ...(offers.length > 0 ? [{ key: 'offers' as const, label: 'En oferta', products: offers }] : []),
    ...(news.length > 0   ? [{ key: 'new' as const,    label: 'Nuevos',    products: news }]   : []),
  ]

  if (tabs.length === 0) return null

  const active = tabs.find(t => t.key === tab) ?? tabs[0]

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-3">
        Ofertas y novedades
      </p>
      <div className="h-px w-16 bg-primary mb-6" />

      {tabs.length > 1 && (
        <div className="flex gap-6 mb-8">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`text-sm uppercase tracking-wide pb-2 border-b-2 transition-colors ${
                active.key === t.key
                  ? 'border-primary text-ink font-medium'
                  : 'border-transparent text-ink/40 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <PromotionCarousel products={active.products} />
    </section>
  )
}
