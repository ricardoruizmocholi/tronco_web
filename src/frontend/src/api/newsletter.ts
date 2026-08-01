import api from '../lib/axios'
import type { PaginatedSubscribers } from '../types/newsletter'

export interface SubscribePayload {
  email: string
  name?: string
}

export function subscribeNewsletter(payload: SubscribePayload): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/newsletter/subscribe', payload).then(r => r.data)
}

export function getSubscribers(page = 1): Promise<PaginatedSubscribers> {
  return api.get<PaginatedSubscribers>('/api/admin/newsletter/subscribers', { params: { page } }).then(r => r.data)
}

export function exportSubscribers(): Promise<Blob> {
  return api
    .get('/api/admin/newsletter/export', { responseType: 'blob' })
    .then(r => r.data as Blob)
}
