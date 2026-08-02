import { useEffect, useRef, useState } from 'react'
import {
  createHeroSlide, deleteHeroSlide, getAdminHeroSlides, reorderHeroSlides, updateHeroSlide,
} from '../../api/heroSlides'
import type { HeroSlide, HeroSlideType } from '../../types/heroSlide'
import { uploadImage, uploadVideo } from '../../api/upload'

type VideoSource = 'file' | 'url'

interface FormState {
  type:      HeroSlideType
  url:       string
  title:     string
  subtitle:  string
  cta_text:  string
  cta_url:   string
  position:  string
  is_active: boolean
}

const empty: FormState = {
  type:      'image',
  url:       '',
  title:     '',
  subtitle:  '',
  cta_text:  '',
  cta_url:   '',
  position:  '0',
  is_active: true,
}

function toFormState(s: HeroSlide): FormState {
  return {
    type:      s.type,
    url:       s.url,
    title:     s.title ?? '',
    subtitle:  s.subtitle ?? '',
    cta_text:  s.cta_text ?? '',
    cta_url:   s.cta_url ?? '',
    position:  String(s.position),
    is_active: s.is_active,
  }
}

type FormMode = { type: 'create' } | { type: 'edit'; slide: HeroSlide } | null

const inputCls = 'w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

export default function AdminHeroPage() {
  const [slides, setSlides]     = useState<HeroSlide[]>([])
  const [loading, setLoading]   = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [form, setForm]         = useState<FormState>(empty)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [videoSource, setVideoSource] = useState<VideoSource>('url')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const fileRef                 = useRef<HTMLInputElement>(null)
  const videoFileRef            = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAdminHeroSlides()
      .then(setSlides)
      .catch(() => setError('Error al cargar los slides.'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setForm(empty)
    setFormMode({ type: 'create' })
    setVideoSource('url')
    setError(null)
  }

  function openEdit(slide: HeroSlide) {
    setForm(toFormState(slide))
    setFormMode({ type: 'edit', slide })
    setVideoSource('url')
    setError(null)
  }

  function closeForm() {
    setFormMode(null)
    setError(null)
  }

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, url }))
    } catch {
      setError('No se pudo subir la imagen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      const url = await uploadVideo(file)
      setForm(f => ({ ...f, url }))
    } catch {
      setError('No se pudo subir el vídeo.')
    } finally {
      setUploadingVideo(false)
      e.target.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) { setError('La URL (imagen o vídeo) es obligatoria.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        type:      form.type,
        url:       form.url.trim(),
        title:     form.title.trim() || undefined,
        subtitle:  form.subtitle.trim() || undefined,
        cta_text:  form.cta_text.trim() || undefined,
        cta_url:   form.cta_url.trim() || undefined,
        position:  parseInt(form.position, 10) || 0,
        is_active: form.is_active,
      }

      if (formMode?.type === 'edit') {
        const updated = await updateHeroSlide(formMode.slide.id, payload)
        setSlides(prev => prev.map(s => s.id === updated.id ? updated : s))
      } else {
        const created = await createHeroSlide(payload)
        setSlides(prev => [...prev, created].sort((a, b) => a.position - b.position || a.id - b.id))
      }
      closeForm()
    } catch {
      setError('No se pudo guardar el slide.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(slide: HeroSlide) {
    if (!window.confirm(`¿Eliminar el slide "${slide.title ?? `#${slide.id}`}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteHeroSlide(slide.id)
      setSlides(prev => prev.filter(s => s.id !== slide.id))
    } catch {
      setError('No se pudo eliminar el slide.')
    }
  }

  async function handleToggle(slide: HeroSlide) {
    try {
      const updated = await updateHeroSlide(slide.id, { is_active: !slide.is_active })
      setSlides(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch {
      setError('No se pudo cambiar el estado del slide.')
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); return }

    const reordered = [...slides]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)
    const withPositions = reordered.map((s, i) => ({ ...s, position: i }))

    setSlides(withPositions)
    setDragIndex(null)

    try {
      await reorderHeroSlides(withPositions.map(s => ({ id: s.id, position: s.position })))
    } catch {
      setError('No se pudo guardar el nuevo orden.')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Hero slides</h1>
          <p className="text-ink/50 text-sm mt-1">Imágenes o vídeos a pantalla completa de la home</p>
        </div>
        {!formMode && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold
              hover:bg-primary/90 transition-colors"
          >
            + Nuevo slide
          </button>
        )}
      </div>

      {error && !formMode && (
        <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* Formulario crear / editar */}
      {formMode && (
        <form onSubmit={handleSave}
          className="bg-white rounded-2xl border border-ink/10 p-6 mb-8 space-y-4">
          <h2 className="text-base font-semibold text-ink">
            {formMode.type === 'create' ? 'Nuevo slide' : `Editar: ${formMode.slide.title ?? `#${formMode.slide.id}`}`}
          </h2>

          {error && (
            <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                <input type="radio" checked={form.type === 'image'}
                  onChange={() => set('type', 'image')} className="accent-primary" />
                Imagen
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                <input type="radio" checked={form.type === 'video'}
                  onChange={() => set('type', 'video')} className="accent-primary" />
                Vídeo
              </label>
            </div>
          </div>

          {/* URL / archivo — imagen: subir o pegar / vídeo: subir archivo o URL externa */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">
              {form.type === 'video' ? 'Vídeo' : 'Imagen'} <span className="text-secondary">*</span>
            </label>

            {form.type === 'video' && (
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                  <input type="radio" checked={videoSource === 'file'}
                    onChange={() => setVideoSource('file')} className="accent-primary" />
                  Subir archivo
                </label>
                <label className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                  <input type="radio" checked={videoSource === 'url'}
                    onChange={() => setVideoSource('url')} className="accent-primary" />
                  URL externa
                </label>
              </div>
            )}

            <div className="flex gap-2">
              {form.type === 'video' && videoSource === 'file' ? (
                <label className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink/20
                  text-sm text-ink/60 hover:text-primary hover:border-primary cursor-pointer transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {uploadingVideo ? 'Subiendo…' : form.url ? 'Cambiar archivo de vídeo' : 'Elegir archivo de vídeo (máx. 100 MB)'}
                  <input ref={videoFileRef} type="file" accept="video/mp4,video/webm,video/ogg"
                    className="sr-only" onChange={handleVideoFileUpload} disabled={uploadingVideo} />
                </label>
              ) : (
                <input type="text" value={form.url} onChange={e => set('url', e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder={form.type === 'video' ? 'https://.../video.mp4' : 'https://...'} />
              )}
              {form.type === 'image' && (
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink/20
                  text-sm text-ink/60 hover:text-primary hover:border-primary cursor-pointer transition-colors flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {uploading ? 'Subiendo…' : 'Subir'}
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only"
                    onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
            {form.url && form.type === 'image' && (
              <div className="mt-2 h-24 rounded-lg overflow-hidden border border-ink/10">
                <img src={form.url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {form.url && form.type === 'video' && (
              <div className="mt-2 h-24 rounded-lg overflow-hidden border border-ink/10 bg-ink/5">
                <video src={form.url} className="w-full h-full object-cover" muted controls />
              </div>
            )}
          </div>

          {/* Título y subtítulo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Título (opcional, no se muestra en la home)</label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                className={inputCls} placeholder="Nombre interno del slide" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Subtítulo (opcional)</label>
              <input type="text" value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
                className={inputCls} placeholder="Subtítulo" />
            </div>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Texto del CTA (opcional)</label>
              <input type="text" value={form.cta_text} onChange={e => set('cta_text', e.target.value)}
                className={inputCls} placeholder="Ver colección" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">URL del CTA</label>
              <input type="text" value={form.cta_url} onChange={e => set('cta_url', e.target.value)}
                className={inputCls} placeholder="/tienda" />
            </div>
          </div>

          {/* Posición + is_active */}
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Posición</label>
              <input type="number" min="0" value={form.position}
                onChange={e => set('position', e.target.value)}
                className="w-24 rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink
                  focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none mt-4">
              <input type="checkbox" checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-ink">Activo (visible en home)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || uploading || uploadingVideo}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium
                hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Guardando…' : formMode.type === 'create' ? 'Crear slide' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={closeForm}
              className="px-5 py-2 rounded-lg border border-ink/20 text-ink text-sm
                font-medium hover:border-ink/40 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-20 text-ink/40 text-sm">Cargando slides…</div>
      ) : slides.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">No hay slides todavía.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
          <p className="px-5 py-2 text-xs text-ink/40 border-b border-ink/5">
            Arrastra las filas para reordenar
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Slide</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {slides.map((slide, i) => (
                <tr
                  key={slide.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  className={`cursor-move transition-opacity ${slide.is_active ? '' : 'opacity-50'} ${dragIndex === i ? 'opacity-30' : ''}`}
                >
                  <td className="px-5 py-4 text-ink/40 tabular-nums">{slide.position}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 flex-shrink-0 rounded-md overflow-hidden bg-primary/10">
                        {slide.type === 'video' ? (
                          <video src={slide.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={slide.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{slide.title ?? `Slide #${slide.id}`}</p>
                        {slide.subtitle && (
                          <p className="text-xs text-ink/40 truncate">{slide.subtitle}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-ink/50 text-xs capitalize">
                    {slide.type === 'video' ? 'Vídeo' : 'Imagen'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${slide.is_active ? 'bg-primary/10 text-primary' : 'bg-ink/10 text-ink/40'}`}>
                      {slide.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(slide)}
                        className="text-xs font-medium text-primary hover:underline">
                        Editar
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleToggle(slide)}
                        className="text-xs font-medium text-ink/50 hover:text-ink hover:underline">
                        {slide.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleDelete(slide)}
                        className="text-xs font-medium text-secondary hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
