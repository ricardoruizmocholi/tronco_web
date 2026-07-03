export type FanficStatus = 'pending' | 'approved' | 'rejected'

export interface FanficAuthor {
  id:   number
  name: string
}

export interface Fanfic {
  id:                number
  user_id:           number
  title:             string
  content:           string
  latitude:          number
  longitude:         number
  status?:           FanficStatus
  rejection_reason?: string | null
  reviewed_by?:      number | null
  reviewed_at?:      string | null
  author?:           FanficAuthor & { email?: string }
  created_at?:       string
  updated_at?:       string
}

export interface FanficFormData {
  title:     string
  content:   string
  latitude:  number
  longitude: number
}
