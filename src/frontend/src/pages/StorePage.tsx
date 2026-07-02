import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCategories, getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import type { Category, Product } from '../types/product'

export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') ?? ''

  const [categories, setCategories]   = useState<Category[]>([])
  const [products, setProducts]       = useState<Product[]>([])
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(false)

  // Ref para saber si el cambio de página es load-more o reset por categoría
  const isLoadMore = useRef(false)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  // Reset al cambiar categoría
  useEffect(() => {
    isLoadMore.current = false
    setPage(1)
    setProducts([])
    setNextPageUrl(null)
  }, [activeCategory])

  // Fetch al cambiar página o categoría
  useEffect(() => {
    if (!isLoadMore.current) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setError(false)

    getProducts(activeCategory || undefined, page)
      .then(res => {
        setProducts(prev => isLoadMore.current ? [...prev, ...res.data] : res.data)
        setNextPageUrl(res.next_page_url)
      })
      .catch(() => setError(true))
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
        isLoadMore.current = false
      })
  }, [activeCategory, page])

  function selectCategory(slug: string) {
    if (slug) {
      setSearchParams({ category: slug })
    } else {
      setSearchParams({})
    }
  }

  function loadMore() {
    isLoadMore.current = true
    setPage(p => p + 1)
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Cabecera */}
      <header className="bg-dark text-white py-10 px-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">La Tienda del Pantano</h1>
        <p className="mt-2 text-white/70 text-sm">Merchandising oficial de Troncodrilo</p>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filtro por categoría */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => selectCategory('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeCategory === ''
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-ink border-ink/20 hover:border-primary hover:text-primary'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.slug)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat.slug
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-ink border-ink/20 hover:border-primary hover:text-primary'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Estado: cargando primera página */}
        {loading && (
          <div className="text-center py-20 text-ink/50 text-sm">Cargando productos…</div>
        )}

        {error && !loading && (
          <div className="text-center py-20 text-secondary text-sm">
            No se pudieron cargar los productos. Inténtalo de nuevo.
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20 text-ink/50 text-sm">
            No hay productos en esta categoría.
          </div>
        )}

        {/* Grid */}
        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load more */}
            {nextPageUrl && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-2.5 rounded-full border border-primary text-primary font-medium text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Cargando…' : 'Ver más productos'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
