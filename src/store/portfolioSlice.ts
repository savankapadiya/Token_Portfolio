import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Token, PortfolioState } from '@/types'
import { coinGeckoService } from '@/services/coinGeckoService'

const getWatchlistStorageKey = (address?: string) => 
  address ? `portfolio-watchlist-${address.toLowerCase()}` : 'portfolio-watchlist-default'

const getHoldingsStorageKey = (address?: string) => 
  address ? `portfolio-holdings-${address.toLowerCase()}` : 'portfolio-holdings-default'

export const fetchTokens = createAsyncThunk(
  'portfolio/fetchTokens',
  async ({ page = 1, perPage = 100, forceRefresh = false }: { page?: number, perPage?: number, forceRefresh?: boolean }) => {
    const data = await coinGeckoService.getMarketData(page, perPage, forceRefresh)
    
    return data.map((coin: any) => ({
      id: coin.id,
      icon: coin.image,
      name: `${coin.name} (${coin.symbol.toUpperCase()})`,
      symbol: coin.symbol.toUpperCase(),
      price: `$${coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      change: `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h?.toFixed(2) || '0.00'}%`,
      spark: coin.sparkline_in_7d?.price ? 
        coin.sparkline_in_7d.price.slice(-20).map((price: number) => ({ value: price })) : 
        Array.from({ length: 20 }, () => ({ value: Math.random() * 100 + 50 })),
      holdings: '0.0000',
      value: '$0.00',
      current_price: coin.current_price || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      sparkline_in_7d: coin.sparkline_in_7d
    }))
  }
)

export const addTokensById = createAsyncThunk(
  'portfolio/addTokensById',
  async (coinIds: string[]) => {
    const data = await coinGeckoService.getCoinsByIds(coinIds)
    
    if (!data || data.length === 0) {
      return []
    }

    const processedTokens = data.map((coin: any) => ({
      id: coin.id,
      icon: coin.image,
      name: `${coin.name} (${coin.symbol.toUpperCase()})`,
      symbol: coin.symbol.toUpperCase(),
      price: `$${coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      change: `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h?.toFixed(2) || '0.00'}%`,
      spark: coin.sparkline_in_7d?.price ? 
        coin.sparkline_in_7d.price.slice(-20).map((price: number) => ({ value: price })) : 
        Array.from({ length: 20 }, () => ({ value: Math.random() * 100 + 50 })),
      holdings: '0.0000',
      value: '$0.00',
      current_price: coin.current_price || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      sparkline_in_7d: coin.sparkline_in_7d
    }))
    return processedTokens
  }
)

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
  }
}

const calculateTokenValue = (holdings: string, price: number): string => {
  const holdingAmount = parseFloat(holdings || '0')
  const value = holdingAmount * price
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const calculatePortfolioTotal = (tokens: Token[], holdings: Record<string, string>): number => {
  return tokens.reduce((total, token) => {
    const holdingAmount = parseFloat(holdings[token.id] || '0')
    const value = holdingAmount * token.current_price
    return total + value
  }, 0)
}

const initialState: PortfolioState = {
  tokens: [],
  holdings: {},
  watchlist: [],
  portfolioTotal: 0,
  lastUpdated: new Date().toISOString(),
  isLoading: false,
  error: null,
  currentAddress: undefined
}

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    updateHolding: (state, action: PayloadAction<{ tokenId: string, holdings: string }>) => {
      const { tokenId, holdings } = action.payload
      state.holdings[tokenId] = holdings
      
      const token = state.tokens.find(t => t.id === tokenId)
      if (token) {
        token.holdings = holdings
        token.value = calculateTokenValue(holdings, token.current_price)
      }
      
      state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
      state.lastUpdated = new Date().toISOString()
      
      saveToStorage(getHoldingsStorageKey(state.currentAddress), state.holdings)
    },
    
    addToWatchlist: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload
      if (!state.watchlist.includes(tokenId)) {
        state.watchlist.push(tokenId)
        saveToStorage(getWatchlistStorageKey(state.currentAddress), state.watchlist)
      }
    },
    
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload
      
      const watchlistIndex = state.watchlist.findIndex(id => id === tokenId)
      if (watchlistIndex !== -1) {
        state.watchlist.splice(watchlistIndex, 1)
      }
      
      const tokenIndex = state.tokens.findIndex(token => token.id === tokenId)
      if (tokenIndex !== -1) {
        state.tokens.splice(tokenIndex, 1)
      }
      
      delete state.holdings[tokenId]
      
      state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
      state.lastUpdated = new Date().toISOString()
      
      saveToStorage(getWatchlistStorageKey(state.currentAddress), state.watchlist)
      saveToStorage(getHoldingsStorageKey(state.currentAddress), state.holdings)
    },
    
    clearPortfolio: (state) => {
      state.tokens = []
      state.holdings = {}
      state.watchlist = []
      state.portfolioTotal = 0
      state.lastUpdated = new Date().toISOString()
      
      if (state.currentAddress) {
        localStorage.removeItem(getWatchlistStorageKey(state.currentAddress))
        localStorage.removeItem(getHoldingsStorageKey(state.currentAddress))
      }
    },
    
    clearTokensOnly: (state) => {
      state.tokens = []
      state.holdings = {}
      state.watchlist = []
      state.portfolioTotal = 0
      state.lastUpdated = new Date().toISOString()
    },
    
    updateLastRefresh: (state) => {
      state.lastUpdated = new Date().toISOString()
    },
    
    clearError: (state) => {
      state.error = null
    },
    
    loadWalletData: (state, action: PayloadAction<string | undefined>) => {
      const address = action.payload
      const previousAddress = state.currentAddress
      
      if (address && previousAddress && address !== previousAddress) {
        state.tokens = []
      }
      
      state.currentAddress = address
      const watchlistKey = getWatchlistStorageKey(address)
      const holdingsKey = getHoldingsStorageKey(address)
      
      state.holdings = loadFromStorage(holdingsKey, {})
      state.watchlist = loadFromStorage(watchlistKey, [])
      state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
      state.lastUpdated = new Date().toISOString()
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokens.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.isLoading = false
        state.tokens = action.payload
        
        state.tokens.forEach(token => {
          const existingHoldings = state.holdings[token.id] || '0.0000'
          token.holdings = existingHoldings
          token.value = calculateTokenValue(existingHoldings, token.current_price)
        })
        
          state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch tokens'
      })
      
      .addCase(addTokensById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(addTokensById.fulfilled, (state, action) => {
        state.isLoading = false
        
        const newTokens = action.payload.filter((newToken: Token) => 
          !state.tokens.some(existingToken => existingToken.id === newToken.id)
        )
        
        newTokens.forEach((token: Token) => {
          if (!state.holdings[token.id]) {
            state.holdings[token.id] = '0.0000'
          }
          
          const existingHoldings = state.holdings[token.id]
          token.holdings = existingHoldings
          token.value = calculateTokenValue(existingHoldings, token.current_price)
          
          if (!state.watchlist.includes(token.id)) {
            state.watchlist.push(token.id)
          }
        })
        
        state.tokens.unshift(...newTokens)
        
          state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
        state.lastUpdated = new Date().toISOString()
        
          saveToStorage(getWatchlistStorageKey(state.currentAddress), state.watchlist)
        saveToStorage(getHoldingsStorageKey(state.currentAddress), state.holdings)
      })
      .addCase(addTokensById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to add tokens'
      })
  }
})

export const {
  updateHolding,
  addToWatchlist,
  removeFromWatchlist,
  clearPortfolio,
  clearTokensOnly,
  updateLastRefresh,
  clearError,
  loadWalletData
} = portfolioSlice.actions

export default portfolioSlice.reducer