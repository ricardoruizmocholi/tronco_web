import api from '../lib/axios'

export interface CompanyBillingInfo {
  legal_name:    string
  tax_id:        string
  address_line1: string
  address_line2: string
  postal_code:   string
  city:          string
  province:      string
  country:       string
  tax_rate:      number
}

export function getBillingSettings(): Promise<CompanyBillingInfo> {
  return api.get<CompanyBillingInfo>('/api/admin/billing-settings').then(r => r.data)
}

export function updateBillingSettings(data: CompanyBillingInfo): Promise<CompanyBillingInfo> {
  return api.put<CompanyBillingInfo>('/api/admin/billing-settings', data).then(r => r.data)
}
