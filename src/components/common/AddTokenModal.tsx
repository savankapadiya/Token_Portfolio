import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, Search, CircleCheck, Circle } from "lucide-react";
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
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({ open, setOpen, onAdd }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CoinGeckoToken[]>([]);
  const [trendingCoins, setTrendingCoins] = useState<CoinGeckoToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch trending coins on modal open
  useEffect(() => {
    if (open) {
      console.log('🚀 Modal opened - fetching trending coins...');
      // Reset state when opening
      setTrendingCoins([]);
      setSearchResults([]);
      setSearch('');
      setSelected([]);
      // Fetch trending coins immediately without any delay
      fetchTrendingCoins();
    }
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (search.length > 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await coinGeckoService.searchCoins(search);
          setSearchResults(results.slice(0, 10)); // Limit to 10 results
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [search]);

  const fetchTrendingCoins = async () => {
    try {
      console.log('📡 Starting fetchTrendingCoins...');
      setIsLoading(true);

      const trending = await coinGeckoService.getTrendingCoins();
      console.log('📊 Trending API response:', trending);

      if (trending?.coins) {
        const trendingTokens = trending.coins.slice(0, 7).map((coin: TrendingToken) => coin.item);
        console.log('✅ Trending tokens processed:', trendingTokens.length, trendingTokens);
        setTrendingCoins(trendingTokens);
      } else {
        console.log('❌ No trending coins data received');
      }
    } catch (error) {
      console.error('❌ Error fetching trending coins:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 fetchTrendingCoins completed');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    if (selected.length > 0) {
      try {
        setIsLoading(true);
        await onAdd(selected);
        setSelected([]);
        setSearch("");
        setSearchResults([]);
        setOpen(false);
      } catch (error) {
        console.error('Error adding tokens:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const displayTokens = search.length > 2 ? searchResults : trendingCoins;

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogContent className="bg-[#212124] border-[#333] text-white sm:w-[640px] w-full rounded-xl !p-0">
        {/* Search Bar */}
        <div className="relative">
          {/* <Input
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#27272A] border-[#333] text-white placeholder:text-[#A1A1AA] focus:ring-0 focus-visible:ring-0 pl-10"
          /> */}
          <input
            placeholder="Search tokens (e.g., ETH, SOL)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#27272A] border-[#333] text-white placeholder:text-[#A1A1AA] rounded-tr-xl rounded-tl-xl border-b-1 overflow-hidden p-4 w-full outline-none"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Token List */}
        <div className="max-h-80 overflow-y-auto px-2">
          <p className="text-xs text-[#A1A1AA] mb-2 uppercase tracking-wider">
            {search.length > 2 ? 'Search Results' : 'Trending'}
          </p>

          {isLoading && displayTokens.length === 0 ? (
            <div className="text-center py-8 text-[#A1A1AA] text-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
              Loading tokens...
            </div>
          ) : (
            <>
              {displayTokens.map((token) => (
                <div
                  key={token.id}
                  onClick={() => toggleSelect(token.id)}
                  className={`flex justify-between items-center border border-[#212124] px-3 py-2 rounded-md cursor-pointer mb-1 transition-colors ${selected.includes(token.id)
                    ? "bg-[#A9E8510F] border border-[#A9E8510F]"
                    : "hover:bg-[#27272A]"  
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#333] flex items-center justify-center">
                      {token.thumb || token.large ? (
                        <img
                          src={token.thumb || token.large}
                          alt={token.name}
                          className="w-8 h-8 rounded-full object-cover"
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
                    {/* {token.market_cap_rank && (
                      <span className="text-xs text-[#A1A1AA] ml-auto mr-2">
                        #{token.market_cap_rank}
                      </span>
                    )} */}
                  </div>
                  <div className="flex items-center gap-3">
                    {selected.includes(token.id) && (
                      <>
                        <Star className="h-4 w-4 fill-[#A9E851] text-[#A9E851]" />
                      </>
                    )}
                    {selected.includes(token.id) ? (
                      <CircleCheck className="h-4 w-4 text-[#A9E851]" />
                    ) : (
                      <Circle className="h-4 w-4  text-[#A1A1AA]" />
                    )}
                  </div>
                </div>
              ))}

              {!isLoading && displayTokens.length === 0 && (
                <div className="text-center py-8 text-[#A1A1AA] text-sm">
                  {search.length > 2 ? 'No tokens found' : 'No trending tokens available'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end  w-full bg-[#27272A] px-4 py-3 rounded-bl-xl rounded-br-xl ">
            <button
              className="bg-transparent text-[#52525B] font-medium px-3 py-1.5 rounded-sm  w-fit text-sm border border-[#ffffff10]"
              onClick={handleAdd}
              disabled={selected.length === 0 || isLoading}
            >
              {isLoading ? 'Adding...' : `Add ${selected.length} to Watchlist`}
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTokenModal;