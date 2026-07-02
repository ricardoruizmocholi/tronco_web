import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getArtist } from '../api/artists'
import ProductCard from '../components/ProductCard'
import type { Artist, ArtistImage } from '../types/artist'

// ─── Iconos de redes sociales ────────────────────────────────────────────────

const SOCIAL_META: Record<string, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  twitter:   { label: 'Twitter/X', color: '#000000' },
  tiktok:    { label: 'TikTok',    color: '#010101' },
  youtube:   { label: 'YouTube',   color: '#FF0000' },
  twitch:    { label: 'Twitch',    color: '#9146FF' },
  bandcamp:  { label: 'Bandcamp',  color: '#1DA0C3' },
}

function SocialIcon({ network }: { network: string }) {
  const icons: Record<string, JSX.Element> = {
    instagram: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />,
    twitter:   <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
    tiktok:    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.73a4.85 4.85 0 01-1.01-.04z" />,
    youtube:   <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />,
    twitch:    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />,
    bandcamp:  <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z" />,
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      {icons[network]}
    </svg>
  )
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ image, onClose }: { image: ArtistImage; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 z-[100] m-auto max-w-4xl w-full bg-transparent p-4
        backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative bg-dark rounded-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/60 hover:text-white
            bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none"
        >
          ✕
        </button>
        <img src={image.url} alt={image.caption ?? ''} className="w-full max-h-[80vh] object-contain" />
        {image.caption && (
          <p className="px-5 py-3 text-sm text-white/60 text-center">{image.caption}</p>
        )}
      </div>
    </dialog>
  )
}

// ─── Utilidad: convierte URL de YouTube/Vimeo a embed si no lo es ya ────────

function toEmbedUrl(url: string): string {
  // YouTube: youtu.be/ID o youtube.com/watch?v=ID → embed/ID
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo: vimeo.com/ID → player.vimeo.com/video/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return url // ya es embed u otro
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [artist, setArtist]     = useState<Artist | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<ArtistImage | null>(null)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    getArtist(Number(id))
      .then(setArtist)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-ink/40 text-sm">Cargando artista…</p>
      </div>
    )
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4">
        <p className="text-ink font-medium">Artista no encontrado.</p>
        <Link to="/artistas" className="text-primary text-sm hover:underline">
          ← Ver todos los artistas
        </Link>
      </div>
    )
  }

  const socials    = Object.entries(artist.social_links ?? {}).filter(([, v]) => v)
  const hasProducts = (artist.products?.length ?? 0) > 0
  const hasVideos   = artist.video_urls.length > 0
  const hasGallery  = artist.images.length > 0

  return (
    <div className="min-h-screen bg-canvas">
      {lightbox && <Lightbox image={lightbox} onClose={() => setLightbox(null)} />}

      {/* Hero con avatar */}
      <div className="bg-dark">
        <div className="max-w-5xl mx-auto px-4 py-14 flex flex-col sm:flex-row items-center sm:items-end gap-8">
          {/* Avatar */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0 rounded-2xl overflow-hidden
            border-4 border-primary/40 shadow-xl bg-primary/10">
            {artist.avatar_url ? (
              <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-bold text-primary">
                  {artist.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Nombre + breadcrumb */}
          <div className="text-center sm:text-left pb-1">
            <nav className="text-white/30 text-xs mb-2">
              <Link to="/artistas" className="hover:text-primary transition-colors">Artistas</Link>
              <span className="mx-2">/</span>
              <span className="text-white/60">{artist.name}</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{artist.name}</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">

        {/* Bio */}
        {artist.bio && (
          <section>
            <p className="text-ink/70 text-base leading-relaxed max-w-2xl">{artist.bio}</p>
          </section>
        )}

        {/* Apóyales desde aquí */}
        {(socials.length > 0 || artist.website_url) && (
          <section>
            <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-widest mb-5">
              Apóyales desde aquí
            </h2>
            <div className="flex flex-wrap gap-3">
              {socials.map(([network, url]) => {
                const meta = SOCIAL_META[network]
                return (
                  <a
                    key={network}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-ink/10
                      bg-white text-ink/70 text-sm font-medium hover:border-primary/40 hover:text-ink
                      transition-colors"
                  >
                    <span style={{ color: meta?.color }}>
                      <SocialIcon network={network} />
                    </span>
                    {meta?.label ?? network}
                  </a>
                )
              })}
              {artist.website_url && (
                <a
                  href={artist.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-ink/10
                    bg-white text-ink/70 text-sm font-medium hover:border-primary/40 hover:text-ink transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary">
                    <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                  </svg>
                  Web / Tienda
                </a>
              )}
            </div>
          </section>
        )}

        {/* Galería */}
        {hasGallery && (
          <section>
            <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-widest mb-5">
              Galería
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {artist.images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setLightbox(img)}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-primary/10
                    focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={img.url}
                    alt={img.caption ?? ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
                      px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{img.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Vídeos */}
        {hasVideos && (
          <section>
            <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-widest mb-5">
              Vídeos
            </h2>
            <div className={`grid gap-4 ${artist.video_urls.length === 1 ? 'grid-cols-1 max-w-2xl' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {artist.video_urls.map((url, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden bg-dark">
                  <iframe
                    src={toEmbedUrl(url)}
                    title={`Vídeo ${i + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Colaboraciones con Troncodrilo */}
        {hasProducts && (
          <section>
            <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-widest mb-5">
              Colaboraciones con Troncodrilo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {artist.products!.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <div className="pt-4 border-t border-ink/10">
          <Link to="/artistas" className="text-sm text-ink/40 hover:text-primary transition-colors">
            ← Volver a artistas
          </Link>
        </div>
      </main>
    </div>
  )
}
