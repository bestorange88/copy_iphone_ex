import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOKXTicker, MarketTicker } from '@/services/marketData';

interface RealtimePriceState {
  price: number | null;
  priceChange: number;
  priceChangePercent: number;
  high24h: number | null;
  low24h: number | null;
  volume24h: string;
  loading: boolean;
  lastUpdate: number;
}

interface UseRealtimePriceOptions {
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

export function useRealtimePrice(
  symbol: string,
  options: UseRealtimePriceOptions = {}
) {
  const { refreshInterval = 3000, enabled = true } = options;
  
  const [state, setState] = useState<RealtimePriceState>({
    price: null,
    priceChange: 0,
    priceChangePercent: 0,
    high24h: null,
    low24h: null,
    volume24h: '0',
    loading: true,
    lastUpdate: 0,
  });

  const previousPriceRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchPrice = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      const ticker = await fetchOKXTicker(symbol);
      
      if (!mountedRef.current) return;

      if (ticker) {
        const newPrice = parseFloat(ticker.lastPrice);
        const prevPrice = previousPriceRef.current;
        
        previousPriceRef.current = newPrice;

        setState({
          price: newPrice,
          priceChange: parseFloat(ticker.priceChange),
          priceChangePercent: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.high24h),
          low24h: parseFloat(ticker.low24h),
          volume24h: ticker.volume24h,
          loading: false,
          lastUpdate: Date.now(),
        });

        // Log price changes for debugging
        if (prevPrice !== null && prevPrice !== newPrice) {
          console.log(`[RealtimePrice] ${symbol}: ${prevPrice} -> ${newPrice} (${newPrice > prevPrice ? '↑' : '↓'})`);
        }
      }
    } catch (error) {
      console.error('[RealtimePrice] Error fetching price:', error);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [symbol, enabled]);

  // Initial fetch and interval setup
  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Fetch immediately
    fetchPrice();

    // Set up interval for real-time updates
    intervalRef.current = setInterval(fetchPrice, refreshInterval);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchPrice, refreshInterval, enabled]);

  // Reset when symbol changes
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
      lastUpdate: 0,
    });
  }, [symbol]);

  const refresh = useCallback(() => {
    fetchPrice();
  }, [fetchPrice]);

  return {
    ...state,
    refresh,
  };
}
