import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Token, PortfolioState } from '@/types'
import { coinGeckoService } from '@/services/coinGeckoService'

// Default coin IDs for initial watchlist
const defaultCoinIds = ['bitcoin', 'ethereum', 'solana', 'dogecoin', 'usd-coin', 'stellar']

// Storage keys
const WATCHLIST_STORAGE_KEY = 'portfolio-watchlist'
const HOLDINGS_STORAGE_KEY = 'portfolio-holdings'

// Thunks for async operations
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

// Helper functions for localStorage
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
    console.error(`Failed to save ${key} to localStorage:`, error)
  }
}

// Calculate portfolio value for a token
const calculateTokenValue = (holdings: string, price: number): string => {
  const holdingAmount = parseFloat(holdings || '0')
  const value = holdingAmount * price
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Calculate total portfolio value
const calculatePortfolioTotal = (tokens: Token[], holdings: Record<string, string>): number => {
  return tokens.reduce((total, token) => {
    const holdingAmount = parseFloat(holdings[token.id] || '0')
    const value = holdingAmount * token.current_price
    return total + value
  }, 0)
}

const initialState: PortfolioState = {
  tokens: [],
  holdings: loadFromStorage(HOLDINGS_STORAGE_KEY, {}),
  watchlist: loadFromStorage(WATCHLIST_STORAGE_KEY, defaultCoinIds),
  portfolioTotal: 0,
  lastUpdated: new Date().toISOString(),
  isLoading: false,
  error: null
}

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    updateHolding: (state, action: PayloadAction<{ tokenId: string, holdings: string }>) => {
      const { tokenId, holdings } = action.payload
      state.holdings[tokenId] = holdings
      
      // Update token value
      const token = state.tokens.find(t => t.id === tokenId)
      if (token) {
        token.holdings = holdings
        token.value = calculateTokenValue(holdings, token.current_price)
      }
      
      // Recalculate portfolio total
      state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
      state.lastUpdated = new Date().toISOString()
      
      // Save to localStorage
      saveToStorage(HOLDINGS_STORAGE_KEY, state.holdings)
    },
    
    addToWatchlist: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload
      if (!state.watchlist.includes(tokenId)) {
        state.watchlist.push(tokenId)
        saveToStorage(WATCHLIST_STORAGE_KEY, state.watchlist)
      }
    },
    
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload
      
      // Remove from watchlist array using findIndex and splice
      const watchlistIndex = state.watchlist.findIndex(id => id === tokenId)
      if (watchlistIndex !== -1) {
        state.watchlist.splice(watchlistIndex, 1)
      }
      
      // Remove from tokens array using findIndex and splice
      const tokenIndex = state.tokens.findIndex(token => token.id === tokenId)
      if (tokenIndex !== -1) {
        state.tokens.splice(tokenIndex, 1)
      }
      
      // Remove holdings for this token
      delete state.holdings[tokenId]
      
      // Recalculate portfolio total
      state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
      state.lastUpdated = new Date().toISOString()
      
      // Save to localStorage
      saveToStorage(WATCHLIST_STORAGE_KEY, state.watchlist)
      saveToStorage(HOLDINGS_STORAGE_KEY, state.holdings)
    },
    
    clearPortfolio: (state) => {
      state.tokens = []
      state.holdings = {}
      state.watchlist = []
      state.portfolioTotal = 0
      state.lastUpdated = new Date().toISOString()
      
      // Clear localStorage
      localStorage.removeItem(WATCHLIST_STORAGE_KEY)
      localStorage.removeItem(HOLDINGS_STORAGE_KEY)
    },
    
    updateLastRefresh: (state) => {
      state.lastUpdated = new Date().toISOString()
    },
    
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchTokens
      .addCase(fetchTokens.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.isLoading = false
        state.tokens = action.payload
        
        // Apply existing holdings and calculate values
        state.tokens.forEach(token => {
          const existingHoldings = state.holdings[token.id] || '0.0000'
          token.holdings = existingHoldings
          token.value = calculateTokenValue(existingHoldings, token.current_price)
        })
        
        // Recalculate portfolio total
        state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch tokens'
      })
      
      // Handle addTokensById
      .addCase(addTokensById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(addTokensById.fulfilled, (state, action) => {
        state.isLoading = false
        
        // Filter out duplicates and add new tokens
        const newTokens = action.payload.filter((newToken: Token) => 
          !state.tokens.some(existingToken => existingToken.id === newToken.id)
        )
        
        newTokens.forEach((token: Token) => {
          // Initialize holdings if not exists
          if (!state.holdings[token.id]) {
            state.holdings[token.id] = '0.0000'
          }
          
          const existingHoldings = state.holdings[token.id]
          token.holdings = existingHoldings
          token.value = calculateTokenValue(existingHoldings, token.current_price)
          
          // Add to watchlist
          if (!state.watchlist.includes(token.id)) {
            state.watchlist.push(token.id)
          }
        })
        
        state.tokens.push(...newTokens)
        
        // Recalculate portfolio total
        state.portfolioTotal = calculatePortfolioTotal(state.tokens, state.holdings)
        state.lastUpdated = new Date().toISOString()
        
        // Save to localStorage
        saveToStorage(WATCHLIST_STORAGE_KEY, state.watchlist)
        saveToStorage(HOLDINGS_STORAGE_KEY, state.holdings)
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
  updateLastRefresh,
  clearError
} = portfolioSlice.actions

export default portfolioSlice.reducer