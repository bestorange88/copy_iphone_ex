import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocketPrice } from "@/hooks/useWebSocketPrice";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TradeFormProps {
  pair: string;
  orderType: "buy" | "sell";
  onOrderTypeChange: (type: "buy" | "sell") => void;
}

interface Balance {
  currency: string;
  available: number;
}

type OrderFormType = "limit" | "market";

export const TradeForm = ({ pair, orderType, onOrderTypeChange }: TradeFormProps) => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [orderFormType, setOrderFormType] = useState<OrderFormType>("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [baseCurrency, quoteCurrency] = pair.split('/');

  // Use WebSocket price hook for millisecond-level updates
  const { 
    price: realtimePrice, 
    priceChangePercent,
    loading: priceLoading,
    connected: wsConnected,
    priceDirection,
    refresh: refreshPrice,
    lastUpdate 
  } = useWebSocketPrice(pair, { 
    enabled: true,
    fallbackToPolling: true,
    pollingInterval: 5000
  });

  // Load user balances
  const loadBalances = useCallback(async () => {
    if (!user) return;
    
    setLoadingBalances(true);
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('currency, available')
        .eq('user_id', user.id)
        .eq('account_type', 'spot')
        .in('currency', [baseCurrency, quoteCurrency]);

      if (error) throw error;
      setBalances(data || []);
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  }, [user, baseCurrency, quoteCurrency]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Set current price when available (only for limit orders)
  useEffect(() => {
    if (realtimePrice && !price && orderFormType === 'limit') {
      setPrice(realtimePrice.toFixed(2));
    }
  }, [realtimePrice, price, orderFormType]);

  // Calculate total when price or amount changes
  useEffect(() => {
    if (orderFormType === 'market' && realtimePrice && amount) {
      setTotal((realtimePrice * parseFloat(amount)).toFixed(2));
    } else if (orderFormType === 'limit' && price && amount) {
      setTotal((parseFloat(price) * parseFloat(amount)).toFixed(2));
    } else {
      setTotal("");
    }
  }, [orderFormType, price, amount, realtimePrice]);

  const getAvailableBalance = (currency: string): number => {
    const balance = balances.find(b => b.currency === currency);
    return balance?.available || 0;
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handlePercentClick = (percent: number) => {
    if (!user) return;
    
    const effectivePrice = orderFormType === 'market' ? realtimePrice : parseFloat(price);
    
    if (orderType === 'buy') {
      // Buying: use quote currency (USDT)
      const available = getAvailableBalance(quoteCurrency);
      if (available > 0 && effectivePrice) {
        const maxAmount = available / effectivePrice;
        const targetAmount = (maxAmount * percent / 100).toFixed(6);
        setAmount(targetAmount);
      }
    } else {
      // Selling: use base currency (BTC)
      const available = getAvailableBalance(baseCurrency);
      if (available > 0) {
        const targetAmount = (available * percent / 100).toFixed(6);
        setAmount(targetAmount);
      }
    }
  };

  const validateOrder = (): boolean => {
    if (orderFormType === 'limit') {
      if (!price || parseFloat(price) <= 0) {
        toast.error(t('trade.error_invalid_price', 'Please enter a valid price'));
        return false;
      }
    } else if (!realtimePrice) {
      toast.error(t('trade.error_no_market_price', 'Market price unavailable'));
      return false;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t('trade.error_invalid_amount', 'Please enter a valid amount'));
      return false;
    }

    const effectivePrice = orderFormType === 'market' ? realtimePrice : parseFloat(price);
    const orderTotal = (effectivePrice || 0) * parseFloat(amount);

    if (orderType === 'buy') {
      const available = getAvailableBalance(quoteCurrency);
      if (orderTotal > available) {
        toast.error(t('trade.insufficient_balance'));
        return false;
      }
    } else {
      const available = getAvailableBalance(baseCurrency);
      if (parseFloat(amount) > available) {
        toast.error(t('trade.insufficient_balance'));
        return false;
      }
    }

    return true;
  };

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error(t('auth.signin_required', 'Please sign in first'));
      return;
    }

    if (!validateOrder()) return;

    setSubmitting(true);
    try {
      const effectivePrice = orderFormType === 'market' ? realtimePrice : parseFloat(price);
      
      const orderData = {
        user_id: user.id,
        exchange: 'internal',
        symbol: pair.replace('/', ''),
        order_type: orderFormType,
        side: orderType,
        price: effectivePrice,
        amount: parseFloat(amount),
        filled: 0,
        status: 'pending'
      };

      const { data: insertedOrder, error } = await supabase
        .from('trade_orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      toast.success(t('trade.order_submitted', 'Order submitted successfully'));
      
      // Trigger order matching
      try {
        await supabase.functions.invoke('match-orders', {
          body: { orderId: insertedOrder.id }
        });
      } catch (matchError) {
        console.log('Order matching triggered:', matchError);
      }
      
      // Reset form
      setAmount("");
      setTotal("");
      if (orderFormType === 'limit') {
        // Keep price for limit orders
      }
      
      // Refresh balances
      loadBalances();
    } catch (error) {
      console.error('Failed to submit order:', error);
      toast.error(t('trade.order_failed', 'Failed to submit order'));
    } finally {
      setSubmitting(false);
    }
  };

  const availableBalance = orderType === 'buy' 
    ? getAvailableBalance(quoteCurrency)
    : getAvailableBalance(baseCurrency);
  
  const availableCurrency = orderType === 'buy' ? quoteCurrency : baseCurrency;

  // Format last update time
  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 5) return t('trade.just_now', 'Just now');
    return `${seconds}s ago`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 lg:pb-3 pt-3 lg:pt-6 px-3 lg:px-6 flex-shrink-0">
        <Tabs value={orderType} onValueChange={(v) => onOrderTypeChange(v as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2 h-8 lg:h-10">
            <TabsTrigger value="buy" className="text-xs lg:text-sm data-[state=active]:bg-success data-[state=active]:text-success-foreground">
              {t('trade.buy')}
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-xs lg:text-sm data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              {t('trade.sell')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-2 lg:space-y-4 px-3 lg:px-6 pb-0 lg:pb-6 flex-1 overflow-y-auto">
        {/* Order Type Selector */}
        <div className="space-y-1 lg:space-y-2">
          <label className="text-[10px] lg:text-xs text-muted-foreground">{t('trade.order_type', 'Order Type')}</label>
          <Select value={orderFormType} onValueChange={(v) => setOrderFormType(v as OrderFormType)}>
            <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="limit">{t('trade.limit_order', 'Limit Order')}</SelectItem>
              <SelectItem value="market">{t('trade.market_order', 'Market Order')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Input */}
        <div className="space-y-1 lg:space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] lg:text-xs text-muted-foreground">{t('trade.price')}</label>
            {orderFormType === 'market' && (
              <div className="flex items-center gap-2">
                {/* WebSocket connection indicator */}
                <span className={`flex items-center gap-1 text-[10px] ${wsConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {wsConnected ? (
                    <><Wifi className="h-3 w-3" /><span>Live</span></>
                  ) : (
                    <><WifiOff className="h-3 w-3" /><span>Polling</span></>
                  )}
                </span>
                <button 
                  onClick={refreshPrice}
                  disabled={priceLoading}
                  className="text-[10px] lg:text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${priceLoading ? 'animate-spin' : ''}`} />
                  {formatLastUpdate()}
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <Input 
              type={orderFormType === 'market' ? 'text' : 'number'}
              placeholder={orderFormType === 'market' ? t('trade.market_price', 'Market Price') : '0.00'}
              value={orderFormType === 'market' ? t('trade.market_price', 'Market Price') : price}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="h-8 lg:h-10 text-xs lg:text-sm pr-12"
              disabled={submitting || orderFormType === 'market'}
              readOnly={orderFormType === 'market'}
            />
            <span className="absolute right-2 lg:right-3 top-2 lg:top-2.5 text-[10px] lg:text-xs text-muted-foreground">{quoteCurrency}</span>
          </div>
          {orderFormType === 'market' && (
            <div className={`flex items-center gap-1 text-[10px] lg:text-xs transition-colors duration-300 ${
              priceDirection === 'up' ? 'text-green-500' : 
              priceDirection === 'down' ? 'text-red-500' : 
              'text-muted-foreground'
            }`}>
              {priceLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : realtimePrice ? (
                <>
                  {priceDirection === 'up' && <TrendingUp className="h-3 w-3" />}
                  {priceDirection === 'down' && <TrendingDown className="h-3 w-3" />}
                  <span className="font-medium">
                    {realtimePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                  <span className={priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </>
              ) : (
                <span>{t('trade.loading_price', 'Loading price...')}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1 lg:space-y-2">
          <label className="text-[10px] lg:text-xs text-muted-foreground">{t('trade.amount')}</label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="h-8 lg:h-10 text-xs lg:text-sm pr-12"
              disabled={submitting}
            />
            <span className="absolute right-2 lg:right-3 top-2 lg:top-2.5 text-[10px] lg:text-xs text-muted-foreground">{baseCurrency}</span>
          </div>
          <div className="flex gap-1 lg:gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => handlePercentClick(percent)}
                disabled={!user || submitting}
                className="flex-1 px-1 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs border border-border rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 lg:space-y-2">
          <label className="text-[10px] lg:text-xs text-muted-foreground">{t('trade.total')}</label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0.00"
              value={total}
              readOnly
              className="bg-muted h-8 lg:h-10 text-xs lg:text-sm pr-12"
            />
            <span className="absolute right-2 lg:right-3 top-2 lg:top-2.5 text-[10px] lg:text-xs text-muted-foreground">{quoteCurrency}</span>
          </div>
        </div>

        <div className="pt-1 lg:pt-2 space-y-1 lg:space-y-2">
          <div className="flex justify-between text-[10px] lg:text-xs">
            <span className="text-muted-foreground">{t('trade.available')}:</span>
            <span>
              {loadingBalances ? (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              ) : (
                `${availableBalance.toFixed(4)} ${availableCurrency}`
              )}
            </span>
          </div>
          <Button 
            onClick={handleSubmitOrder}
            disabled={!user || submitting || (orderFormType === 'limit' && !price) || !amount}
            className={`w-full h-8 lg:h-10 text-xs lg:text-sm ${
              orderType === 'buy' 
                ? 'bg-success hover:bg-success/90' 
                : 'bg-destructive hover:bg-destructive/90'
            }`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {orderFormType === 'market' ? t('trade.market', 'Market') : t('trade.limit', 'Limit')} {orderType === 'buy' ? t('trade.buy') : t('trade.sell')} {baseCurrency}
          </Button>
        </div>

        {!authLoading && !user && (
          <div className="text-[10px] lg:text-xs text-center text-muted-foreground pt-1 pb-2 lg:pt-2 lg:pb-0">
            <Link to="/auth" className="text-primary hover:underline">{t('common.login')}</Link> {t('common.or')} <Link to="/auth" className="text-primary hover:underline">{t('common.register')}</Link> {t('trade.to_trade')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
