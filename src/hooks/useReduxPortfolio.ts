import { useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { useAppDispatch, useAppSelector } from './redux'
import { 
  addTokensById, 
  updateHolding, 
  addToWatchlist, 
  removeFromWatchlist, 
  clearPortfolio,
  clearTokensOnly,
  updateLastRefresh,
  loadWalletData
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

  useEffect(() => {
    if (!address) {
      // If disconnected, clear everything including localStorage
      dispatch(clearTokensOnly())
    } else {
      // Load wallet-specific data
      dispatch(loadWalletData(address))
    }
  }, [dispatch, address])

  useEffect(() => {
    if (isConnected && address && watchlist.length > 0 && tokens.length === 0) {
      dispatch(addTokensById(watchlist))
    }
  }, [dispatch, isConnected, address, watchlist, tokens.length])

  const formatLastUpdated = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const getWalletPortfolioValue = async () => {
    if (!address || !isConnected) {
      return 0
    }

    try {
      const portfolioValue = await coinGeckoService.getPortfolioValue(address, 1)
      return portfolioValue
    } catch (error) {
      return 0
    }
  }

  const refreshPortfolio = async () => {
    dispatch(updateLastRefresh())
    
    const promises = []
    
    if (watchlist.length > 0) {
      promises.push(dispatch(addTokensById(watchlist)))
    }
    
    if (isConnected && address) {
      promises.push(
        getWalletPortfolioValue().catch(() => {})
      )
      promises.push(
        refetchBalance().catch(() => {})
      )
    }
    
    await Promise.all(promises)
  }

  const addTokens = async (coinIds: string[]) => {
    await dispatch(addTokensById(coinIds))
  }

  const updateTokenHolding = (tokenId: string, newHolding: string) => {
    dispatch(updateHolding({ tokenId, holdings: newHolding }))
  }

  const addTokenToWatchlist = (tokenId: string) => {
    dispatch(addToWatchlist(tokenId))
  }

  const removeTokenFromWatchlist = (tokenId: string) => {
    dispatch(removeFromWatchlist(tokenId))
  }

  const clearWatchlist = () => {
    dispatch(clearPortfolio())
  }

  const getPaginatedTokens = (page: number, itemsPerPage: number = 10) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return tokens.slice(startIndex, endIndex)
  }

  const getTotalPages = (itemsPerPage: number = 10) => {
    return Math.ceil(tokens.length / itemsPerPage)
  }

  return {
    tokens,
    holdings,
    watchlist,
    portfolioTotal: `$${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    lastUpdated: formatLastUpdated(lastUpdated),
    isLoading,
    error,
    
    isConnected,
    balance: balance ? formatEther(balance.value) : '0',
    symbol: balance?.symbol || 'ETH',
    
    refreshPortfolio,
    addTokens,
    updateTokenHolding,
    addTokenToWatchlist,
    removeTokenFromWatchlist,
    clearWatchlist,
    
    getPaginatedTokens,
    getTotalPages
  }
}