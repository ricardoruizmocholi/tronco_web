import type { Product } from './product'

export interface SocialLinks {
  instagram?: string
  twitter?:   string
  tiktok?:    string
  youtube?:   string
  twitch?:    string
  bandcamp?:  string
}

export interface ArtistImage {
  id:        number
  artist_id: number
  url:       string
  caption:   string | null
  position:  number
}

export interface Artist {
  id:          number
  name:        string
  bio:         string | null
  avatar_url:  string | null
  website_url: string | null
  video_urls:  string[]
  social_links: SocialLinks | null
  is_active:   boolean
  images:      ArtistImage[]
  products?:   Product[]
}

export interface ArtistFormData {
  name:         string
  bio:          string
  avatar_url:   string
  website_url:  string
  video_urls:   string[]
  social_links: SocialLinks
  is_active?:   boolean
}
