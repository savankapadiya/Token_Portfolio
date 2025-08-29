import { useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { useAppDispatch, useAppSelector } from './redux'
import { 
  fetchTokens, 
  addTokensById, 
  updateHolding, 
  addToWatchlist, 
  removeFromWatchlist, 
  clearPortfolio,
  updateLastRefresh 
} from '@/store/portfolioSlice'
import { coinGeckoService } from '@/services/coinGeckoService'

export const useReduxPortfolio = () => {
  const dispatch = useAppDispatch()
  const { 
    tokens, 
    holdings, 
    watchlist, 
    portfolioTotal, 
    lastUpdated, 
    isLoading, 
    error 
  } = useAppSelector(state => state.portfolio)
  
  const { address, isConnected } = useAccount()
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
  })

  // Initialize data on mount
  useEffect(() => {
    if (tokens.length === 0) {
      dispatch(fetchTokens({ page: 1, perPage: 100 }))
    }
  }, [dispatch, tokens.length])

  // Format timestamp
  const formatLastUpdated = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  // Get wallet portfolio value from CoinGecko service
  const getWalletPortfolioValue = async () => {
    if (!address || !isConnected) {
      return 0
    }

    try {
      console.log('Fetching wallet portfolio value...')
      const portfolioValue = await coinGeckoService.getPortfolioValue(address, 1) // Ethereum mainnet
      console.log('Wallet portfolio value:', portfolioValue)
      return portfolioValue
    } catch (error) {
      console.error('Error fetching wallet portfolio:', error)
      return 0
    }
  }

  // Refresh portfolio data
  const refreshPortfolio = async () => {
    // Immediately update timestamp for instant feedback
    dispatch(updateLastRefresh())
    
    // Run all operations in parallel for faster response
    const promises = []
    
    // Add token refresh (main operation)
    promises.push(dispatch(fetchTokens({ page: 1, perPage: 100, forceRefresh: true })))
    
    if (isConnected && address) {
      // Add wallet operations in parallel
      promises.push(
        getWalletPortfolioValue().catch(error => {
          console.error('Error fetching wallet portfolio:', error)
        })
      )
      promises.push(
        refetchBalance().catch(error => {
          console.error('Error fetching wallet balance:', error)
        })
      )
    }
    
    // Wait for all operations to complete
    await Promise.all(promises)
  }

  // Add tokens to portfolio
  const addTokens = async (coinIds: string[]) => {
    await dispatch(addTokensById(coinIds))
  }

  // Update token holding
  const updateTokenHolding = (tokenId: string, newHolding: string) => {
    dispatch(updateHolding({ tokenId, holdings: newHolding }))
  }

  // Add token to watchlist
  const addTokenToWatchlist = (tokenId: string) => {
    dispatch(addToWatchlist(tokenId))
  }

  // Remove token from watchlist
  const removeTokenFromWatchlist = (tokenId: string) => {
    dispatch(removeFromWatchlist(tokenId))
  }

  // Clear entire portfolio
  const clearWatchlist = () => {
    dispatch(clearPortfolio())
  }

  // Get paginated tokens
  const getPaginatedTokens = (page: number, itemsPerPage: number = 10) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return tokens.slice(startIndex, endIndex)
  }

  // Calculate total pages
  const getTotalPages = (itemsPerPage: number = 10) => {
    return Math.ceil(tokens.length / itemsPerPage)
  }

  return {
    // State
    tokens,
    holdings,
    watchlist,
    portfolioTotal: `$${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    lastUpdated: formatLastUpdated(lastUpdated),
    isLoading,
    error,
    
    // Wallet connection
    isConnected,
    balance: balance ? formatEther(balance.value) : '0',
    symbol: balance?.symbol || 'ETH',
    
    // Actions
    refreshPortfolio,
    addTokens,
    updateTokenHolding,
    addTokenToWatchlist,
    removeTokenFromWatchlist,
    clearWatchlist,
    
    // Pagination helpers
    getPaginatedTokens,
    getTotalPages
  }
}