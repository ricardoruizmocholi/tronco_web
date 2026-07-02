import { useEffect, useState } from 'react'
import type { Category, Product, ProductFormData } from '../../types/product'

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

  // Re-inicializar si cambia el producto seleccionado
  useEffect(() => {
    setForm(product ? toFormState(product) : empty)
    setErrors({})
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
