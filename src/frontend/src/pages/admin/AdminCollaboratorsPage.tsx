import { useEffect, useRef, useState } from 'react'
import {
  createCollaborator, deleteCollaborator, getAdminCollaborators, updateCollaborator,
} from '../../api/collaborators'
import type { Collaborator } from '../../api/collaborators'
import { uploadImage } from '../../api/upload'

interface FormState {
  name:        string
  logo_url:    string
  url:         string
  description: string
  position:    string
  is_active:   boolean
}

const empty: FormState = {
  name:        '',
  logo_url:    '',
  url:         '',
  description: '',
  position:    '0',
  is_active:   true,
}

function toFormState(c: Collaborator): FormState {
  return {
    name:        c.name,
    logo_url:    c.logo_url ?? '',
    url:         c.url,
    description: c.description ?? '',
    position:    String(c.position),
    is_active:   c.is_active,
  }
}

type FormMode = { type: 'create' } | { type: 'edit'; collaborator: Collaborator } | null

const inputCls = 'w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

export default function AdminCollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading]     = useState(true)
  const [formMode, setFormMode]   = useState<FormMode>(null)
  const [form, setForm]           = useState<FormState>(empty)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const fileRef                   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAdminCollaborators()
      .then(setCollaborators)
      .catch(() => setError('Error al cargar los colaboradores.'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setForm(empty)
    setFormMode({ type: 'create' })
    setError(null)
  }

  function openEdit(c: Collaborator) {
    setForm(toFormState(c))
    setFormMode({ type: 'edit', collaborator: c })
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
      setForm(f => ({ ...f, logo_url: url }))
    } catch {
      setError('No se pudo subir el logo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.url.trim())  { setError('La URL es obligatoria.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        name:        form.name.trim(),
        logo_url:    form.logo_url.trim() || undefined,
        url:         form.url.trim(),
        description: form.description.trim() || undefined,
        position:    parseInt(form.position, 10) || 0,
        is_active:   form.is_active,
      }

      if (formMode?.type === 'edit') {
        const updated = await updateCollaborator(formMode.collaborator.id, payload)
        setCollaborators(prev => prev.map(c => c.id === updated.id ? updated : c))
      } else {
        const created = await createCollaborator(payload)
        setCollaborators(prev =>
          [...prev, created].sort((a, b) => a.position - b.position || a.id - b.id)
        )
      }
      closeForm()
    } catch {
      setError('No se pudo guardar el colaborador.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Collaborator) {
    if (!window.confirm(`¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteCollaborator(c.id)
      setCollaborators(prev => prev.filter(x => x.id !== c.id))
    } catch {
      setError('No se pudo eliminar el colaborador.')
    }
  }

  async function handleToggle(c: Collaborator) {
    try {
      const updated = await updateCollaborator(c.id, { is_active: !c.is_active })
      setCollaborators(prev => prev.map(x => x.id === updated.id ? updated : x))
    } catch {
      setError('No se pudo cambiar el estado.')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Colaboradores</h1>
          <p className="text-ink/50 text-sm mt-1">Marcas y tiendas en la home</p>
        </div>
        {!formMode && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold
              hover:bg-primary/90 transition-colors"
          >
            + Nuevo colaborador
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
            {formMode.type === 'create' ? 'Nuevo colaborador' : `Editar: ${formMode.collaborator.name}`}
          </h2>

          {error && (
            <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Nombre y URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Nombre <span className="text-secondary">*</span></label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                className={inputCls} placeholder="Nombre del colaborador" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">URL <span className="text-secondary">*</span></label>
              <input type="url" value={form.url} onChange={e => set('url', e.target.value)}
                className={inputCls} placeholder="https://sutienda.com" />
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Logo</label>
            <div className="flex gap-2">
              <input type="url" value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
                className={`${inputCls} flex-1`} placeholder="https://... (opcional)" />
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
            {form.logo_url && (
              <div className="mt-2 h-16 w-32 rounded-lg overflow-hidden border border-ink/10 bg-ink/[0.02] flex items-center justify-center p-2">
                <img src={form.logo_url} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Descripción corta</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              className={inputCls} placeholder="Tienda de ropa streetwear (opcional)" />
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
              {saving ? 'Guardando…' : formMode.type === 'create' ? 'Crear colaborador' : 'Guardar cambios'}
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
        <div className="text-center py-20 text-ink/40 text-sm">Cargando colaboradores…</div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">No hay colaboradores todavía.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Colaborador</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider hidden sm:table-cell">Descripción</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {collaborators.map(c => (
                <tr key={c.id}
                  className={`transition-opacity ${c.is_active ? '' : 'opacity-50'}`}>
                  <td className="px-5 py-4 text-ink/40 tabular-nums">{c.position}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-ink/[0.04]
                        border border-ink/10 flex items-center justify-center p-1">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-xs font-bold text-ink/30">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{c.name}</p>
                        <p className="text-xs text-ink/40 truncate">{c.url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-ink/50 text-xs truncate max-w-[180px]">
                    {c.description ?? <span className="italic text-ink/30">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${c.is_active ? 'bg-primary/10 text-primary' : 'bg-ink/10 text-ink/40'}`}>
                      {c.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)}
                        className="text-xs font-medium text-primary hover:underline">
                        Editar
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleToggle(c)}
                        className="text-xs font-medium text-ink/50 hover:text-ink hover:underline">
                        {c.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <span className="text-ink/20">|</span>
                      <button onClick={() => handleDelete(c)}
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
