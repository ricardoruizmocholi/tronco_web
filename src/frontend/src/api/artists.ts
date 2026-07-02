import api from '../lib/axios'
import type { Artist, ArtistFormData, ArtistImage } from '../types/artist'

export function getArtists(): Promise<Artist[]> {
  return api.get<Artist[]>('/api/artists').then(r => r.data)
}

export function getArtist(id: number): Promise<Artist> {
  return api.get<Artist>(`/api/artists/${id}`).then(r => r.data)
}

// Admin
export function getAdminArtists(): Promise<Artist[]> {
  return api.get<Artist[]>('/api/admin/artists').then(r => r.data)
}

export function createArtist(data: ArtistFormData): Promise<Artist> {
  return api.post<Artist>('/api/admin/artists', data).then(r => r.data)
}

export function updateArtist(id: number, data: ArtistFormData): Promise<Artist> {
  return api.put<Artist>(`/api/admin/artists/${id}`, data).then(r => r.data)
}

export function toggleArtist(id: number): Promise<Artist> {
  return api.patch<Artist>(`/api/admin/artists/${id}/toggle`).then(r => r.data)
}

export function addArtistImage(artistId: number, data: { url: string; caption: string }): Promise<ArtistImage> {
  return api.post<ArtistImage>(`/api/admin/artists/${artistId}/images`, data).then(r => r.data)
}

export function deleteArtistImage(artistId: number, imageId: number): Promise<void> {
  return api.delete(`/api/admin/artists/${artistId}/images/${imageId}`).then(() => undefined)
}

export function deleteArtist(id: number): Promise<void> {
  return api.delete(`/api/admin/artists/${id}`).then(() => undefined)
}
