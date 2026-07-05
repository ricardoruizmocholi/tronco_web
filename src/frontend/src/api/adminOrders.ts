import api from '../lib/axios'
import type {
  AdminOrderDetail,
  AdminOrdersFilters,
  OrderStats,
  PaginatedAdminOrders,
} from '../types/adminOrder'

function buildParams(filters: AdminOrdersFilters, page = 1): URLSearchParams {
  const q = new URLSearchParams()
  q.set('page', String(page))
  if (filters.status)     q.set('status',     filters.status)
  if (filters.date_from)  q.set('date_from',  filters.date_from)
  if (filters.date_to)    q.set('date_to',    filters.date_to)
  if (filters.user_email) q.set('user_email', filters.user_email)
  if (filters.min_amount) q.set('min_amount', filters.min_amount)
  if (filters.max_amount) q.set('max_amount', filters.max_amount)
  return q
}

export function getAdminOrders(
  filters: AdminOrdersFilters = {},
  page = 1,
): Promise<PaginatedAdminOrders> {
  return api
    .get<PaginatedAdminOrders>(`/api/admin/orders?${buildParams(filters, page)}`)
    .then(r => r.data)
}

export function getAdminOrder(id: number): Promise<AdminOrderDetail> {
  return api.get<AdminOrderDetail>(`/api/admin/orders/${id}`).then(r => r.data)
}

export function updateOrderStatus(
  id: number,
  status: string,
): Promise<{ id: number; status: string }> {
  return api.put(`/api/admin/orders/${id}/status`, { status }).then(r => r.data)
}

export function getOrderStats(): Promise<OrderStats> {
  return api.get<OrderStats>('/api/admin/orders/stats').then(r => r.data)
}

export function getPendingCount(): Promise<number> {
  return api
    .get<{ count: number }>('/api/admin/orders/pending-count')
    .then(r => r.data.count)
}

export function exportOrders(filters: AdminOrdersFilters = {}): Promise<Blob> {
  const q = new URLSearchParams()
  if (filters.status)     q.set('status',     filters.status)
  if (filters.date_from)  q.set('date_from',  filters.date_from)
  if (filters.date_to)    q.set('date_to',    filters.date_to)
  if (filters.user_email) q.set('user_email', filters.user_email)
  if (filters.min_amount) q.set('min_amount', filters.min_amount)
  if (filters.max_amount) q.set('max_amount', filters.max_amount)

  return api
    .get(`/api/admin/orders/export?${q}`, { responseType: 'blob' })
    .then(r => r.data)
}
