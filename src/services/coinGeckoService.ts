class CoinGeckoService {
  private apiKey: string | undefined
  private proApiKey: string | undefined
  private baseUrl: string
  private proBaseUrl: string
  private walletTokens: any[]
  private walletCallbacks: Set<Function>
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private requestQueue: Array<{ url: string; resolve: Function; reject: Function }> = []
  private isProcessingQueue = false
  private lastRequestTime = 0
  private readonly RATE_LIMIT_DELAY = 6000 // 6 seconds between requests (more conservative for free tier)
  private readonly CACHE_DURATION = 600000 // 10 minute cache (longer cache to reduce requests)

  constructor() {
    this.apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
    this.proApiKey = import.meta.env.VITE_COINGECKO_PRO_API_KEY;
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.proBaseUrl = 'https://pro-api.coingecko.com/api/v3';
    this.walletTokens = [];
    this.walletCallbacks = new Set();
  }

  // Wallet state management
  onWalletChange(callback: Function) {
    this.walletCallbacks.add(callback);
    return () => this.walletCallbacks.delete(callback);
  }

  notifyWalletChange(walletData: any) {
    this.walletCallbacks.forEach(callback => callback(walletData));
  }

  // Chain ID to network mapping for CoinGecko
  getNetworkFromChainId(chainId: number): string {
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

  private _getApiUrl(endpoint: string, isProEndpoint = false): string {
    const baseUrl = isProEndpoint && this.proApiKey ? this.proBaseUrl : this.baseUrl;
    const apiKeyParam = isProEndpoint && this.proApiKey 
      ? `x_cg_pro_api_key=${this.proApiKey}`
      : this.apiKey ? `x_cg_demo_api_key=${this.apiKey}` : '';
    
    const separator = endpoint.includes('?') ? '&' : '?';
    return apiKeyParam ? `${baseUrl}${endpoint}${separator}${apiKeyParam}` : `${baseUrl}${endpoint}`;
  }

  private getCacheKey(url: string): string {
    return url;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private async rateLimitedFetch(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { url, resolve, reject } = this.requestQueue.shift()!;
      
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        await new Promise(res => setTimeout(res, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
      }

      try {
        const response = await this.fetchWithRetry(url);
        this.lastRequestTime = Date.now();
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async fetchWithRetry(url: string, maxRetries = 5, baseBackoffMs = 2000): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        
        if (response.status === 429) {
          this.markRateLimited(); // Mark that we've been rate limited
          
          if (attempt === maxRetries) {
            console.error(`Rate limited after ${maxRetries} attempts. Consider getting a CoinGecko API key.`);
            throw new Error(`Rate limited after ${maxRetries} attempts`);
          }
          
          // More aggressive backoff for 429 errors
          const delay = baseBackoffMs * Math.pow(2, attempt) + Math.random() * 2000;
          console.log(`⚠️ Rate limited (429), waiting ${Math.round(delay/1000)}s before retry ${attempt + 1}/${maxRetries}`);
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
        console.log(`Request failed, retrying in ${Math.round(delay/1000)}s... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private async cachedFetch(url: string): Promise<any> {
    const cacheKey = this.getCacheKey(url);
    const cached = this.cache.get(cacheKey);
    
    console.log(`🔍 Cache check for: ${url}`);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('✅ Using cached data (still valid)');
      return cached.data;
    }

    if (cached) {
      console.log('⏰ Cache expired, fetching fresh data');
    } else {
      console.log('🆕 No cache found, fetching fresh data');
    }

    try {
      console.log('📞 Making API request...');
      const response = await this.rateLimitedFetch(url);
      
      console.log(`📊 Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Data received and parsed successfully');
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('❌ Fetch error:', error);
      
      if (cached) {
        console.log('🔄 Using stale cached data due to fetch error');
        return cached.data;
      }
      
      throw error;
    }
  }

  async getTokenPriceData(tokenAddresses: string | string[], network = 'ethereum') {
    try {
      const addresses = Array.isArray(tokenAddresses) ? tokenAddresses : [tokenAddresses];
      const results: any = {};
      
      console.log(`Fetching token price data for ${addresses.length} addresses (1 per request - CoinGecko free plan limit)...`);
      
      // CoinGecko free plan only allows 1 contract address per request
      for (const address of addresses) {
        try {
          const endpoint = `/simple/token_price/${network}?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
          const url = this._getApiUrl(endpoint, false);
          
          console.log(`Fetching price for token: ${address}`);
          const data = await this.cachedFetch(url);
          
          if (data && typeof data === 'object') {
            Object.assign(results, data);
            console.log(`✅ Token price fetched for: ${address}`);
          } else {
            console.log(`❌ No data returned for: ${address}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching data for address ${address}:`, error);
          
          // Continue with other addresses even if one fails
          continue;
        }
      }
      
      const successCount = Object.keys(results).length;
      console.log(`Token price data complete: ${successCount}/${addresses.length} tokens fetched successfully`);
      
      return Object.keys(results).length > 0 ? results : undefined;
    } catch (error) {
      console.error(`Error fetching token price data: ${error}`);
      return undefined;
    }
  }

  async getTrendingCoins() {
    try {
      const endpoint = '/search/trending';
      const url = this._getApiUrl(endpoint, false);
      
      console.log('🔗 Full trending API URL:', url);
      console.log('📡 Fetching trending coins from API...');
      
      // Check cache first
      const cacheKey = this.getCacheKey(url);
      const cached = this.cache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log('✅ Using cached trending data');
        return cached.data;
      }
      
      // For trending coins, make direct fetch without rate limiting to ensure instant response
      try {
        console.log('📞 Making direct API request for trending coins...');
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Trending data received and parsed successfully');
        
        // Cache the result
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        if (data?.coins) {
          console.log(`✅ Trending coins fetched: ${data.coins.length} trending tokens`);
          console.log('📋 First trending coin:', data.coins[0]?.item);
        } else {
          console.log('❌ No coins data in response:', data);
        }
        
        return data;
      } catch (fetchError) {
        console.error('❌ Direct fetch failed, falling back to rate-limited fetch:', fetchError);
        
        // Fallback to rate-limited fetch if direct fetch fails
        const data = await this.cachedFetch(url);
        
        if (data?.coins) {
          console.log(`✅ Trending coins fetched (fallback): ${data.coins.length} trending tokens`);
        }
        
        return data;
      }
      
    } catch (error) {
      console.error(`❌ Error fetching trending coins:`, error);
      return undefined;
    }
  }

  async getAllCryptocurrencies(page = 1, perPage = 10) {
    try {
      const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
      const url = this._getApiUrl(endpoint, false);
      
      const data = await this.cachedFetch(url);
      return data;
    } catch (error) {
      console.log(`Error fetching all cryptocurrencies: ${error}`);
      return undefined;
    }
  }

  async searchCoins(query: string) {
    try {
      const endpoint = `/search?query=${encodeURIComponent(query)}`;
      const url = this._getApiUrl(endpoint, false);
      
      const data = await this.cachedFetch(url);
      return data.coins || [];
    } catch (error) {
      console.log(`Error searching coins: ${error}`);
      return [];
    }
  }

  // Wallet-aware methods
  async getWalletTokenBalances(_walletAddress: string, chainId: number) {
    try {
      const network = this.getNetworkFromChainId(chainId);
      
      // This would typically integrate with a blockchain RPC or service like Alchemy/Infura
      // For now, we'll simulate wallet token discovery
      const mockWalletTokens = [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
        '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'  // UNI
      ];

      const tokenPrices = await this.getTokenPriceData(mockWalletTokens, network);
      
      if (tokenPrices) {
        this.walletTokens = mockWalletTokens.map(address => ({
          address,
          network,
          priceData: tokenPrices[address.toLowerCase()],
          balance: Math.random() * 100 // Mock balance
        }));
        
        return this.walletTokens;
      }
      
      return [];
    } catch (error) {
      console.log(`Error fetching wallet token balances: ${error}`);
      return [];
    }
  }

  async getPortfolioValue(walletAddress: string, chainId: number): Promise<number> {
    const tokens = await this.getWalletTokenBalances(walletAddress, chainId);
    return tokens.reduce((total, token) => {
      const price = token.priceData?.usd || 0;
      return total + (price * token.balance);
    }, 0);
  }

  // Enhanced token data with wallet context
  async getTokenDataWithWalletInfo(tokenAddresses: string | string[], network = 'ethereum', walletAddress: string | null = null) {
    const priceData = await this.getTokenPriceData(tokenAddresses, network);
    
    if (!priceData) return null;

    const tokensWithInfo = Object.entries(priceData).map(([address, data]) => ({
      address,
      network,
      priceData: data,
      isInWallet: walletAddress ? this.walletTokens.some(t => 
        t.address.toLowerCase() === address.toLowerCase()
      ) : false,
      walletBalance: walletAddress ? this.getWalletTokenBalance(address) : 0
    }));

    return tokensWithInfo;
  }

  getWalletTokenBalance(tokenAddress: string): number {
    const token = this.walletTokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.balance || 0;
  }

  // Get market data for table list
  async getMarketData(page = 1, perPage = 10, forceRefresh = false): Promise<any[]> {
    try {
      // Reduce request size if we've been rate limited recently
      const adjustedPerPage = this.hasBeenRateLimited() ? Math.min(perPage, 50) : perPage;
      
      const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${adjustedPerPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
      const url = this._getApiUrl(endpoint, false);
      
      console.log(`Fetching market data from API: ${url}`);
      
      if (forceRefresh) {
        // Clear cache for this URL when force refreshing
        const cacheKey = this.getCacheKey(url);
        this.cache.delete(cacheKey);
        console.log('Cache cleared for market data refresh');
        
        // For force refresh, use direct fetch to avoid rate limiting delay
        try {
          console.log('🚀 Making immediate API request for refresh...');
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Immediate refresh successful: ${data?.length || 0} coins`);
            
            // Update cache with fresh data
            this.cache.set(cacheKey, {
              data,
              timestamp: Date.now()
            });
            
            return data;
          } else if (response.status === 429) {
            console.log('⚠️ Rate limited on immediate refresh, falling back to cached/rate-limited fetch');
            // Fall through to rate-limited fetch below
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (directFetchError) {
          console.log('❌ Direct fetch failed, falling back to rate-limited fetch:', directFetchError);
          // Fall through to rate-limited fetch below
        }
      }
      
      const data = await this.cachedFetch(url);
      console.log(`Market data fetched: ${data?.length || 0} coins`);
      return data;
    } catch (error: any) {
      console.error(`Error fetching market data: ${error}`);
      
      // If we get rate limited (429 or rate limit error), try with smaller request and longer delay
      if ((error?.message?.includes('Rate limited') || error?.message?.includes('429')) && perPage > 20) {
        console.log('Rate limited - retrying with smaller request size after longer delay...');
        
        // Wait longer before retry for rate limit
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        
        return this.getMarketData(page, Math.floor(perPage / 2), forceRefresh);
      }
      
      return [];
    }
  }

  private rateLimitedTimestamp = 0;
  
  private hasBeenRateLimited(): boolean {
    return Date.now() - this.rateLimitedTimestamp < 60000; // Within last minute
  }

  private markRateLimited(): void {
    this.rateLimitedTimestamp = Date.now();
  }

  // Get coin data by IDs (for watchlist tokens) - now uses market data API
  async getCoinsByIds(ids: string[]) {
    try {
      // For now, get top market coins and filter by IDs if needed
      // This uses the market API endpoint you specified
      const idsString = ids.join(',');
      const endpoint = `/coins/markets?ids=${idsString}&vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`;
      const url = this._getApiUrl(endpoint, false);
      
      const data = await this.cachedFetch(url);
      return data;
    } catch (error) {
      console.log(`Error fetching coins by IDs: ${error}`);
      return [];
    }
  }
}

export const coinGeckoService = new CoinGeckoService();