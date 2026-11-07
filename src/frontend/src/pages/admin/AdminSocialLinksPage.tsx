import { useEffect, useState } from 'react'
import {
  createSocialLink, deleteSocialLink, getAdminSocialLinks, reorderSocialLinks,
  toggleSocialLink, updateSocialLink,
} from '../../api/socialLinks'
import SocialIcon from '../../components/SocialIcon'
import type { AdminSocialLink } from '../../types/socialLink'

interface FormState {
  platform:  string
  url:       string
  label:     string
  is_active: boolean
}

const empty: FormState = { platform: 'instagram', url: '', label: '', is_active: true }

type FormMode = { type: 'create' } | { type: 'edit'; link: AdminSocialLink } | null

const inputCls = 'w-full rounded-xs border border-ink/20 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

// Mensaje del primer error de validación (422) de Laravel, o uno genérico
function errorMessage(e: unknown, fallback: string): string {
  const errors = (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
  return errors ? Object.values(errors)[0]?.[0] ?? fallback : fallback
}

export default function AdminSocialLinksPage() {
  const [links, setLinks]         = useState<AdminSocialLink[]>([])
  const [platforms, setPlatforms] = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(true)
  const [formMode, setFormMode]   = useState<FormMode>(null)
  const [form, setForm]           = useState<FormState>(empty)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    getAdminSocialLinks()
      .then(res => { setLinks(res.data); setPlatforms(res.platforms) })
      .catch(() => setError('Error al cargar las redes sociales.'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setForm(empty)
    setFormMode({ type: 'create' })
    setError(null)
  }

  function openEdit(link: AdminSocialLink) {
    setForm({ platform: link.platform, url: link.url, label: link.label ?? '', is_active: link.is_active })
    setFormMode({ type: 'edit', link })
    setError(null)
  }

  function closeForm() {
    setFormMode(null)
    setError(null)
  }

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) { setError('La URL es obligatoria.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        platform:  form.platform,
        url:       form.url.trim(),
        label:     form.label.trim() || null,
        is_active: form.is_active,
      }
      if (formMode?.type === 'edit') {
        const updated = await updateSocialLink(formMode.link.id, payload)
        setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
      } else {
        const created = await createSocialLink(payload)
        setLinks(prev => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar la red social.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(link: AdminSocialLink) {
    if (!window.confirm(`¿Eliminar la red social "${platforms[link.platform] ?? link.platform}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteSocialLink(link.id)
      setLinks(prev => prev.filter(l => l.id !== link.id))
    } catch {
      setError('No se pudo eliminar la red social.')
    }
  }

  async function handleToggle(link: AdminSocialLink) {
    try {
      const updated = await toggleSocialLink(link.id)
      setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    } catch {
      setError('No se pudo cambiar el estado de la red social.')
    }
  }

  // Reordena en local y sincroniza con el servidor; si falla, revierte
  async function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= links.length) return
    const previous = links
    const reordered = [...links]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setLinks(reordered)
    try {
      await reorderSocialLinks(reordered.map(l => l.id))
    } catch {
      setLinks(previous)
      setError('No se pudo guardar el nuevo orden.')
    }
  }

  async function handleDrop(index: number) {
    const from = dragIndex
    setDragIndex(null)
    if (from !== null) await moveTo(from, index)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-end mb-8">
        {!formMode && (
          <button onClick={openCreate} className="btn-admin-primary">
            + Nueva red social
          </button>
        )}
      </div>

      {error && !formMode && (
        <p className="text-sm text-secondary bg-secondary/10 rounded-xs px-3 py-2 mb-4">{error}</p>
      )}

      {formMode && (
        <form onSubmit={handleSave} className="bg-white rounded-xs border border-ink/10 p-6 mb-8 space-y-4">
          <h2 className="text-base font-semibold text-ink">
            {formMode.type === 'create' ? 'Nueva red social' : `Editar: ${platforms[formMode.link.platform] ?? formMode.link.platform}`}
          </h2>

          {error && (
            <p className="text-sm text-secondary bg-secondary/10 rounded-xs px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sl-platform" className="block text-xs font-medium text-ink/60 mb-1">
                Plataforma <span className="text-secondary">*</span>
              </label>
              <select id="sl-platform" value={form.platform} onChange={e => set('platform', e.target.value)}
                className={inputCls}>
                {Object.entries(platforms).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sl-label" className="block text-xs font-medium text-ink/60 mb-1">
                Etiqueta accesible (opcional)
              </label>
              <input id="sl-label" type="text" maxLength={60} value={form.label}
                onChange={e => set('label', e.target.value)}
                className={inputCls} placeholder="Instagram oficial" />
            </div>
          </div>

          <div>
            <label htmlFor="sl-url" className="block text-xs font-medium text-ink/60 mb-1">
              URL <span className="text-secondary">*</span>
            </label>
            <input id="sl-url" type="url" maxLength={255} value={form.url}
              onChange={e => set('url', e.target.value)}
              className={inputCls} placeholder="https://www.instagram.com/troncodrilo" />
            <p className="text-xs text-ink/40 mt-1">Solo se admiten enlaces http:// o https://</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <span className="text-sm text-ink">Activa (visible en el footer)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-admin-primary">
              {saving ? 'Guardando…' : formMode.type === 'create' ? 'Crear red social' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={closeForm} className="btn-admin-secondary">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-20 text-ink/40 text-sm">Cargando redes sociales…</div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">No hay redes sociales todavía.</div>
      ) : (
        <div className="bg-white rounded-xs border border-ink/10 overflow-hidden">
          <p className="px-5 py-2 text-xs text-ink/40 border-b border-ink/5">
            Arrastra las filas o usa las flechas para reordenar
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Red</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider hidden sm:table-cell">URL</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {links.map((link, i) => (
                <tr
                  key={link.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={`cursor-move transition-opacity ${link.is_active ? '' : 'opacity-50'} ${dragIndex === i ? 'opacity-30' : ''}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                        <SocialIcon platform={link.platform} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{platforms[link.platform] ?? link.platform}</p>
                        {link.label && <p className="text-xs text-ink/40 truncate">{link.label}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-ink/50 text-xs max-w-[16rem] truncate">{link.url}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${link.is_active ? 'bg-primary/10 text-primary' : 'bg-ink/10 text-ink/40'}`}>
                      {link.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => moveTo(i, i - 1)} disabled={i === 0}
                        aria-label="Subir" className="btn-admin-link btn-admin-link-neutral disabled:opacity-30">↑</button>
                      <button onClick={() => moveTo(i, i + 1)} disabled={i === links.length - 1}
                        aria-label="Bajar" className="btn-admin-link btn-admin-link-neutral disabled:opacity-30">↓</button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => openEdit(link)} className="btn-admin-link btn-admin-link-primary">Editar</button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleToggle(link)} className="btn-admin-link btn-admin-link-neutral">
                        {link.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleDelete(link)} className="btn-admin-link btn-admin-link-danger">Eliminar</button>
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
