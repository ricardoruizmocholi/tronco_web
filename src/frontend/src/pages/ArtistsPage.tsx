import { useEffect, useState } from 'react'
import { getArtists } from '../api/artists'
import type { Artist } from '../types/artist'

function ArtistCard({ artist }: { artist: Artist }) {
  const initials = artist.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const socialCount = Object.values(artist.social_links ?? {}).filter(Boolean).length

  return (
    <a
      href={`/artistas/${artist.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white border border-ink/10
        hover:border-primary/40 transition-colors duration-300 overflow-hidden"
    >
      {/* Avatar */}
      <div className="aspect-square overflow-hidden bg-primary/10 flex-shrink-0">
        {artist.avatar_url ? (
          <img
            src={artist.avatar_url}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-dark">
            <span className="text-4xl font-bold text-primary">{initials}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h2 className="font-editorial text-xl text-ink leading-snug group-hover:text-primary transition-colors">
          {artist.name}
        </h2>

        {artist.bio && (
          <p className="text-ink/60 text-sm leading-relaxed line-clamp-3">
            {artist.bio}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {/* Imágenes de galería */}
          {artist.images.length > 0 && (
            <div className="flex -space-x-2">
              {artist.images.slice(0, 3).map(img => (
                <div
                  key={img.id}
                  className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-primary/20 flex-shrink-0"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {artist.images.length > 3 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-ink/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-semibold text-ink/60">+{artist.images.length - 3}</span>
                </div>
              )}
            </div>
          )}

          {socialCount > 0 && (
            <span className="text-xs text-ink/40 ml-auto">
              {socialCount} {socialCount === 1 ? 'red' : 'redes'}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function ArtistsPage() {
  const [artists, setArtists]   = useState<Artist[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getArtists()
      .then(setArtists)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero */}
      <div className="bg-dark text-white px-4 py-16 text-center">
        <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-3">
          Universo Troncodrilo
        </p>
        <h1 className="text-4xl font-bold mb-4">Artistas colaboradores</h1>
        <p className="text-white/60 text-base max-w-md mx-auto">
          Las personas que dan vida al mundo de Troncodrilo con su arte, música y diseño.
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-ink/40 text-sm">Cargando artistas…</p>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-ink/40 text-sm">Próximamente — artistas en camino.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map(artist => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
