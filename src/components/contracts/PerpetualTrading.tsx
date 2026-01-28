import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { CandlestickChart } from "./CandlestickChart";
import { ExpertShowcases } from "./ExpertShowcases";
import { ExpertMarquee } from "./ExpertMarquee";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocketPrice } from "@/hooks/useWebSocketPrice";

interface PerpetualTradingProps {
  mobileView?: "trade" | "chart";
}

export const PerpetualTrading = ({ mobileView = "trade" }: PerpetualTradingProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedPair, setSelectedPair] = useState("BTC-USDT");
  const [leverage, setLeverage] = useState([10]);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  // 使用WebSocket实时价格
  const {
    price: currentPrice,
    priceChangePercent: priceChange,
    connected: wsConnected,
    priceDirection
  } = useWebSocketPrice(selectedPair, {
    enabled: true,
    fallbackToPolling: true,
    pollingInterval: 5000
  });

  useEffect(() => {
    if (user) {
      fetchAvailableBalance();
    }
  }, [user]);

  // 当WebSocket价格更新时，同步更新价格输入框
  useEffect(() => {
    if (currentPrice) {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice]);

  const fetchAvailableBalance = async () => {
    if (!user) return;
    
    try {
      // 统一账户：只从现货账户获取余额
      const { data, error } = await supabase
        .from('user_balances')
        .select('available')
        .eq('user_id', user.id)
        .eq('currency', 'USDT')
        .eq('account_type', 'spot')
        .maybeSingle();

      if (error) throw error;
      setAvailableBalance(data?.available || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleOrder = async (side: 'long' | 'short') => {
    if (!user) {
      toast.error(t('common.error'), {
        description: t('auth.please_login'),
      });
      return;
    }

    if (!amount || !price) {
      toast.error(t('contracts.please_enter'));
      return;
    }

    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(price);
    const leverageNum = leverage[0];

    if (amountNum <= 0 || priceNum <= 0) {
      toast.error(t('contracts.invalid_amount'));
      return;
    }

    // Calculate margin and liquidation price
    const margin = (amountNum * priceNum) / leverageNum;
    const liquidationPrice = side === 'long' 
      ? priceNum * (1 - 1 / leverageNum)
      : priceNum * (1 + 1 / leverageNum);

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('perpetual_positions')
        .insert({
          user_id: user.id,
          symbol: selectedPair,
          side: side,
          leverage: leverageNum,
          entry_price: priceNum,
          amount: amountNum,
          margin: margin,
          liquidation_price: liquidationPrice,
          status: 'open'
        });

      if (error) throw error;

      toast.success(t('contracts.order_placed'), {
        description: `${side === 'long' ? t('contracts.open_long') : t('contracts.open_short')} ${selectedPair} ${amount} @ ${price} USDT`,
      });

      // Reset form
      setAmount("");
    } catch (error) {
      console.error('Error creating position:', error);
      toast.error(t('common.error'), {
        description: t('contracts.order_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 大神曬單跑馬燈 */}
      <ExpertMarquee />
      
      {/* 移动端：根據 mobileView 顯示交易或圖表 */}
      <div className="lg:hidden">
        {mobileView === "trade" && (
          <div className="space-y-4">
            {/* 交易表單 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedPair} {t('contracts.perpetual')}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xl font-bold transition-colors duration-300 ${
                        priceDirection === 'up' ? 'text-green-500' : 
                        priceDirection === 'down' ? 'text-red-500' : ''
                      }`}>
                        {(currentPrice || 0).toLocaleString()} USDT
                      </span>
                      <Badge variant={priceChange >= 0 ? "default" : "destructive"} className="gap-1">
                        {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {priceChange.toFixed(2)}%
                      </Badge>
                      <span className={`flex items-center gap-1 text-[10px] ${wsConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      </span>
                    </div>
                  </div>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC-USDT">BTC/USDT</SelectItem>
                      <SelectItem value="ETH-USDT">ETH/USDT</SelectItem>
                      <SelectItem value="SOL-USDT">SOL/USDT</SelectItem>
                      <SelectItem value="XRP-USDT">XRP/USDT</SelectItem>
                      <SelectItem value="DOGE-USDT">DOGE/USDT</SelectItem>
                      <SelectItem value="ADA-USDT">ADA/USDT</SelectItem>
                      <SelectItem value="AVAX-USDT">AVAX/USDT</SelectItem>
                      <SelectItem value="DOT-USDT">DOT/USDT</SelectItem>
                      <SelectItem value="LINK-USDT">LINK/USDT</SelectItem>
                      <SelectItem value="MATIC-USDT">MATIC/USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="limit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="limit">{t('contracts.limit_price')}</TabsTrigger>
                    <TabsTrigger value="market">{t('contracts.market_price')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="limit" className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('contracts.leverage')}: {leverage[0]}x</Label>
                      <Slider
                        value={leverage}
                        onValueChange={setLeverage}
                        min={1}
                        max={125}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1x</span>
                        <span>125x</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('trade.price')} (USDT)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('trade.amount')} ({selectedPair.split('-')[0]})</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="w-full bg-success hover:bg-success/90 h-12"
                        onClick={() => handleOrder('long')}
                        disabled={isSubmitting}
                      >
                        {t('contracts.open_long')}
                      </Button>
                      <Button 
                        className="w-full bg-destructive hover:bg-destructive/90 h-12"
                        onClick={() => handleOrder('short')}
                        disabled={isSubmitting}
                      >
                        {t('contracts.open_short')}
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                      <div className="flex justify-between">
                        <span>{t('contracts.available_margin')}</span>
                        <span>{availableBalance.toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('contracts.estimated_value')}</span>
                        <span>{(parseFloat(amount || "0") * parseFloat(price || "0")).toFixed(2)} USDT</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="market" className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('contracts.leverage')}: {leverage[0]}x</Label>
                      <Slider
                        value={leverage}
                        onValueChange={setLeverage}
                        min={1}
                        max={125}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('trade.amount')} ({selectedPair.split('-')[0]})</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="w-full bg-success hover:bg-success/90 h-12"
                        onClick={() => handleOrder('long')}
                        disabled={isSubmitting}
                      >
                        {t('contracts.open_long')}
                      </Button>
                      <Button 
                        className="w-full bg-destructive hover:bg-destructive/90 h-12"
                        onClick={() => handleOrder('short')}
                        disabled={isSubmitting}
                      >
                        {t('contracts.open_short')}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {mobileView === "chart" && (
          <div className="space-y-4">
            {/* 大神曬單跑馬燈 */}
            <ExpertMarquee />
            
            {/* 圖表區域 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedPair} {t('contracts.perpetual')}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold transition-colors duration-300 ${
                      priceDirection === 'up' ? 'text-green-500' : 
                      priceDirection === 'down' ? 'text-red-500' : ''
                    }`}>
                      {(currentPrice || 0).toLocaleString()} USDT
                    </span>
                    <Badge variant={priceChange >= 0 ? "default" : "destructive"} className="gap-1 text-xs">
                      {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {priceChange.toFixed(2)}%
                    </Badge>
                    <span className={`flex items-center gap-1 text-[10px] ${wsConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-muted/50 rounded-lg p-2">
                  <CandlestickChart symbol={selectedPair} />
                </div>
              </CardContent>
            </Card>
            
            {/* 大神曬單模塊 - 跟單入口 */}
            <ExpertShowcases />
          </div>
        )}
      </div>

      {/* 桌面端：保持原有布局 */}
      <div className="hidden lg:grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{selectedPair} {t('contracts.perpetual')}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-2xl font-bold transition-colors duration-300 ${
                    priceDirection === 'up' ? 'text-green-500' : 
                    priceDirection === 'down' ? 'text-red-500' : ''
                  }`}>
                    {(currentPrice || 0).toLocaleString()} USDT
                  </span>
                  <Badge variant={priceChange >= 0 ? "default" : "destructive"} className="gap-1">
                    {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {priceChange.toFixed(2)}%
                  </Badge>
                  <span className={`flex items-center gap-1 text-xs ${wsConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  </span>
                </div>
              </div>
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC-USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH-USDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOL-USDT">SOL/USDT</SelectItem>
                  <SelectItem value="XRP-USDT">XRP/USDT</SelectItem>
                  <SelectItem value="DOGE-USDT">DOGE/USDT</SelectItem>
                  <SelectItem value="ADA-USDT">ADA/USDT</SelectItem>
                  <SelectItem value="AVAX-USDT">AVAX/USDT</SelectItem>
                  <SelectItem value="DOT-USDT">DOT/USDT</SelectItem>
                  <SelectItem value="LINK-USDT">LINK/USDT</SelectItem>
                  <SelectItem value="MATIC-USDT">MATIC/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-2">
              <CandlestickChart symbol={selectedPair} />
            </div>
            
            {/* 撮合成交量列表 */}
            <div className="mt-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="px-4 py-2 border-b border-border/50">
                <span className="text-sm font-medium">{t('contracts.recentTrades')}</span>
              </div>
              <div className="px-4 py-2 grid grid-cols-3 gap-4 text-xs text-muted-foreground border-b border-border/30">
                <div>{t('trade.price')}</div>
                <div className="text-right">{t('trade.amount')}</div>
                <div className="text-right">{t('trade.time')}</div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {Array.from({ length: 15 }, (_, i) => {
                  const basePrice = selectedPair.includes('BTC') ? 43251.80 : 
                                  selectedPair.includes('ETH') ? 2650.50 : 
                                  selectedPair.includes('SOL') ? 98.75 : 1.00;
                  const tradePrice = (basePrice + (Math.random() - 0.5) * basePrice * 0.002).toFixed(2);
                  const tradeAmount = selectedPair.includes('BTC') ? (Math.random() * 0.5).toFixed(4) :
                                selectedPair.includes('ETH') ? (Math.random() * 5).toFixed(3) :
                                (Math.random() * 100).toFixed(2);
                  const tradeTime = new Date(Date.now() - i * Math.random() * 60000).toLocaleTimeString();
                  const isBuy = Math.random() > 0.5;
                  return (
                    <div 
                      key={i} 
                      className="px-4 py-1.5 grid grid-cols-3 gap-4 text-xs hover:bg-accent/50 transition-colors"
                    >
                      <div className={`font-medium ${isBuy ? 'text-success' : 'text-destructive'}`}>
                        {tradePrice}
                      </div>
                      <div className="text-right">{tradeAmount}</div>
                      <div className="text-right text-muted-foreground">{tradeTime}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4">
              <ExpertShowcases />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('contracts.position')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="limit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="limit">{t('contracts.limit_price')}</TabsTrigger>
                <TabsTrigger value="market">{t('contracts.market_price')}</TabsTrigger>
              </TabsList>

              <TabsContent value="limit" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('contracts.leverage')}: {leverage[0]}x</Label>
                  <Slider
                    value={leverage}
                    onValueChange={setLeverage}
                    min={1}
                    max={125}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1x</span>
                    <span>125x</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('trade.price')} (USDT)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('trade.amount')} ({selectedPair.split('-')[0]})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="w-full bg-success hover:bg-success/90"
                    onClick={() => handleOrder('long')}
                    disabled={isSubmitting}
                  >
                    {t('contracts.open_long')}
                  </Button>
                  <Button 
                    className="w-full bg-destructive hover:bg-destructive/90"
                    onClick={() => handleOrder('short')}
                    disabled={isSubmitting}
                  >
                    {t('contracts.open_short')}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>{t('contracts.available_margin')}</span>
                    <span>{availableBalance.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('contracts.estimated_value')}</span>
                    <span>{(parseFloat(amount || "0") * parseFloat(price || "0")).toFixed(2)} USDT</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="market" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('contracts.leverage')}: {leverage[0]}x</Label>
                  <Slider
                    value={leverage}
                    onValueChange={setLeverage}
                    min={1}
                    max={125}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('trade.amount')} ({selectedPair.split('-')[0]})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="w-full bg-success hover:bg-success/90"
                    onClick={() => handleOrder('long')}
                    disabled={isSubmitting}
                  >
                    {t('contracts.open_long')}
                  </Button>
                  <Button 
                    className="w-full bg-destructive hover:bg-destructive/90"
                    onClick={() => handleOrder('short')}
                    disabled={isSubmitting}
                  >
                    {t('contracts.open_short')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
