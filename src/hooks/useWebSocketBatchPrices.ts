import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  subscribeToPricesBatch, 
  isWebSocketConnected,
  WebSocketPriceData,
  POPULAR_CRYPTO_SYMBOLS
} from '@/services/websocketPrice';

interface UseWebSocketBatchPricesOptions {
  symbols?: string[];
  enabled?: boolean;
}

interface BatchPricesState {
  prices: Map<string, WebSocketPriceData>;
  connected: boolean;
  loading: boolean;
  lastUpdate: number;
}

export function useWebSocketBatchPrices(options: UseWebSocketBatchPricesOptions = {}) {
  const { 
    symbols = POPULAR_CRYPTO_SYMBOLS,
    enabled = true 
  } = options;

  const [state, setState] = useState<BatchPricesState>({
    prices: new Map(),
    connected: false,
    loading: true,
    lastUpdate: 0,
  });

  const mountedRef = useRef(true);

  // Handle batch price updates
  const handleBatchUpdate = useCallback((prices: Map<string, WebSocketPriceData>) => {
    if (!mountedRef.current) return;

    setState(prev => ({
      ...prev,
      prices: new Map(prices),
      connected: isWebSocketConnected(),
      loading: false,
      lastUpdate: Date.now(),
    }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || symbols.length === 0) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Subscribe to batch price updates
    const unsubscribe = subscribeToPricesBatch(symbols, handleBatchUpdate);

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          connected: isWebSocketConnected(),
        }));
      }
    }, 2000);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [enabled, symbols.join(','), handleBatchUpdate]);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol: string): WebSocketPriceData | undefined => {
    return state.prices.get(symbol);
  }, [state.prices]);

  // Get all prices as array
  const getPricesArray = useCallback((): WebSocketPriceData[] => {
    return Array.from(state.prices.values());
  }, [state.prices]);

  return {
    prices: state.prices,
    connected: state.connected,
    loading: state.loading,
    lastUpdate: state.lastUpdate,
    getPrice,
    getPricesArray,
  };
}
