import api from '../lib/axios'
import type { AttributeType, ProductAttribute, ProductAttributeValue } from '../types/product'

export function createAttribute(
  productId: number,
  data: { name: string; type: AttributeType },
): Promise<ProductAttribute> {
  return api.post<ProductAttribute>(`/api/admin/products/${productId}/attributes`, data).then(r => r.data)
}

export function updateAttribute(
  attributeId: number,
  data: Partial<{ name: string; type: AttributeType }>,
): Promise<ProductAttribute> {
  return api.put<ProductAttribute>(`/api/admin/attributes/${attributeId}`, data).then(r => r.data)
}

export function deleteAttribute(attributeId: number): Promise<void> {
  return api.delete(`/api/admin/attributes/${attributeId}`).then(() => undefined)
}

export function createAttributeValue(
  attributeId: number,
  data: { value: string; label: string },
): Promise<ProductAttributeValue> {
  return api.post<ProductAttributeValue>(`/api/admin/attributes/${attributeId}/values`, data).then(r => r.data)
}

export function updateAttributeValue(
  valueId: number,
  data: Partial<{ value: string; label: string }>,
): Promise<ProductAttributeValue> {
  return api.put<ProductAttributeValue>(`/api/admin/attribute-values/${valueId}`, data).then(r => r.data)
}

export function deleteAttributeValue(valueId: number): Promise<void> {
  return api.delete(`/api/admin/attribute-values/${valueId}`).then(() => undefined)
}
