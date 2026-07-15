import api from '../lib/axios'
import type { CheckoutItem, Order } from '../types/order'

export interface ShippingAddress {
  name:          string
  phone:         string
  address_line1: string
  address_line2: string
  postal_code:   string
  city:          string
  state:         string
  country:       string
}

export function initiateCheckout(
  items: CheckoutItem[],
  shipping_address: ShippingAddress,
): Promise<{ checkout_url: string }> {
  return api
    .post<{ checkout_url: string }>('/api/checkout', { items, shipping_address })
    .then(r => r.data)
}

export function getOrders(): Promise<Order[]> {
  return api.get<Order[]>('/api/orders').then(r => r.data)
}

export function getOrder(id: number): Promise<Order> {
  return api.get<Order>(`/api/orders/${id}`).then(r => r.data)
}

export function cancelOrder(id: number): Promise<{ status: string; message: string }> {
  return api.post<{ status: string; message: string }>(`/api/orders/${id}/cancel`).then(r => r.data)
}
