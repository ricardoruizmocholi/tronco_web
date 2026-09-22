import api from '../lib/axios'

export interface MaintenanceStatus {
  active: boolean
}

export function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  return api.get<MaintenanceStatus>('/api/maintenance-status').then(r => r.data)
}

export function setMaintenanceStatus(active: boolean): Promise<MaintenanceStatus> {
  return api.put<MaintenanceStatus>('/api/admin/maintenance', { active }).then(r => r.data)
}
