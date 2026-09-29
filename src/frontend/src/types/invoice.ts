export interface InvoiceOrderUser {
  id:    number
  name:  string
  email: string
}

export interface InvoiceOrderItem {
  id:       number
  quantity: number
  unit_price: number
  product: { id: number; name: string } | null
}

export interface InvoiceOrder {
  id:    number
  user?: InvoiceOrderUser
  items?: InvoiceOrderItem[]
}

export interface Invoice {
  id:             number
  order_id:       number
  series:         string
  year:           number
  number:         number
  full_number:    string
  issued_at:      string
  is_simplified:  boolean
  buyer_name:     string
  buyer_tax_id:   string | null
  buyer_address:  Record<string, string>
  subtotal:       number
  tax_rate:       string
  tax_amount:     number
  total:          number
  order?:         InvoiceOrder
}

export interface InvoiceFilters {
  date_from?: string
  date_to?:   string
  search?:    string
}

export interface PaginatedInvoices {
  data:          Invoice[]
  current_page:  number
  last_page:     number
  per_page:      number
  total:         number
}
