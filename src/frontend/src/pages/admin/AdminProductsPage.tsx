import { useEffect, useState } from 'react'
import {
  addProductImage,
  createProduct,
  deleteProduct,
  getAdminProducts,
  getCategories,
  toggleProduct,
  togglePreorder,
  updateProduct,
} from '../../api/products'
import { getAdminArtists } from '../../api/artists'
import ProductForm from '../../components/admin/ProductForm'
import type { Category, Product, ProductFormData } from '../../types/product'
import type { Artist } from '../../types/artist'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

type FormMode = { type: 'create' } | { type: 'edit'; product: Product } | null

export default function AdminProductsPage() {
  const [products, setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [artists, setArtists]     = useState<Artist[]>([])
  const [loading, setLoading]     = useState(true)
  const [formMode, setFormMode]   = useState<FormMode>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  function loadProducts() {
    return getAdminProducts().then(setProducts)
  }

  useEffect(() => {
    Promise.all([loadProducts(), getCategories().then(setCategories), getAdminArtists().then(setArtists)])
      .catch(() => setError('Error al cargar los productos.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(data: ProductFormData, pendingImageUrls: string[] = []) {
    setSaving(true)
    setError(null)
    try {
      if (formMode?.type === 'edit') {
        const updated = await updateProduct(formMode.product.id, data)
        setProducts(ps => ps.map(p => (p.id === updated.id ? updated : p)))
      } else {
        const created = await createProduct(data)
        for (const url of pendingImageUrls) {
          await addProductImage(created.id, { url })
        }
        setProducts(ps => [...ps, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setFormMode(null)
    } catch {
      setError('No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(product: Product) {
    try {
      const updated = await toggleProduct(product.id)
      setProducts(ps => ps.map(p => (p.id === updated.id ? updated : p)))
    } catch {
      setError('No se pudo cambiar el estado del producto.')
    }
  }

  async function handleTogglePreorder(product: Product) {
    try {
      const updated = await togglePreorder(product.id)
      setProducts(ps => ps.map(p => (p.id === updated.id ? updated : p)))
    } catch {
      setError('No se pudo cambiar el estado de preorder.')
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`¿Eliminar "${product.name}" permanentemente? Esta acción no se puede deshacer.`)) return
    try {
      await deleteProduct(product.id)
      setProducts(ps => ps.filter(p => p.id !== product.id))
    } catch {
      setError('No se pudo eliminar el producto.')
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-dark text-white py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de productos</h1>
            <p className="text-white/60 text-sm mt-1">Gestión del catálogo de Troncodrilo</p>
          </div>
          <button
            onClick={() => setFormMode({ type: 'create' })}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Nuevo producto
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Error global */}
        {error && (
          <div className="rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-sm px-4 py-3">
            {error}
          </div>
        )}

        {/* Formulario create/edit */}
        {formMode && (
          <ProductForm
            product={formMode.type === 'edit' ? formMode.product : undefined}
            categories={categories}
            artists={artists}
            onSave={handleSave}
            onCancel={() => { setFormMode(null); setError(null) }}
            saving={saving}
          />
        )}

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-20 text-ink/50 text-sm">Cargando productos…</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink/10">
            <table className="w-full text-sm">
              <thead className="bg-ink/5 text-ink/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-right">Precio</th>
                  <th className="px-4 py-3 font-medium text-right">Stock</th>
                  <th className="px-4 py-3 font-medium text-center">Estado</th>
                  <th className="px-4 py-3 font-medium text-center">Preorder</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-ink/40">
                      No hay productos aún.
                    </td>
                  </tr>
                )}
                {products.map(product => (
                  <tr
                    key={product.id}
                    className={`bg-white hover:bg-ink/[0.02] transition-colors ${
                      !product.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-ink max-w-[220px] truncate">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {product.category?.name ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {euros.format(product.price / 100)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {product.stock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.is_active ? (
                        <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-ink/10 text-ink/50 text-xs font-medium px-2.5 py-0.5">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleTogglePreorder(product)}
                        title={product.allow_preorder ? 'Desactivar preorder' : 'Activar preorder'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                          product.allow_preorder
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-ink/20 text-ink/30 hover:border-ink/40'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setFormMode({ type: 'edit', product })}
                          className="text-xs px-3 py-1 rounded border border-ink/20 text-ink hover:border-primary hover:text-primary transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(product)}
                          className={`text-xs px-3 py-1 rounded border transition-colors ${
                            product.is_active
                              ? 'border-secondary/40 text-secondary hover:bg-secondary/10'
                              : 'border-primary/40 text-primary hover:bg-primary/10'
                          }`}
                        >
                          {product.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-xs px-3 py-1 rounded border border-secondary/40
                            text-secondary hover:bg-secondary/10 transition-colors"
                        >
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
      </main>
    </div>
  )
}
