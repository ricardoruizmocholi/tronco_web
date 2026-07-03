import { useEffect, useState } from 'react'
import { createFanfic, getMyFanfic, updateFanfic } from '../api/fanfics'
import type { Fanfic, FanficFormData, FanficStatus } from '../types/fanfic'

const STATUS_UI: Record<FanficStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending:  { label: 'En revisión',  dot: 'bg-amber-400',  bg: 'bg-amber-500/10',   text: 'text-amber-500' },
  approved: { label: 'Aprobado',     dot: 'bg-primary',    bg: 'bg-primary/10',     text: 'text-primary'   },
  rejected: { label: 'Rechazado',    dot: 'bg-secondary',  bg: 'bg-secondary/10',   text: 'text-secondary' },
}

export default function MiFanficPage() {
  const [fanfic, setFanfic]   = useState<Fanfic | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<FanficFormData>({
    title:     '',
    content:   '',
    latitude:  40.4168,
    longitude: -3.7038,
  })

  useEffect(() => {
    getMyFanfic()
      .then(f => {
        setFanfic(f)
        setForm({ title: f.title, content: f.content, latitude: f.latitude, longitude: f.longitude })
      })
      .catch(() => { /* 404 = aún no tiene fanfic, muestra el formulario vacío */ })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const saved = fanfic
        ? await updateFanfic(fanfic.id, form)
        : await createFanfic(form)
      setFanfic(saved)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message ?? 'Error al guardar el fanfic.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const status = fanfic?.status as FanficStatus | undefined
  const statusUI = status ? STATUS_UI[status] : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Mi fanfic</h1>
      <p className="text-ink/50 text-sm mb-8">
        {fanfic
          ? 'Edita tu historia. Al guardar vuelve a revisión.'
          : 'Escribe tu historia de Troncodrilo y elige dónde sucede en el mapa.'}
      </p>

      {/* Badge de estado */}
      {statusUI && (
        <div className="mb-6 space-y-2">
          <span className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5
            rounded-full ${statusUI.bg} ${statusUI.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusUI.dot}`} />
            {statusUI.label}
          </span>
          {status === 'rejected' && fanfic?.rejection_reason && (
            <p className="text-sm text-secondary bg-secondary/10 rounded-xl px-4 py-3">
              <span className="font-medium">Motivo: </span>{fanfic.rejection_reason}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            maxLength={255}
            placeholder="Un título épico para tu fanfic"
            className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink
              focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Historia */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Historia</label>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            required
            rows={10}
            placeholder="Érase una vez Troncodrilo..."
            className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink
              focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          />
        </div>

        {/* Ubicación */}
        <fieldset className="border border-ink/10 rounded-2xl p-5 space-y-4">
          <legend className="text-sm font-medium text-ink px-1">Ubicación en el mapa</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink/50 mb-1">Latitud (−90 a 90)</label>
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: parseFloat(e.target.value) }))}
                required
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm
                  font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Longitud (−180 a 180)</label>
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: parseFloat(e.target.value) }))}
                required
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm
                  font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <p className="text-xs text-ink/40">
            Introduce las coordenadas donde ocurre tu historia. Puedes buscarlas en Google Maps
            (clic derecho → &ldquo;¿Qué hay aquí?&rdquo;).
          </p>
        </fieldset>

        {error   && <p className="text-sm text-secondary bg-secondary/10 rounded-xl px-4 py-3">{error}</p>}
        {success && <p className="text-sm text-primary bg-primary/10 rounded-xl px-4 py-3">¡Fanfic guardado! Queda pendiente de revisión.</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white font-medium py-3 rounded-xl
            hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : fanfic ? 'Guardar cambios' : 'Enviar fanfic'}
        </button>
      </form>
    </div>
  )
}
