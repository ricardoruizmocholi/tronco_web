import { useState } from 'react'
import { CARRIERS, buildTrackingUrl } from '../lib/trackingCarriers'

export interface TrackingData {
  number: string | null
  url: string | null
  carrier: string | null
  updatedAt: string | null
}

export interface TrackingSavePayload {
  number: string
  url: string
  carrier: string
}

interface Props {
  title: string
  data: TrackingData
  onSave: (payload: TrackingSavePayload) => Promise<void>
  // 'rounded' para modales con esquinas redondeadas (AdminOrdersPage),
  // 'flat' para el estilo editorial de esquinas rectas (AdminReturnsPage)
  variant?: 'rounded' | 'flat'
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="9" y="9" width="12" height="12" rx="1.5" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </svg>
  )
}

function extractErrorMessage(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'No se pudo guardar el seguimiento.'
}

export default function TrackingPanel({ title, data, onSave, variant = 'rounded' }: Props) {
  const hasTracking = Boolean(data.number)
  const [editing, setEditing] = useState(!hasTracking)
  const [carrier, setCarrier] = useState(data.carrier ?? CARRIERS[0].value)
  const [number, setNumber] = useState(data.number ?? '')
  const [url, setUrl] = useState(data.url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const rounded = variant === 'rounded'
  const fieldCls = `w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-primary/40 ${rounded ? 'rounded-xl' : ''}`
  const primaryBtnCls = `px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors ${rounded ? 'rounded-xl' : ''}`

  const preview = url.trim() ? '' : buildTrackingUrl(carrier, number)

  async function handleSave() {
    if (!number.trim()) {
      setError('El número de seguimiento es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const finalUrl = url.trim() || buildTrackingUrl(carrier, number.trim())
      await onSave({ number: number.trim(), url: finalUrl, carrier })
      setEditing(false)
    } catch (e: unknown) {
      setError(extractErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setCarrier(data.carrier ?? CARRIERS[0].value)
    setNumber(data.number ?? '')
    setUrl(data.url ?? '')
    setError(null)
    setEditing(false)
  }

  async function handleCopy() {
    if (!data.number) return
    await navigator.clipboard.writeText(data.number)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="pt-4 border-t border-ink/10">
      <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">{title}</p>

      {!editing && hasTracking ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-ink">
            <span className="font-mono">{data.number}</span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar número de seguimiento"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <CopyIcon />
            </button>
            {copied && <span className="text-xs text-primary">Copiado</span>}
          </div>
          {data.carrier && <p className="text-xs text-ink/50">Transportista: {data.carrier}</p>}
          {data.updatedAt && (
            <p className="text-xs text-ink/40">
              Actualizado: {new Date(data.updatedAt).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          )}
          <div className="flex items-center gap-3 pt-1">
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/70 transition-colors"
              >
                Ver seguimiento →
              </a>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-ink/40 hover:text-ink transition-colors"
            >
              Editar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink/50 mb-1.5">Transportista</label>
              <select value={carrier} onChange={e => setCarrier(e.target.value)} className={fieldCls}>
                {CARRIERS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1.5">Número de seguimiento</label>
              <input
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder="Ej. 1234567890"
                className={fieldCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink/50 mb-1.5">URL de seguimiento (opcional)</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={preview || 'https://…'}
              className={fieldCls}
            />
            {!url.trim() && preview && (
              <p className="mt-1.5 text-xs text-ink/40 break-all">Se generará automáticamente: {preview}</p>
            )}
          </div>

          {error && <p className="text-sm text-secondary">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className={primaryBtnCls}>
              {saving ? 'Guardando…' : 'Guardar seguimiento'}
            </button>
            {hasTracking && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-sm text-ink/40 hover:text-ink transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
