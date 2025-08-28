class CoinGeckoService {
  private apiKey: string | undefined
  private proApiKey: string | undefined
  private baseUrl: string
  private proBaseUrl: string
  private walletTokens: any[]
  private walletCallbacks: Set<Function>

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

  async getTokenPriceData(tokenAddresses: string | string[], network = 'ethereum') {
    try {
      const addresses = Array.isArray(tokenAddresses) ? tokenAddresses : [tokenAddresses];
      const results: any = {};
      
      // Fetch each token individually to avoid rate limits
      for (const address of addresses) {
        const endpoint = `/simple/token_price/${network}?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
        
        const url = this._getApiUrl(endpoint, false);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          Object.assign(results, data);
        }
        
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return Object.keys(results).length > 0 ? results : undefined;
    } catch (error) {
      console.log(`Error fetching token price data: ${error}`);
      return undefined;
    }
  }

  async getTrendingCoins() {
    try {
      const endpoint = '/search/trending';
      const url = this._getApiUrl(endpoint, false);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
        return undefined;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.log(`Error fetching trending coins: ${error}`);
      return undefined;
    }
  }

  async getAllCryptocurrencies(page = 1, perPage = 10) {
    try {
      const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
      const url = this._getApiUrl(endpoint, false);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
        return undefined;
      }
      
      const data = await response.json();
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
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
        return undefined;
      }
      
      const data = await response.json();
      return data.coins || [];
    } catch (error) {
      console.log(`Error searching coins: ${error}`);
      return [];
    }
  }

  // Wallet-aware methods
  async getWalletTokenBalances(walletAddress: string, chainId: number) {
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

  // Get coin data by IDs (for watchlist tokens)
  async getCoinsByIds(ids: string[]) {
    try {
      const idsString = ids.join(',');
      const endpoint = `/coins/markets?ids=${idsString}&vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`;
      const url = this._getApiUrl(endpoint, false);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.log(`Error fetching coins by IDs: ${error}`);
      return [];
    }
  }
}

export const coinGeckoService = new CoinGeckoService();