import api from '../lib/axios'
import type { AdminNotificationsResponse } from '../types/adminNotification'

export function getAdminNotifications(): Promise<AdminNotificationsResponse> {
  return api.get<AdminNotificationsResponse>('/api/admin/notifications').then(r => r.data)
}
