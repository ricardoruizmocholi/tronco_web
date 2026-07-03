import type { Product } from './product'

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'shipped' | 'cancelled'

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  product: Pick<Product, 'id' | 'name' | 'slug' | 'image_url' | 'price'> | null
}

export interface Order {
  id: number
  user_id: number
  status: OrderStatus
  total: number
  stripe_session_id: string | null
  shipping_address: Record<string, string> | null
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface CheckoutItem {
  product_id: number
  variant_id?: number
  quantity: number
}
