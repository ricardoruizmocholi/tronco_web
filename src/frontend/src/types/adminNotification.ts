export type AdminNotificationType = 'order' | 'return' | 'preorder'

export interface AdminNotificationItem {
  type: AdminNotificationType
  id: number
  title: string
  subtitle: string
  created_at: string
}

export interface AdminNotificationsResponse {
  total: number
  items: AdminNotificationItem[]
}
