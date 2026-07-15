import api from '../lib/axios'

export interface CreatePreorderPayload {
  product_id: number
  variant_id?: number
  email: string
  name?: string
}

export interface Preorder {
  id: number
  user_id: number | null
  product_id: number
  variant_id: number | null
  email: string
  name: string | null
  status: 'pending' | 'notified' | 'converted'
  created_at: string
  product?: { id: number; name: string; slug: string }
  variant?: { id: number; size: string } | null
  user?: { id: number; name: string } | null
}

export interface PreorderStats {
  total: number
  pending: number
  notified: number
  converted: number
  top_product: { name: string; total: number } | null
}

export interface PaginatedPreorders {
  data: Preorder[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export interface AdminPreordersFilters {
  product_id?: number
  status?: string
  email?: string
  date_from?: string
  date_to?: string
  page?: number
}

export function createPreorder(payload: CreatePreorderPayload): Promise<Preorder> {
  return api.post<Preorder>('/api/preorders', payload).then(r => r.data)
}

export function getAdminPreorders(filters: AdminPreordersFilters = {}): Promise<PaginatedPreorders> {
  return api.get<PaginatedPreorders>('/api/admin/preorders', { params: filters }).then(r => r.data)
}

export function getPreorderStats(): Promise<PreorderStats> {
  return api.get<PreorderStats>('/api/admin/preorders/stats').then(r => r.data)
}

export function notifyPreorder(id: number): Promise<Preorder> {
  return api.patch<Preorder>(`/api/admin/preorders/${id}/notify`).then(r => r.data)
}

export function exportPreorders(filters: AdminPreordersFilters = {}): Promise<Blob> {
  return api
    .get('/api/admin/preorders/export', { params: filters, responseType: 'blob' })
    .then(r => r.data as Blob)
}
