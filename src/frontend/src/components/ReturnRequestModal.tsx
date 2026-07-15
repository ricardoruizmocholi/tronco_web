import { useRef, useState } from 'react'
import { createReturnRequest } from '../api/returns'
import type { Order } from '../types/order'

const REASONS = [
  { value: 'defectuoso',    label: 'Producto defectuoso o dañado' },
  { value: 'no_corresponde', label: 'No corresponde al pedido' },
  { value: 'desistimiento', label: 'Desistimiento (14 días legales)' },
  { value: 'otro',          label: 'Otro motivo' },
]

interface Props {
  order: Order
  onClose: () => void
  onRequested: (orderId: number) => void
}

export default function ReturnRequestModal({ order, onClose, onRequested }: Props) {
  const [reason, setReason]           = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage]             = useState<File | null>(null)
  const [preview, setPreview]         = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImage(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!image) { setError('La imagen del producto es obligatoria.'); return }
    if (!reason) { setError('Selecciona un motivo.'); return }

    setLoading(true)
    setError(null)
    try {
      await createReturnRequest(order.id, { reason, description: description || undefined, image })
      setSuccess(true)
      onRequested(order.id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const selectCls =
    'w-full bg-transparent border-b border-ink/20 pb-2.5 pt-1 px-0 text-sm text-ink ' +
    'focus:outline-none focus:border-primary transition-colors appearance-none'

  const textareaCls =
    'w-full bg-transparent border border-ink/20 p-3 text-sm text-ink ' +
    'placeholder:text-ink/25 focus:outline-none focus:border-primary transition-colors resize-none'

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
        <div className="bg-canvas w-full max-w-md p-8 relative text-center">
          <p className="text-primary font-medium mb-2">¡Solicitud enviada!</p>
          <p className="text-sm text-ink/60 mb-6 leading-relaxed">
            Hemos recibido tu solicitud de devolución para el pedido #{order.id}. El equipo la revisará
            en breve y te informaremos del resultado.
          </p>
          <button
            onClick={onClose}
            className="text-sm text-ink/50 hover:text-primary transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 overflow-y-auto">
      <div className="bg-canvas w-full max-w-md p-8 relative my-4">
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="text-xs font-medium text-ink/50 uppercase tracking-widest mb-1">Solicitud de devolución</p>
        <h2 className="text-lg font-bold text-ink mb-6">Pedido #{order.id}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivo */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-ink/40 mb-2">
              Motivo <span className="text-secondary">*</span>
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              className={selectCls}
            >
              <option value="" disabled>Selecciona un motivo…</option>
              {REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-ink/40 mb-2">
              Foto del producto <span className="text-secondary">*</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
              id="return-image"
            />
            <label
              htmlFor="return-image"
              className="block w-full border border-dashed border-ink/25 p-4 text-center cursor-pointer
                hover:border-primary/50 transition-colors"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Vista previa"
                  className="mx-auto max-h-36 object-contain"
                />
              ) : (
                <span className="text-sm text-ink/40">
                  Haz clic para adjuntar una imagen del producto
                </span>
              )}
            </label>
            {preview && (
              <button
                type="button"
                onClick={() => { setImage(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                className="mt-1 text-xs text-ink/40 hover:text-secondary transition-colors"
              >
                Eliminar imagen
              </button>
            )}
          </div>

          {/* Descripción opcional */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-ink/40 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe el problema o motivo con más detalle…"
              rows={3}
              maxLength={1000}
              className={textareaCls}
            />
          </div>

          {reason === 'desistimiento' && (
            <div className="border border-ink/10 bg-ink/[0.03] p-4">
              <p className="text-xs text-ink/60 leading-relaxed">
                Tienes derecho de desistimiento durante <strong>14 días naturales</strong> desde la
                recepción del pedido (LGDCU, RD 1/2007). El reembolso incluirá el coste de envío original.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-secondary">{error}</p>
          )}

          <div className="h-px bg-ink/10 w-full" />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-sm text-ink/40 hover:text-ink transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white text-sm tracking-wide px-6 py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
