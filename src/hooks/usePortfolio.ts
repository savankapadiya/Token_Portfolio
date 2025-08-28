import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'

export const usePortfolio = () => {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [portfolioTotal, setPortfolioTotal] = useState<string>('$0.00')
  const [isLoading, setIsLoading] = useState(false)
  
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

  // Function to refresh portfolio data
  const refreshPortfolio = async () => {
    setIsLoading(true)
    setLastUpdated(new Date())
    
    if (isConnected && address) {
      try {
        // Refetch wallet balance
        await refetchBalance()
        
        // Calculate portfolio total from balance
        if (balance) {
          const ethValue = parseFloat(formatEther(balance.value))
          // Mock ETH price for demo - in real app, fetch from price API
          const ethPrice = 2654.32
          const portfolioValue = ethValue * ethPrice
          setPortfolioTotal(`$${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        }
      } catch (error) {
        console.error('Error fetching portfolio data:', error)
      }
    } else {
      // Show default value when not connected
      setPortfolioTotal('$0.00')
    }
    
    setTimeout(() => setIsLoading(false), 1000) // Show loading for UX
  }

  // Update timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Refresh portfolio when wallet connects/disconnects
  useEffect(() => {
    refreshPortfolio()
  }, [isConnected, address, balance])

  return {
    portfolioTotal,
    lastUpdated: formatLastUpdated(lastUpdated),
    isLoading,
    refreshPortfolio,
    isConnected,
    balance: balance ? formatEther(balance.value) : '0',
    symbol: balance?.symbol || 'ETH'
  }
}