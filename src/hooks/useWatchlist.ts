import { useState, useEffect } from 'react'
import { coinGeckoService } from '@/services/coinGeckoService'

interface Token {
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

const WATCHLIST_STORAGE_KEY = 'portfolio-watchlist'
const HOLDINGS_STORAGE_KEY = 'portfolio-holdings'

export const useWatchlist = (initialTokens: Token[]) => {
  const [allTokens, setAllTokens] = useState<Token[]>([]) // Store all fetched tokens
  const [tokenList, setTokenList] = useState<Token[]>([]) // Current page tokens
  const [holdings, setHoldings] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10



  // Fetch token data from CoinGecko market API (fetch larger dataset for frontend pagination)
  const fetchTokenData = async (forceRefresh = false) => {
    try {
      console.log('Setting loading state...')
      setIsLoading(true)
      setError(null)
      
      console.log('Fetching token data for table...')
      // Fetch 100 coins for frontend pagination
      const data = await coinGeckoService.getMarketData(1, 100, forceRefresh)
      
      if (data && data.length > 0) {
        const formattedTokens = data.map((coin: { 
          id: string; 
          image: string; 
          name: string; 
          symbol: string; 
          current_price: number; 
          price_change_percentage_24h: number; 
          sparkline_in_7d?: { price: number[] };
        }) => ({
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
        
        setAllTokens(formattedTokens)
        
        // Calculate total pages based on fetched data
        setTotalPages(Math.ceil(formattedTokens.length / itemsPerPage))
        
        // Initialize holdings for all tokens
        const newHoldings = formattedTokens.map(() => '0.0000')
        setHoldings(newHoldings)
      }
    } catch (err) {
      console.error('Error fetching token data:', err)
      setError('Failed to fetch token data')
      // Fallback to initial tokens if API fails
      setTokenList(initialTokens)
      setHoldings(initialTokens.map(t => t.holdings))
    } finally {
      console.log('Turning off loading state...')
      setIsLoading(false)
    }
  }

  // Initialize data on mount
  useEffect(() => {
    fetchTokenData() // Fetch all tokens once
  }, [])

  // Update displayed tokens when page or allTokens changes
  useEffect(() => {
    if (allTokens.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const pageTokens = allTokens.slice(startIndex, endIndex)
      setTokenList(pageTokens)
    }
  }, [currentPage, allTokens])

  // Save to localStorage whenever tokenList changes
  useEffect(() => {
    if (tokenList.length > 0) {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(tokenList))
    }
  }, [tokenList])

  // Save to localStorage whenever holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings))
    }
  }, [holdings])

  // Calculate portfolio value for each token
  useEffect(() => {
    if (tokenList.length > 0 && holdings.length === tokenList.length) {
      const updatedTokens = tokenList.map((token, index) => {
        const holdingAmount = parseFloat(holdings[index] || '0')
        const value = holdingAmount * token.current_price
        return {
          ...token,
          value: `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      })
      setTokenList(updatedTokens)
    }
  }, [holdings])

  const addToken = (newToken: Token) => {
    setTokenList(prev => [...prev, newToken])
    setHoldings(prev => [...prev, '0.0000'])
  }

  const addTokens = async (coinIds: string[]) => {
    try {
      setIsLoading(true)
      const newTokensData = await coinGeckoService.getCoinsByIds(coinIds)
      
      if (newTokensData && newTokensData.length > 0) {
        const formattedNewTokens = newTokensData.map((coin: { 
          id: string; 
          image: string; 
          name: string; 
          symbol: string; 
          current_price: number; 
          price_change_percentage_24h: number; 
          sparkline_in_7d?: { price: number[] };
        }) => ({
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

        // Filter out duplicates
        const newTokens = formattedNewTokens.filter((newToken: Token) => 
          !tokenList.some(existingToken => existingToken.id === newToken.id)
        )

        if (newTokens.length > 0) {
          setTokenList(prev => [...prev, ...newTokens])
          setHoldings(prev => [...prev, ...newTokens.map(() => '0.0000')])
        }
      }
    } catch (error) {
      console.error('Error adding tokens:', error)
      setError('Failed to add tokens')
    } finally {
      setIsLoading(false)
    }
  }

  const removeToken = (index: number) => {
    setTokenList(prev => prev.filter((_, i) => i !== index))
    setHoldings(prev => prev.filter((_, i) => i !== index))
  }

  const updateHolding = (index: number, newHolding: string) => {
    setHoldings(prev => {
      const updated = [...prev]
      updated[index] = newHolding
      return updated
    })
  }

  const refreshPrices = async () => {
    if (isLoading) {
      console.log('Already loading, skipping refresh...')
      return
    }
    
    console.log('Refresh button clicked - calling market API...')
    await fetchTokenData(true) // Refresh all tokens with cache bypass
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const clearWatchlist = () => {
    setTokenList([])
    setHoldings([])
    localStorage.removeItem(WATCHLIST_STORAGE_KEY)
    localStorage.removeItem(HOLDINGS_STORAGE_KEY)
  }

  return {
    tokenList,
    holdings,
    isLoading,
    error,
    currentPage,
    totalPages,
    addToken,
    addTokens,
    removeToken,
    updateHolding,
    refreshPrices,
    clearWatchlist,
    goToPage,
    nextPage,
    prevPage
  }
}