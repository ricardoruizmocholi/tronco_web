import type { ProductPromotion } from './promotion'

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

export type AttributeType = 'text' | 'color'

export interface ProductAttributeValue {
  id: number
  value: string // texto libre, o hex #RRGGBB si el atributo es de tipo color
  label: string
  position: number
}

export interface ProductAttribute {
  id: number
  name: string
  type: AttributeType
  values: ProductAttributeValue[]
}

// Combinación de un valor de atributo aplicada a una variante concreta
export interface VariantAttributeValue {
  attribute_id: number
  attribute_value_id: number
  value: string
  label: string
}

export interface ProductVariant {
  id: number
  product_id: number
  size?: string | null // legacy — las variantes nuevas se definen por attribute_values
  stock: number
  price_override: number | null
  image_url: string | null
  effective_price: number  // price_override ?? product.price
  effective_image: string | null // image_url ?? primera imagen del producto
  is_active: boolean
  attribute_values: VariantAttributeValue[]
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
  allow_preorder: boolean
  category: Category | null
  images: ProductImage[]
  variants: ProductVariant[]
  // No todos los endpoints lo cargan (solo listados/ficha con swatches de color) —
  // tratar siempre como potencialmente ausente: (product.attributes ?? [])
  attributes?: ProductAttribute[]
  promotion?: ProductPromotion | null
}

// Datos que el formulario admin envía al backend (price en céntimos)
export interface ProductFormData {
  name: string
  description: string
  price: number
  stock: number
  category_id: number | null
  artist_id?: number | null
  is_active?: boolean
}

export interface PaginatedProducts {
  data: Product[]
  next_page_url: string | null
  total: number
  per_page: number
  current_page: number
}
