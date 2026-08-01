import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHeroSlides } from '../api/heroSlides'
import { getPublicCollaborators } from '../api/collaborators'
import { getActivePromotions, getNewProducts } from '../api/promotions'
import { getArtists } from '../api/artists'
import { subscribeNewsletter } from '../api/newsletter'
import LandingProductCard from '../components/LandingProductCard'
import type { HeroSlide } from '../types/heroSlide'
import type { Collaborator } from '../api/collaborators'
import type { Product } from '../types/product'
import type { Artist } from '../types/artist'

type ProductsTab = 'new' | 'offers'

function ProductsSection() {
  const [offers, setOffers]   = useState<Product[]>([])
  const [news, setNews]       = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<ProductsTab>('new')

  useEffect(() => {
    Promise.all([
      getActivePromotions().catch(() => []),
      getNewProducts().catch(() => []),
    ]).then(([offerResults, newResults]) => {
      setOffers(offerResults)
      setNews(newResults)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const hasOffers = offers.length > 0
  const active    = tab === 'offers' && hasOffers ? offers : news

  if (active.length === 0) return null

  const products = active.slice(0, 12)

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="flex gap-6 mb-8">
        <button
          type="button"
          onClick={() => setTab('new')}
          className={`label-caps pb-2 border-b-2 transition-colors ${
            tab === 'new' || !hasOffers
              ? 'border-primary text-ink font-semibold'
              : 'border-transparent text-ink/40 hover:text-ink'
          }`}
        >
          Novedades
        </button>
        {hasOffers && (
          <button
            type="button"
            onClick={() => setTab('offers')}
            className={`label-caps pb-2 border-b-2 transition-colors ${
              tab === 'offers'
                ? 'border-primary text-ink font-semibold'
                : 'border-transparent text-ink/40 hover:text-ink'
            }`}
          >
            En oferta
          </button>
        )}
      </div>

      {/* 4×3 escritorio (12), 2×3 móvil (6) — los índices ≥6 se ocultan en móvil */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p, i) => (
          <div key={p.id} className={i >= 6 ? 'hidden md:block' : ''}>
            <LandingProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}

interface Star {
  top: string
  left: string
  size: number
  opacity: number
}

// Textura de estrellas CSS pura — puntos posicionados una única vez al montar,
// sin canvas ni animación (distinta de StarField.tsx, propia de /bola-troncodrilo)
function useStarfield(count: number): Star[] {
  return useMemo(() => Array.from({ length: count }, () => ({
    top:     `${Math.random() * 100}%`,
    left:    `${Math.random() * 100}%`,
    size:    Math.random() < 0.15 ? 2 : 1,
    opacity: 0.3 + Math.random() * 0.7,
  })), [count])
}

function SplitHalf({
  to, label, subtitle, backgroundImage, children,
}: {
  to: string
  label: string
  subtitle: string
  backgroundImage?: string | null
  children?: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="group relative w-full md:w-1/2 h-[40vh] md:h-[50vh]
        flex items-center justify-center overflow-hidden bg-dark flex-shrink-0"
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {children}

      {/* Overlay: 0.4 en reposo (dos capas de 0.2), 0.2 al hover (la capa superior se desvanece) */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
      <div
        className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
      />

      <div className="relative z-10 text-center px-4">
        <p className="label-caps text-canvas font-semibold mb-2">{label}</p>
        <p className="text-canvas/70 text-sm">{subtitle}</p>
      </div>
    </Link>
  )
}

function ArtistsBolaSplitSection({ firstArtist }: { firstArtist: Artist | null }) {
  const stars = useStarfield(70)
  const artistImage = firstArtist?.images[0]?.url ?? firstArtist?.avatar_url ?? null

  return (
    <section className="relative w-full flex flex-col md:flex-row">
      <SplitHalf
        to="/artistas"
        label="Artistas colaboradores"
        subtitle="Descubre a los artistas detrás de Troncodrilo"
        backgroundImage={artistImage}
      />

      <SplitHalf
        to="/bola-troncodrilo"
        label="Bola Troncodrilo"
        subtitle="El mapa de fans de Troncodrilo"
      >
        {/* Textura de estrellas — solo hay fallback CSS, no existe imagen estática de la bola */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {stars.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-canvas"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }}
            />
          ))}
        </div>
      </SplitHalf>
    </section>
  )
}

type SubscribeStatus = 'idle' | 'loading' | 'success' | 'error'

interface ApiErrorShape {
  response?: { data?: { message?: string; errors?: Record<string, string[]> } }
}

function NewsletterSection() {
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<SubscribeStatus>('idle')
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      await subscribeNewsletter({ email, name: name.trim() || undefined })
      setStatus('success')
      setName('')
      setEmail('')
    } catch (err: unknown) {
      const apiErr = err as ApiErrorShape
      const msg = apiErr.response?.data?.errors?.email?.[0]
        ?? apiErr.response?.data?.message
        ?? 'No se pudo completar la suscripción.'
      setError(msg)
      setStatus('error')
    }
  }

  return (
    <section className="w-full py-20 px-4" style={{ backgroundColor: '#1C1F1A' }}>
      <div className="max-w-md mx-auto flex flex-col items-center text-center gap-2">
        <h2 className="font-editorial text-3xl text-canvas">Únete a la Troco Comunidad</h2>
        <p className="label-caps text-canvas/60">Novedades, drops exclusivos y más</p>

        {status === 'success' ? (
          <p className="mt-6 text-sm font-medium text-primary">¡Bienvenido a la comunidad!</p>
        ) : (
          <form onSubmit={handleSubmit} className="w-full mt-6 flex flex-col gap-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre (opcional)"
              className="w-full bg-transparent border-b border-canvas text-canvas
                placeholder-canvas/50 text-sm px-1 py-2 focus:outline-none"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Tu email"
                className="flex-1 bg-transparent border-b border-canvas text-canvas
                  placeholder-canvas/50 text-sm px-1 py-2 focus:outline-none"
              />
              <button type="submit" disabled={status === 'loading'} className="btn-primary flex-shrink-0">
                {status === 'loading' ? 'Enviando…' : 'Suscribirme'}
              </button>
            </div>
            {error && <p className="text-xs text-secondary">{error}</p>}
          </form>
        )}
      </div>
    </section>
  )
}

export default function HomePage() {
  const [slides, setSlides]               = useState<HeroSlide[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [firstArtist, setFirstArtist]     = useState<Artist | null>(null)
  const [activeIndex, setActiveIndex]     = useState(0)

  useEffect(() => {
    getHeroSlides().then(setSlides).catch(() => {})
    getPublicCollaborators().then(setCollaborators).catch(() => {})
    getArtists().then(artists => setFirstArtist(artists[0] ?? null)).catch(() => {})
  }, [])

  // Rotación automática cada 5 s cuando hay múltiples slides
  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [slides.length])

  const activeSlide = slides[activeIndex] ?? null

  return (
    <div className="bg-canvas">
      {/* ── Hero — 100vh exacto, imagen o vídeo gestionado desde admin, sin overlay ── */}
      <section className="relative w-full overflow-hidden bg-dark" style={{ height: '100vh' }}>
        {activeSlide ? (
          activeSlide.type === 'video' ? (
            <video
              key={activeSlide.id}
              src={activeSlide.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img
              key={activeSlide.id}
              src={activeSlide.url}
              alt={activeSlide.title ?? 'Troncodrilo'}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          /* Fallback — sin slides en BD */
          <div className="absolute inset-0" style={{ backgroundColor: '#1C1F1A' }} />
        )}

        {/* Contenido inferior-izquierda — sin overlay adicional, la imagen habla sola */}
        <div className="absolute z-10 bottom-8 left-8 md:bottom-12 md:left-12 flex flex-col items-start gap-4">
          <p className="text-xs uppercase tracking-widest text-canvas">
            Bienvenido a la Troco Tienda
          </p>
          <Link
            to="/tienda"
            className="inline-block border border-canvas text-canvas px-6 py-2 text-sm
              uppercase tracking-wide transition-colors duration-200
              hover:bg-canvas hover:text-ink"
          >
            Visita la tienda
          </Link>
        </div>

        {/* Dots indicadores — solo si hay múltiples slides (círculos: excepción semántica) */}
        {slides.length > 1 && (
          <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-10 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-300
                  ${i === activeIndex ? 'bg-canvas w-5' : 'bg-canvas/40 hover:bg-canvas/70'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Productos: novedades / en oferta ── */}
      <ProductsSection />

      {/* ── Artistas / Bola Troncodrilo — 50vh partido en dos mitades ── */}
      <ArtistsBolaSplitSection firstArtist={firstArtist} />

      {/* ── Colaboradores ── */}
      {collaborators.length > 0 && (
        <section className="bg-dark/40 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <div className="text-center mb-10">
              <p className="label-caps text-primary font-semibold mb-2">
                Comunidad
              </p>
              <h2 className="font-editorial text-2xl text-ink">Colaboradores</h2>
              <p className="text-ink/50 text-sm mt-2">
                Apóyales — visita sus tiendas y proyectos
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {collaborators.map(c => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={c.logo_url ? { backgroundImage: `url(${c.logo_url})` } : undefined}
                  className={`group relative flex flex-col overflow-hidden min-h-[200px]
                    bg-cover bg-center grayscale hover:grayscale-0
                    border border-transparent hover:border-primary/50
                    transition-[filter,border-color] duration-200
                    ${c.logo_url ? '' : 'bg-dark'}`}
                >
                  {/* Overlay oscuro */}
                  <div className="absolute inset-0 bg-dark/60 group-hover:bg-dark/50 transition-colors" />

                  {/* Contenido sobre el overlay */}
                  <div className="relative z-10 flex flex-col items-center justify-center
                    flex-1 p-5 text-center gap-2">
                    <p className="font-bold text-white text-sm leading-snug">
                      {c.name}
                    </p>
                    {c.description && (
                      <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <span className="mt-2 inline-block text-xs font-medium text-white
                      border border-white/40 px-3 py-1
                      group-hover:border-primary group-hover:text-primary transition-colors">
                      Visitar →
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter ── */}
      <NewsletterSection />
    </div>
  )
}
