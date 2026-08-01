export interface NewsletterSubscriber {
  id:            number
  email:         string
  name:          string | null
  confirmed_at:  string | null
  created_at:    string
}

export interface PaginatedSubscribers {
  data:            NewsletterSubscriber[]
  total:           number
  current_page:    number
  last_page:       number
}
