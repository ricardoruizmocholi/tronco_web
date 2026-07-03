import api from '../lib/axios'

export interface Banner {
  id: number
  title: string
  subtitle: string | null
  image_url: string
  cta_text: string | null
  cta_url: string | null
  is_active: boolean
  position: number
}

export type BannerPayload = Omit<Banner, 'id'>

export function getPublicBanners(): Promise<Banner[]> {
  return api.get<Banner[]>('/api/banners').then(r => r.data)
}

export function getAdminBanners(): Promise<Banner[]> {
  return api.get<Banner[]>('/api/admin/banners').then(r => r.data)
}

export function createBanner(data: Partial<BannerPayload>): Promise<Banner> {
  return api.post<Banner>('/api/admin/banners', data).then(r => r.data)
}

export function updateBanner(id: number, data: Partial<BannerPayload>): Promise<Banner> {
  return api.put<Banner>(`/api/admin/banners/${id}`, data).then(r => r.data)
}

export function deleteBanner(id: number): Promise<void> {
  return api.delete(`/api/admin/banners/${id}`).then(() => undefined)
}
