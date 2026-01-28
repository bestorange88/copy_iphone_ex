import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, TrendingUp, TrendingDown, RefreshCw, Trophy, TrendingDownIcon, Share2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CandlestickChart } from "./CandlestickChart";
import { ExpertMarquee } from "./ExpertMarquee";
import { useWebSocketPrice } from "@/hooks/useWebSocketPrice";
// html2canvas will be dynamically imported when needed

interface TimeContractConfig {
  id: string;
  duration_minutes: number;
  duration_value: number;
  duration_unit: 'seconds' | 'minutes' | 'hours' | 'days';
  profit_rate: number;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
}

interface TimeContractAsset {
  id: string;
  coin_symbol: string;
  coin_name: string;
  min_stake_amount: number;
  is_active: boolean;
  category: string;
}

interface SettlementResult {
  orderId: string;
  result: 'win' | 'lose';
  amount: number;
  profit: number;
  entryPrice: number;
  finalPrice: number;
  direction: 'up' | 'down';
  duration: number;
  symbol: string;
}

interface SecondContractsProps {
  mobileView?: "trade" | "chart";
}

export const SecondContracts = ({ mobileView = "trade" }: SecondContractsProps) => {
  const { t } = useTranslation();
  const [selectedDuration, setSelectedDuration] = useState("60");
  const [selectedAsset, setSelectedAsset] = useState("BTC-USDT");
  const [amount, setAmount] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [predictedDirection, setPredictedDirection] = useState<'up' | 'down' | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const currentOrderIdRef = useRef<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [configs, setConfigs] = useState<TimeContractConfig[]>([]);
  const [assets, setAssets] = useState<TimeContractAsset[]>([]);
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showCountdownDialog, setShowCountdownDialog] = useState(false);
  const resultDialogRef = useRef<HTMLDivElement>(null);
  const [sharingImage, setSharingImage] = useState(false);

  // 使用WebSocket实时价格
  const {
    price: currentPrice,
    priceChangePercent: priceChange,
    connected: wsConnected,
    priceDirection,
    refresh: refreshPrice
  } = useWebSocketPrice(selectedAsset, {
    enabled: true,
    fallbackToPolling: true,
    pollingInterval: 3000
  });

  // 加载配置
  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('time_contract_configs')
        .select('*')
        .eq('is_active', true)
        .order('duration_value', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // 类型转换
        const typedData = data.map(config => ({
          ...config,
          duration_unit: config.duration_unit as 'seconds' | 'minutes' | 'hours' | 'days'
        }));
        setConfigs(typedData);
        // 设置第一个配置为默认选项，使用秒作为统一单位
        const firstDurationInSeconds = convertToSeconds(typedData[0].duration_value, typedData[0].duration_unit);
        setSelectedDuration(firstDurationInSeconds.toString());
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  // 加载可交易资产
  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('time_contract_assets')
        .select('*')
        .eq('is_active', true)
        .order('coin_symbol', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setAssets(data);
        // 优先选择 BTC-USDT 作为默认交易对
        const btcAsset = data.find(a => a.coin_symbol === 'BTC-USDT');
        setSelectedAsset(btcAsset ? btcAsset.coin_symbol : data[0].coin_symbol);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  // 转换为秒
  const convertToSeconds = (value: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): number => {
    switch (unit) {
      case 'seconds': return value;
      case 'minutes': return value * 60;
      case 'hours': return value * 3600;
      case 'days': return value * 86400;
      default: return value;
    }
  };

  // 加载USDT余额 - 从现货账户获取（分钟合约从现货账户扣款）
  const loadBalance = async () => {
    try {
      setLoadingBalance(true);
      const { data, error } = await supabase.functions.invoke('user-balance');
      
      if (error) throw error;
      
      // 分钟合约使用现货账户余额（与扣款逻辑一致）
      let spotUsdtAvailable = 0;
      if (data.spot) {
        const spotUsdt = data.spot.find((b: any) => b.currency === 'USDT');
        spotUsdtAvailable = spotUsdt?.available || 0;
      }
      setUsdtBalance(spotUsdtAvailable);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  // 价格现在由useWebSocketPrice hook自动获取和更新

  useEffect(() => {
    loadConfigs();
    loadAssets();
    loadBalance();
    // 价格更新现在由WebSocket hook处理

    // 设置实时监听当前用户的订单更新
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    // 定时调用结算函数，确保所有到期订单都能被处理
    // 每30秒触发一次，帮助处理所有用户的过期订单
    const settlementInterval = setInterval(() => {
      supabase.functions.invoke('settle-second-contracts').catch((e) => {
        console.error('Periodic settlement failed:', e);
      });
    }, 30000);

    // 组件挂载时立即触发一次结算
    supabase.functions.invoke('settle-second-contracts').catch((e) => {
      console.error('Initial settlement failed:', e);
    });
    
    const setupRealtimeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('second-contract-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'second_contract_orders',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updated = payload.new as any;
            
            // 使用 ref 获取最新的 currentOrderId，避免闭包问题
            console.log('Order update received:', updated);
            console.log('Current order ID (ref):', currentOrderIdRef.current);
            
            // 如果订单状态变为settled且是当前正在进行的订单
            if (updated.status === 'settled' && updated.id === currentOrderIdRef.current) {
              console.log('Order settled, showing dialog');
              
              // 显示结算结果弹窗
              setSettlementResult({
                orderId: updated.id,
                result: updated.result,
                amount: updated.amount,
                profit: updated.profit,
                entryPrice: updated.entry_price,
                finalPrice: updated.final_price,
                direction: updated.direction,
                duration: updated.duration,
                symbol: updated.symbol || selectedAsset
              });
              
              // 关闭倒计时弹窗，显示结果弹窗
              setShowCountdownDialog(false);
              setShowResultDialog(true);
              
              // 刷新余额
              loadBalance();
              
              // 重置状态
              setCountdown(null);
              setPredictedDirection(null);
              setCurrentOrderId(null);
              currentOrderIdRef.current = null;
              setAmount("");
            }
          }
        )
        .subscribe();
    };

    setupRealtimeListener();

    return () => {
      clearInterval(settlementInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // 移除依赖，只在组件挂载时订阅一次

  useEffect(() => {
    let timer: number | undefined;

    if (countdown !== null && countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      // 倒计时结束，触发后端结算并等待实时推送
      toast.info(t('secondContracts.waitingSettlement') || '合约已到期，等待自动结算...');

      // 主动触发一次结算函数，确保订单被处理
      supabase.functions.invoke('settle-second-contracts').catch((e) => {
        console.error('Failed to invoke settlement:', e);
      });

      // 兜底方案：3秒后主动查询一次该订单的状态，防止实时通道异常时不展示弹窗
      if (currentOrderIdRef.current) {
        const orderId = currentOrderIdRef.current;
        window.setTimeout(async () => {
          try {
            const { data, error } = await supabase
              .from('second_contract_orders')
              .select('*')
              .eq('id', orderId)
              .single();

            if (!error && data && data.status === 'settled') {
              setSettlementResult({
                orderId: data.id,
                result: data.result as 'win' | 'lose',
                amount: data.amount,
                profit: data.profit,
                entryPrice: data.entry_price,
                finalPrice: data.final_price,
                direction: data.direction as 'up' | 'down',
                duration: data.duration,
                symbol: data.symbol || selectedAsset
              });
              setShowCountdownDialog(false);
              setShowResultDialog(true);
              await loadBalance();
              setCurrentOrderId(null);
              currentOrderIdRef.current = null;
            }
          } catch (err) {
            console.error('Polling settlement failed:', err);
          }
        }, 3000);
      }

      setCountdown(null);
      setPredictedDirection(null);
      // setCurrentOrderId(null); // 不立即清除，等收到结算再清除
      setAmount("");
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [countdown]);

  const handlePredict = async (direction: 'up' | 'down') => {
    // 获取当前选择的配置
    const durationSeconds = parseInt(selectedDuration);
    const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
    
    if (!selectedConfig) {
      toast.error(t('common.error'));
      return;
    }

    const betAmount = parseFloat(amount);
    
    if (!amount || betAmount < selectedConfig.min_amount) {
      toast.error(`${t('secondContracts.minBetAmount')}: ${selectedConfig.min_amount} USDT`);
      return;
    }

    if (selectedConfig.max_amount && betAmount > selectedConfig.max_amount) {
      toast.error(`${t('secondContracts.maxBetAmount')}: ${selectedConfig.max_amount} USDT`);
      return;
    }

    // 检查余额
    if (betAmount > usdtBalance) {
      toast.error(t('trade.insufficient_balance'));
      return;
    }

    try {
      setIsPlacingOrder(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 计算结算时间
      const durationSeconds = parseInt(selectedDuration);
      const settlementTime = new Date(Date.now() + durationSeconds * 1000);

      // 创建订单，使用配置中的收益率
      const { data: orderData, error: orderError } = await supabase
        .from('second_contract_orders')
        .insert({
          user_id: user.id,
          symbol: selectedAsset,
          duration: durationSeconds,
          amount: betAmount,
          entry_price: currentPrice,
          direction: direction,
          settlement_time: settlementTime.toISOString(),
          yield_rate: selectedConfig.profit_rate // 已为小数（0.2=20%）
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 扣除余额（冻结）- 从现货账户（统一账户使用spot）
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('currency', 'USDT')
        .eq('account_type', 'spot')
        .maybeSingle();

      if (balanceError) throw balanceError;
      
      if (!balanceData) {
        toast.error(t('trade.insufficient_balance'));
        return;
      }

      const newAvailable = Number(balanceData.available) - betAmount;
      const newFrozen = Number(balanceData.frozen) + betAmount;
      const newTotal = newAvailable + newFrozen;
      const newUsdValue = newTotal; // USDT 1:1 USD

      // 注意：total 是数据库生成列（generated column），不能直接更新
      // 数据库会自动计算 total = available + frozen
      const { error: updateBalanceError } = await supabase
        .from('user_balances')
        .update({
          available: newAvailable,
          frozen: newFrozen,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('currency', 'USDT')
        .eq('account_type', 'spot');

      if (updateBalanceError) throw updateBalanceError;

      // 刷新余额
      await loadBalance();

      setCurrentOrderId(orderData.id);
      currentOrderIdRef.current = orderData.id; // 同时更新 ref
      setPredictedDirection(direction);
      setCountdown(durationSeconds);
      
      // 立即显示倒计时弹窗
      setShowCountdownDialog(true);
      
      toast.success(t('secondContracts.orderSubmitted'), {
        description: `${t('secondContracts.predictPrice')} ${getDurationLabel(selectedDuration)}${t('secondContracts.after')}${direction === 'up' ? t('secondContracts.rise') : t('secondContracts.fall')}`,
      });
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(t('common.error'));
    } finally {
      setIsPlacingOrder(false);
    }
  };


  const handleCloseResultDialog = () => {
    setShowResultDialog(false);
    setShowCountdownDialog(false);
    setSettlementResult(null);
  };

  const handleShareToWhatsApp = async () => {
    if (!settlementResult || !resultDialogRef.current) return;

    try {
      setSharingImage(true);

      // 动态加载 html2canvas，减小类型负担
      const { default: html2canvas } = await import('html2canvas');
      // 捕获弹窗截图
      const canvas = await html2canvas(resultDialogRef.current, {
        backgroundColor: '#000000',
        scale: 2, // 提高清晰度
        logging: false,
      });

      // 转换为 blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error(t('common.error'));
          setSharingImage(false);
          return;
        }

        // 检查是否支持 Web Share API（移动设备）
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], 'trading-result.png', { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'BTC/USDT ' + t('secondContracts.contract'),
                text: `P&L: ${settlementResult.result === 'win' ? '+' : ''}${settlementResult.profit.toFixed(2)} USDT`,
              });
              setSharingImage(false);
              return;
            } catch (error) {
              if ((error as Error).name !== 'AbortError') {
                console.error('Share failed:', error);
              }
            }
          }
        }

        // 备用方案：下载图片
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trading-result-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(t('common.imageDownloaded'));
        setSharingImage(false);
      }, 'image/png');
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast.error(t('common.error'));
      setSharingImage(false);
    }
  };

  // 圆形进度条组件
  const CircularProgress = ({ value, max }: { value: number; max: number }) => {
    // 计算剩余百分比（倒计时从100%到0%）
    const percentage = (value / max) * 100;
    // 圆的半径是85，周长 = 2 * PI * r = 2 * 3.14159 * 85 ≈ 534
    const circumference = 2 * Math.PI * 85;
    // 从满圆开始，随着倒计时减少而减少
    const strokeDashoffset = circumference * (1 - percentage / 100);

    return (
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          {/* 背景圆 */}
          <circle
            cx="96"
            cy="96"
            r="85"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
            opacity="0.2"
          />
          {/* 进度圆 */}
          <circle
            cx="96"
            cy="96"
            r="85"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${
              predictedDirection === 'up' ? 'text-success' : 'text-destructive'
            }`}
            strokeLinecap="round"
          />
        </svg>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {t('secondContracts.seconds')}
          </div>
        </div>
      </div>
    );
  };

  const getDurationLabel = (seconds: string) => {
    const num = parseInt(seconds);
    if (num < 60) return `${num}${t('secondContracts.seconds')}`;
    if (num < 3600) return `${num / 60}${t('secondContracts.minutes')}`;
    if (num < 86400) return `${num / 3600}${t('secondContracts.hours')}`;
    return `${num / 86400}${t('secondContracts.days')}`;
  };


  return (
    <>
      {/* 倒计时弹窗 - 下单后立即显示 */}
      <Dialog open={showCountdownDialog} onOpenChange={setShowCountdownDialog}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <div className="space-y-6 py-6">
            {/* 标题 */}
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">
                {selectedAsset} {t('secondContracts.contract')}
              </h3>
              <div className={`text-lg font-medium ${
                predictedDirection === 'up' ? 'text-success' : 'text-destructive'
              }`}>
                {predictedDirection === 'up' 
                  ? t('secondContracts.buyLong') 
                  : t('secondContracts.sellShort')}
              </div>
            </div>

            {/* 圆形倒计时 */}
            <div className="flex justify-center">
              <CircularProgress 
                value={countdown || 0} 
                max={parseInt(selectedDuration)} 
              />
            </div>

            {/* 交易信息 */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('secondContracts.entryPrice')}</span>
                <span className="font-medium">{(currentPrice || 0).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('secondContracts.amount')}</span>
                <span className="font-medium">{amount} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('secondContracts.orderType')}</span>
                <span className="font-medium">
                  {getDurationLabel(selectedDuration)}
                </span>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="text-center text-sm text-muted-foreground">
              {t('secondContracts.predictPriceWill')}
              {predictedDirection === 'up' ? t('secondContracts.rise') : t('secondContracts.fall')}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 结算结果弹窗 - 交易完成后显示 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <div ref={resultDialogRef} className="space-y-6 py-4">{/* 添加 ref 用于截图 */}
            {/* 标题 */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">
                {settlementResult?.symbol || selectedAsset} {t('secondContracts.contract')}
              </h3>
            </div>

            {settlementResult && (
              <>
                {/* 大的盈亏显示 */}
                <div className="text-center py-4">
                  <div className={`text-4xl font-bold ${
                    settlementResult.result === 'win' 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    P&L{settlementResult.result === 'win' ? '+' : ''}
                    {settlementResult.profit.toFixed(2)} USDT
                  </div>
                </div>

                {/* 详细信息 */}
                <div className="space-y-4 bg-muted/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('secondContracts.entryPrice')}</span>
                    <span className="font-medium">{settlementResult.entryPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('secondContracts.settlementPrice')}</span>
                    <span className={`font-medium ${
                      settlementResult.finalPrice > settlementResult.entryPrice 
                        ? 'text-success' 
                        : 'text-destructive'
                    }`}>
                      {settlementResult.finalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('secondContracts.direction')}</span>
                    <span className={`font-medium ${
                      settlementResult.direction === 'up' ? 'text-success' : 'text-destructive'
                    }`}>
                      {settlementResult.direction === 'up' 
                        ? t('secondContracts.buyLong') 
                        : t('secondContracts.sellShort')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('secondContracts.amount')}</span>
                    <span className="font-medium">{settlementResult.amount.toFixed(2)} USDT</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('secondContracts.orderType')}</span>
                    <span className="font-medium">
                      {getDurationLabel(settlementResult.duration.toString())}
                    </span>
                  </div>
                </div>

                {/* 按钮 */}
                <div className="space-y-3 pt-2">
                  {/* 分享按钮 */}
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={handleShareToWhatsApp}
                    disabled={sharingImage}
                    className="w-full border-success/50 hover:bg-success/10"
                  >
                    {sharingImage ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {t('common.generating')}
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        {t('common.shareToWhatsApp')}
                      </>
                    )}
                  </Button>

                  {/* 关闭和继续按钮 */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      size="lg"
                      onClick={handleCloseResultDialog}
                      className="bg-muted hover:bg-muted/80"
                    >
                      {t('common.close')}
                    </Button>
                    <Button 
                      size="lg"
                      onClick={handleCloseResultDialog}
                      className={settlementResult.result === 'win' 
                        ? 'bg-success hover:bg-success/90' 
                        : 'bg-primary hover:bg-primary/90'
                      }
                    >
                      {t('common.continue')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 大神曬單跑馬燈 */}
      <ExpertMarquee />
      
      {/* 原有内容 */}
      {/* 移动端：根據 mobileView 顯示交易或圖表 */}
      <div className="lg:hidden">
        {mobileView === "trade" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {/* 资产选择器 */}
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue placeholder={t('trade.pair')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {assets.length > 0 ? (
                      <>
                        {assets.filter(a => a.category === 'crypto').length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">加密貨幣</div>
                            {assets.filter(a => a.category === 'crypto').map((asset) => (
                              <SelectItem key={asset.id} value={asset.coin_symbol}>
                                {asset.coin_symbol} - {asset.coin_name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {assets.filter(a => a.category === 'futures').length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">期貨</div>
                            {assets.filter(a => a.category === 'futures').map((asset) => (
                              <SelectItem key={asset.id} value={asset.coin_symbol}>
                                {asset.coin_symbol} - {asset.coin_name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      <SelectItem value="BTC-USDT">BTC-USDT</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {/* 价格信息 */}
                <span className={`text-xl font-bold transition-colors duration-300 ${
                  priceDirection === 'up' ? 'text-green-500' : 
                  priceDirection === 'down' ? 'text-red-500' : ''
                }`}>
                  {(currentPrice || 0).toLocaleString()} USDT
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {t('trade.available')}: <span className="font-medium text-foreground">{usdtBalance.toFixed(2)} USDT</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadBalance}
                  disabled={loadingBalance}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* 时间周期选择按钮 */}
              <div className="space-y-2">
                <Label>{t('secondContracts.selectDuration')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {configs.map((config) => {
                    const seconds = convertToSeconds(config.duration_value, config.duration_unit);
                    const isSelected = selectedDuration === seconds.toString();
                    return (
                      <Button
                        key={config.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDuration(seconds.toString())}
                        disabled={countdown !== null}
                        className={`text-xs py-3 ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                      >
                        {config.duration_value}s ({(config.profit_rate * 100).toFixed(0)}%)
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('secondContracts.betAmount')}</Label>
                <Input
                  type="number"
                  placeholder={(() => {
                    const durationSeconds = parseInt(selectedDuration);
                    const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                    if (selectedConfig) {
                      const minAmount = selectedConfig.min_amount || 10;
                      const maxAmount = selectedConfig.max_amount || 10000;
                      return `${minAmount} - ${maxAmount}`;
                    }
                    return "10 - 10,000";
                  })()}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={countdown !== null}
                />
                <div className="flex gap-2">
                  {(() => {
                    const durationSeconds = parseInt(selectedDuration);
                    const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                    const minAmount = selectedConfig?.min_amount || 10;
                    const maxAmount = selectedConfig?.max_amount || 10000;
                    
                    // 生成合理的快捷选择按钮值
                    const quickAmounts: number[] = [];
                    
                    // 根据金额范围智能生成快捷值
                    if (maxAmount <= 1000) {
                      quickAmounts.push(minAmount, Math.round(maxAmount * 0.25), Math.round(maxAmount * 0.5), maxAmount);
                    } else if (maxAmount <= 10000) {
                      const base = Math.pow(10, Math.floor(Math.log10(minAmount)));
                      quickAmounts.push(minAmount, base * 5, base * 10, base * 50);
                    } else {
                      let current = minAmount;
                      while (quickAmounts.length < 4 && current <= maxAmount) {
                        quickAmounts.push(current);
                        current *= 10;
                      }
                      if (quickAmounts.length < 4) {
                        quickAmounts.push(Math.round(maxAmount * 0.5));
                      }
                    }
                    
                    const uniqueAmounts = Array.from(new Set(quickAmounts))
                      .filter(v => v >= minAmount && v <= maxAmount)
                      .sort((a, b) => a - b)
                      .slice(0, 4);
                    
                    return uniqueAmounts.map((val, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(val.toString())}
                        disabled={countdown !== null}
                        className="flex-1 text-xs lg:text-sm"
                      >
                        {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                      </Button>
                    ));
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  className="w-full bg-success hover:bg-success/90 h-16"
                  onClick={() => handlePredict('up')}
                  disabled={countdown !== null || isPlacingOrder}
                >
                  <div className="flex flex-col items-center gap-1">
                    <TrendingUp className="h-5 w-5" />
                    <span>{isPlacingOrder ? t('common.submitting') : t('secondContracts.bullish')}</span>
                  </div>
                </Button>
                <Button 
                  className="w-full bg-destructive hover:bg-destructive/90 h-16"
                  onClick={() => handlePredict('down')}
                  disabled={countdown !== null || isPlacingOrder}
                >
                  <div className="flex flex-col items-center gap-1">
                    <TrendingDown className="h-5 w-5" />
                    <span>{t('secondContracts.bearish')}</span>
                  </div>
                </Button>
              </div>

              {countdown !== null && (
                <div className="bg-muted rounded-lg p-6 text-center space-y-4">
                  <Clock className="h-12 w-12 mx-auto text-primary animate-pulse" />
                  <div className="text-4xl font-bold">{countdown}s</div>
                    <div className="text-sm text-muted-foreground">
                      {t('secondContracts.predictPriceWill')}{predictedDirection === 'up' ? t('secondContracts.rise') : t('secondContracts.fall')}
                  </div>
                </div>
              )}

              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('secondContracts.settlementTime')}</span>
                    <span className="font-medium">{getDurationLabel(selectedDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('secondContracts.yieldRate')}</span>
                    <span className="font-medium text-success">
                      {(() => {
                        const durationSeconds = parseInt(selectedDuration);
                        const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                        const profitRate = selectedConfig?.profit_rate || 0.85;
                        // profit_rate在数据库中存储为小数（如0.2表示20%），需要乘以100显示
                        const ratePercent = profitRate * 100;
                        return `${ratePercent.toFixed(0)}%`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('secondContracts.expectedProfit')}</span>
                    <span className="font-medium">
                      {(() => {
                        const durationSeconds = parseInt(selectedDuration);
                        const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                        const profitRate = selectedConfig?.profit_rate || 0.85;
                        // profit_rate在数据库中存储为小数，直接乘以金额即可
                        return amount ? (parseFloat(amount) * profitRate).toFixed(2) : '0.00';
                      })()} USDT
                    </span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

        {mobileView === "chart" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{selectedAsset} {t('secondContracts.contract')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-2">
                <CandlestickChart symbol={selectedAsset} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 桌面端：保持原有布局 */}
      <div className="hidden lg:grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              {/* 资产选择器 */}
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="w-[160px] shrink-0">
                  <SelectValue placeholder={t('trade.pair')} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {assets.length > 0 ? (
                    <>
                      {assets.filter(a => a.category === 'crypto').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">加密貨幣</div>
                          {assets.filter(a => a.category === 'crypto').map((asset) => (
                            <SelectItem key={asset.id} value={asset.coin_symbol}>
                              {asset.coin_symbol} - {asset.coin_name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {assets.filter(a => a.category === 'futures').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">期貨</div>
                          {assets.filter(a => a.category === 'futures').map((asset) => (
                            <SelectItem key={asset.id} value={asset.coin_symbol}>
                              {asset.coin_symbol} - {asset.coin_name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <SelectItem value="BTC-USDT">BTC-USDT</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {/* 价格信息 */}
              <span className={`text-2xl font-bold transition-colors duration-300 ${
                priceDirection === 'up' ? 'text-green-500' : 
                priceDirection === 'down' ? 'text-red-500' : ''
              }`}>
                {(currentPrice || 0).toLocaleString()} USDT
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {countdown !== null ? (
              <div className="h-[400px] bg-muted/50 rounded-lg flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                  <Clock className="h-16 w-16 mx-auto text-primary animate-pulse" />
                  <div className="text-5xl font-bold">{countdown}s</div>
                      <div className="text-muted-foreground">
                        {t('secondContracts.predictPriceWill')}{predictedDirection === 'up' ? t('secondContracts.rise') : t('secondContracts.fall')}
                  </div>
                </div>
              </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-2">
                        <CandlestickChart symbol={selectedAsset} />
                      </div>
                    )}
            
                                        {/* 撮合成交量列表 */}
                                        {countdown === null && (
                                          <div className="mt-4 bg-muted/30 rounded-lg border border-border/50">
                                            <div className="px-4 py-2 border-b border-border/50">
                                              <span className="text-sm font-medium">{t('secondContracts.recentTrades')}</span>
                                            </div>
                                            <div className="px-4 py-2 grid grid-cols-3 gap-4 text-xs text-muted-foreground border-b border-border/30">
                                              <div>{t('trade.price')}</div>
                                              <div className="text-right">{t('trade.amount')}</div>
                                              <div className="text-right">{t('trade.time')}</div>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto">
                                              {Array.from({ length: 15 }, (_, i) => {
                                                const basePrice = selectedAsset.includes('BTC') ? 43251.80 : 
                                                                selectedAsset.includes('ETH') ? 2650.50 : 
                                                                selectedAsset.includes('SOL') ? 98.75 : 1.00;
                                                const price = (basePrice + (Math.random() - 0.5) * basePrice * 0.002).toFixed(2);
                                                const amount = selectedAsset.includes('BTC') ? (Math.random() * 0.5).toFixed(4) :
                                                              selectedAsset.includes('ETH') ? (Math.random() * 5).toFixed(3) :
                                                              (Math.random() * 100).toFixed(2);
                                                const time = new Date(Date.now() - i * Math.random() * 60000).toLocaleTimeString();
                                                const isBuy = Math.random() > 0.5;
                                                return (
                                                  <div 
                                                    key={i} 
                                                    className="px-4 py-1.5 grid grid-cols-3 gap-4 text-xs hover:bg-accent/50 transition-colors"
                                                  >
                                                    <div className={`font-medium ${isBuy ? 'text-success' : 'text-destructive'}`}>
                                                      {price}
                                                    </div>
                                                    <div className="text-right">{amount}</div>
                                                    <div className="text-right text-muted-foreground">{time}</div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                  </CardContent>
                </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('secondContracts.quickTrade')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('trade.available')}: <span className="font-medium text-foreground">{usdtBalance.toFixed(2)} USDT</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadBalance}
                disabled={loadingBalance}
              >
                <RefreshCw className={`h-4 w-4 ${loadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* 时间周期选择按钮 */}
            <div className="space-y-2">
              <Label>{t('secondContracts.selectDuration')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {configs.map((config) => {
                  const seconds = convertToSeconds(config.duration_value, config.duration_unit);
                  const isSelected = selectedDuration === seconds.toString();
                  return (
                    <Button
                      key={config.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDuration(seconds.toString())}
                      disabled={countdown !== null}
                      className={`text-xs py-3 ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      {config.duration_value}s ({(config.profit_rate * 100).toFixed(0)}%)
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('secondContracts.betAmount')}</Label>
              <Input
                type="number"
                placeholder={(() => {
                  const durationSeconds = parseInt(selectedDuration);
                  const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                  if (selectedConfig) {
                    const minAmount = selectedConfig.min_amount || 10;
                    const maxAmount = selectedConfig.max_amount || 10000;
                    return `${minAmount} - ${maxAmount}`;
                  }
                  return "10 - 10,000";
                })()}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={countdown !== null}
              />
              <div className="flex gap-2">
                {(() => {
                  const durationSeconds = parseInt(selectedDuration);
                  const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                  const minAmount = selectedConfig?.min_amount || 10;
                  const maxAmount = selectedConfig?.max_amount || 10000;
                  
                  const quickAmounts: number[] = [];
                  
                  if (maxAmount <= 1000) {
                    quickAmounts.push(minAmount, Math.round(maxAmount * 0.25), Math.round(maxAmount * 0.5), maxAmount);
                  } else if (maxAmount <= 10000) {
                    const base = Math.pow(10, Math.floor(Math.log10(minAmount)));
                    quickAmounts.push(minAmount, base * 5, base * 10, base * 50);
                  } else {
                    let current = minAmount;
                    while (quickAmounts.length < 4 && current <= maxAmount) {
                      quickAmounts.push(current);
                      current *= 10;
                    }
                    if (quickAmounts.length < 4) {
                      quickAmounts.push(Math.round(maxAmount * 0.5));
                    }
                  }
                  
                  const uniqueAmounts = Array.from(new Set(quickAmounts))
                    .filter(v => v >= minAmount && v <= maxAmount)
                    .sort((a, b) => a - b)
                    .slice(0, 4);
                  
                  return uniqueAmounts.map((val, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(val.toString())}
                      disabled={countdown !== null}
                      className="flex-1"
                    >
                      {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                    </Button>
                  ));
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="w-full bg-success hover:bg-success/90 h-16"
                onClick={() => handlePredict('up')}
                disabled={countdown !== null || isPlacingOrder}
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="h-5 w-5" />
                  <span>{isPlacingOrder ? t('common.submitting') : t('secondContracts.bullish')}</span>
                </div>
              </Button>
              <Button 
                className="w-full bg-destructive hover:bg-destructive/90 h-16"
                onClick={() => handlePredict('down')}
                disabled={countdown !== null || isPlacingOrder}
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingDown className="h-5 w-5" />
                  <span>{t('secondContracts.bearish')}</span>
                </div>
              </Button>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('secondContracts.settlementTime')}</span>
                  <span className="font-medium">{getDurationLabel(selectedDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('secondContracts.yieldRate')}</span>
                  <span className="font-medium text-success">
                    {(() => {
                      const durationSeconds = parseInt(selectedDuration);
                      const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                      const profitRate = selectedConfig?.profit_rate || 0.85;
                      // profit_rate在数据库中存储为小数（如0.2表示20%），需要乘以100显示
                      const ratePercent = profitRate * 100;
                      return `${ratePercent.toFixed(0)}%`;
                    })()}
                  </span>
                </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('secondContracts.expectedProfit')}</span>
                      <span className="font-medium">
                        {(() => {
                          const durationSeconds = parseInt(selectedDuration);
                          const selectedConfig = configs.find(c => convertToSeconds(c.duration_value, c.duration_unit) === durationSeconds);
                          const profitRate = selectedConfig?.profit_rate || 0.85;
                          // profit_rate在数据库中存储为小数，直接乘以金额即可
                          return amount ? (parseFloat(amount) * profitRate).toFixed(2) : '0.00';
                        })()} USDT
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
              <p>• {t('secondContracts.feature1')}</p>
              <p>• {t('secondContracts.feature2')}</p>
              <p>• {t('secondContracts.feature3')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
