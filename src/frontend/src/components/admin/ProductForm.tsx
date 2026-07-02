import { useEffect, useState } from 'react'
import { addProductImage, deleteProductImage } from '../../api/products'
import { uploadImage } from '../../api/upload'
import type { Category, Product, ProductFormData, ProductImage } from '../../types/product'

interface Props {
  product?: Product          // undefined = crear, definido = editar
  categories: Category[]
  onSave: (data: ProductFormData) => void
  onCancel: () => void
  saving: boolean
}

interface FormState {
  name: string
  description: string
  priceEuros: string         // input en euros, se convierte a céntimos al enviar
  stock: string
  category_id: string
  is_active: boolean
}

const empty: FormState = {
  name: '',
  description: '',
  priceEuros: '',
  stock: '0',
  category_id: '',
  is_active: true,
}

function toFormState(p: Product): FormState {
  return {
    name:        p.name,
    description: p.description,
    priceEuros:  (p.price / 100).toFixed(2),
    stock:       String(p.stock),
    category_id: p.category_id ? String(p.category_id) : '',
    is_active:   p.is_active,
  }
}

export default function ProductForm({ product, categories, onSave, onCancel, saving }: Props) {
  const [form, setForm] = useState<FormState>(product ? toFormState(product) : empty)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Galería de imágenes
  const [localImages, setLocalImages]     = useState<ProductImage[]>(product?.images ?? [])
  const [newImgUrl, setNewImgUrl]         = useState('')
  const [imgSaving, setImgSaving]         = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [imgError, setImgError]           = useState<string | null>(null)

  // Re-inicializar si cambia el producto seleccionado
  useEffect(() => {
    setForm(product ? toFormState(product) : empty)
    setErrors({})
    setLocalImages(product?.images ?? [])
    setNewImgUrl('')
    setImgError(null)
  }, [product])

  function set(field: keyof FormState, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim())        e.name        = 'El nombre es obligatorio.'
    if (!form.description.trim()) e.description = 'La descripción es obligatoria.'
    const price = parseFloat(form.priceEuros)
    if (isNaN(price) || price <= 0) e.priceEuros = 'Introduce un precio válido mayor que 0.'
    const stock = parseInt(form.stock, 10)
    if (isNaN(stock) || stock < 0)  e.stock      = 'El stock no puede ser negativo.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (!validate()) return
    onSave({
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       Math.round(parseFloat(form.priceEuros) * 100),
      stock:       parseInt(form.stock, 10),
      category_id: form.category_id ? parseInt(form.category_id, 10) : null,
      is_active:   form.is_active,
    })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!product || !file) return
    setImgSaving(true)
    setUploading(true)
    setImgError(null)
    try {
      const url = await uploadImage(file)
      const img = await addProductImage(product.id, { url })
      setLocalImages(prev => [...prev, img])
    } catch {
      setImgError('No se pudo subir la imagen.')
    } finally {
      setImgSaving(false)
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleAddImage() {
    if (!product || !newImgUrl.trim()) return
    setImgSaving(true)
    setImgError(null)
    try {
      const img = await addProductImage(product.id, { url: newImgUrl.trim() })
      setLocalImages(prev => [...prev, img])
      setNewImgUrl('')
    } catch {
      setImgError('No se pudo añadir la imagen.')
    } finally {
      setImgSaving(false)
    }
  }

  async function handleDeleteImage(img: ProductImage) {
    if (!product) return
    try {
      await deleteProductImage(product.id, img.id)
      setLocalImages(prev => prev.filter(i => i.id !== img.id))
    } catch {
      setImgError('No se pudo eliminar la imagen.')
    }
  }

  const inputCls = (field: keyof FormState) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      errors[field] ? 'border-secondary' : 'border-ink/20'
    }`

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-ink text-base">
        {product ? 'Editar producto' : 'Nuevo producto'}
      </h2>

      {/* Nombre */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Nombre</label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          className={inputCls('name')}
          placeholder="Camiseta Troncodrilo Classic"
        />
        {errors.name && <p className="text-xs text-secondary mt-1">{errors.name}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Descripción</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={3}
          className={inputCls('description')}
          placeholder="Descripción del producto…"
        />
        {errors.description && <p className="text-xs text-secondary mt-1">{errors.description}</p>}
      </div>

      {/* Precio y stock en fila */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Precio (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.priceEuros}
            onChange={e => set('priceEuros', e.target.value)}
            className={inputCls('priceEuros')}
            placeholder="24.99"
          />
          {errors.priceEuros && <p className="text-xs text-secondary mt-1">{errors.priceEuros}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Stock</label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={e => set('stock', e.target.value)}
            className={inputCls('stock')}
          />
          {errors.stock && <p className="text-xs text-secondary mt-1">{errors.stock}</p>}
        </div>
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Categoría</label>
        <select
          value={form.category_id}
          onChange={e => set('category_id', e.target.value)}
          className={inputCls('category_id')}
        >
          <option value="">Sin categoría</option>
          {categories.map(cat => (
            <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* is_active — solo en edición */}
      {product && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm text-ink">Producto activo (visible en tienda)</span>
        </label>
      )}

      {/* Galería de imágenes — solo en modo edición */}
      {product && (
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-2">Imágenes de galería</label>
          {imgError && (
            <p className="text-xs text-secondary mb-2">{imgError}</p>
          )}
          <div className="space-y-2 mb-3">
            {localImages.length === 0 && (
              <p className="text-xs text-ink/30 italic">Sin imágenes todavía.</p>
            )}
            {localImages.map(img => (
              <div key={img.id} className="flex items-center gap-3 p-2 rounded-lg border border-ink/10 bg-ink/[0.02]">
                <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-primary/10">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="flex-1 text-xs text-ink/60 truncate min-w-0">{img.url}</p>
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

          {/* Añadir por URL */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink
                focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={newImgUrl}
              onChange={e => setNewImgUrl(e.target.value)}
              placeholder="O pega una URL de imagen"
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
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg border border-ink/20 text-ink text-sm font-medium hover:border-ink/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
