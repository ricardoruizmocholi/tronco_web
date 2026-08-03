import api from '../lib/axios'
import type { BlockedUser, Fanfic, FanficFormData, FanficStatus } from '../types/fanfic'

export function getFanfics(cursor?: string): Promise<{
  data: Fanfic[]
  next_page_url: string | null
}> {
  const params = cursor ? `?cursor=${cursor}` : ''
  return api.get(`/api/fanfics${params}`).then(r => r.data)
}

// El mapa necesita todos los fanfics aprobados a la vez (no una página) — recorre la
// paginación por cursor de getFanfics() hasta agotarla.
export async function getAllFanfics(): Promise<Fanfic[]> {
  const all: Fanfic[] = []
  let cursor: string | undefined

  do {
    const page = await getFanfics(cursor)
    all.push(...page.data)
    cursor = page.next_page_url
      ? new URL(page.next_page_url).searchParams.get('cursor') ?? undefined
      : undefined
  } while (cursor)

  return all
}

export function getMyFanfic(): Promise<Fanfic> {
  return api.get<Fanfic>('/api/fanfics/mine').then(r => r.data)
}

export function createFanfic(data: FanficFormData): Promise<Fanfic> {
  return api.post<Fanfic>('/api/fanfics', data).then(r => r.data)
}

export function updateFanfic(id: number, data: FanficFormData): Promise<Fanfic> {
  return api.put<Fanfic>(`/api/fanfics/${id}`, data).then(r => r.data)
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminFanficsParams {
  status?:   FanficStatus
  search?:   string
  featured?: boolean
}

export function getAdminFanfics(params: AdminFanficsParams = {}): Promise<Fanfic[]> {
  const q = new URLSearchParams()
  if (params.status)            q.set('status',   params.status)
  if (params.search)            q.set('search',   params.search)
  if (params.featured === true) q.set('featured', 'true')
  return api.get<Fanfic[]>(`/api/admin/fanfics?${q}`).then(r => r.data)
}

export function approveFanfic(id: number): Promise<Fanfic> {
  return api.patch<Fanfic>(`/api/admin/fanfics/${id}/approve`).then(r => r.data)
}

export function rejectFanfic(id: number, rejection_reason?: string): Promise<Fanfic> {
  return api.patch<Fanfic>(`/api/admin/fanfics/${id}/reject`, { rejection_reason }).then(r => r.data)
}

export function featureFanfic(id: number): Promise<Fanfic> {
  return api.patch<Fanfic>(`/api/admin/fanfics/${id}/feature`).then(r => r.data)
}

export function unfeatureFanfic(id: number): Promise<Fanfic> {
  return api.patch<Fanfic>(`/api/admin/fanfics/${id}/unfeature`).then(r => r.data)
}

export function blockFanficUser(fanficId: number): Promise<{ message: string }> {
  return api.patch(`/api/admin/fanfics/${fanficId}/block-user`).then(r => r.data)
}

export function getBlockedUsers(): Promise<BlockedUser[]> {
  return api.get<BlockedUser[]>('/api/admin/users/blocked').then(r => r.data)
}

export function unblockUser(userId: number): Promise<{ message: string }> {
  return api.patch(`/api/admin/users/${userId}/unblock`).then(r => r.data)
}
