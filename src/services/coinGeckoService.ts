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

const RATE_LIMIT_DELAY = 6000
const CACHE_DURATION = 600000
const SEARCH_CACHE_DURATION = 300000

const initializeConfig = () => {
  apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
  proApiKey = import.meta.env.VITE_COINGECKO_PRO_API_KEY;
  baseUrl = 'https://api.coingecko.com/api/v3';
  proBaseUrl = 'https://pro-api.coingecko.com/api/v3';
}

initializeConfig()

export const onWalletChange = (callback: Function) => {
  walletCallbacks.add(callback);
  return () => walletCallbacks.delete(callback);
}

export const notifyWalletChange = (walletData: any) => {
  walletCallbacks.forEach(callback => callback(walletData));
}

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
    
    for (const address of addresses) {
      try {
        const endpoint = `/simple/token_price/${network}?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
        const url = getApiUrl(endpoint, false);
        
        const data = await cachedFetch(url);
        
        if (data && typeof data === 'object') {
          Object.assign(results, data);
        }
      } catch (error) {
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
    
    const cacheKey = getCacheKey(url);
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (fetchError) {
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
    
    const searchCacheKey = `search:${normalizedQuery}`;
    const searchCached = searchCache.get(searchCacheKey);
    
    if (searchCached && Date.now() - searchCached.timestamp < SEARCH_CACHE_DURATION) {
      return searchCached.data;
    }
    
    const endpoint = `/search?query=${encodeURIComponent(query)}`;
    const url = getApiUrl(endpoint, false);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const coins = data.coins || [];
      
      searchCache.set(searchCacheKey, {
        data: coins,
        timestamp: Date.now()
      });
      
      cache.set(getCacheKey(url), {
        data,
        timestamp: Date.now()
      });
      
      return coins;
    } catch (fetchError) {
      if (searchCached) {
        return searchCached.data;
      }
      
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

export const getWalletTokenBalances = async (_walletAddress: string, chainId: number) => {
  try {
    const network = getNetworkFromChainId(chainId);
    
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

export const getMarketData = async (page = 1, perPage = 10, forceRefresh = false): Promise<any[]> => {
  try {
    const adjustedPerPage = hasBeenRateLimited() ? Math.min(perPage, 50) : perPage;
    
    const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${adjustedPerPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
    const url = getApiUrl(endpoint, false);
    
    if (forceRefresh) {
      const cacheKey = getCacheKey(url);
      cache.delete(cacheKey);
      
      try {
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          
          return data;
        } else if (response.status === 429) {
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (directFetchError) {
      }
    }
    
    const data = await cachedFetch(url);
    return data;
  } catch (error: any) {
    if ((error?.message?.includes('Rate limited') || error?.message?.includes('429')) && perPage > 20) {
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      return getMarketData(page, Math.floor(perPage / 2), forceRefresh);
    }
    
    return [];
  }
}

const hasBeenRateLimited = (): boolean => {
  return Date.now() - rateLimitedTimestamp < 60000;
}

const markRateLimited = (): void => {
  rateLimitedTimestamp = Date.now();
}

export const getCoinsByIds = async (ids: string[]) => {
  try {
    const idsString = ids.join(',');
    const endpoint = `/coins/markets?ids=${idsString}&vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`;
    const url = getApiUrl(endpoint, false);
    
    const data = await cachedFetch(url);
    return data;
  } catch (error) {
    return [];
  }
}

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