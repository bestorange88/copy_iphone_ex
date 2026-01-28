import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 期貨代碼映射到 Yahoo Finance 代碼
const symbolMap: Record<string, string> = {
  "ES": "ES=F",      // E-mini S&P 500
  "NQ": "NQ=F",      // E-mini NASDAQ 100
  "CL": "CL=F",      // Crude Oil
  "GC": "GC=F",      // Gold
  "SI": "SI=F",      // Silver
  "NG": "NG=F",      // Natural Gas
  "ZB": "ZB=F",      // 30-Year T-Bond
  "ZN": "ZN=F",      // 10-Year T-Note
};

interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: number;
  value: number;
  color: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, interval = '15m', range = '5d' } = await req.json();
    
    console.log(`Fetching futures data for symbol: ${symbol}, interval: ${interval}, range: ${range}`);

    const yahooSymbol = symbolMap[symbol] || `${symbol}=F`;
    
    // 使用 Yahoo Finance API 獲取數據
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
    
    console.log(`Requesting URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      console.error('No data returned from Yahoo Finance');
      throw new Error('No data returned from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const { open, high, low, close, volume } = quotes;

    const candlestickData: CandlestickData[] = [];
    const volumeData: VolumeData[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (open[i] != null && high[i] != null && low[i] != null && close[i] != null) {
        const time = timestamps[i];
        
        candlestickData.push({
          time,
          open: parseFloat(open[i].toFixed(2)),
          high: parseFloat(high[i].toFixed(2)),
          low: parseFloat(low[i].toFixed(2)),
          close: parseFloat(close[i].toFixed(2)),
        });

        const isUp = close[i] >= open[i];
        volumeData.push({
          time,
          value: volume[i] || 0,
          color: isUp ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        });
      }
    }

    // 獲取當前價格信息
    const meta = result.meta || {};
    const currentPrice = meta.regularMarketPrice || close[close.length - 1];
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const priceChange = currentPrice - previousClose;
    const priceChangePercent = previousClose ? ((priceChange / previousClose) * 100) : 0;

    console.log(`Successfully fetched ${candlestickData.length} candles for ${symbol}`);

    return new Response(
      JSON.stringify({
        success: true,
        symbol: yahooSymbol,
        candlestickData,
        volumeData,
        meta: {
          currentPrice: parseFloat(currentPrice?.toFixed(2) || '0'),
          previousClose: parseFloat(previousClose?.toFixed(2) || '0'),
          priceChange: parseFloat(priceChange?.toFixed(2) || '0'),
          priceChangePercent: parseFloat(priceChangePercent?.toFixed(2) || '0'),
          high: meta.regularMarketDayHigh,
          low: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
        },
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch futures data';
    console.error('Error fetching futures data:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
