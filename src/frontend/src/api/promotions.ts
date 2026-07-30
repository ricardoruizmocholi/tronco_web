import api from '../lib/axios'
import type { Product } from '../types/product'
import type { DiscountType, Promotion } from '../types/promotion'

export function getActivePromotions(): Promise<Product[]> {
  return api.get<Product[]>('/api/promotions/active').then(r => r.data)
}

export function getNewProducts(): Promise<Product[]> {
  return api.get<Product[]>('/api/products/new').then(r => r.data)
}

// --- Admin ---

export function getAdminPromotions(): Promise<Promotion[]> {
  return api.get<Promotion[]>('/api/admin/promotions').then(r => r.data)
}

export interface PromotionPayload {
  product_id: number
  discount_type: DiscountType
  discount_value: number
  starts_at?: string | null
  ends_at?: string | null
  is_active: boolean
}

export function createPromotion(data: PromotionPayload): Promise<Promotion> {
  return api.post<Promotion>('/api/admin/promotions', data).then(r => r.data)
}

export function updatePromotion(id: number, data: PromotionPayload): Promise<Promotion> {
  return api.put<Promotion>(`/api/admin/promotions/${id}`, data).then(r => r.data)
}

export function deletePromotion(id: number): Promise<void> {
  return api.delete(`/api/admin/promotions/${id}`).then(() => undefined)
}
