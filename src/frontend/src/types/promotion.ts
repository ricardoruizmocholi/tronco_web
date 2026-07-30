export type DiscountType = 'percent' | 'fixed'
export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'inactive'

// Lo que devuelve un Product con promoción vigente embebida (product.promotion)
export interface ProductPromotion {
  id: number
  product_id: number
  discount_type: DiscountType
  discount_value: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  original_price: number
  discounted_price: number
  status: PromotionStatus
  created_at: string
  updated_at: string
}

// Fila del panel admin — misma forma + datos del producto asociado
export interface Promotion extends ProductPromotion {
  product?: {
    id: number
    name: string
    slug: string
    price: number
    image_url: string | null
  }
}
