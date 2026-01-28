// WebSocket real-time price service for OKX
// Provides millisecond-level price updates with batch subscription support

export interface WebSocketPriceData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  timestamp: number;
}

type PriceCallback = (data: WebSocketPriceData) => void;
type BatchPriceCallback = (data: Map<string, WebSocketPriceData>) => void;

// Popular crypto symbols for batch subscription
export const POPULAR_CRYPTO_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
  'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'MATIC/USDT', 'DOT/USDT',
  'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'ATOM/USDT', 'ETC/USDT',
  'FIL/USDT', 'APT/USDT', 'ARB/USDT', 'OP/USDT', 'NEAR/USDT',
  'TRX/USDT', 'SHIB/USDT', 'BCH/USDT', 'PEPE/USDT', 'SUI/USDT'
];

// Symbol mappings for OKX WebSocket
const symbolToOKX: Record<string, string> = {
  'BTC/USDT': 'BTC-USDT',
  'ETH/USDT': 'ETH-USDT',
  'BNB/USDT': 'BNB-USDT',
  'SOL/USDT': 'SOL-USDT',
  'XRP/USDT': 'XRP-USDT',
  'ADA/USDT': 'ADA-USDT',
  'DOGE/USDT': 'DOGE-USDT',
  'AVAX/USDT': 'AVAX-USDT',
  'MATIC/USDT': 'POL-USDT',
  'DOT/USDT': 'DOT-USDT',
  'LINK/USDT': 'LINK-USDT',
  'UNI/USDT': 'UNI-USDT',
  'LTC/USDT': 'LTC-USDT',
  'ATOM/USDT': 'ATOM-USDT',
  'ETC/USDT': 'ETC-USDT',
  'FIL/USDT': 'FIL-USDT',
  'APT/USDT': 'APT-USDT',
  'ARB/USDT': 'ARB-USDT',
  'OP/USDT': 'OP-USDT',
  'NEAR/USDT': 'NEAR-USDT',
  'TRX/USDT': 'TRX-USDT',
  'SHIB/USDT': 'SHIB-USDT',
  'BCH/USDT': 'BCH-USDT',
  'PEPE/USDT': 'PEPE-USDT',
  'SUI/USDT': 'SUI-USDT',
};

const okxToSymbol: Record<string, string> = Object.fromEntries(
  Object.entries(symbolToOKX).map(([k, v]) => [v, k])
);

class WebSocketPriceManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<PriceCallback>> = new Map();
  private batchSubscribers: Set<BatchPriceCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduced to fail fast
  private reconnectDelay = 3000; // Increased delay
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private batchUpdateInterval: NodeJS.Timeout | null = null;
  private lastPriceData: Map<string, WebSocketPriceData> = new Map();
  private open24hPrices: Map<string, number> = new Map();
  private pendingBatchUpdate = false;
  private connectionFailed = false; // Track if connection has permanently failed
  // Only use primary endpoint - AWS endpoint has CSP issues
  private wsEndpoints = [
    'wss://ws.okx.com:8443/ws/v5/public',
  ];
  private currentEndpointIndex = 0;

  constructor() {
    // Delay initial connection to avoid blocking page load
    setTimeout(() => this.connect(), 1000);
  }

  private connect() {
    if (this.connectionFailed || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const endpoint = this.wsEndpoints[this.currentEndpointIndex];
    console.log(`[WebSocketPrice] Connecting to ${endpoint}...`);

    try {
      this.ws = new WebSocket(endpoint);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.log('[WebSocketPrice] Connection timeout, trying next endpoint');
          this.ws.close();
        }
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('[WebSocketPrice] Connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.currentEndpointIndex = 0; // Reset to primary endpoint on success
        
        this.resubscribeAll();
        this.startHeartbeat();
        this.startBatchUpdateInterval();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.warn('[WebSocketPrice] WebSocket error, will fallback to HTTP polling');
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        clearTimeout(connectionTimeout);
        console.log('[WebSocketPrice] WebSocket closed');
        this.isConnecting = false;
        this.stopHeartbeat();
        this.stopBatchUpdateInterval();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[WebSocketPrice] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      
      // Handle pong response
      if (message.op === 'pong') {
        return;
      }

      // Handle subscription confirmation
      if (message.event === 'subscribe') {
        console.log('[WebSocketPrice] Subscribed:', message.arg?.instId);
        return;
      }

      // Handle ticker data
      if (message.arg?.channel === 'tickers' && message.data?.[0]) {
        const tickerData = message.data[0];
        const okxSymbol = tickerData.instId;
        const symbol = okxToSymbol[okxSymbol] || okxSymbol.replace('-', '/');
        
        const open24h = parseFloat(tickerData.open24h) || 0;
        const lastPrice = parseFloat(tickerData.last) || 0;
        const priceChange = lastPrice - open24h;
        const priceChangePercent = open24h > 0 ? (priceChange / open24h) * 100 : 0;

        // Store open24h price for future reference
        if (open24h > 0) {
          this.open24hPrices.set(symbol, open24h);
        }

        const priceData: WebSocketPriceData = {
          symbol,
          price: lastPrice,
          priceChange,
          priceChangePercent,
          high24h: parseFloat(tickerData.high24h) || 0,
          low24h: parseFloat(tickerData.low24h) || 0,
          volume24h: tickerData.vol24h || '0',
          timestamp: parseInt(tickerData.ts) || Date.now(),
        };

        // Store last price data
        this.lastPriceData.set(symbol, priceData);
        
        // Mark pending batch update
        this.pendingBatchUpdate = true;

        // Notify individual subscribers
        const callbacks = this.subscribers.get(symbol);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(priceData);
            } catch (err) {
              console.error('[WebSocketPrice] Callback error:', err);
            }
          });
        }
      }
    } catch (error) {
      // Ignore parse errors for heartbeat responses
      if (data !== 'pong') {
        console.error('[WebSocketPrice] Failed to parse message:', error);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 15000); // Send ping every 15 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startBatchUpdateInterval() {
    this.stopBatchUpdateInterval();
    // Batch updates every 500ms to reduce re-renders while still being responsive
    this.batchUpdateInterval = setInterval(() => {
      if (this.pendingBatchUpdate && this.batchSubscribers.size > 0) {
        this.pendingBatchUpdate = false;
        this.notifyBatchSubscribers();
      }
    }, 500);
  }

  private stopBatchUpdateInterval() {
    if (this.batchUpdateInterval) {
      clearInterval(this.batchUpdateInterval);
      this.batchUpdateInterval = null;
    }
  }

  private notifyBatchSubscribers() {
    const allPrices = new Map(this.lastPriceData);
    this.batchSubscribers.forEach(callback => {
      try {
        callback(allPrices);
      } catch (err) {
        console.error('[WebSocketPrice] Batch callback error:', err);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Try next endpoint
      this.currentEndpointIndex++;
      if (this.currentEndpointIndex >= this.wsEndpoints.length) {
        console.warn('[WebSocketPrice] All endpoints failed, disabling WebSocket. Will use HTTP polling fallback.');
        this.connectionFailed = true;
        return;
      }
      this.reconnectAttempts = 0;
    }

    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts); // Gentler backoff
    this.reconnectAttempts++;
    
    console.log(`[WebSocketPrice] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private resubscribeAll() {
    const symbols = Array.from(this.subscribers.keys());
    symbols.forEach(symbol => {
      this.sendSubscription(symbol, true);
    });
  }

  private sendSubscription(symbol: string, subscribe: boolean) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const okxSymbol = symbolToOKX[symbol] || symbol.replace('/', '-');
    
    const message = {
      op: subscribe ? 'subscribe' : 'unsubscribe',
      args: [
        {
          channel: 'tickers',
          instId: okxSymbol,
        }
      ]
    };

    console.log(`[WebSocketPrice] ${subscribe ? 'Subscribing' : 'Unsubscribing'} to ${okxSymbol}`);
    this.ws.send(JSON.stringify(message));
  }

  // Subscribe to multiple symbols at once
  subscribeBatch(symbols: string[], callback: BatchPriceCallback): () => void {
    // Add batch subscriber
    this.batchSubscribers.add(callback);
    
    // Subscribe to each symbol
    symbols.forEach(symbol => {
      if (!this.subscribers.has(symbol)) {
        this.subscribers.set(symbol, new Set());
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendSubscription(symbol, true);
        }
      }
    });

    // Immediately send current prices if available
    if (this.lastPriceData.size > 0) {
      setTimeout(() => callback(new Map(this.lastPriceData)), 0);
    }

    // Return unsubscribe function
    return () => {
      this.batchSubscribers.delete(callback);
    };
  }

  subscribe(symbol: string, callback: PriceCallback): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      
      // Subscribe via WebSocket if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendSubscription(symbol, true);
      }
    }

    this.subscribers.get(symbol)!.add(callback);

    // Immediately send last known price if available
    const lastData = this.lastPriceData.get(symbol);
    if (lastData) {
      setTimeout(() => callback(lastData), 0);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        
        // Unsubscribe if no more callbacks for this symbol
        if (callbacks.size === 0) {
          this.subscribers.delete(symbol);
          this.sendSubscription(symbol, false);
        }
      }
    };
  }

  getLastPrice(symbol: string): WebSocketPriceData | null {
    return this.lastPriceData.get(symbol) || null;
  }

  getAllPrices(): Map<string, WebSocketPriceData> {
    return new Map(this.lastPriceData);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.stopHeartbeat();
    this.stopBatchUpdateInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.batchSubscribers.clear();
    this.lastPriceData.clear();
  }
}

// Singleton instance
let managerInstance: WebSocketPriceManager | null = null;

export function getWebSocketPriceManager(): WebSocketPriceManager {
  if (!managerInstance) {
    managerInstance = new WebSocketPriceManager();
  }
  return managerInstance;
}

export function subscribeToPrice(symbol: string, callback: PriceCallback): () => void {
  return getWebSocketPriceManager().subscribe(symbol, callback);
}

export function subscribeToPricesBatch(symbols: string[], callback: BatchPriceCallback): () => void {
  return getWebSocketPriceManager().subscribeBatch(symbols, callback);
}

export function getLastPrice(symbol: string): WebSocketPriceData | null {
  return getWebSocketPriceManager().getLastPrice(symbol);
}

export function getAllPrices(): Map<string, WebSocketPriceData> {
  return getWebSocketPriceManager().getAllPrices();
}

export function isWebSocketConnected(): boolean {
  return getWebSocketPriceManager().isConnected();
}
