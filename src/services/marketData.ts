// Market data service with caching and batch fetching
// Optimized for performance

import { supabase } from "@/integrations/supabase/client";

export interface MarketTicker {
  symbol: string;
  name: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
  timestamp: number;
}

export interface KlineData {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

// Cache configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 10000; // 10 seconds cache
const cache: Map<string, CacheEntry<any>> = new Map();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Symbol mappings
const symbolMap: Record<string, { okx: string; htx: string }> = {
  'BTC/USDT': { okx: 'BTC-USDT', htx: 'btcusdt' },
  'ETH/USDT': { okx: 'ETH-USDT', htx: 'ethusdt' },
  'BNB/USDT': { okx: 'BNB-USDT', htx: 'bnbusdt' },
  'SOL/USDT': { okx: 'SOL-USDT', htx: 'solusdt' },
  'XRP/USDT': { okx: 'XRP-USDT', htx: 'xrpusdt' },
  'ADA/USDT': { okx: 'ADA-USDT', htx: 'adausdt' },
  'DOGE/USDT': { okx: 'DOGE-USDT', htx: 'dogeusdt' },
  'AVAX/USDT': { okx: 'AVAX-USDT', htx: 'avaxusdt' },
  'MATIC/USDT': { okx: 'POL-USDT', htx: 'maticusdt' },
  'DOT/USDT': { okx: 'DOT-USDT', htx: 'dotusdt' },
};

const coinNames: Record<string, string> = {
  'BTC/USDT': 'Bitcoin',
  'ETH/USDT': 'Ethereum',
  'BNB/USDT': 'BNB',
  'SOL/USDT': 'Solana',
  'XRP/USDT': 'Ripple',
  'ADA/USDT': 'Cardano',
  'DOGE/USDT': 'Dogecoin',
  'AVAX/USDT': 'Avalanche',
  'MATIC/USDT': 'Polygon',
  'DOT/USDT': 'Polkadot',
};

// Session cache to avoid repeated auth calls
let sessionCache: { token: string; expiry: number } | null = null;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (sessionCache && sessionCache.expiry > now) {
    return sessionCache.token;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  // Cache for 5 minutes
  sessionCache = { token, expiry: now + 300000 };
  return token;
}

// Batch fetch all tickers in one request
export async function fetchAllTickers(exchange: 'okx' | 'htx' = 'okx'): Promise<MarketTicker[]> {
  const cacheKey = `all_tickers_${exchange}`;
  const cached = getCached<MarketTicker[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const symbols = Object.keys(symbolMap);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  try {
    const token = await getAuthToken();
    
    // Fetch all tickers in parallel with a shared connection
    const exchangeSymbols = symbols.map(s => symbolMap[s]?.[exchange] || s.replace('/', '-'));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'batch_tickers',
        exchange,
        symbols: exchangeSymbols,
      }),
    });

    if (!response.ok) {
      // Fallback to individual requests if batch not supported
      return fetchAllTickersIndividual(exchange);
    }

    const data = await response.json();
    
    if (data.tickers && Array.isArray(data.tickers)) {
      const tickers: MarketTicker[] = data.tickers.map((ticker: any, index: number) => {
        const symbol = symbols[index];
        const priceChangePercent = ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h) * 100).toFixed(2);
        
        return {
          symbol,
          name: coinNames[symbol] || symbol.split('/')[0],
          lastPrice: ticker.last,
          priceChange: (parseFloat(ticker.last) - parseFloat(ticker.open24h)).toFixed(2),
          priceChangePercent,
          high24h: ticker.high24h,
          low24h: ticker.low24h,
          volume24h: ticker.vol24h,
          quoteVolume24h: ticker.volCcy24h,
          timestamp: parseInt(ticker.ts),
        };
      });
      
      setCache(cacheKey, tickers);
      return tickers;
    }
    
    // Fallback
    return fetchAllTickersIndividual(exchange);
  } catch (error) {
    console.error('Batch fetch failed, falling back to individual:', error);
    return fetchAllTickersIndividual(exchange);
  }
}

// Fallback: fetch tickers individually but with optimization
async function fetchAllTickersIndividual(exchange: 'okx' | 'htx'): Promise<MarketTicker[]> {
  const cacheKey = `all_tickers_individual_${exchange}`;
  const cached = getCached<MarketTicker[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const symbols = Object.keys(symbolMap);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const token = await getAuthToken();
  
  // Use Promise.allSettled for better error handling
  const promises = symbols.map(async (symbol) => {
    const okxSymbol = symbolMap[symbol]?.okx || symbol.replace('/', '-');
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'ticker',
          exchange: 'okx',
          symbol: okxSymbol,
        }),
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || data.code !== '0' || !data.data?.[0]) return null;
      
      const ticker = data.data[0];
      const priceChangePercent = ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h) * 100).toFixed(2);
      
      return {
        symbol,
        name: coinNames[symbol] || symbol.split('/')[0],
        lastPrice: ticker.last,
        priceChange: (parseFloat(ticker.last) - parseFloat(ticker.open24h)).toFixed(2),
        priceChangePercent,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        volume24h: ticker.vol24h,
        quoteVolume24h: ticker.volCcy24h,
        timestamp: parseInt(ticker.ts),
      };
    } catch {
      return null;
    }
  });
  
  const results = await Promise.allSettled(promises);
  const tickers = results
    .filter((r): r is PromiseFulfilledResult<MarketTicker | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((t): t is MarketTicker => t !== null);
  
  setCache(cacheKey, tickers);
  return tickers;
}

// Single ticker fetch with cache
export async function fetchOKXTicker(symbol: string): Promise<MarketTicker | null> {
  const cacheKey = `ticker_okx_${symbol}`;
  const cached = getCached<MarketTicker>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const okxSymbol = symbolMap[symbol]?.okx || symbol.replace('/', '-');
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const token = await getAuthToken();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'ticker',
        exchange: 'okx',
        symbol: okxSymbol,
      }),
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.code !== '0' || !data.data?.[0]) return null;

    const ticker = data.data[0];
    const priceChangePercent = ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h) * 100).toFixed(2);

    const result: MarketTicker = {
      symbol,
      name: coinNames[symbol] || symbol.split('/')[0],
      lastPrice: ticker.last,
      priceChange: (parseFloat(ticker.last) - parseFloat(ticker.open24h)).toFixed(2),
      priceChangePercent,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      volume24h: ticker.vol24h,
      quoteVolume24h: ticker.volCcy24h,
      timestamp: parseInt(ticker.ts),
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching OKX ticker:', error);
    return null;
  }
}

export async function fetchHTXTicker(symbol: string): Promise<MarketTicker | null> {
  const cacheKey = `ticker_htx_${symbol}`;
  const cached = getCached<MarketTicker>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const htxSymbol = symbolMap[symbol]?.htx || symbol.toLowerCase().replace('/', '');
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const token = await getAuthToken();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'ticker',
        exchange: 'htx',
        symbol: htxSymbol,
      }),
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'ok' || !data.tick) return null;

    const ticker = data.tick;
    const open = ticker.open || ticker.close;
    const priceChangePercent = ((ticker.close - open) / open * 100).toFixed(2);

    const result: MarketTicker = {
      symbol,
      name: coinNames[symbol] || symbol.split('/')[0],
      lastPrice: ticker.close.toString(),
      priceChange: (ticker.close - open).toFixed(2),
      priceChangePercent,
      high24h: ticker.high.toString(),
      low24h: ticker.low.toString(),
      volume24h: ticker.amount.toString(),
      quoteVolume24h: ticker.vol.toString(),
      timestamp: data.ts,
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching HTX ticker:', error);
    return null;
  }
}

// Kline data with caching
const OKX_BASE_URL = 'https://www.okx.com/api/v5';
const HTX_BASE_URL = 'https://api.huobi.pro';

export async function fetchOKXKlines(
  symbol: string,
  interval: string = '1D',
  limit: number = 100
): Promise<KlineData[]> {
  const cacheKey = `klines_okx_${symbol}_${interval}_${limit}`;
  const cached = getCached<KlineData[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const okxSymbol = symbolMap[symbol]?.okx || symbol.replace('/', '-');
    const response = await fetch(
      `${OKX_BASE_URL}/market/candles?instId=${okxSymbol}&bar=${interval}&limit=${limit}`
    );
    
    if (!response.ok) return [];

    const data = await response.json();
    if (data.code !== '0' || !data.data) return [];

    const result = data.data.map((candle: string[]) => ({
      timestamp: parseInt(candle[0]),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching OKX klines:', error);
    return [];
  }
}

export async function fetchHTXKlines(
  symbol: string,
  period: string = '1day',
  size: number = 100
): Promise<KlineData[]> {
  const cacheKey = `klines_htx_${symbol}_${period}_${size}`;
  const cached = getCached<KlineData[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const htxSymbol = symbolMap[symbol]?.htx || symbol.toLowerCase().replace('/', '');
    const response = await fetch(
      `${HTX_BASE_URL}/market/history/kline?symbol=${htxSymbol}&period=${period}&size=${size}`
    );
    
    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== 'ok' || !data.data) return [];

    const result = data.data.map((candle: any) => ({
      timestamp: candle.id * 1000,
      open: candle.open.toString(),
      high: candle.high.toString(),
      low: candle.low.toString(),
      close: candle.close.toString(),
      volume: candle.vol.toString(),
    }));
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching HTX klines:', error);
    return [];
  }
}

// Clear cache utility
export function clearMarketCache(): void {
  cache.clear();
  sessionCache = null;
}
