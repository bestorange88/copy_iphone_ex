import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  subscribeToPrice, 
  getLastPrice, 
  isWebSocketConnected,
  WebSocketPriceData 
} from '@/services/websocketPrice';
import { fetchOKXTicker } from '@/services/marketData';
import { supabase } from '@/integrations/supabase/client';

interface UseWebSocketPriceState {
  price: number | null;
  priceChange: number;
  priceChangePercent: number;
  high24h: number | null;
  low24h: number | null;
  volume24h: string;
  loading: boolean;
  connected: boolean;
  lastUpdate: number;
  priceDirection: 'up' | 'down' | 'neutral';
}

interface UseWebSocketPriceOptions {
  enabled?: boolean;
  fallbackToPolling?: boolean;
  pollingInterval?: number;
}

// 判断资产类型
function getAssetType(symbol: string): 'crypto' | 'futures' | 'stocks' {
  const isCrypto = symbol.includes('-USDT') || symbol.includes('/USDT');
  const isFutures = ['ES', 'NQ', 'CL', 'GC', 'SI', 'NG', 'ZB', 'ZN'].includes(symbol);
  
  if (isCrypto) return 'crypto';
  if (isFutures) return 'futures';
  return 'stocks';
}

// 股票模拟价格数据
const stockMockPrices: Record<string, { price: number; change: number }> = {
  'AAPL': { price: 178.50, change: 1.25 },
  'GOOGL': { price: 142.30, change: -0.85 },
  'MSFT': { price: 378.90, change: 2.15 },
  'TSLA': { price: 245.60, change: -3.25 },
  'AMZN': { price: 178.25, change: 1.85 },
  'NVDA': { price: 495.80, change: 5.45 },
  'META': { price: 505.40, change: 2.30 },
};

export function useWebSocketPrice(
  symbol: string,
  options: UseWebSocketPriceOptions = {}
) {
  const { 
    enabled = true, 
    fallbackToPolling = true,
    pollingInterval = 5000 
  } = options;

  const [state, setState] = useState<UseWebSocketPriceState>({
    price: null,
    priceChange: 0,
    priceChangePercent: 0,
    high24h: null,
    low24h: null,
    volume24h: '0',
    loading: true,
    connected: false,
    lastUpdate: 0,
    priceDirection: 'neutral',
  });

  const previousPriceRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const assetType = getAssetType(symbol);

  // Handle price update from WebSocket
  const handlePriceUpdate = useCallback((data: WebSocketPriceData) => {
    if (!mountedRef.current) return;

    const prevPrice = previousPriceRef.current;
    let direction: 'up' | 'down' | 'neutral' = 'neutral';

    if (prevPrice !== null && data.price !== prevPrice) {
      direction = data.price > prevPrice ? 'up' : 'down';
    }

    previousPriceRef.current = data.price;

    setState({
      price: data.price,
      priceChange: data.priceChange,
      priceChangePercent: data.priceChangePercent,
      high24h: data.high24h,
      low24h: data.low24h,
      volume24h: data.volume24h,
      loading: false,
      connected: true,
      lastUpdate: data.timestamp,
      priceDirection: direction,
    });
  }, []);

  // Fetch futures price via edge function
  const fetchFuturesPrice = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      const { data, error } = await supabase.functions.invoke('futures-market-data', {
        body: { symbol, interval: '15m', range: '1d' }
      });

      if (!mountedRef.current) return;

      if (!error && data?.success && data?.meta?.currentPrice) {
        const newPrice = data.meta.currentPrice;
        const prevPrice = previousPriceRef.current;
        let direction: 'up' | 'down' | 'neutral' = 'neutral';

        if (prevPrice !== null && newPrice !== prevPrice) {
          direction = newPrice > prevPrice ? 'up' : 'down';
        }

        previousPriceRef.current = newPrice;

        setState({
          price: newPrice,
          priceChange: data.meta.priceChange || 0,
          priceChangePercent: data.meta.priceChangePercent || 0,
          high24h: data.meta.dayHigh || null,
          low24h: data.meta.dayLow || null,
          volume24h: data.meta.volume?.toString() || '0',
          loading: false,
          connected: false, // Futures use polling, not WebSocket
          lastUpdate: Date.now(),
          priceDirection: direction,
        });
      }
    } catch (error) {
      console.error('[useWebSocketPrice] Futures price fetch error:', error);
    }
  }, [symbol, enabled]);

  // Fetch stock price (simulated)
  const fetchStockPrice = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      if (!mountedRef.current) return;

      const stockData = stockMockPrices[symbol];
      if (stockData) {
        // Add some random variation to simulate real-time changes
        const variation = (Math.random() - 0.5) * 2; // -1 to +1
        const newPrice = stockData.price + variation;
        const prevPrice = previousPriceRef.current;
        let direction: 'up' | 'down' | 'neutral' = 'neutral';

        if (prevPrice !== null && newPrice !== prevPrice) {
          direction = newPrice > prevPrice ? 'up' : 'down';
        }

        previousPriceRef.current = newPrice;

        const priceChange = stockData.change + variation;
        const priceChangePercent = (priceChange / stockData.price) * 100;

        setState({
          price: newPrice,
          priceChange: priceChange,
          priceChangePercent: priceChangePercent,
          high24h: stockData.price * 1.02,
          low24h: stockData.price * 0.98,
          volume24h: '1000000',
          loading: false,
          connected: false, // Stocks use polling, not WebSocket
          lastUpdate: Date.now(),
          priceDirection: direction,
        });
      }
    } catch (error) {
      console.error('[useWebSocketPrice] Stock price fetch error:', error);
    }
  }, [symbol, enabled]);

  // Fallback to HTTP polling for crypto
  const fetchViaPolling = useCallback(async () => {
    if (!enabled || !symbol) return;

    // Route to appropriate fetch based on asset type
    if (assetType === 'futures') {
      return fetchFuturesPrice();
    }
    
    if (assetType === 'stocks') {
      return fetchStockPrice();
    }

    // Crypto - use OKX API
    try {
      const ticker = await fetchOKXTicker(symbol);
      
      if (!mountedRef.current || !ticker) return;

      const newPrice = parseFloat(ticker.lastPrice);
      const prevPrice = previousPriceRef.current;
      let direction: 'up' | 'down' | 'neutral' = 'neutral';

      if (prevPrice !== null && newPrice !== prevPrice) {
        direction = newPrice > prevPrice ? 'up' : 'down';
      }

      previousPriceRef.current = newPrice;

      setState({
        price: newPrice,
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        high24h: parseFloat(ticker.high24h),
        low24h: parseFloat(ticker.low24h),
        volume24h: ticker.volume24h,
        loading: false,
        connected: false,
        lastUpdate: Date.now(),
        priceDirection: direction,
      });
    } catch (error) {
      console.error('[useWebSocketPrice] Polling error:', error);
    }
  }, [symbol, enabled, assetType, fetchFuturesPrice, fetchStockPrice]);

  // WebSocket subscription (only for crypto)
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !symbol) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Only use WebSocket for crypto assets
    if (assetType === 'crypto') {
      // Check for cached price first
      const cachedPrice = getLastPrice(symbol);
      if (cachedPrice) {
        handlePriceUpdate(cachedPrice);
      }

      // Subscribe to WebSocket updates
      const unsubscribe = subscribeToPrice(symbol, handlePriceUpdate);

      // Start polling as fallback if WebSocket is not connected
      if (fallbackToPolling) {
        // Initial fetch if no cached data
        if (!cachedPrice) {
          fetchViaPolling();
        }

        // Set up polling interval as backup
        pollingIntervalRef.current = setInterval(() => {
          if (!isWebSocketConnected()) {
            fetchViaPolling();
          }
        }, pollingInterval);
      }

      return () => {
        mountedRef.current = false;
        unsubscribe();
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      // For futures and stocks, use polling only
      fetchViaPolling();

      pollingIntervalRef.current = setInterval(() => {
        fetchViaPolling();
      }, pollingInterval);

      return () => {
        mountedRef.current = false;
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [symbol, enabled, assetType, handlePriceUpdate, fallbackToPolling, pollingInterval, fetchViaPolling]);

  // Reset state when symbol changes
  useEffect(() => {
    previousPriceRef.current = null;
    setState({
      price: null,
      priceChange: 0,
      priceChangePercent: 0,
      high24h: null,
      low24h: null,
      volume24h: '0',
      loading: true,
      connected: false,
      lastUpdate: 0,
      priceDirection: 'neutral',
    });
  }, [symbol]);

  const refresh = useCallback(() => {
    fetchViaPolling();
  }, [fetchViaPolling]);

  return {
    ...state,
    refresh,
  };
}
