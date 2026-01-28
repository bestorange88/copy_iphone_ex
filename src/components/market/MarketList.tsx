import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Loader2, Wifi, WifiOff } from "lucide-react";
import { fetchAllTickers, MarketTicker } from "@/services/marketData";
import { useWebSocketBatchPrices } from "@/hooks/useWebSocketBatchPrices";
import { POPULAR_CRYPTO_SYMBOLS, WebSocketPriceData } from "@/services/websocketPrice";

type MarketCategory = "crypto";

interface Market {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume: number;
}

// Memoized trend data generation
const trendDataCache = new Map<string, number[]>();

const generateTrendData = (symbol: string, basePrice: number, isPositive: boolean, points: number = 20) => {
  const cacheKey = `${symbol}_${isPositive}`;
  if (trendDataCache.has(cacheKey)) {
    return trendDataCache.get(cacheKey)!;
  }
  
  const data: number[] = [];
  let price = basePrice * 0.98;
  
  for (let i = 0; i < points; i++) {
    const variance = isPositive 
      ? (Math.random() * 0.015 + 0.005)
      : (Math.random() * 0.015 - 0.02);
    price = price * (1 + variance);
    data.push(price);
  }
  
  trendDataCache.set(cacheKey, data);
  return data;
};

const generateSparklinePath = (data: number[], width: number, height: number) => {
  if (data.length === 0) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
  
  return `M ${points.join(" L ")}`;
};

const generateSparklineAreaPath = (data: number[], width: number, height: number) => {
  if (data.length === 0) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")} L ${width},${height} L 0,${height} Z`;
};

// Removed static futures and stock market data - only crypto is supported

const tickerToMarket = (ticker: MarketTicker): Market => {
  const [base, quote] = ticker.symbol.split('/');
  return {
    symbol: ticker.symbol.replace('/', ''),
    baseAsset: base,
    quoteAsset: quote,
    lastPrice: parseFloat(ticker.lastPrice),
    change24h: parseFloat(ticker.priceChangePercent),
    high24h: parseFloat(ticker.high24h),
    low24h: parseFloat(ticker.low24h),
    volume24h: parseFloat(ticker.volume24h),
    quoteVolume: parseFloat(ticker.quoteVolume24h),
  };
};

// Apply WebSocket price updates to market data
const applyWebSocketPrices = (markets: Market[], wsPrices: Map<string, WebSocketPriceData>): Market[] => {
  return markets.map(market => {
    // Try different symbol formats to match WebSocket data
    const symbolWithSlash = `${market.baseAsset}/${market.quoteAsset}`;
    const wsData = wsPrices.get(symbolWithSlash);
    
    if (wsData) {
      return {
        ...market,
        lastPrice: wsData.price,
        change24h: wsData.priceChangePercent,
        high24h: wsData.high24h,
        low24h: wsData.low24h,
        volume24h: parseFloat(wsData.volume24h) || market.volume24h,
      };
    }
    return market;
  });
};

// Memoized market card component
const MarketCard = memo(({ 
  market, 
  category, 
  isFavorite, 
  onToggleFavorite, 
  onNavigate,
  isLive
}: { 
  market: Market; 
  category: MarketCategory;
  isFavorite: boolean; 
  onToggleFavorite: () => void;
  onNavigate: () => void;
  isLive?: boolean;
}) => {
  const isPositive = market.change24h >= 0;
  const trendData = useMemo(() => 
    generateTrendData(market.symbol, market.lastPrice, isPositive), 
    [market.symbol, market.lastPrice, isPositive]
  );
  
  const displaySymbol = category === "crypto" 
    ? `${market.baseAsset}/${market.quoteAsset}`
    : market.symbol;

  const linePath = useMemo(() => generateSparklinePath(trendData, 200, 60), [trendData]);
  const areaPath = useMemo(() => generateSparklineAreaPath(trendData, 200, 60), [trendData]);

  return (
    <div 
      className="relative overflow-hidden bg-card border border-border rounded-lg p-3 lg:p-4 cursor-pointer hover:border-primary/50 transition-all"
      onClick={onNavigate}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2/3 opacity-[0.08] pointer-events-none z-0">
        <svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none" className="overflow-visible">
          <path
            d={areaPath}
            fill={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
            stroke="none"
          />
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? "hsl(var(--success) / 0.5)" : "hsl(var(--destructive) / 0.5)"}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="hover:text-yellow-500 transition-colors flex-shrink-0"
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm lg:text-base">{displaySymbol}</span>
              {isLive && (
                <span className="flex items-center gap-0.5 text-[9px] text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{market.baseAsset}</div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="font-bold text-base lg:text-lg">
            {market.lastPrice.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: market.lastPrice < 1 ? 6 : 2 
            })} USDT
          </div>
          <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
            {isPositive ? "+" : ""}{market.change24h.toFixed(2)}%
          </Badge>
        </div>
      </div>

      <div className="relative z-10 mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">24h High</div>
          <div className="font-medium">
            {market.high24h.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: market.high24h < 1 ? 6 : 2 
            })} USDT
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">24h Low</div>
          <div className="font-medium">
            {market.low24h.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: market.low24h < 1 ? 6 : 2 
            })} USDT
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">24h Volume</div>
          <div className="font-medium">
            {market.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
});

MarketCard.displayName = 'MarketCard';

interface MarketListProps {
  category?: MarketCategory;
}

export function MarketList({ category = "crypto" }: MarketListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTab] = useState<"all" | "favorites" | "gainers" | "losers">("all");
  const [cryptoMarkets, setCryptoMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // WebSocket batch price updates for crypto
  const { prices: wsPrices, connected: wsConnected } = useWebSocketBatchPrices({
    symbols: POPULAR_CRYPTO_SYMBOLS,
    enabled: category === "crypto",
  });

  // Initial data fetch (only once or when category changes)
  const fetchCryptoData = useCallback(async () => {
    if (category !== "crypto") return;
    
    setLoading(true);
    try {
      const tickers = await fetchAllTickers('okx');
      if (tickers.length > 0) {
        setCryptoMarkets(tickers.map(tickerToMarket));
        setInitialLoadDone(true);
      }
    } catch (error) {
      console.error('Failed to fetch crypto markets:', error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchCryptoData();
    
    // Only use HTTP polling as fallback if WebSocket not connected
    // Increase interval since we have WebSocket for real-time updates
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchCryptoData();
      }
    }, 60000); // Fallback polling every 60 seconds
    
    return () => clearInterval(interval);
  }, [fetchCryptoData, wsConnected]);

  // Apply WebSocket prices to market data for real-time updates
  const currentMarkets = useMemo(() => {
    // Only crypto is supported now
    return applyWebSocketPrices(cryptoMarkets, wsPrices);
  }, [cryptoMarkets, wsPrices]);
  
  const filteredMarkets = useMemo(() => {
    return currentMarkets
      .filter((m) =>
        m.symbol.toLowerCase().includes(search.toLowerCase()) ||
        m.baseAsset.toLowerCase().includes(search.toLowerCase())
      )
      .filter((m) => {
        if (activeTab === "favorites") return favorites.has(m.symbol);
        if (activeTab === "gainers") return m.change24h > 0;
        if (activeTab === "losers") return m.change24h < 0;
        return true;
      })
      .sort((a, b) => {
        if (activeTab === "gainers") return b.change24h - a.change24h;
        if (activeTab === "losers") return a.change24h - b.change24h;
        return 0;
      });
  }, [currentMarkets, search, activeTab, favorites]);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(symbol)) {
        newFavorites.delete(symbol);
      } else {
        newFavorites.add(symbol);
      }
      return newFavorites;
    });
  }, []);

  const getTradeLink = useCallback((symbol: string) => {
    return `/trade?pair=${symbol}`;
  }, []);

  // Check if a symbol has live WebSocket data
  const hasLiveData = useCallback((market: Market) => {
    if (category !== "crypto") return false;
    const symbolWithSlash = `${market.baseAsset}/${market.quoteAsset}`;
    return wsPrices.has(symbolWithSlash);
  }, [category, wsPrices]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('markets.search_placeholder', '搜索交易對...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          {category === "crypto" && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
              wsConnected ? 'text-success bg-success/10' : 'text-muted-foreground bg-muted'
            }`}>
              {wsConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Polling</span>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 lg:p-6 pt-0">
        {loading && category === "crypto" && !initialLoadDone ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeTab === "favorites" ? t('markets.no_favorites', '暫無收藏') : t('markets.no_markets', '未找到市場')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.symbol}
                market={market}
                category={category}
                isFavorite={favorites.has(market.symbol)}
                onToggleFavorite={() => toggleFavorite(market.symbol)}
                onNavigate={() => window.location.href = getTradeLink(market.symbol)}
                isLive={hasLiveData(market)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
