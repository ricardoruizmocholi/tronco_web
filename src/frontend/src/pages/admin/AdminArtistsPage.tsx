import { useEffect, useState } from 'react'
import {
  addArtistImage, createArtist, deleteArtist, getAdminArtists, toggleArtist, updateArtist,
} from '../../api/artists'
import ArtistForm from '../../components/admin/ArtistForm'
import type { Artist, ArtistFormData } from '../../types/artist'

type FormMode = { type: 'create' } | { type: 'edit'; artist: Artist } | null

export default function AdminArtistsPage() {
  const [artists, setArtists]     = useState<Artist[]>([])
  const [loading, setLoading]     = useState(true)
  const [formMode, setFormMode]   = useState<FormMode>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    getAdminArtists()
      .then(setArtists)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(data: ArtistFormData, pendingImageUrls: string[] = []) {
    setSaving(true)
    setError(null)
    try {
      if (formMode?.type === 'edit') {
        const updated = await updateArtist(formMode.artist.id, data)
        setArtists(prev => prev.map(a => a.id === updated.id ? updated : a))
      } else {
        const created = await createArtist(data)
        for (const url of pendingImageUrls) {
          await addArtistImage(created.id, { url, caption: '' })
        }
        setArtists(prev => [created, ...prev])
      }
      setFormMode(null)
    } catch {
      setError('No se pudo guardar. Revisa los campos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(artist: Artist) {
    const updated = await toggleArtist(artist.id)
    setArtists(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  async function handleDelete(artist: Artist) {
    if (!window.confirm(`¿Eliminar "${artist.name}" permanentemente? Esta acción no se puede deshacer.`)) return
    try {
      await deleteArtist(artist.id)
      setArtists(prev => prev.filter(a => a.id !== artist.id))
    } catch {
      setError('No se pudo eliminar el artista.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink/40 text-sm">Cargando artistas…</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-ink">Artistas colaboradores</h1>
        {!formMode && (
          <button
            onClick={() => setFormMode({ type: 'create' })}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold
              hover:bg-primary/90 transition-colors"
          >
            + Nuevo artista
          </button>
        )}
      </div>

      {/* Error fuera del formulario (ej: al eliminar) */}
      {error && !formMode && (
        <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* Formulario crear / editar */}
      {formMode && (
        <div className="bg-white rounded-2xl border border-ink/10 p-6 mb-8">
          <h2 className="text-base font-semibold text-ink mb-5">
            {formMode.type === 'create' ? 'Nuevo artista' : `Editar: ${formMode.artist.name}`}
          </h2>
          {error && (
            <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}
          <ArtistForm
            artist={formMode.type === 'edit' ? formMode.artist : undefined}
            onSave={handleSave}
            onCancel={() => { setFormMode(null); setError(null) }}
            saving={saving}
          />
        </div>
      )}

      {/* Tabla */}
      {artists.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">
          No hay artistas todavía.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Artista</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider hidden sm:table-cell">Redes</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {artists.map(artist => {
                const socialCount = Object.values(artist.social_links ?? {}).filter(Boolean).length
                return (
                  <tr
                    key={artist.id}
                    className={`transition-opacity ${artist.is_active ? '' : 'opacity-50'}`}
                  >
                    {/* Artista */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden bg-primary/10">
                          {artist.avatar_url ? (
                            <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-dark">
                              <span className="text-xs font-bold text-primary">
                                {artist.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{artist.name}</p>
                          {artist.website_url && (
                            <p className="text-xs text-ink/40 truncate">{artist.website_url}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Redes */}
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-ink/50">
                        {socialCount > 0 ? `${socialCount} ${socialCount === 1 ? 'red' : 'redes'}` : '—'}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${artist.is_active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-ink/10 text-ink/40'
                        }`}>
                        {artist.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setFormMode({ type: 'edit', artist })}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Editar
                        </button>
                        <span className="text-ink/20">|</span>
                        <button
                          onClick={() => handleToggle(artist)}
                          className="text-xs font-medium text-ink/50 hover:text-ink hover:underline"
                        >
                          {artist.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <span className="text-ink/20">|</span>
                        <button
                          onClick={() => handleDelete(artist)}
                          className="text-xs font-medium text-secondary hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
