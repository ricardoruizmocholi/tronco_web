import api from '../lib/axios'
import type { Fanfic, FanficFormData, FanficStatus } from '../types/fanfic'

export function getFanfics(): Promise<Fanfic[]> {
  return api.get<Fanfic[]>('/api/fanfics').then(r => r.data)
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

// Admin
export function getAdminFanfics(status: FanficStatus = 'pending'): Promise<Fanfic[]> {
  return api.get<Fanfic[]>(`/api/admin/fanfics?status=${status}`).then(r => r.data)
}

export function approveFanfic(id: number): Promise<Fanfic> {
  return api.patch<Fanfic>(`/api/admin/fanfics/${id}/approve`).then(r => r.data)
}

export function rejectFanfic(id: number, rejection_reason?: string): Promise<Fanfic> {
  return api.patch<Fanfic>(`/api/admin/fanfics/${id}/reject`, { rejection_reason }).then(r => r.data)
}
