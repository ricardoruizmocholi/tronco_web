import api from '../lib/axios'

export interface Collaborator {
  id: number
  name: string
  logo_url: string | null
  url: string
  description: string | null
  is_active: boolean
  position: number
}

export type CollaboratorPayload = Omit<Collaborator, 'id'>

export function getPublicCollaborators(): Promise<Collaborator[]> {
  return api.get<Collaborator[]>('/api/collaborators').then(r => r.data)
}

export function getAdminCollaborators(): Promise<Collaborator[]> {
  return api.get<Collaborator[]>('/api/admin/collaborators').then(r => r.data)
}

export function createCollaborator(data: Partial<CollaboratorPayload>): Promise<Collaborator> {
  return api.post<Collaborator>('/api/admin/collaborators', data).then(r => r.data)
}

export function updateCollaborator(id: number, data: Partial<CollaboratorPayload>): Promise<Collaborator> {
  return api.put<Collaborator>(`/api/admin/collaborators/${id}`, data).then(r => r.data)
}

export function deleteCollaborator(id: number): Promise<void> {
  return api.delete(`/api/admin/collaborators/${id}`).then(() => undefined)
}
