import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createPreorder } from '../api/preorders'
import type { Product, ProductVariant } from '../types/product'

interface Props {
  product: Product
  variant: ProductVariant | null
  onClose: () => void
}

// Talla legacy si existe, si no la combinación de atributos (p.ej. "Rojo / S")
function variantLabel(variant: ProductVariant | null): string | null {
  if (!variant) return null
  if (variant.size) return `Talla: ${variant.size}`
  const labels = variant.attribute_values.map(av => av.label)
  return labels.length > 0 ? labels.join(' / ') : null
}

export default function PreorderModal({ product, variant, onClose }: Props) {
  const { user } = useAuth()

  const [email, setEmail] = useState(user?.email ?? '')
  const [name,  setName]  = useState(user?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createPreorder({
        product_id: product.id,
        variant_id: variant?.id ?? undefined,
        email,
        name: name || undefined,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'No se pudo registrar la reserva. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full bg-transparent border-b border-ink/20 pb-2.5 pt-1 px-0 text-sm text-ink ' +
    'placeholder:text-ink/25 focus:outline-none focus:border-primary transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
      <div className="bg-canvas w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {success ? (
          <div className="text-center py-6">
            <p className="text-primary font-medium mb-2">¡Reserva registrada!</p>
            <p className="text-sm text-ink/60 mb-6">
              Te avisaremos en <span className="text-ink font-medium">{email}</span> cuando{' '}
              <span className="text-ink font-medium">{product.name}</span> vuelva a estar disponible.
            </p>
            <button
              onClick={onClose}
              className="text-sm text-ink/50 hover:text-primary transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-ink/50 uppercase tracking-widest mb-1">Reserva de lista de espera</p>
            <h2 className="text-lg font-bold text-ink mb-1">{product.name}</h2>
            {variantLabel(variant) ? (
              <p className="text-sm text-ink/50 mb-6">{variantLabel(variant)}</p>
            ) : (
              <div className="mb-6" />
            )}

            <p className="text-sm text-ink/60 mb-7 leading-relaxed">
              Apúntate a la lista de espera. No se realiza ningún cargo — solo guardamos tu interés y te
              avisamos cuando haya stock.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-ink/40 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className={inputCls}
                />
              </div>

              {!user && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-ink/40 mb-1">
                    Nombre (opcional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className={inputCls}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-secondary">{error}</p>
              )}

              <div className="h-px bg-primary w-full" />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-ink/40 hover:text-ink transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white text-sm tracking-wide px-6 py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando…' : 'Apuntarme'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
