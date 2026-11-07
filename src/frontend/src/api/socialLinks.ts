import api from '../lib/axios'
import type {
  AdminSocialLink, AdminSocialLinksResponse, SocialLink, SocialLinkPayload,
} from '../types/socialLink'

export function getSocialLinks(): Promise<SocialLink[]> {
  return api.get<SocialLink[]>('/api/social-links').then(r => r.data)
}

export function getAdminSocialLinks(): Promise<AdminSocialLinksResponse> {
  return api.get<AdminSocialLinksResponse>('/api/admin/social-links').then(r => r.data)
}

export function createSocialLink(data: SocialLinkPayload): Promise<AdminSocialLink> {
  return api.post<AdminSocialLink>('/api/admin/social-links', data).then(r => r.data)
}

export function updateSocialLink(id: number, data: Partial<SocialLinkPayload>): Promise<AdminSocialLink> {
  return api.put<AdminSocialLink>(`/api/admin/social-links/${id}`, data).then(r => r.data)
}

export function toggleSocialLink(id: number): Promise<AdminSocialLink> {
  return api.patch<AdminSocialLink>(`/api/admin/social-links/${id}/toggle`).then(r => r.data)
}

export function deleteSocialLink(id: number): Promise<void> {
  return api.delete(`/api/admin/social-links/${id}`).then(() => undefined)
}

export function reorderSocialLinks(ids: number[]): Promise<AdminSocialLink[]> {
  return api.put<AdminSocialLink[]>('/api/admin/social-links/reorder', { ids }).then(r => r.data)
}
