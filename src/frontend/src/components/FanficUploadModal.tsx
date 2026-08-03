import { useEffect, useRef, useState } from 'react'
import { createFanfic, getMyFanfic, updateFanfic } from '../api/fanfics'
import { uploadImage } from '../api/upload'
import type { Fanfic, FanficFormData, FanficStatus } from '../types/fanfic'

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

interface Props {
  onClose: () => void
  onSuccess: (fanfic: Fanfic) => void
}

const STATUS_UI: Record<FanficStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending:  { label: 'En revisión', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-500' },
  approved: { label: 'Aprobado',    dot: 'bg-primary',   bg: 'bg-primary/10',   text: 'text-primary'   },
  rejected: { label: 'Rechazado',   dot: 'bg-secondary', bg: 'bg-secondary/10', text: 'text-secondary' },
}

// Modal equivalente a MiFanficPage.tsx (misma lógica: imagen + geocoding Nominatim +
// crear/editar) pero en formato overlay para usarse desde el panel del mapa.
// MiFanficPage.tsx no se modifica — este componente es una adaptación independiente.
export default function FanficUploadModal({ onClose, onSuccess }: Props) {
  const [fanfic, setFanfic]                   = useState<Fanfic | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [uploading, setUploading]             = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [success, setSuccess]                 = useState(false)
  const [cityQuery, setCityQuery]             = useState('')
  const [citySuggestions, setCitySuggestions] = useState<NominatimResult[]>([])
  const [searchingCity, setSearchingCity]     = useState(false)
  const debounceRef                           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef                          = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FanficFormData>({
    image_url: '',
    caption:   '',
    city_name: '',
    latitude:  40.4168,
    longitude: -3.7038,
  })

  useEffect(() => {
    getMyFanfic()
      .then(f => {
        setFanfic(f)
        setCityQuery(f.city_name)
        setForm({
          image_url: f.image_url,
          caption:   f.caption ?? '',
          city_name: f.city_name,
          latitude:  f.latitude,
          longitude: f.longitude,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Debounce Nominatim — respeta el límite de uso de la API pública (1 req/s)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (cityQuery.length < 3) { setCitySuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearchingCity(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'es', 'User-Agent': 'TroncodriloApp/1.0' } }
        )
        setCitySuggestions(await res.json())
      } catch {
        setCitySuggestions([])
      } finally {
        setSearchingCity(false)
      }
    }, 400)
  }, [cityQuery])

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, image_url: url }))
    } catch {
      setError('Error al subir la imagen. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function selectCity(result: NominatimResult) {
    const name = result.display_name.split(',')[0].trim()
    setCityQuery(result.display_name)
    setCitySuggestions([])
    setForm(f => ({
      ...f,
      city_name: name,
      latitude:  parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.image_url) { setError('Debes subir una imagen.'); return }
    if (!form.city_name) { setError('Debes seleccionar una ciudad.'); return }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const saved = fanfic
        ? await updateFanfic(fanfic.id, form)
        : await createFanfic(form)
      setFanfic(saved)
      setSuccess(true)
      onSuccess(saved)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message ?? 'Error al guardar.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const status   = fanfic?.status as FanficStatus | undefined
  const statusUI = status ? STATUS_UI[status] : null

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-canvas border border-ink/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="font-editorial text-xl text-ink">
            {fanfic ? 'Mi fanfic' : 'Sube tu fanfic'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 -mt-1 -mr-1 text-ink/40 hover:text-ink transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-ink/50 text-sm mb-6">
              {fanfic
                ? 'Edita tu imagen. Al guardar vuelve a revisión.'
                : 'Sube una imagen geolocalizada de Troncodrilo.'}
            </p>

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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Imagen */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Imagen</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer rounded-2xl border-2 border-dashed border-ink/15
                    hover:border-primary/40 transition-colors overflow-hidden bg-ink/[0.02]
                    flex items-center justify-center"
                  style={{ minHeight: 160 }}
                >
                  {form.image_url ? (
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-full object-cover max-h-56 rounded-2xl"
                    />
                  ) : (
                    <div className="text-center p-6 pointer-events-none">
                      {uploading
                        ? <div className="w-7 h-7 border-2 border-primary border-t-transparent
                            rounded-full animate-spin mx-auto" />
                        : <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                              className="w-8 h-8 text-ink/20 mx-auto mb-2">
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775
                                   5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.076 11.095H6.75z" />
                            </svg>
                            <p className="text-sm text-ink/40">Haz clic para subir una imagen</p>
                            <p className="text-xs text-ink/25 mt-1">JPG, PNG o WebP · máx. 10 MB</p>
                          </>
                      }
                    </div>
                  )}
                  {form.image_url && uploading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {form.image_url && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs text-ink/40 hover:text-ink transition-colors"
                  >
                    Cambiar imagen
                  </button>
                )}
              </div>

              {/* Ciudad con geocoding Nominatim */}
              <div className="relative">
                <label className="block text-sm font-medium text-ink mb-1.5">Ciudad</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setForm(f => ({ ...f, city_name: '' })) }}
                    required
                    placeholder="Ej: Madrid, Tokyo, Buenos Aires..."
                    className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm
                      text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  />
                  {searchingCity && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {citySuggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white border border-ink/10 rounded-xl
                    shadow-lg overflow-hidden divide-y divide-ink/5 max-h-48 overflow-y-auto">
                    {citySuggestions.map((r, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => selectCity(r)}
                          className="w-full text-left px-4 py-2.5 text-sm text-ink
                            hover:bg-primary/5 transition-colors truncate"
                        >
                          {r.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.city_name && (
                  <p className="mt-1.5 text-xs text-ink/40 font-mono">
                    {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Caption <span className="text-ink/30 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  maxLength={500}
                  rows={2}
                  placeholder="Una frase sobre tu imagen..."
                  className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm
                    text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <p className="mt-1 text-xs text-ink/30 text-right">{form.caption.length}/500</p>
              </div>

              {error   && <p className="text-sm text-secondary bg-secondary/10 rounded-xl px-4 py-3">{error}</p>}
              {success && <p className="text-sm text-primary bg-primary/10 rounded-xl px-4 py-3">¡Fanfic guardado! Queda pendiente de revisión.</p>}

              <button
                type="submit"
                disabled={saving || uploading}
                className="w-full bg-primary text-white font-medium py-3 rounded-xl
                  hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : fanfic ? 'Guardar cambios' : 'Enviar fanfic'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
