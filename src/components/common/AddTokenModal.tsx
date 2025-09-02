import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Star, CircleCheck, Circle } from "lucide-react";
import { coinGeckoService } from "@/services/coinGeckoService";

interface CoinGeckoToken {
  id: string;
  name: string;
  symbol: string;
  large?: string;
  thumb?: string;
  market_cap_rank?: number;
}

interface TrendingToken {
  item: CoinGeckoToken;
}

interface AddTokenModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onAdd: (coinIds: string[]) => Promise<void>;
  onRemove: (coinIds: string[]) => Promise<void>;
  selectedTokens: string[];
  setSelectedTokens: (selected: string[]) => void;
  watchlist?: string[];
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({ open, setOpen, onAdd, onRemove, selectedTokens, setSelectedTokens, watchlist = [] }) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CoinGeckoToken[]>([]);
  const [trendingCoins, setTrendingCoins] = useState<CoinGeckoToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setTrendingCoins([]);
      setSearchResults([]);
      setSearch('');
      setSelectedTokens(watchlist);
      setError(null);
      setIsAdding(false);
      fetchTrendingCoins();
    }
  }, [open, watchlist]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      
      if (search.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        if (trendingCoins.length === 0) {
          fetchTrendingCoins();
        }
        return;
      }

      setIsSearching(true);
      try {
        const results = await coinGeckoService.searchCoins(search);
        setSearchResults(results.slice(0, 10));
        setError(null);
      } catch (error) {
        setSearchResults([]);
        setError('Failed to search tokens. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [search, trendingCoins.length]);

  const fetchTrendingCoins = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const trending = await coinGeckoService.getTrendingCoins();

      if (trending?.coins) {
        const trendingTokens = trending.coins.slice(0, 7).map((coin: TrendingToken) => coin.item);
        setTrendingCoins(trendingTokens);
      }
    } catch (error) {
      setError('Failed to load trending tokens. Please refresh to try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedTokens(selectedTokens.includes(id) 
      ? selectedTokens.filter(s => s !== id) 
      : [...selectedTokens, id]
    );
  }, [selectedTokens]);

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      
      const tokensToAdd = selectedTokens.filter(token => !watchlist.includes(token));
      const tokensToRemove = watchlist.filter(token => !selectedTokens.includes(token));
      
      if (tokensToAdd.length > 0) {
        await onAdd(tokensToAdd);
      }
      
      if (tokensToRemove.length > 0) {
        await onRemove(tokensToRemove);
      }
      
      setSelectedTokens([]);
      setSearch("");
      setSearchResults([]);
      setError(null);
      setOpen(false);
    } catch (error) {
      setError('Failed to update tokens. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const displayTokens = useMemo(() => 
    search.length > 0 ? searchResults : trendingCoins,
    [search.length, searchResults, trendingCoins]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogContent 
        className="bg-[#212124] border-[#333] text-white sm:w-[640px] w-full rounded-xl !p-0"
        onClick={(e) => e.stopPropagation()}
        showCloseButton={!isSearching}
      >
        <div className="relative">
          <input
            placeholder="Search tokens (e.g., ETH, SOL)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#27272A] border-[#333] text-white placeholder:text-[#A1A1AA] rounded-tr-xl rounded-tl-xl border-b-1 overflow-hidden p-4 w-full outline-none"
          />
        </div>

        <div 
          className="max-h-80 overflow-y-auto px-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-[#A1A1AA] mb-2 uppercase tracking-wider">
            {search.length > 0 ? 'Search Results' : 'Trending'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg animate-in fade-in-0">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full flex-shrink-0 mt-0.5"></div>
                <div className="text-xs text-red-300">{error}</div>
              </div>
            </div>
          )}

          {(isLoading && displayTokens.length === 0) || isSearching ? (
            <div className="text-center py-8 text-[#A1A1AA] text-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A9E851] mx-auto mb-2"></div>
              {isSearching ? 'Searching tokens...' : 'Loading tokens...'}
            </div>
          ) : (
            <>
              {displayTokens.map((token) => (
                <div
                  key={token.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSelect(token.id);
                  }}
                  className={`flex justify-between items-center border border-[#212124] px-3 py-2 rounded-md cursor-pointer mb-1 transition-all duration-150 hover:scale-[0.99] ${selectedTokens.includes(token.id)
                    ? "bg-[#A9E8510F] border border-[#A9E8510F] scale-[0.99]"
                    : "hover:bg-[#27272A]"  
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#333] flex items-center justify-center">
                      {token.thumb || token.large ? (
                        <img
                          src={token.thumb || token.large}
                          alt={token.name}
                          className="w-8 h-8 rounded-full object-cover transition-transform duration-150"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<span class="text-xs font-bold">${token.symbol?.charAt(0).toUpperCase() || token.name.charAt(0)}</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold">
                          {token.symbol?.charAt(0).toUpperCase() || token.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex  items-center gap-1.5">
                      <span className="text-sm font-medium">{token.name}</span>
                      <span className="text-xs text-[#A1A1AA] uppercase">({token.symbol})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedTokens.includes(token.id) && (
                      <Star className="h-4 w-4 fill-[#A9E851] text-[#A9E851] animate-in zoom-in-50" />
                    )}
                    {selectedTokens.includes(token.id) ? (
                      <CircleCheck className="h-4 w-4 text-[#A9E851] animate-in zoom-in-95" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#A1A1AA] transition-colors duration-150" />
                    )}
                  </div>
                </div>
              ))}

              {!isLoading && !isSearching && !error && displayTokens.length === 0 && (
                <div className="text-center py-8 text-[#A1A1AA] text-sm">
                  {search.length > 0 ? 'No tokens found' : 'No trending tokens available'}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end  w-full bg-[#27272A] px-4 py-3 rounded-bl-xl rounded-br-xl ">
            <button
              className={`font-medium px-3 py-1.5 rounded-sm w-fit text-sm transition-all duration-150 ${
                !isAdding
                  ? 'bg-[#A9E851] text-black hover:bg-[#A9E851]/80 hover:text-black hover:scale-105' 
                  : 'bg-transparent text-[#52525B] border border-[#ffffff10] cursor-not-allowed'
              } ${isAdding ? 'opacity-75 cursor-wait' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd();
              }}
              disabled={isLoading || isAdding}
            >
              {isAdding ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-black"></div>
                  Updating...
                </div>
              ) : (
                'Update Watchlist'
              )}
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTokenModal;