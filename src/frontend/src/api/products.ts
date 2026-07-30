import api from '../lib/axios'
import type { Category, PaginatedProducts, Product, ProductFormData, ProductImage, ProductVariant } from '../types/product'

export function getProducts(categorySlug?: string, page = 1): Promise<PaginatedProducts> {
  const params: Record<string, string | number> = { page }
  if (categorySlug) params.category = categorySlug
  return api.get<PaginatedProducts>('/api/products', { params }).then(r => r.data)
}

export function getProduct(slug: string): Promise<Product> {
  return api.get<Product>(`/api/products/${slug}`).then(r => r.data)
}

export function getCategories(): Promise<Category[]> {
  return api.get<Category[]>('/api/categories').then(r => r.data)
}

// --- Admin ---

export function getAdminProducts(): Promise<Product[]> {
  return api.get<Product[]>('/api/admin/products').then(r => r.data)
}

export function createProduct(data: ProductFormData): Promise<Product> {
  return api.post<Product>('/api/admin/products', data).then(r => r.data)
}

export function updateProduct(id: number, data: ProductFormData): Promise<Product> {
  return api.put<Product>(`/api/admin/products/${id}`, data).then(r => r.data)
}

export function toggleProduct(id: number): Promise<Product> {
  return api.patch<Product>(`/api/admin/products/${id}/toggle`).then(r => r.data)
}

export function togglePreorder(id: number): Promise<Product> {
  return api.patch<Product>(`/api/admin/products/${id}/toggle-preorder`).then(r => r.data)
}

export function deleteProduct(id: number): Promise<void> {
  return api.delete(`/api/admin/products/${id}/permanent`).then(() => undefined)
}

export function addProductImage(productId: number, data: { url: string }): Promise<ProductImage> {
  return api.post<ProductImage>(`/api/admin/products/${productId}/images`, data).then(r => r.data)
}

export function deleteProductImage(productId: number, imageId: number): Promise<void> {
  return api.delete(`/api/admin/products/${productId}/images/${imageId}`).then(() => undefined)
}

export interface VariantPayload {
  size?: string | null // legacy — omitir en variantes nuevas basadas en atributos
  stock: number
  is_active?: boolean
  price_override?: number | null
  image_url?: string | null
  attribute_value_ids?: number[]
}

export function createVariant(productId: number, data: VariantPayload): Promise<ProductVariant> {
  return api.post<ProductVariant>(`/api/admin/products/${productId}/variants`, data).then(r => r.data)
}

export function updateVariant(productId: number, variantId: number, data: Partial<VariantPayload>): Promise<ProductVariant> {
  return api.put<ProductVariant>(`/api/admin/products/${productId}/variants/${variantId}`, data).then(r => r.data)
}

export function deleteVariant(productId: number, variantId: number): Promise<void> {
  return api.delete(`/api/admin/products/${productId}/variants/${variantId}`).then(() => undefined)
}
