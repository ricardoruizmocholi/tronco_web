import { useEffect, useState } from 'react'
import { addProductImage, createVariant, deleteProductImage, deleteVariant, updateVariant } from '../../api/products'
import {
  createAttribute, createAttributeValue, deleteAttribute, deleteAttributeValue,
} from '../../api/attributes'
import { uploadImage } from '../../api/upload'
import type {
  AttributeType, Category, Product, ProductAttribute, ProductFormData, ProductImage, ProductVariant,
} from '../../types/product'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

interface Props {
  product?: Product
  categories: Category[]
  onSave: (data: ProductFormData, pendingImageUrls?: string[]) => void
  onCancel: () => void
  saving: boolean
}

interface FormState {
  name: string
  description: string
  priceEuros: string
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
  const [form, setForm]     = useState<FormState>(product ? toFormState(product) : empty)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const [localImages, setLocalImages]     = useState<ProductImage[]>(product?.images ?? [])
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [newImgUrl, setNewImgUrl]         = useState('')
  const [imgSaving, setImgSaving]         = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [imgError, setImgError]           = useState<string | null>(null)

  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(product?.variants ?? [])
  const [newVarSelections, setNewVarSelections] = useState<Record<number, string>>({})
  const [newVarStock, setNewVarStock]           = useState('0')
  const [newVarPriceEuros, setNewVarPriceEuros] = useState('')
  const [newVarImageUrl, setNewVarImageUrl]     = useState('')
  const [varSaving, setVarSaving]               = useState(false)
  const [varError, setVarError]                 = useState<string | null>(null)

  // Atributos del producto (Color, Talla...)
  const [localAttributes, setLocalAttributes] = useState<ProductAttribute[]>(product?.attributes ?? [])
  const [attrModalOpen, setAttrModalOpen]     = useState(false)
  const [newAttrName, setNewAttrName]         = useState('')
  const [newAttrType, setNewAttrType]         = useState<AttributeType>('text')
  const [attrSaving, setAttrSaving]           = useState(false)
  const [attrError, setAttrError]             = useState<string | null>(null)

  const [valueModalAttrId, setValueModalAttrId] = useState<number | null>(null)
  const [newValueLabel, setNewValueLabel]       = useState('')
  const [newValueRaw, setNewValueRaw]           = useState('')
  const [valueSaving, setValueSaving]           = useState(false)
  const [valueError, setValueError]             = useState<string | null>(null)

  useEffect(() => {
    setForm(product ? toFormState(product) : empty)
    setErrors({})
    setLocalImages(product?.images ?? [])
    setPendingImages([])
    setNewImgUrl('')
    setImgError(null)
    setLocalVariants(product?.variants ?? [])
    setNewVarSelections({})
    setNewVarStock('0')
    setNewVarPriceEuros('')
    setNewVarImageUrl('')
    setVarError(null)
    setLocalAttributes(product?.attributes ?? [])
    setAttrModalOpen(false)
    setAttrError(null)
    setValueModalAttrId(null)
    setValueError(null)
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
    }, pendingImages)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgSaving(true)
    setUploading(true)
    setImgError(null)
    try {
      const url = await uploadImage(file)
      if (product) {
        const img = await addProductImage(product.id, { url })
        setLocalImages(prev => [...prev, img])
      } else {
        setPendingImages(prev => [...prev, url])
      }
    } catch {
      setImgError('No se pudo subir la imagen.')
    } finally {
      setImgSaving(false)
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleAddImage() {
    if (!newImgUrl.trim()) return
    if (product) {
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
    } else {
      setPendingImages(prev => [...prev, newImgUrl.trim()])
      setNewImgUrl('')
    }
  }

  async function handleAddVariant() {
    if (!product) return
    const stock = parseInt(newVarStock, 10)
    if (isNaN(stock) || stock < 0) return

    if (localAttributes.length > 0 && localAttributes.some(a => !newVarSelections[a.id])) {
      setVarError('Selecciona un valor para cada atributo.')
      return
    }

    setVarSaving(true)
    setVarError(null)
    try {
      const priceOverride = newVarPriceEuros.trim()
        ? Math.round(parseFloat(newVarPriceEuros) * 100)
        : null

      const v = await createVariant(product.id, {
        stock,
        price_override: isNaN(priceOverride as number) ? null : priceOverride,
        image_url: newVarImageUrl.trim() || null,
        attribute_value_ids: Object.values(newVarSelections).map(id => parseInt(id, 10)),
      })
      setLocalVariants(prev => [...prev, v])
      setNewVarSelections({})
      setNewVarStock('0')
      setNewVarPriceEuros('')
      setNewVarImageUrl('')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data
      const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
      setVarError(firstFieldError ?? data?.message ?? 'No se pudo añadir la variante.')
    } finally {
      setVarSaving(false)
    }
  }

  // --- Atributos ---

  async function handleCreateAttribute() {
    if (!product || !newAttrName.trim()) return
    setAttrSaving(true)
    setAttrError(null)
    try {
      const attr = await createAttribute(product.id, { name: newAttrName.trim(), type: newAttrType })
      setLocalAttributes(prev => [...prev, attr])
      setAttrModalOpen(false)
      setNewAttrName('')
      setNewAttrType('text')
    } catch {
      setAttrError('No se pudo crear el atributo.')
    } finally {
      setAttrSaving(false)
    }
  }

  async function handleDeleteAttribute(attr: ProductAttribute) {
    if (!window.confirm(`¿Eliminar el atributo "${attr.name}" y todos sus valores? Las variantes que lo usen perderán esa combinación.`)) return
    try {
      await deleteAttribute(attr.id)
      setLocalAttributes(prev => prev.filter(a => a.id !== attr.id))
      setLocalVariants(prev => prev.map(v => ({
        ...v,
        attribute_values: v.attribute_values.filter(av => av.attribute_id !== attr.id),
      })))
    } catch {
      setAttrError('No se pudo eliminar el atributo.')
    }
  }

  function openValueModal(attribute: ProductAttribute) {
    setValueModalAttrId(attribute.id)
    setNewValueLabel('')
    setNewValueRaw(attribute.type === 'color' ? '#5BBB2A' : '')
    setValueError(null)
  }

  async function handleCreateValue() {
    if (valueModalAttrId === null) return
    const attr = localAttributes.find(a => a.id === valueModalAttrId)
    if (!attr) return

    if (!newValueLabel.trim()) { setValueError('El label es obligatorio.'); return }
    if (attr.type === 'color' && !/^#[0-9A-Fa-f]{6}$/.test(newValueRaw)) {
      setValueError('El color debe ser un hex válido (#RRGGBB).')
      return
    }
    if (attr.type === 'text' && !newValueRaw.trim()) {
      setValueError('El valor es obligatorio.')
      return
    }

    setValueSaving(true)
    setValueError(null)
    try {
      const value = await createAttributeValue(attr.id, { value: newValueRaw.trim(), label: newValueLabel.trim() })
      setLocalAttributes(prev => prev.map(a => (a.id === attr.id ? { ...a, values: [...a.values, value] } : a)))
      setValueModalAttrId(null)
    } catch {
      setValueError('No se pudo añadir el valor.')
    } finally {
      setValueSaving(false)
    }
  }

  async function handleDeleteValue(attributeId: number, valueId: number, label: string) {
    if (!window.confirm(`¿Eliminar el valor "${label}"?`)) return
    try {
      await deleteAttributeValue(valueId)
      setLocalAttributes(prev => prev.map(a => (
        a.id === attributeId ? { ...a, values: a.values.filter(v => v.id !== valueId) } : a
      )))
    } catch {
      setAttrError('No se pudo eliminar el valor.')
    }
  }

  async function handleToggleVariant(v: ProductVariant) {
    if (!product) return
    try {
      const updated = await updateVariant(product.id, v.id, { is_active: !v.is_active })
      setLocalVariants(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    } catch {
      setVarError('No se pudo cambiar el estado de la variante.')
    }
  }

  async function handleDeleteVariant(v: ProductVariant) {
    if (!product) return
    try {
      await deleteVariant(product.id, v.id)
      setLocalVariants(prev => prev.filter(x => x.id !== v.id))
    } catch {
      setVarError('No se pudo eliminar la variante.')
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
    <>
    <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-ink text-base">
        {product ? 'Editar producto' : 'Nuevo producto'}
      </h2>

      {/* Nombre */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Nombre</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          className={inputCls('name')} placeholder="Camiseta Troncodrilo Classic" />
        {errors.name && <p className="text-xs text-secondary mt-1">{errors.name}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Descripción</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} className={inputCls('description')} placeholder="Descripción del producto…" />
        {errors.description && <p className="text-xs text-secondary mt-1">{errors.description}</p>}
      </div>

      {/* Precio y stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Precio (€)</label>
          <input type="number" step="0.01" min="0.01" value={form.priceEuros}
            onChange={e => set('priceEuros', e.target.value)}
            className={inputCls('priceEuros')} placeholder="24.99" />
          {errors.priceEuros && <p className="text-xs text-secondary mt-1">{errors.priceEuros}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Stock</label>
          <input type="number" min="0" value={form.stock}
            onChange={e => set('stock', e.target.value)} className={inputCls('stock')} />
          {errors.stock && <p className="text-xs text-secondary mt-1">{errors.stock}</p>}
        </div>
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Categoría</label>
        <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
          className={inputCls('category_id')}>
          <option value="">Sin categoría</option>
          {categories.map(cat => (
            <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* is_active — solo en edición */}
      {product && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-primary" />
          <span className="text-sm text-ink">Producto activo (visible en tienda)</span>
        </label>
      )}

      {/* Galería de imágenes — siempre visible */}
      <div>
        <label className="block text-xs font-medium text-ink/60 mb-2">
          Imágenes de galería
          {!product && pendingImages.length > 0 && (
            <span className="ml-1 font-normal text-primary">({pendingImages.length} por añadir)</span>
          )}
        </label>

        {imgError && <p className="text-xs text-secondary mb-2">{imgError}</p>}

        {/* Modo CREACIÓN: URLs pendientes */}
        {!product && (
          <div className="space-y-2 mb-3">
            {pendingImages.length === 0 ? (
              <p className="text-xs text-ink/30 italic">Se añadirán al crear el producto.</p>
            ) : (
              pendingImages.map((url, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-ink/10 bg-ink/[0.02]">
                  <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-primary/10">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <p className="flex-1 text-xs text-ink/60 truncate min-w-0">{url}</p>
                  <button type="button"
                    onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                    className="text-xs text-secondary hover:underline flex-shrink-0">
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modo EDICIÓN: imágenes guardadas */}
        {product && (
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
                <button type="button" onClick={() => handleDeleteImage(img)}
                  className="text-xs text-secondary hover:underline flex-shrink-0">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

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
          <button type="button" onClick={handleAddImage}
            disabled={imgSaving || !newImgUrl.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium
              hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            {imgSaving ? '…' : '+ Añadir'}
          </button>
        </div>
      </div>

      {/* Variantes — solo en edición */}
      {product && (
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-2">Variantes / Stock</label>

          {varError && <p className="text-xs text-secondary mb-2">{varError}</p>}

          <div className="space-y-1.5 mb-3">
            {localVariants.length === 0 && (
              <p className="text-xs text-ink/30 italic">
                Sin variantes definidas. El stock se gestiona en el campo de arriba.
              </p>
            )}
            {localVariants.map(v => {
              const label = v.size || v.attribute_values.map(av => av.label).join(' / ') || 'Variante única'
              return (
                <div key={v.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-ink/10 bg-ink/[0.02]">
                  <span className="w-28 text-sm font-medium text-ink truncate">{label}</span>
                  <span className="w-16 text-sm tabular-nums text-ink/70">{v.stock} uds.</span>
                  {v.price_override !== null && (
                    <span className="text-xs text-primary font-medium flex-shrink-0">
                      {euros.format(v.price_override / 100)}
                    </span>
                  )}
                  <span className={`flex-1 text-xs font-medium ${v.is_active ? 'text-primary' : 'text-ink/30'}`}>
                    {v.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  <button type="button" onClick={() => handleToggleVariant(v)}
                    className="text-xs px-2 py-0.5 rounded border border-ink/20 text-ink/50
                      hover:border-primary hover:text-primary transition-colors flex-shrink-0">
                    {v.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" onClick={() => handleDeleteVariant(v)}
                    className="text-xs text-secondary hover:underline flex-shrink-0">
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>

          {localAttributes.length === 0 ? (
            <p className="text-xs text-ink/30 italic mb-3">
              Define al menos un atributo (más abajo) para poder crear variantes por combinación.
              También puedes añadir una variante única sin atributos.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-3">
              {localAttributes.map(attr => (
                <div key={attr.id}>
                  <label className="block text-[11px] font-medium text-ink/50 mb-1">{attr.name}</label>
                  <select
                    value={newVarSelections[attr.id] ?? ''}
                    onChange={e => setNewVarSelections(prev => ({ ...prev, [attr.id]: e.target.value }))}
                    className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink bg-white
                      focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Selecciona {attr.name.toLowerCase()}…</option>
                    {attr.values.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number"
              min="0"
              value={newVarStock}
              onChange={e => setNewVarStock(e.target.value)}
              placeholder="Stock"
              className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink
                focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={newVarPriceEuros}
              onChange={e => setNewVarPriceEuros(e.target.value)}
              placeholder="Precio base del producto"
              className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink
                focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="mb-2">
            <label className="block text-[11px] font-medium text-ink/50 mb-1">
              Imagen de la variante (opcional)
            </label>
            {localImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {localImages.map(img => {
                  const isSelected = newVarImageUrl === img.url
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setNewVarImageUrl(prev => (prev === img.url ? '' : img.url))}
                      title={isSelected ? 'Quitar selección' : 'Usar esta imagen'}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                        isSelected ? 'border-primary' : 'border-transparent hover:border-ink/20'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            )}
            <input
              type="text"
              value={newVarImageUrl}
              onChange={e => setNewVarImageUrl(e.target.value)}
              placeholder="Primera imagen del producto — o pega una URL externa"
              className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink
                focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            disabled={varSaving}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium
              hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {varSaving ? '…' : '+ Añadir variante'}
          </button>
        </div>
      )}

      {/* Atributos del producto — solo en edición */}
      {product && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-ink/60">Atributos del producto</label>
            <button
              type="button"
              onClick={() => setAttrModalOpen(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              + Añadir atributo
            </button>
          </div>

          {attrError && <p className="text-xs text-secondary mb-2">{attrError}</p>}

          {localAttributes.length === 0 ? (
            <p className="text-xs text-ink/30 italic">Sin atributos definidos (p. ej. Color, Talla, Material…).</p>
          ) : (
            <div className="space-y-3">
              {localAttributes.map(attr => (
                <div key={attr.id} className="rounded-lg border border-ink/10 bg-ink/[0.02] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink">
                      {attr.name} <span className="text-xs text-ink/40 font-normal">({attr.type === 'color' ? 'color' : 'texto'})</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => openValueModal(attr)}
                        className="text-xs text-primary hover:underline font-medium">
                        + Añadir valor
                      </button>
                      <button type="button" onClick={() => handleDeleteAttribute(attr)}
                        className="text-xs text-secondary hover:underline">
                        Eliminar atributo
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.length === 0 && (
                      <p className="text-xs text-ink/30 italic">Sin valores todavía.</p>
                    )}
                    {attr.values.map(v => (
                      <span key={v.id}
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full
                          border border-ink/15 bg-white text-ink/70">
                        {attr.type === 'color' && (
                          <span className="w-3 h-3 rounded-full border border-ink/15 flex-shrink-0"
                            style={{ backgroundColor: v.value }} />
                        )}
                        {v.label}
                        <button type="button" onClick={() => handleDeleteValue(attr.id, v.id, v.label)}
                          className="text-secondary hover:text-secondary/70">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium
            hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 rounded-lg border border-ink/20 text-ink text-sm
            font-medium hover:border-ink/40 transition-colors">
          Cancelar
        </button>
      </div>
    </form>

    {/* Modal: nuevo atributo */}
    {attrModalOpen && (
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) setAttrModalOpen(false) }}
      >
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h3 className="font-semibold text-ink mb-4">Nuevo atributo</h3>

          <label className="block text-xs font-medium text-ink/60 mb-1">Nombre</label>
          <input
            type="text"
            value={newAttrName}
            onChange={e => setNewAttrName(e.target.value)}
            placeholder="Color, Talla, Material…"
            autoFocus
            className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink mb-3
              focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <label className="block text-xs font-medium text-ink/60 mb-1.5">Tipo</label>
          <div className="flex gap-4 mb-4">
            {(['text', 'color'] as AttributeType[]).map(type => (
              <label key={type} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="radio"
                  name="attr_type"
                  checked={newAttrType === type}
                  onChange={() => setNewAttrType(type)}
                  className="accent-primary"
                />
                {type === 'color' ? 'Color' : 'Texto'}
              </label>
            ))}
          </div>

          {attrError && <p className="text-xs text-secondary mb-3">{attrError}</p>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setAttrModalOpen(false)}
              className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleCreateAttribute} disabled={attrSaving || !newAttrName.trim()}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg
                hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium">
              {attrSaving ? 'Creando…' : 'Crear atributo'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal: nuevo valor de atributo */}
    {valueModalAttrId !== null && (() => {
      const attr = localAttributes.find(a => a.id === valueModalAttrId)
      if (!attr) return null
      return (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setValueModalAttrId(null) }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-ink mb-4">Nuevo valor — {attr.name}</h3>

            <label className="block text-xs font-medium text-ink/60 mb-1">Label</label>
            <input
              type="text"
              value={newValueLabel}
              onChange={e => setNewValueLabel(e.target.value)}
              placeholder={attr.type === 'color' ? 'Rojo' : 'S'}
              autoFocus
              className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink mb-3
                focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {attr.type === 'color' ? (
              <>
                <label className="block text-xs font-medium text-ink/60 mb-1">Color</label>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(newValueRaw) ? newValueRaw : '#5BBB2A'}
                    onChange={e => setNewValueRaw(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-ink/20 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newValueRaw}
                    onChange={e => setNewValueRaw(e.target.value)}
                    placeholder="#FF0000"
                    className="flex-1 rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink
                      focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </>
            ) : (
              <>
                <label className="block text-xs font-medium text-ink/60 mb-1">Valor</label>
                <input
                  type="text"
                  value={newValueRaw}
                  onChange={e => setNewValueRaw(e.target.value)}
                  placeholder="S"
                  className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink mb-4
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </>
            )}

            {valueError && <p className="text-xs text-secondary mb-3">{valueError}</p>}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setValueModalAttrId(null)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleCreateValue} disabled={valueSaving}
                className="px-4 py-2 bg-primary text-white text-sm rounded-lg
                  hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium">
                {valueSaving ? 'Añadiendo…' : 'Añadir valor'}
              </button>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}
