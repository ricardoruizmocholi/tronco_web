import type { Order, OrderItem } from './order'

export type ReturnReason = 'defectuoso' | 'no_corresponde' | 'desistimiento' | 'otro'
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'received' | 'refunded'

export interface ReturnRequestItem {
  id: number
  return_request_id: number
  order_item_id: number
  quantity: number
  reason: string | null
  order_item?: OrderItem
}

export interface ReturnStatusHistory {
  id: number
  return_request_id: number
  changed_by: number
  from_status: string
  to_status: string
  notes: string | null
  created_at: string
  changed_by_user?: { id: number; name: string }
}

export interface ReturnRequest {
  id: number
  order_id: number
  user_id: number
  reason: ReturnReason
  description: string | null
  image_url: string | null
  status: ReturnStatus
  admin_notes: string | null
  stripe_refund_id: string | null
  refund_amount: number | null
  requested_at: string | null
  approved_at: string | null
  rejected_at: string | null
  received_at: string | null
  refunded_at: string | null
  created_at: string
  updated_at: string
  order?: Order
  user?: { id: number; name: string; email: string }
  history?: ReturnStatusHistory[]
  items?: ReturnRequestItem[]
}

export interface PaginatedAdminReturns {
  data: ReturnRequest[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AdminReturnsFilters {
  status?: ReturnStatus | ''
  user_email?: string
  date_from?: string
  date_to?: string
}
