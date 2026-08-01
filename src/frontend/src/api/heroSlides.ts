import api from '../lib/axios'
import type { HeroSlide } from '../types/heroSlide'

export type HeroSlidePayload = Omit<HeroSlide, 'id'>

export function getHeroSlides(): Promise<HeroSlide[]> {
  return api.get<HeroSlide[]>('/api/hero-slides').then(r => r.data)
}

export function getAdminHeroSlides(): Promise<HeroSlide[]> {
  return api.get<HeroSlide[]>('/api/admin/hero-slides').then(r => r.data)
}

export function createHeroSlide(data: Partial<HeroSlidePayload>): Promise<HeroSlide> {
  return api.post<HeroSlide>('/api/admin/hero-slides', data).then(r => r.data)
}

export function updateHeroSlide(id: number, data: Partial<HeroSlidePayload>): Promise<HeroSlide> {
  return api.put<HeroSlide>(`/api/admin/hero-slides/${id}`, data).then(r => r.data)
}

export function deleteHeroSlide(id: number): Promise<void> {
  return api.delete(`/api/admin/hero-slides/${id}`).then(() => undefined)
}

export function reorderHeroSlides(slides: { id: number; position: number }[]): Promise<HeroSlide[]> {
  return api.put<HeroSlide[]>('/api/admin/hero-slides/reorder', { slides }).then(r => r.data)
}
