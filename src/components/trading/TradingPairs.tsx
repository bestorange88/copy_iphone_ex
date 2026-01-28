import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { fetchAllTickers, MarketTicker } from "@/services/marketData";

interface TradingPairsProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

export const TradingPairs = ({ selectedPair, onSelectPair }: TradingPairsProps) => {
  const [search, setSearch] = useState("");
  const [pairs, setPairs] = useState<MarketTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPairs = async () => {
      try {
        setLoading(true);
        const tickers = await fetchAllTickers('okx');
        setPairs(tickers);
      } catch (error) {
        console.error('Failed to load trading pairs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPairs();
    const interval = setInterval(loadPairs, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  const filteredPairs = pairs.filter(pair => 
    pair.symbol.toLowerCase().includes(search.toLowerCase()) ||
    pair.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-lg p-1.5 lg:p-3 h-full flex flex-col overflow-hidden">
      <div className="mb-1 lg:mb-3">
        <div className="relative">
          <Search className="absolute left-1.5 top-1.5 lg:top-2.5 h-2.5 w-2.5 lg:h-4 lg:w-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-6 lg:pl-8 h-6 lg:h-9 text-[9px] lg:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-px lg:space-y-1 scrollbar-hide">
          {filteredPairs.map((pair) => {
            const isPositive = parseFloat(pair.priceChangePercent) > 0;
            const isSelected = pair.symbol === selectedPair;
            
            return (
              <button
                key={pair.symbol}
                onClick={() => onSelectPair(pair.symbol)}
                className={`w-full text-left px-1.5 py-0.5 lg:p-2 rounded transition-colors ${
                  isSelected 
                    ? 'bg-primary/10 border border-primary' 
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[9px] lg:text-sm overflow-hidden text-ellipsis whitespace-nowrap">{pair.name || pair.symbol}</span>
                  <span className={`text-[8px] lg:text-xs font-medium flex-shrink-0 ml-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{pair.priceChangePercent}%
                  </span>
                </div>
                <div className="text-[8px] lg:text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">{parseFloat(pair.lastPrice).toFixed(2)} USDT</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
