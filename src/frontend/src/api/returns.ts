import api from '../lib/axios'
import type {
  AdminReturnsFilters,
  PaginatedAdminReturns,
  ReturnRequest,
} from '../types/returnRequest'

export interface CreateReturnItemPayload {
  order_item_id: number
  quantity: number
}

export interface CreateReturnPayload {
  reason: string
  description?: string
  image: File
  items?: CreateReturnItemPayload[]
}

export function createReturnRequest(orderId: number, payload: CreateReturnPayload): Promise<ReturnRequest> {
  const form = new FormData()
  form.append('reason', payload.reason)
  if (payload.description) form.append('description', payload.description)
  form.append('image', payload.image)
  payload.items?.forEach((item, i) => {
    form.append(`items[${i}][order_item_id]`, String(item.order_item_id))
    form.append(`items[${i}][quantity]`, String(item.quantity))
  })
  return api.post<ReturnRequest>(`/api/orders/${orderId}/return`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export function getUserReturns(): Promise<ReturnRequest[]> {
  return api.get<ReturnRequest[]>('/api/user/returns').then(r => r.data)
}

export function getAdminReturns(
  filters: AdminReturnsFilters = {},
  page = 1,
): Promise<PaginatedAdminReturns> {
  const q = new URLSearchParams()
  q.set('page', String(page))
  if (filters.status)     q.set('status',     filters.status)
  if (filters.user_email) q.set('user_email', filters.user_email)
  if (filters.date_from)  q.set('date_from',  filters.date_from)
  if (filters.date_to)    q.set('date_to',    filters.date_to)
  return api.get<PaginatedAdminReturns>(`/api/admin/returns?${q}`).then(r => r.data)
}

export function getAdminReturn(id: number): Promise<ReturnRequest> {
  return api.get<ReturnRequest>(`/api/admin/returns/${id}`).then(r => r.data)
}

export function approveReturn(id: number): Promise<{ status: string }> {
  return api.put<{ status: string }>(`/api/admin/returns/${id}/approve`).then(r => r.data)
}

export function rejectReturn(id: number, admin_notes: string): Promise<{ status: string }> {
  return api.put<{ status: string }>(`/api/admin/returns/${id}/reject`, { admin_notes }).then(r => r.data)
}

export function confirmReturnReceived(id: number, refund_amount?: number): Promise<{ status: string; stripe_refund: string; refund_amount: number }> {
  return api.put(`/api/admin/returns/${id}/receive`, { refund_amount }).then(r => r.data)
}

export function getPendingReturnsCount(): Promise<number> {
  return api.get<{ count: number }>('/api/admin/returns/pending-count').then(r => r.data.count)
}

export function exportReturns(filters: AdminReturnsFilters = {}): Promise<Blob> {
  const q = new URLSearchParams()
  if (filters.status)     q.set('status',     filters.status)
  if (filters.user_email) q.set('user_email', filters.user_email)
  if (filters.date_from)  q.set('date_from',  filters.date_from)
  if (filters.date_to)    q.set('date_to',    filters.date_to)

  return api
    .get(`/api/admin/returns/export?${q}`, { responseType: 'blob' })
    .then(r => r.data)
}

export interface ReturnTrackingPayload {
  return_tracking_number: string
  return_tracking_url: string
  return_carrier: string
}

export function updateReturnTracking(id: number, payload: ReturnTrackingPayload): Promise<ReturnRequest> {
  return api.put<ReturnRequest>(`/api/admin/returns/${id}/tracking`, payload).then(r => r.data)
}
