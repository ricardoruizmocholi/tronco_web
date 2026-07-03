import api from '../lib/axios'

export interface ShippingRate {
  id: number
  name: string
  country_code: string | null
  min_order_amount: number
  free_above: number | null
  rate: number
  is_active: boolean
}

export type ShippingRatePayload = Omit<ShippingRate, 'id'>

export function getPublicShippingRates(): Promise<ShippingRate[]> {
  return api.get<ShippingRate[]>('/api/shipping-rates').then(r => r.data)
}

export function getAdminShippingRates(): Promise<ShippingRate[]> {
  return api.get<ShippingRate[]>('/api/admin/shipping-rates').then(r => r.data)
}

export function createShippingRate(data: ShippingRatePayload): Promise<ShippingRate> {
  return api.post<ShippingRate>('/api/admin/shipping-rates', data).then(r => r.data)
}

export function updateShippingRate(id: number, data: ShippingRatePayload): Promise<ShippingRate> {
  return api.put<ShippingRate>(`/api/admin/shipping-rates/${id}`, data).then(r => r.data)
}

export function deleteShippingRate(id: number): Promise<void> {
  return api.delete(`/api/admin/shipping-rates/${id}`).then(() => undefined)
}
