import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { coinGeckoService } from '@/services/coinGeckoService'

interface Token {
  id: string
  name: string
  symbol: string
  current_price: number
  value: string
  holdings: string
}

export const usePortfolio = (tokenList?: Token[]) => {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [portfolioTotal, setPortfolioTotal] = useState<string>('$0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [walletPortfolioValue, setWalletPortfolioValue] = useState<number>(0)
  
  const { address, isConnected } = useAccount()
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
  })

  // Function to format timestamp
  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  // Calculate portfolio total from watchlist
  const calculatePortfolioTotal = () => {
    if (!tokenList || tokenList.length === 0) {
      return '$0.00'
    }
    
    const total = tokenList.reduce((sum, token) => {
      const value = parseFloat(token.value.replace('$', '').replace(/,/g, '')) || 0
      return sum + value
    }, 0)
    
    return `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Get wallet portfolio value from CoinGecko service
  const getWalletPortfolioValue = async () => {
    if (!address || !isConnected) {
      setWalletPortfolioValue(0)
      return
    }

    try {
      console.log('Fetching wallet portfolio value...')
      const portfolioValue = await coinGeckoService.getPortfolioValue(address, 1) // Ethereum mainnet
      setWalletPortfolioValue(portfolioValue)
      console.log('Wallet portfolio value:', portfolioValue)
    } catch (error) {
      console.error('Error fetching wallet portfolio:', error)
      setWalletPortfolioValue(0)
    }
  }

  // Function to refresh portfolio data
  const refreshPortfolio = async () => {
    setIsLoading(true)
    setLastUpdated(new Date())
    
    if (isConnected && address) {
      // When wallet is connected, get real portfolio value
      await getWalletPortfolioValue()
      
      try {
        // Refetch wallet balance for display
        await refetchBalance()
      } catch (error) {
        console.error('Error fetching wallet data:', error)
      }
    } else {
      // When wallet not connected, use watchlist total
      const calculatedTotal = calculatePortfolioTotal()
      setPortfolioTotal(calculatedTotal)
    }
    
    setTimeout(() => setIsLoading(false), 1000) // Show loading for UX
  }

  // Update portfolio total when tokenList changes (only if wallet not connected)
  useEffect(() => {
    if (!isConnected) {
      const calculatedTotal = calculatePortfolioTotal()
      setPortfolioTotal(calculatedTotal)
    }
  }, [tokenList, isConnected])

  // Update portfolio total when wallet portfolio value changes
  useEffect(() => {
    if (isConnected && walletPortfolioValue > 0) {
      setPortfolioTotal(`$${walletPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    }
  }, [walletPortfolioValue, isConnected])

  // Update timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Refresh portfolio when wallet connects/disconnects
  useEffect(() => {
    if (isConnected && address) {
      getWalletPortfolioValue()
    } else {
      setWalletPortfolioValue(0)
      const calculatedTotal = calculatePortfolioTotal()
      setPortfolioTotal(calculatedTotal)
    }
  }, [isConnected, address])

  return {
    portfolioTotal: isConnected ? `$${walletPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : portfolioTotal,
    lastUpdated: formatLastUpdated(lastUpdated),
    isLoading,
    refreshPortfolio,
    isConnected,
    balance: balance ? formatEther(balance.value) : '0',
    symbol: balance?.symbol || 'ETH',
    walletPortfolioValue
  }
}