export interface Token {
  id: string
  icon: string
  name: string
  symbol: string
  price: string
  change: string
  spark: { value: number }[]
  holdings: string
  value: string
  current_price: number
  price_change_percentage_24h: number
  sparkline_in_7d?: { price: number[] }
}

export interface PortfolioState {
  tokens: Token[]
  holdings: Record<string, string>
  watchlist: string[]
  portfolioTotal: number
  lastUpdated: string
  isLoading: boolean
  error: string | null
  currentAddress?: string
}