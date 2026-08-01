export type HeroSlideType = 'image' | 'video'

export interface HeroSlide {
  id:         number
  type:       HeroSlideType
  url:        string
  title:      string | null
  subtitle:   string | null
  cta_text:   string | null
  cta_url:    string | null
  is_active:  boolean
  position:   number
}
