export interface Category {
  id: number
  name: string
  slug: string
}

export interface ProductImage {
  id: number
  product_id: number
  url: string
  position: number
}

export interface ProductVariant {
  id: number
  product_id: number
  size: string
  stock: number
  is_active: boolean
}

export interface Product {
  id: number
  category_id: number | null
  artist_id: number | null
  name: string
  slug: string
  description: string
  price: number       // céntimos de euro
  stock: number
  image_url: string | null
  is_active: boolean
  category: Category | null
  images: ProductImage[]
  variants: ProductVariant[]
}

// Datos que el formulario admin envía al backend (price en céntimos)
export interface ProductFormData {
  name: string
  description: string
  price: number
  stock: number
  category_id: number | null
  is_active?: boolean
}

export interface PaginatedProducts {
  data: Product[]
  next_page_url: string | null
  total: number
  per_page: number
  current_page: number
}
