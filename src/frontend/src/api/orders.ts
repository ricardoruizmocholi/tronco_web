import api from '../lib/axios'
import type { CheckoutItem, Order } from '../types/order'

export function initiateCheckout(items: CheckoutItem[]): Promise<{ checkout_url: string }> {
  return api.post<{ checkout_url: string }>('/api/checkout', { items }).then(r => r.data)
}

export function getOrders(): Promise<Order[]> {
  return api.get<Order[]>('/api/orders').then(r => r.data)
}

export function getOrder(id: number): Promise<Order> {
  return api.get<Order>(`/api/orders/${id}`).then(r => r.data)
}
