import { useEffect, useRef, useState } from 'react'
import {
  createBanner, deleteBanner, getAdminBanners, updateBanner,
} from '../../api/banners'
import type { Banner } from '../../api/banners'
import { uploadImage } from '../../api/upload'

interface FormState {
  title:    string
  subtitle: string
  image_url: string
  cta_text: string
  cta_url:  string
  position: string
  is_active: boolean
}

const empty: FormState = {
  title:     '',
  subtitle:  '',
  image_url: '',
  cta_text:  '',
  cta_url:   '',
  position:  '0',
  is_active: true,
}

function toFormState(b: Banner): FormState {
  return {
    title:     b.title,
    subtitle:  b.subtitle ?? '',
    image_url: b.image_url,
    cta_text:  b.cta_text ?? '',
    cta_url:   b.cta_url ?? '',
    position:  String(b.position),
    is_active: b.is_active,
  }
}

type FormMode = { type: 'create' } | { type: 'edit'; banner: Banner } | null

const inputCls = 'w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

export default function AdminBannersPage() {
  const [banners, setBanners]   = useState<Banner[]>([])
  const [loading, setLoading]   = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [form, setForm]         = useState<FormState>(empty)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const fileRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAdminBanners()
      .then(setBanners)
      .catch(() => setError('Error al cargar los banners.'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setForm(empty)
    setFormMode({ type: 'create' })
    setError(null)
  }

  function openEdit(banner: Banner) {
    setForm(toFormState(banner))
    setFormMode({ type: 'edit', banner })
    setError(null)
  }

  function closeForm() {
    setFormMode(null)
    setError(null)
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, image_url: url }))
    } catch {
      setError('No se pudo subir la imagen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim())     { setError('El título es obligatorio.'); return }
    if (!form.image_url.trim()) { setError('La URL de imagen es obligatoria.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        title:     form.title.trim(),
        subtitle:  form.subtitle.trim() || undefined,
        image_url: form.image_url.trim(),
        cta_text:  form.cta_text.trim() || undefined,
        cta_url:   form.cta_url.trim() || undefined,
        position:  parseInt(form.position, 10) || 0,
        is_active: form.is_active,
      }

      if (formMode?.type === 'edit') {
        const updated = await updateBanner(formMode.banner.id, payload)
        setBanners(prev => prev.map(b => b.id === updated.id ? updated : b))
      } else {
        const created = await createBanner(payload)
        setBanners(prev => [...prev, created].sort((a, b) => a.position - b.position || a.id - b.id))
      }
      closeForm()
    } catch {
      setError('No se pudo guardar el banner.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(banner: Banner) {
    if (!window.confirm(`¿Eliminar el banner "${banner.title}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteBanner(banner.id)
      setBanners(prev => prev.filter(b => b.id !== banner.id))
    } catch {
      setError('No se pudo eliminar el banner.')
    }
  }

  async function handleToggle(banner: Banner) {
    try {
      const updated = await updateBanner(banner.id, { is_active: !banner.is_active })
      setBanners(prev => prev.map(b => b.id === updated.id ? updated : b))
    } catch {
      setError('No se pudo cambiar el estado del banner.')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Banners</h1>
          <p className="text-ink/50 text-sm mt-1">Hero de la home pública</p>
        </div>
        {!formMode && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold
              hover:bg-primary/90 transition-colors"
          >
            + Nuevo banner
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
            {formMode.type === 'create' ? 'Nuevo banner' : `Editar: ${formMode.banner.title}`}
          </h2>

          {error && (
            <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Título y subtítulo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Título <span className="text-secondary">*</span></label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                className={inputCls} placeholder="Nuevo drop de verano" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Subtítulo</label>
              <input type="text" value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
                className={inputCls} placeholder="Colección limitada disponible ahora" />
            </div>
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Imagen de fondo <span className="text-secondary">*</span></label>
            <div className="flex gap-2">
              <input type="url" value={form.image_url} onChange={e => set('image_url', e.target.value)}
                className={`${inputCls} flex-1`} placeholder="https://..." />
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
            </div>
            {form.image_url && (
              <div className="mt-2 h-24 rounded-lg overflow-hidden border border-ink/10">
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Texto del botón CTA</label>
              <input type="text" value={form.cta_text} onChange={e => set('cta_text', e.target.value)}
                className={inputCls} placeholder="Ver colección" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">URL del CTA</label>
              <input type="url" value={form.cta_url} onChange={e => set('cta_url', e.target.value)}
                className={inputCls} placeholder="https://..." />
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
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium
                hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Guardando…' : formMode.type === 'create' ? 'Crear banner' : 'Guardar cambios'}
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
        <div className="text-center py-20 text-ink/40 text-sm">Cargando banners…</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">No hay banners todavía.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Banner</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider hidden sm:table-cell">CTA</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {banners.map(banner => (
                <tr key={banner.id}
                  className={`transition-opacity ${banner.is_active ? '' : 'opacity-50'}`}>
                  <td className="px-5 py-4 text-ink/40 tabular-nums">{banner.position}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 flex-shrink-0 rounded-md overflow-hidden bg-primary/10">
                        <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{banner.title}</p>
                        {banner.subtitle && (
                          <p className="text-xs text-ink/40 truncate">{banner.subtitle}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-ink/50 text-xs truncate max-w-[160px]">
                    {banner.cta_text
                      ? <span>{banner.cta_text}</span>
                      : <span className="italic text-ink/30">Sin CTA</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${banner.is_active ? 'bg-primary/10 text-primary' : 'bg-ink/10 text-ink/40'}`}>
                      {banner.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(banner)}
                        className="text-xs font-medium text-primary hover:underline">
                        Editar
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleToggle(banner)}
                        className="text-xs font-medium text-ink/50 hover:text-ink hover:underline">
                        {banner.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleDelete(banner)}
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
