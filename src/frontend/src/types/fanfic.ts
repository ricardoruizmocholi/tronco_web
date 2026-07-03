export type FanficStatus = 'pending' | 'approved' | 'rejected'

export interface FanficAuthor {
  id:     number
  name:   string
  email?: string
}

export interface Fanfic {
  id:                number
  user_id:           number
  image_url:         string
  caption?:          string | null
  city_name:         string
  latitude:          number
  longitude:         number
  is_featured?:      boolean
  status?:           FanficStatus
  rejection_reason?: string | null
  reviewed_by?:      number | null
  reviewed_at?:      string | null
  author?:           FanficAuthor
  created_at?:       string
  updated_at?:       string
}

export interface FanficFormData {
  image_url: string
  caption:   string
  city_name: string
  latitude:  number
  longitude: number
}

export interface BlockedUser {
  id:         number
  name:       string
  email:      string
  is_blocked: true
}
