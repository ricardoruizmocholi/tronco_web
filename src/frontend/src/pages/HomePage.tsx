import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicBanners } from '../api/banners'
import { getPublicCollaborators } from '../api/collaborators'
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
      {/* ── Hero ── */}
      <section className="relative w-full min-h-[50vh] flex items-center overflow-hidden bg-dark">
        {/* Imagen de fondo del banner activo */}
        {activeBanner ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: `url(${activeBanner.image_url})` }}
          />
        ) : null}

        {/* Overlay oscuro — siempre presente para legibilidad */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Contenido centrado */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-6">
          {activeBanner ? (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                {activeBanner.title}
              </h1>
              {activeBanner.subtitle && (
                <p className="text-lg text-white/70 max-w-xl mx-auto">
                  {activeBanner.subtitle}
                </p>
              )}
              {activeBanner.cta_text && activeBanner.cta_url && (
                <Link
                  to={activeBanner.cta_url}
                  className="mt-2 inline-flex items-center gap-2 bg-primary text-white
                    px-7 py-3 rounded-lg font-semibold text-sm hover:bg-primary/90
                    transition-colors shadow-lg shadow-primary/20"
                >
                  {activeBanner.cta_text}
                  <span aria-hidden>→</span>
                </Link>
              )}
            </>
          ) : (
            /* Fallback estático cuando no hay banners */
            <>
              <img
                src="/logo_troncodrilo.PNG"
                alt="Troncodrilo"
                className="h-28 w-auto drop-shadow-2xl"
              />
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  Bienvenido al pantano
                </h1>
                <p className="text-lg text-white/60 max-w-md mx-auto">
                  Merchandising oficial del cocodrilo más icónico del universo conocido.
                </p>
              </div>
              <Link
                to="/tienda"
                className="mt-2 inline-flex items-center gap-2 bg-primary text-white
                  px-7 py-3 rounded-lg font-semibold text-sm hover:bg-primary/90
                  transition-colors shadow-lg shadow-primary/20"
              >
                Ver tienda
                <span aria-hidden>→</span>
              </Link>
            </>
          )}
        </div>

        {/* Dots indicadores — solo si hay múltiples banners */}
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

      {/* ── Acceso rápido ── */}
      <section className="max-w-4xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/tienda"
          className="group relative bg-dark rounded-2xl overflow-hidden
            flex flex-col justify-end p-8 min-h-[260px]
            hover:ring-2 hover:ring-primary/50 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
          <div className="relative z-10 space-y-2">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">
              Merchandising
            </span>
            <h2 className="text-2xl font-bold text-white leading-tight">La Tienda</h2>
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
          className="group relative bg-dark rounded-2xl overflow-hidden
            flex flex-col justify-end p-8 min-h-[260px]
            hover:ring-2 hover:ring-primary/50 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
          <div className="relative z-10 space-y-2">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">
              Mundo interactivo
            </span>
            <h2 className="text-2xl font-bold text-white leading-tight">Bola Troncodrilo</h2>
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
              <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-2">
                Comunidad
              </p>
              <h2 className="text-2xl font-bold text-ink">Colaboradores</h2>
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
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl
                    bg-white border border-ink/10 hover:border-primary/40 hover:shadow-md
                    transition-all duration-200 text-center"
                >
                  {/* Logo o placeholder */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-ink/[0.04]
                    border border-ink/10 flex items-center justify-center p-1.5 flex-shrink-0">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-lg font-bold text-ink/30">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm leading-snug
                      group-hover:text-primary transition-colors">
                      {c.name}
                    </p>
                    {c.description && (
                      <p className="text-xs text-ink/50 mt-1 leading-relaxed line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-medium text-primary/70
                    group-hover:text-primary transition-colors">
                    Visitar →
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
