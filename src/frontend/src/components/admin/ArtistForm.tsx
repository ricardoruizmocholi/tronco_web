import { useEffect, useState } from 'react'
import { addArtistImage, deleteArtistImage } from '../../api/artists'
import { uploadImage } from '../../api/upload'
import type { Artist, ArtistFormData, ArtistImage } from '../../types/artist'

interface Props {
  artist?:   Artist
  onSave:    (data: ArtistFormData) => void
  onCancel:  () => void
  saving:    boolean
}

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'twitter',   label: 'Twitter / X' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'twitch',    label: 'Twitch' },
  { key: 'bandcamp',  label: 'Bandcamp' },
] as const

const EMPTY: ArtistFormData = {
  name:         '',
  bio:          '',
  avatar_url:   '',
  website_url:  '',
  video_urls:   [],
  social_links: {},
}

export default function ArtistForm({ artist, onSave, onCancel, saving }: Props) {
  const [form, setForm]           = useState<ArtistFormData>(EMPTY)
  const [videoText, setVideoText] = useState('')   // textarea — una URL por línea
  const [error, setError]         = useState<string | null>(null)

  // Campos para nueva imagen de galería
  const [newImgUrl, setNewImgUrl]         = useState('')
  const [newImgCaption, setNewImgCaption] = useState('')
  const [imgSaving, setImgSaving]         = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [localImages, setLocalImages]     = useState<ArtistImage[]>([])

  // Re-inicializa el formulario cuando cambia el artista seleccionado
  useEffect(() => {
    if (artist) {
      setForm({
        name:         artist.name,
        bio:          artist.bio ?? '',
        avatar_url:   artist.avatar_url ?? '',
        website_url:  artist.website_url ?? '',
        video_urls:   artist.video_urls ?? [],
        social_links: artist.social_links ?? {},
        is_active:    artist.is_active,
      })
      setVideoText((artist.video_urls ?? []).join('\n'))
      setLocalImages(artist.images ?? [])
    } else {
      setForm(EMPTY)
      setVideoText('')
      setLocalImages([])
    }
    setError(null)
  }, [artist])

  function setField<K extends keyof ArtistFormData>(key: K, value: ArtistFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setSocial(key: string, value: string) {
    setForm(f => ({ ...f, social_links: { ...f.social_links, [key]: value } }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }

    const videoUrls = videoText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    onSave({ ...form, video_urls: videoUrls })
  }

  async function handleAddImage() {
    if (!artist || !newImgUrl.trim()) return
    setImgSaving(true)
    try {
      const img = await addArtistImage(artist.id, { url: newImgUrl.trim(), caption: newImgCaption.trim() })
      setLocalImages(prev => [...prev, img])
      setNewImgUrl('')
      setNewImgCaption('')
    } finally {
      setImgSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!artist || !file) return
    setImgSaving(true)
    setUploading(true)
    try {
      const url = await uploadImage(file)
      const img = await addArtistImage(artist.id, { url, caption: '' })
      setLocalImages(prev => [...prev, img])
    } finally {
      setImgSaving(false)
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteImage(img: ArtistImage) {
    if (!artist) return
    await deleteArtistImage(artist.id, img.id)
    setLocalImages(prev => prev.filter(i => i.id !== img.id))
  }

  const inputCls = 'w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary/50'
  const labelCls = 'block text-xs font-medium text-ink/60 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Nombre */}
      <div>
        <label className={labelCls}>Nombre artístico *</label>
        <input className={inputCls} value={form.name}
          onChange={e => setField('name', e.target.value)} placeholder="Nombre del artista" />
      </div>

      {/* Bio */}
      <div>
        <label className={labelCls}>Biografía</label>
        <textarea className={`${inputCls} resize-y min-h-[100px]`} value={form.bio}
          onChange={e => setField('bio', e.target.value)} placeholder="Describe al artista y su colaboración…" />
      </div>

      {/* URLs básicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>URL de avatar</label>
          <input className={inputCls} value={form.avatar_url}
            onChange={e => setField('avatar_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className={labelCls}>Web / Tienda personal</label>
          <input className={inputCls} value={form.website_url}
            onChange={e => setField('website_url', e.target.value)} placeholder="https://…" />
        </div>
      </div>

      {/* Redes sociales */}
      <div>
        <label className={labelCls}>Redes sociales</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-ink/40 w-20 flex-shrink-0">{label}</span>
              <input
                className={inputCls}
                value={(form.social_links as Record<string, string>)[key] ?? ''}
                onChange={e => setSocial(key, e.target.value)}
                placeholder="https://…"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Vídeos */}
      <div>
        <label className={labelCls}>URLs de vídeos (una por línea — YouTube o Vimeo)</label>
        <textarea
          className={`${inputCls} resize-y min-h-[80px] font-mono text-xs`}
          value={videoText}
          onChange={e => setVideoText(e.target.value)}
          placeholder={'https://www.youtube.com/embed/…\nhttps://vimeo.com/…'}
        />
      </div>

      {/* Estado activo — solo en edición */}
      {artist && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active ?? true}
            onChange={e => setField('is_active', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="is_active" className="text-sm text-ink">Artista activo (visible en la web)</label>
        </div>
      )}

      {/* Galería de imágenes — solo en edición (el artista debe existir) */}
      {artist && (
        <div>
          <label className={labelCls}>Galería de imágenes</label>
          <div className="space-y-2 mb-3">
            {localImages.length === 0 && (
              <p className="text-xs text-ink/30 italic">Sin imágenes todavía.</p>
            )}
            {localImages.map(img => (
              <div key={img.id} className="flex items-center gap-3 p-2 rounded-lg border border-ink/10 bg-white">
                <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-primary/10">
                  <img src={img.url} alt={img.caption ?? ''} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{img.url}</p>
                  {img.caption && <p className="text-xs text-ink/50 truncate">{img.caption}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img)}
                  className="text-xs text-secondary hover:underline flex-shrink-0"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>

          {/* Subir desde dispositivo */}
          <label className="inline-flex items-center gap-2 mb-2 cursor-pointer text-xs
            text-ink/50 hover:text-primary transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12
                   3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? 'Subiendo…' : 'Subir desde dispositivo'}
            <input type="file" accept="image/*" className="sr-only"
              onChange={handleFileUpload} disabled={imgSaving} />
          </label>

          {/* Añadir imagen por URL */}
          <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border border-dashed border-ink/20 bg-ink/[0.02]">
            <input
              className={`${inputCls} flex-1`}
              value={newImgUrl}
              onChange={e => setNewImgUrl(e.target.value)}
              placeholder="URL de imagen"
            />
            <input
              className={`${inputCls} flex-1`}
              value={newImgCaption}
              onChange={e => setNewImgCaption(e.target.value)}
              placeholder="Pie de foto (opcional)"
            />
            <button
              type="button"
              onClick={handleAddImage}
              disabled={imgSaving || !newImgUrl.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium
                hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {imgSaving ? '…' : '+ Añadir'}
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm
            hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando…' : artist ? 'Guardar cambios' : 'Crear artista'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-ink/20 text-ink text-sm
            font-medium hover:border-ink/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
