import api from '../lib/axios'
import type { Invoice, InvoiceFilters, PaginatedInvoices } from '../types/invoice'

function buildParams(filters: InvoiceFilters, page = 1): URLSearchParams {
  const q = new URLSearchParams()
  q.set('page', String(page))
  if (filters.date_from) q.set('date_from', filters.date_from)
  if (filters.date_to)   q.set('date_to',   filters.date_to)
  if (filters.search)    q.set('search',    filters.search)
  return q
}

export function getAdminInvoices(
  filters: InvoiceFilters = {},
  page = 1,
): Promise<PaginatedInvoices> {
  return api
    .get<PaginatedInvoices>(`/api/admin/invoices?${buildParams(filters, page)}`)
    .then(r => r.data)
}

export function getAdminInvoice(id: number): Promise<Invoice> {
  return api.get<Invoice>(`/api/admin/invoices/${id}`).then(r => r.data)
}

export function downloadAdminInvoice(id: number): Promise<Blob> {
  return api
    .get(`/api/admin/invoices/${id}/download`, { responseType: 'blob' })
    .then(r => r.data)
}
