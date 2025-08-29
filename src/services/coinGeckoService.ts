// Module-level state variables (replacing class instance variables)
let apiKey: string | undefined
let proApiKey: string | undefined
let baseUrl: string
let proBaseUrl: string
let walletTokens: any[] = []
let walletCallbacks: Set<Function> = new Set()
let cache: Map<string, { data: any; timestamp: number }> = new Map()
let searchCache: Map<string, { data: any; timestamp: number }> = new Map()
let requestQueue: Array<{ url: string; resolve: Function; reject: Function }> = []
let isProcessingQueue = false
let lastRequestTime = 0
let rateLimitedTimestamp = 0

// Constants
const RATE_LIMIT_DELAY = 6000 // 6 seconds between requests (more conservative for free tier)
const CACHE_DURATION = 600000 // 10 minute cache (longer cache to reduce requests)
const SEARCH_CACHE_DURATION = 300000 // 5 minute cache for search results

// Initialize configuration
const initializeConfig = () => {
  apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
  proApiKey = import.meta.env.VITE_COINGECKO_PRO_API_KEY;
  baseUrl = 'https://api.coingecko.com/api/v3';
  proBaseUrl = 'https://pro-api.coingecko.com/api/v3';
}

// Initialize on module load
initializeConfig()

// Wallet state management
export const onWalletChange = (callback: Function) => {
  walletCallbacks.add(callback);
  return () => walletCallbacks.delete(callback);
}

export const notifyWalletChange = (walletData: any) => {
  walletCallbacks.forEach(callback => callback(walletData));
}

// Chain ID to network mapping for CoinGecko
export const getNetworkFromChainId = (chainId: number): string => {
  const chainMap: { [key: number]: string } = {
    1: 'ethereum',      // Ethereum Mainnet
    137: 'polygon-pos', // Polygon
    42161: 'arbitrum-one', // Arbitrum
    10: 'optimistic-ethereum', // Optimism
    8453: 'base',       // Base
    56: 'binance-smart-chain', // BSC
    250: 'fantom',      // Fantom
    43114: 'avalanche'  // Avalanche
  };
  return chainMap[chainId] || 'ethereum';
}

const getApiUrl = (endpoint: string, isProEndpoint = false): string => {
  const currentBaseUrl = isProEndpoint && proApiKey ? proBaseUrl : baseUrl;
  const apiKeyParam = isProEndpoint && proApiKey 
    ? `x_cg_pro_api_key=${proApiKey}`
    : apiKey ? `x_cg_demo_api_key=${apiKey}` : '';
  
  const separator = endpoint.includes('?') ? '&' : '?';
  return apiKeyParam ? `${currentBaseUrl}${endpoint}${separator}${apiKeyParam}` : `${currentBaseUrl}${endpoint}`;
}

const getCacheKey = (url: string): string => {
  return url;
}

const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
}

const rateLimitedFetch = async (url: string): Promise<Response> => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, resolve, reject });
    processQueue();
  });
}

const processQueue = async (): Promise<void> => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { url, resolve, reject } = requestQueue.shift()!;
    
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(res => setTimeout(res, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }

    try {
      const response = await fetchWithRetry(url);
      lastRequestTime = Date.now();
      resolve(response);
    } catch (error) {
      reject(error);
    }
  }

  isProcessingQueue = false;
}

const fetchWithRetry = async (url: string, maxRetries = 5, baseBackoffMs = 2000): Promise<Response> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        markRateLimited(); // Mark that we've been rate limited
        
        if (attempt === maxRetries) {
          throw new Error(`Rate limited after ${maxRetries} attempts`);
        }
        
        // More aggressive backoff for 429 errors
        const delay = baseBackoffMs * Math.pow(2, attempt) + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseBackoffMs * Math.pow(1.5, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

const cachedFetch = async (url: string): Promise<any> => {
  const cacheKey = getCacheKey(url);
  const cached = cache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  try {
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    if (cached) {
      return cached.data;
    }
    
    throw error;
  }
}

export const getTokenPriceData = async (tokenAddresses: string | string[], network = 'ethereum') => {
  try {
    const addresses = Array.isArray(tokenAddresses) ? tokenAddresses : [tokenAddresses];
    const results: any = {};
    
    // CoinGecko free plan only allows 1 contract address per request
    for (const address of addresses) {
      try {
        const endpoint = `/simple/token_price/${network}?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
        const url = getApiUrl(endpoint, false);
        
        const data = await cachedFetch(url);
        
        if (data && typeof data === 'object') {
          Object.assign(results, data);
        }
      } catch (error) {
        // Continue with other addresses even if one fails
        continue;
      }
    }
    
    return Object.keys(results).length > 0 ? results : undefined;
  } catch (error) {
    return undefined;
  }
}

export const getTrendingCoins = async () => {
  try {
    const endpoint = '/search/trending';
    const url = getApiUrl(endpoint, false);
    
    // Check cache first
    const cacheKey = getCacheKey(url);
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    // For trending coins, make direct fetch without rate limiting to ensure instant response
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (fetchError) {
      // Fallback to rate-limited fetch if direct fetch fails
      const data = await cachedFetch(url);
      
      return data;
    }
    
  } catch (error) {
    return undefined;
  }
}

export const getAllCryptocurrencies = async (page = 1, perPage = 10) => {
  try {
    const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
    const url = getApiUrl(endpoint, false);
    
    const data = await cachedFetch(url);
    return data;
  } catch (error) {
    return undefined;
  }
}

export const searchCoins = async (query: string) => {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check search cache first for instant response
    const searchCacheKey = `search:${normalizedQuery}`;
    const searchCached = searchCache.get(searchCacheKey);
    
    if (searchCached && Date.now() - searchCached.timestamp < SEARCH_CACHE_DURATION) {
      return searchCached.data;
    }
    
    const endpoint = `/search?query=${encodeURIComponent(query)}`;
    const url = getApiUrl(endpoint, false);
    
    // For search, make direct fetch without rate limiting for instant response
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const coins = data.coins || [];
      
      // Cache in both regular cache and search cache
      searchCache.set(searchCacheKey, {
        data: coins,
        timestamp: Date.now()
      });
      
      // Also cache the full API response
      cache.set(getCacheKey(url), {
        data,
        timestamp: Date.now()
      });
      
      return coins;
    } catch (fetchError) {
      // Fallback to search cache if available
      if (searchCached) {
        return searchCached.data;
      }
      
      // Fallback to regular cache
      const cached = cache.get(getCacheKey(url));
      if (cached && cached.data) {
        return cached.data.coins || [];
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    return [];
  }
}

// Wallet-aware methods
export const getWalletTokenBalances = async (_walletAddress: string, chainId: number) => {
  try {
    const network = getNetworkFromChainId(chainId);
    
    // This would typically integrate with a blockchain RPC or service like Alchemy/Infura
    // For now, we'll simulate wallet token discovery
    const mockWalletTokens = [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'  // UNI
    ];

    const tokenPrices = await getTokenPriceData(mockWalletTokens, network);
    
    if (tokenPrices) {
      walletTokens = mockWalletTokens.map(address => ({
        address,
        network,
        priceData: tokenPrices[address.toLowerCase()],
        balance: Math.random() * 100 // Mock balance
      }));
      
      return walletTokens;
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

export const getPortfolioValue = async (walletAddress: string, chainId: number): Promise<number> => {
  const tokens = await getWalletTokenBalances(walletAddress, chainId);
  return tokens.reduce((total, token) => {
    const price = token.priceData?.usd || 0;
    return total + (price * token.balance);
  }, 0);
}

// Enhanced token data with wallet context
export const getTokenDataWithWalletInfo = async (tokenAddresses: string | string[], network = 'ethereum', walletAddress: string | null = null) => {
  const priceData = await getTokenPriceData(tokenAddresses, network);
  
  if (!priceData) return null;

  const tokensWithInfo = Object.entries(priceData).map(([address, data]) => ({
    address,
    network,
    priceData: data,
    isInWallet: walletAddress ? walletTokens.some(t => 
      t.address.toLowerCase() === address.toLowerCase()
    ) : false,
    walletBalance: walletAddress ? getWalletTokenBalance(address) : 0
  }));

  return tokensWithInfo;
}

export const getWalletTokenBalance = (tokenAddress: string): number => {
  const token = walletTokens.find(t => 
    t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return token?.balance || 0;
}

// Get market data for table list
export const getMarketData = async (page = 1, perPage = 10, forceRefresh = false): Promise<any[]> => {
  try {
    // Reduce request size if we've been rate limited recently
    const adjustedPerPage = hasBeenRateLimited() ? Math.min(perPage, 50) : perPage;
    
    const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${adjustedPerPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
    const url = getApiUrl(endpoint, false);
    
    if (forceRefresh) {
      // Clear cache for this URL when force refreshing
      const cacheKey = getCacheKey(url);
      cache.delete(cacheKey);
      
      // For force refresh, use direct fetch to avoid rate limiting delay
      try {
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          // Update cache with fresh data
          cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          
          return data;
        } else if (response.status === 429) {
          // Fall through to rate-limited fetch below
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (directFetchError) {
        // Fall through to rate-limited fetch below
      }
    }
    
    const data = await cachedFetch(url);
    return data;
  } catch (error: any) {
    // If we get rate limited (429 or rate limit error), try with smaller request and longer delay
    if ((error?.message?.includes('Rate limited') || error?.message?.includes('429')) && perPage > 20) {
      
      // Wait longer before retry for rate limit
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
      
      return getMarketData(page, Math.floor(perPage / 2), forceRefresh);
    }
    
    return [];
  }
}

const hasBeenRateLimited = (): boolean => {
  return Date.now() - rateLimitedTimestamp < 60000; // Within last minute
}

const markRateLimited = (): void => {
  rateLimitedTimestamp = Date.now();
}

// Get coin data by IDs (for watchlist tokens) - now uses market data API
export const getCoinsByIds = async (ids: string[]) => {
  try {
    // For now, get top market coins and filter by IDs if needed
    // This uses the market API endpoint you specified
    const idsString = ids.join(',');
    const endpoint = `/coins/markets?ids=${idsString}&vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`;
    const url = getApiUrl(endpoint, false);
    
    const data = await cachedFetch(url);
    return data;
  } catch (error) {
    return [];
  }
}

// Legacy export for backward compatibility - create an object with all the functions
export const coinGeckoService = {
  onWalletChange,
  notifyWalletChange,
  getNetworkFromChainId,
  getTokenPriceData,
  getTrendingCoins,
  getAllCryptocurrencies,
  searchCoins,
  getWalletTokenBalances,
  getPortfolioValue,
  getTokenDataWithWalletInfo,
  getWalletTokenBalance,
  getMarketData,
  getCoinsByIds
}