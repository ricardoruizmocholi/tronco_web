import type { OrderStatus } from './order'

export type { OrderStatus }

export interface AdminOrderUser {
  id:    number
  name:  string
  email: string
}

export interface AdminOrder {
  id:          number
  status:      OrderStatus
  total:       number
  shipping_cost: number
  items_count: number
  created_at:  string
  user:        AdminOrderUser | null
}

export interface AdminOrderItem {
  id:           number
  product_name: string
  product_slug: string | null
  variant_size: string | null
  unit_price:   number
  quantity:     number
  subtotal:     number
}

export interface AdminOrderDetail {
  id:               number
  status:           OrderStatus
  total:            number
  shipping_cost:    number
  shipping_address: Record<string, string> | null
  created_at:       string
  user:             AdminOrderUser | null
  items:            AdminOrderItem[]
}

export interface OrderStats {
  total_revenue: number
  order_count:   number
  top_product:   { name: string; units_sold: number } | null
}

export interface AdminOrdersFilters {
  status?:     string
  date_from?:  string
  date_to?:    string
  user_email?: string
  min_amount?: string
  max_amount?: string
}

export interface PaginatedAdminOrders {
  data:          AdminOrder[]
  current_page:  number
  last_page:     number
  per_page:      number
  total:         number
  next_page_url: string | null
  prev_page_url: string | null
}
