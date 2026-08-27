import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCategories, getProducts } from '../api/products'
import { getPublicCollaborators } from '../api/collaborators'
import LandingProductCard from '../components/LandingProductCard'
import CollaboratorCard from '../components/CollaboratorCard'
import type { Category, Product } from '../types/product'
import type { Collaborator } from '../api/collaborators'

const COLLAB_SLUG = 'colaboradores'

export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') ?? ''
  const isCollabView = activeCategory === COLLAB_SLUG

  const [categories, setCategories]       = useState<Category[]>([])
  const [products, setProducts]           = useState<Product[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [nextPageUrl, setNextPageUrl]     = useState<string | null>(null)
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [error, setError]                 = useState(false)

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

  // Fetch de colaboradores cuando el filtro activo es "colaboradores"
  useEffect(() => {
    if (!isCollabView) return
    setLoading(true)
    setError(false)
    getPublicCollaborators()
      .then(setCollaborators)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [isCollabView])

  // Fetch de productos al cambiar página o categoría
  useEffect(() => {
    if (isCollabView) return

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
  }, [activeCategory, page, isCollabView])

  function selectCategory(slug: string) {
    if (slug) {
      setSearchParams({ category: slug })
    } else {
      setSearchParams({})
    }
  }

  function toggleCollabFilter() {
    setSearchParams(isCollabView ? {} : { category: COLLAB_SLUG })
  }

  function loadMore() {
    isLoadMore.current = true
    setPage(p => p + 1)
  }

  const hasItems = isCollabView ? collaborators.length > 0 : products.length > 0

  return (
    <div className="min-h-screen bg-canvas">
      {/* Cabecera */}
      <header className="bg-dark text-white py-10 px-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {isCollabView ? 'Colaboradores' : 'Tronco Tienda'}
        </h1>
        <p className="mt-2 text-white/70 text-sm">
          {isCollabView ? 'Marcas y artistas aliados de Troncodrilo' : 'Merchandising oficial de Troncodrilo'}
        </p>
      </header>

      <main className="w-full px-4 md:px-6 lg:px-8 py-8">
        {/* Filtro por categoría — chips planos, borde inferior activo */}
        <div className="flex flex-wrap gap-6 mb-10 border-b border-ink/10">
          <button
            onClick={() => selectCategory('')}
            className={`pb-3 text-xs uppercase tracking-wide border-b-2 -mb-px transition-colors ${
              activeCategory === ''
                ? 'border-primary text-ink font-medium'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.slug)}
              className={`pb-3 text-xs uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                activeCategory === cat.slug
                  ? 'border-primary text-ink font-medium'
                  : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              {cat.name}
            </button>
          ))}
          {/* Filtra en la misma página mostrando las cards de colaboradores */}
          <button
            onClick={toggleCollabFilter}
            className={`pb-3 text-xs uppercase tracking-wide border-b-2 -mb-px transition-colors ${
              isCollabView
                ? 'border-primary text-ink font-medium'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            Colaboradores
          </button>
        </div>

        {/* Estado: cargando */}
        {loading && (
          <div className="text-center py-20 text-ink/50 text-sm">
            {isCollabView ? 'Cargando colaboradores…' : 'Cargando productos…'}
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20 text-secondary text-sm">
            {isCollabView
              ? 'No se pudieron cargar los colaboradores. Inténtalo de nuevo.'
              : 'No se pudieron cargar los productos. Inténtalo de nuevo.'}
          </div>
        )}

        {!loading && !error && !hasItems && (
          <div className="text-center py-20 text-ink/50 text-sm">
            {isCollabView ? 'No hay colaboradores disponibles.' : 'No hay productos en esta categoría.'}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && hasItems && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {isCollabView
                ? collaborators.map(collaborator => (
                    <CollaboratorCard key={collaborator.id} collaborator={collaborator} />
                  ))
                : products.map(product => (
                    <LandingProductCard key={product.id} product={product} />
                  ))}
            </div>

            {/* Load more — solo aplica a productos */}
            {!isCollabView && nextPageUrl && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-2.5 border border-primary text-primary uppercase tracking-wide text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
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
