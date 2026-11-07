export interface SocialLink {
  id:       number
  platform: string
  label:    string | null
  url:      string
}

export interface AdminSocialLink extends SocialLink {
  position:  number
  is_active: boolean
}

export interface AdminSocialLinksResponse {
  data:      AdminSocialLink[]
  platforms: Record<string, string>
}

export interface SocialLinkPayload {
  platform:   string
  url:        string
  label?:     string | null
  is_active?: boolean
}
