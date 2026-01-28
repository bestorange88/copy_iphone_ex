import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Loader2, 
  Eye, 
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AssetTrendChart } from "./AssetTrendChart";
import { fetchAllTickers } from "@/services/marketData";

interface Balance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  usdValue: number;
}

interface BalanceData {
  unified: Balance[];  // 统一账户余额
  totalAssets: number;
  profit24h: number;
  profitPercent24h: number;
}


export function AssetOverview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balances, setBalances] = useState<BalanceData>({
    unified: [],
    totalAssets: 0,
    profit24h: 0,
    profitPercent24h: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideValues, setHideValues] = useState(false);

  const loadBalances = async () => {
    if (!user) return;
    try {
      // Fetch current market prices first to calculate real-time USD value
      const tickers = await fetchAllTickers();
      const priceMap = new Map<string, number>();
      tickers.forEach(t => {
        priceMap.set(t.symbol, parseFloat(t.lastPrice));
      });

      // 统一账户：只查询现货账户（spot）的余额
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_type', 'spot');
      
      if (balanceError) throw balanceError;

      // 获取理财持仓（Earn）
      const { data: earnData } = await supabase
        .from('earn_subscriptions')
        .select('amount, product:earn_products(coin_symbol)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // 获取矿机持仓（Mining）
      const { data: miningData } = await supabase
        .from('user_mining_rentals')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // 计算理财和矿机总值
      let earnTotal = 0;
      
      // 计算理财产品价值
      earnData?.forEach((item: any) => {
        const amount = Number(item.amount) || 0;
        const symbol = item.product?.coin_symbol;
        if (symbol) {
          if (symbol === 'USDT' || symbol === 'USDC' || symbol === 'USD') {
            earnTotal += amount;
          } else {
            // 查找对应币种价格
            // 尝试直接匹配或匹配 X/USDT
            let price = priceMap.get(symbol);
            if (!price) {
              price = priceMap.get(`${symbol}/USDT`);
            }
            if (price) {
              earnTotal += amount * price;
            }
          }
        }
      });

      // 计算矿机投入价值（默认为USDT计价）
      const miningTotal = miningData?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
      
      // 总理财持仓 = 理财产品 + 矿机
      const totalInvested = earnTotal + miningTotal;

      // 按币种汇总余额
      const currencyMap = new Map<string, { available: number; frozen: number; usdValue: number }>();
      const STABLES = new Set(["USDT", "USDC", "USD"]);
      balanceData?.forEach(b => {
        const availableNum = Number(b.available) || 0;
        const frozenNum = Number(b.frozen) || 0;
        // Always calculate total from available + frozen to ensure consistency
        const totalNum = availableNum + frozenNum;
        
        let usdVal = 0;
        if (STABLES.has(b.currency)) {
          usdVal = totalNum;
        } else {
          // Try to find real-time price
          const symbol = `${b.currency}/USDT`;
          const price = priceMap.get(symbol);
          
          if (price && price > 0) {
            usdVal = totalNum * price;
          } else {
            // Fallback to DB value if price not found, but prefer calculation
            usdVal = Number(b.usd_value) || 0;
          }
        }
        
        if (currencyMap.has(b.currency)) {
          const existing = currencyMap.get(b.currency)!;
          existing.available += availableNum;
          existing.frozen += frozenNum;
          existing.usdValue += usdVal;
        } else {
          currencyMap.set(b.currency, {
            available: availableNum,
            frozen: frozenNum,
            usdValue: usdVal
          });
        }
      });

      // Calculate total assets from the unique currency map to ensure consistency with the displayed list
      // This fixes the discrepancy where duplicate rows in DB would cause totalAssets to be higher than the sum of displayed assets
      let totalAssets = 0;
      currencyMap.forEach((value) => {
        totalAssets += value.usdValue;
      });

      // Add invested assets (Earn + Mining) to Total Assets
      // 加上理财持仓金额（理财产品 + 矿机）
      totalAssets += totalInvested;

      // 直接从合约订单记录计算24小时收益
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
      
            // 获取24小时内已结算的合约订单盈亏
            const { data: settledOrders } = await supabase
              .from('second_contract_orders')
              .select('profit')
              .eq('user_id', user.id)
              .eq('status', 'settled')
              .gte('settled_at', yesterday.toISOString());

            // 计算24小时内的总盈亏
            const profit24h = settledOrders?.reduce((sum, order) => sum + (Number(order.profit) || 0), 0) || 0;
      
            // 计算盈亏百分比（基于当前总资产）
            const profitPercent24h = totalAssets > 0 ? (profit24h / totalAssets) * 100 : 0;

      // 将 Map 转换为统一账户余额数组
      const unifiedBalances: Balance[] = Array.from(currencyMap.entries())
        .map(([currency, data]) => ({
          currency,
          available: data.available,
          frozen: data.frozen,
          total: data.available + data.frozen,
          usdValue: data.usdValue
        }))
        .sort((a, b) => b.usdValue - a.usdValue);

      setBalances({
        unified: unifiedBalances,
        totalAssets,
        profit24h,
        profitPercent24h,
      });
    } catch (error) {
      console.error('Failed to load balances:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

    useEffect(() => {
      if (!user) return;
      setLoading(true);
      loadBalances();

      // 订阅余额变化实时更新
      const balanceSubscription = supabase
        .channel('user_balances_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_balances',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // 余额变化时重新加载
            loadBalances();
          }
        )
        .subscribe();

      // 订阅合约订单变化（影响24小时收益）
      const orderSubscription = supabase
        .channel('contract_orders_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'second_contract_orders',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // 订单变化时重新加载余额
            loadBalances();
          }
        )
        .subscribe();

      return () => {
        balanceSubscription.unsubscribe();
        orderSubscription.unsubscribe();
      };
    }, [user]);

  const refreshBalances = async () => {
    setRefreshing(true);
    await loadBalances();
    toast.success(t('common.success'));
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const { totalAssets, profit24h, profitPercent24h, unified } = balances;
  const isProfit = profit24h >= 0;


  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Total Assets Header with Trend Chart */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold-glow/10 rounded-full blur-3xl" />
        
        <CardContent className="relative p-4 lg:p-8 pb-2">
          {/* Top section with trend controls */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-sm">{t('assetOverview.total_value')}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setHideValues(!hideValues)}
              >
                {hideValues ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            {/* Trend Chart Controls - right side */}
            <AssetTrendChart currentTotal={totalAssets} hideValues={hideValues} controlsOnly />
          </div>

          {/* Total Value */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl lg:text-5xl font-bold tracking-tight">
                {hideValues ? '******' : `${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
              </span>
              <Badge 
                variant="outline" 
                className={`gap-1 ${isProfit ? 'text-success border-success/30 bg-success/10' : 'text-destructive border-destructive/30 bg-destructive/10'}`}
              >
                {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isProfit ? '+' : ''}{profitPercent24h.toFixed(2)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('assetOverview.profit_24h')}: 
              <span className={`ml-1 font-medium ${isProfit ? 'text-success' : 'text-destructive'}`}>
                {hideValues ? '****' : `${isProfit ? '+' : ''}${profit24h.toFixed(2)} USDT`}
              </span>
            </div>
          </div>

          {/* Trend Chart Line - between 24h profit and buttons */}
          <div className="w-full h-8 -mx-4 lg:-mx-8 px-4 lg:px-8 mt-1 mb-2">
            <AssetTrendChart currentTotal={totalAssets} hideValues={hideValues} chartOnly />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => navigate('/deposit')}
            >
              <ArrowDownLeft className="h-4 w-4" />
              {t('assets.deposit', '充值')}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => navigate('/withdraw')}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t('assets.withdraw', '提現')}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refreshBalances} 
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
        
        {/* Date axis at the very bottom */}
        <div className="px-4 lg:px-8 pb-2">
          <AssetTrendChart currentTotal={totalAssets} hideValues={hideValues} showAxisOnly />
        </div>
      </Card>

      {/* 统一账户币种列表 */}
      {unified.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('assetOverview.my_assets', '我的資產')}</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {unified.length} {t('assets.currencies', '幣種')}
              </Badge>
            </div>
            <div className="space-y-3">
              {unified.map((balance) => (
                <div key={balance.currency} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {balance.currency.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium">{balance.currency}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('assets.available', '可用')}: {hideValues ? '****' : balance.available.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {hideValues ? '****' : balance.total.toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ≈ {hideValues ? '**' : `${balance.usdValue.toFixed(2)} USDT`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
