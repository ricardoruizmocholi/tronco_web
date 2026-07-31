import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicBanners } from '../api/banners'
import { getPublicCollaborators } from '../api/collaborators'
import CarouselSection from '../components/CarouselSection'
import type { Banner } from '../api/banners'
import type { Collaborator } from '../api/collaborators'

export default function HomePage() {
  const [banners, setBanners]             = useState<Banner[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [activeIndex, setActiveIndex]     = useState(0)

  useEffect(() => {
    getPublicBanners().then(setBanners).catch(() => {})
    getPublicCollaborators().then(setCollaborators).catch(() => {})
  }, [])

  // Rotación automática cada 5 s cuando hay múltiples banners
  useEffect(() => {
    if (banners.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) % banners.length)
    }, 5000)
    return () => clearInterval(id)
  }, [banners.length])

  const activeBanner = banners[activeIndex] ?? null

  return (
    <div className="bg-canvas">
      {/* ── Hero — imagen a sangre ── */}
      <section className="relative w-full h-[70vh] flex items-center overflow-hidden bg-dark">
        {/* Imagen de fondo del banner activo — a sangre, object-fit cover */}
        {activeBanner ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: `url(${activeBanner.image_url})` }}
          />
        ) : null}

        {/* Overlay oscuro plano — siempre presente para legibilidad, sin gradiente */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Contenido centrado */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 flex flex-col items-center text-center gap-5">
          {activeBanner ? (
            <>
              <h1 className="font-editorial text-4xl md:text-6xl text-white leading-tight text-balance">
                {activeBanner.title}
              </h1>
              {activeBanner.subtitle && (
                <p className="text-sm uppercase tracking-widest text-white/70 max-w-xl mx-auto">
                  {activeBanner.subtitle}
                </p>
              )}
              {activeBanner.cta_text && activeBanner.cta_url && (
                <Link to={activeBanner.cta_url} className="btn-primary mt-2 inline-flex items-center gap-2">
                  {activeBanner.cta_text}
                  <span aria-hidden>→</span>
                </Link>
              )}
            </>
          ) : (
            /* Fallback estático cuando no hay banners */
            <>
              <h1 className="font-editorial text-4xl md:text-6xl text-white leading-tight">
                Bienvenido al pantano
              </h1>
              <p className="text-sm uppercase tracking-widest text-white/60 max-w-md mx-auto">
                Merchandising oficial del cocodrilo más icónico del universo conocido
              </p>
              <Link to="/tienda" className="btn-primary mt-2 inline-flex items-center gap-2">
                Ver colección
                <span aria-hidden>→</span>
              </Link>
            </>
          )}
        </div>

        {/* Dots indicadores — solo si hay múltiples banners (círculos: excepción semántica) */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`Banner ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-300
                  ${i === activeIndex ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Ofertas y novedades ── */}
      <CarouselSection />

      {/* ── Acceso rápido ── */}
      <section className="max-w-4xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/tienda"
          className="group relative bg-dark overflow-hidden
            flex flex-col justify-end p-8 min-h-[260px]
            border border-transparent hover:border-primary/50 transition-colors"
        >
          <div className="relative z-10 space-y-2">
            <span className="label-caps text-primary font-semibold">
              Merchandising
            </span>
            <h2 className="font-editorial text-2xl text-white leading-tight">La Tienda</h2>
            <p className="text-white/50 text-sm">
              Camisetas, accesorios, pósters y coleccionables del pantano.
            </p>
            <span className="inline-block text-primary text-sm font-medium mt-2
              group-hover:translate-x-1 transition-transform">
              Explorar →
            </span>
          </div>
        </Link>

        <Link
          to="/bola-troncodrilo"
          className="group relative bg-dark overflow-hidden
            flex flex-col justify-end p-8 min-h-[260px]
            border border-transparent hover:border-primary/50 transition-colors"
        >
          <div className="relative z-10 space-y-2">
            <span className="label-caps text-primary font-semibold">
              Mundo interactivo
            </span>
            <h2 className="font-editorial text-2xl text-white leading-tight">Bola Troncodrilo</h2>
            <p className="text-white/50 text-sm">
              Sube tu fanfic y ponlo en el mapa del universo Troncodrilo.
            </p>
            <span className="inline-block text-primary text-sm font-medium mt-2
              group-hover:translate-x-1 transition-transform">
              Descubrir →
            </span>
          </div>
        </Link>
      </section>

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
    </div>
  )
}
