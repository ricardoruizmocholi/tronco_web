import api from '../lib/axios'
import type { AuthUser } from '../context/AuthContext'

export interface UpdateProfilePayload {
  name:                  string
  current_password?:     string
  password?:             string
  password_confirmation?: string
}

export function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  return api.put<AuthUser>('/api/user/profile', payload).then(r => r.data)
}
