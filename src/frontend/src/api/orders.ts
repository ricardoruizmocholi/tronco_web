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

// Datos fiscales del receptor — solo se envían si el cliente marca "quiero
// factura con mis datos fiscales" en el checkout. Si no, se emite una
// factura simplificada con los datos de la cuenta.
export interface BillingInfo {
  tax_name:      string
  tax_id:        string
  address_line1: string
  address_line2: string
  postal_code:   string
  city:          string
  province:      string
  country:       string
}

export function initiateCheckout(
  items: CheckoutItem[],
  shipping_address: ShippingAddress,
  billing_info: BillingInfo | null = null,
): Promise<{ checkout_url: string }> {
  return api
    .post<{ checkout_url: string }>('/api/checkout', { items, shipping_address, billing_info })
    .then(r => r.data)
}

export function getOrders(): Promise<Order[]> {
  return api.get<Order[]>('/api/orders').then(r => r.data)
}

export function getOrder(id: number): Promise<Order> {
  return api.get<Order>(`/api/orders/${id}`).then(r => r.data)
}

export function downloadOrderInvoice(id: number): Promise<Blob> {
  return api.get(`/api/orders/${id}/invoice`, { responseType: 'blob' }).then(r => r.data)
}

export function cancelOrder(id: number): Promise<{ status: string; message: string }> {
  return api.post<{ status: string; message: string }>(`/api/orders/${id}/cancel`).then(r => r.data)
}
