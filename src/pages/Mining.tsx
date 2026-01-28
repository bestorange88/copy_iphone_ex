import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pickaxe, Cpu, Zap, TrendingUp, Gift, HardDrive, Server, Loader2, Clock, DollarSign, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface MiningProduct {
  id: string;
  name: string;
  description: string | null;
  daily_rate: number;
  min_amount: number;
  max_amount: number | null;
  period_days: number;
  is_free: boolean;
  expected_profit: number;
  icon_type: string | null;
  return_type: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  early_redemption_fee: number | null;
  allow_early_redemption: boolean | null;
}

interface UserRental {
  id: string;
  amount: number;
  daily_profit: number;
  total_earned: number;
  start_date: string;
  end_date: string;
  status: string;
  product: MiningProduct;
}

const getIconComponent = (iconType: string) => {
  switch (iconType) {
    case 'gift':
      return <Gift className="h-10 w-10 text-amber-500" />;
    case 'cpu':
      return <Cpu className="h-10 w-10 text-blue-500" />;
    case 'hard-drive':
      return <HardDrive className="h-10 w-10 text-purple-500" />;
    case 'server':
      return <Server className="h-10 w-10 text-green-500" />;
    default:
      return <Cpu className="h-10 w-10 text-muted-foreground" />;
  }
};

const getIconBgColor = (iconType: string) => {
  switch (iconType) {
    case 'gift':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'cpu':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'hard-drive':
      return 'bg-purple-500/10 border-purple-500/20';
    case 'server':
      return 'bg-green-500/10 border-green-500/20';
    default:
      return 'bg-muted';
  }
};

const Mining = () => {
  const { t } = useTranslation();
  
  const getReturnTypeLabel = (returnType: string | null) => {
    switch (returnType) {
      case "daily_interest": return t('mining.return_type_daily');
      case "maturity_interest": return t('mining.return_type_maturity');
      default: return t('mining.return_type_daily');
    }
  };
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
    const [products, setProducts] = useState<MiningProduct[]>([]);
    const [rentals, setRentals] = useState<UserRental[]>([]);
    const [loading, setLoading] = useState(true);
    const [renting, setRenting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<MiningProduct | null>(null);
    const [rentAmount, setRentAmount] = useState("");
    const [showRentDialog, setShowRentDialog] = useState(false);
    const [showRedeemDialog, setShowRedeemDialog] = useState(false);
    const [selectedRental, setSelectedRental] = useState<UserRental | null>(null);
    const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('mining_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch user rentals
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('user_mining_rentals')
        .select('*, product:mining_products(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (rentalsError) throw rentalsError;
      setRentals(rentalsData?.map(r => ({
        ...r,
        product: r.product as MiningProduct
      })) || []);
    } catch (error) {
      console.error('Error fetching mining data:', error);
      toast.error('加載數據失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRentClick = (product: MiningProduct) => {
    setSelectedProduct(product);
    setRentAmount(product.is_free ? "0" : product.min_amount.toString());
    setShowRentDialog(true);
  };

  const handleRent = async () => {
    if (!selectedProduct || !user) return;

    const amount = parseFloat(rentAmount);
    if (!selectedProduct.is_free) {
      if (isNaN(amount) || amount < selectedProduct.min_amount) {
        toast.error(`最低投資金額為 ${selectedProduct.min_amount} USDT`);
        return;
      }
      if (selectedProduct.max_amount && amount > selectedProduct.max_amount) {
        toast.error(`最高投資金額為 ${selectedProduct.max_amount} USDT`);
        return;
      }
    }

    setRenting(true);
    try {
      const dailyProfit = selectedProduct.is_free 
        ? selectedProduct.expected_profit / selectedProduct.period_days
        : amount * (selectedProduct.daily_rate / 100);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedProduct.period_days);

      const { error } = await supabase
        .from('user_mining_rentals')
        .insert({
          user_id: user.id,
          product_id: selectedProduct.id,
          amount: selectedProduct.is_free ? 0 : amount,
          daily_profit: dailyProfit,
          end_date: endDate.toISOString(),
          status: 'active'
        });

      if (error) throw error;

        toast.success(t('mining.rent_success'));
        setShowRentDialog(false);
        fetchData();
      } catch (error) {
        console.error('Error renting:', error);
        toast.error(t('mining.rent_failed'));
      } finally {
        setRenting(false);
      }
    };

    const handleRedeemClick = (rental: UserRental) => {
      if (rental.product?.allow_early_redemption === false) {
        toast.error(t('mining.early_redemption_not_allowed'));
        return;
      }
      setSelectedRental(rental);
      setShowRedeemDialog(true);
    };

    const handleRedeem = async () => {
      if (!selectedRental || !user) return;

      setRedeeming(true);
      try {
        const feeRate = selectedRental.product?.early_redemption_fee ?? 10;
        const penalty = selectedRental.amount * (feeRate / 100);
        const returnAmount = selectedRental.amount - penalty + selectedRental.total_earned;

        // Update rental status to redeemed
        const { error: updateError } = await supabase
          .from('user_mining_rentals')
          .update({ status: 'redeemed' })
          .eq('id', selectedRental.id);

        if (updateError) throw updateError;

        // Add return amount to user balance
        const { error: balanceError } = await supabase
          .from('user_balances')
          .upsert({
            user_id: user.id,
            currency: 'USDT',
            account_type: 'spot',
            available: returnAmount,
          }, {
            onConflict: 'user_id,currency,account_type',
          });

        if (balanceError) {
          // If upsert fails, try to update existing balance
          const { data: existingBalance } = await supabase
            .from('user_balances')
            .select('available')
            .eq('user_id', user.id)
            .eq('currency', 'USDT')
            .eq('account_type', 'spot')
            .single();

          if (existingBalance) {
            await supabase
              .from('user_balances')
              .update({ available: (existingBalance.available || 0) + returnAmount })
              .eq('user_id', user.id)
              .eq('currency', 'USDT')
              .eq('account_type', 'spot');
          }
        }

        toast.success(t('mining.redeem_success', { amount: returnAmount.toFixed(2) }));
        setShowRedeemDialog(false);
        setSelectedRental(null);
        fetchData();
      } catch (error) {
        console.error('Error redeeming:', error);
        toast.error(t('mining.redeem_failed'));
      } finally {
        setRedeeming(false);
      }
    };

    // Calculate stats
  const activeRentals = rentals.filter(r => r.status === 'active');
  const totalDailyProfit = activeRentals.reduce((sum, r) => sum + r.daily_profit, 0);
  const totalEarned = rentals.reduce((sum, r) => sum + r.total_earned, 0);

  if (authLoading || !user) {
    return null;
  }

  const cloudMiningPools = [
    { coin: "BTC", apy: "18%", participants: "12,458", tvl: "45.2M USDT", risk: t('mining.low_risk') },
    { coin: "ETH", apy: "25%", participants: "8,923", tvl: "32.7M USDT", risk: t('mining.medium_risk') },
    { coin: "DOGE", apy: "35%", participants: "15,632", tvl: "18.5M USDT", risk: t('mining.high_risk') },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 mb-20 lg:mb-0">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Pickaxe className="h-8 w-8 text-primary" />
            {t('mining.title')}
          </h1>
          <p className="text-muted-foreground">{t('mining.subtitle')}</p>
        </div>

        {/* Mining Stats Dashboard - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Activity className="h-3 w-3" />
                {t('mining.my_hashrate')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 px-3 pt-0">
              <div className="text-lg font-bold">{activeRentals.length > 0 ? `${activeRentals.length * 10} TH/s` : '0 TH/s'}</div>
              <p className="text-[10px] text-muted-foreground">
                {activeRentals.length > 0 ? `${activeRentals.length} 台运行中` : t('mining.no_hashrate')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <DollarSign className="h-3 w-3" />
                {t('mining.today_profit')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 px-3 pt-0">
                            <div className="text-lg font-bold text-green-500">+{totalDailyProfit.toFixed(2)} USDT</div>
                            <p className="text-[10px] text-muted-foreground">{t('mining.daily_earnings')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3 w-3" />
                {t('mining.total_profit')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 px-3 pt-0">
                            <div className="text-lg font-bold">{totalEarned.toFixed(2)} USDT</div>
                            <p className="text-[10px] text-muted-foreground">{t('mining.accumulated_earnings')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3" />
                {t('mining.status')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 px-3 pt-0">
              <div className="flex items-center gap-1">
                <Badge variant={activeRentals.length > 0 ? "default" : "outline"} className={`text-[10px] h-5 ${activeRentals.length > 0 ? "bg-green-500" : ""}`}>
                  {activeRentals.length > 0 ? '運行中' : t('mining.offline')}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{t('mining.miners_running', { count: activeRentals.length })}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="hashrate" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="hashrate" className="gap-2">
              <Cpu className="h-4 w-4" />
              {t('mining.hashrate_plans')}
            </TabsTrigger>
                        <TabsTrigger value="my-machines" className="gap-2">
                          <Server className="h-4 w-4" />
                          {t('mining.my_machines')}
                        </TabsTrigger>
            <TabsTrigger value="cloud" className="gap-2">
              <Zap className="h-4 w-4" />
              {t('mining.cloud_pool')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hashrate" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden relative group hover:shadow-lg transition-shadow">
                    {/* 预计收益标签 */}
                                        <Badge className="absolute -left-0 top-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-r-md rounded-l-none px-3 py-1 z-10 shadow-md">
                                          {product.is_free 
                                            ? `${product.period_days}${t('mining.days')} ${t('mining.expected_roi')} ${product.expected_profit}USDT`
                                            : `${product.period_days}${t('mining.days')} ${t('mining.expected_roi')} ${(product.daily_rate * product.period_days).toFixed(0)}%`
                                          }
                                        </Badge>
                    
                    <CardContent className="p-5 pt-12">
                      <div className="flex items-start gap-4">
                        {/* 矿机图标 */}
                        <div className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 border ${getIconBgColor(product.icon_type)}`}>
                          {getIconComponent(product.icon_type)}
                        </div>
                        
                        {/* 矿机信息 */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <h3 className="font-bold text-lg">{product.name}</h3>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                          )}
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                      <div>
                                                        <span className="text-muted-foreground">{t('mining.daily_rate')}: </span>
                                                        <span className="font-semibold text-green-500">
                                                          {product.is_free ? `${(product.expected_profit / product.period_days).toFixed(1)} USDT` : `${product.daily_rate}%`}
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted-foreground">{t('mining.period')}: </span>
                                                        <span className="font-semibold">{product.period_days}{t('mining.days')}</span>
                                                      </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                      {t('mining.limit')}: {product.is_free ? t('mining.free') : `${product.min_amount.toLocaleString()} - ${product.max_amount?.toLocaleString() || '∞'} USDT`}
                                                    </p>
                                                    <p className="text-sm">
                                                      <span className="text-muted-foreground">{t('mining.return_type')}: </span>
                                                      <span className="font-medium text-primary">{getReturnTypeLabel(product.return_type)}</span>
                                                    </p>
                        </div>
                      </div>
                      
                      {/* 租用按钮 */}
                                            <Button 
                                              className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                                              onClick={() => handleRentClick(product)}
                                            >
                                              {product.is_free ? t('mining.experience_now') : t('mining.rent_now')}
                                            </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-machines" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rentals.length === 0 ? (
                            <Card className="bg-muted/30">
                              <CardContent className="flex flex-col items-center justify-center py-12">
                                <Server className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">{t('mining.no_machines')}</h3>
                                <p className="text-muted-foreground text-center mb-4">{t('mining.no_machines_desc')}</p>
                                <Button onClick={() => document.querySelector('[data-value="hashrate"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
                                  {t('mining.browse_machines')}
                                </Button>
                              </CardContent>
                            </Card>
            ) : (
              <div className="space-y-4">
                {rentals.map((rental) => {
                  const now = new Date();
                  const endDate = new Date(rental.end_date);
                  const startDate = new Date(rental.start_date);
                  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  const progress = ((totalDays - daysLeft) / totalDays) * 100;
                  const isActive = rental.status === 'active' && daysLeft > 0;

                  return (
                    <Card key={rental.id} className={`overflow-hidden ${isActive ? 'border-green-500/30' : 'border-muted'}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* 矿机图标 */}
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border ${getIconBgColor(rental.product?.icon_type || 'cpu')}`}>
                            {getIconComponent(rental.product?.icon_type || 'cpu')}
                          </div>
                          
                          {/* 矿机信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                                            <h3 className="font-bold text-lg">{rental.product?.name || t('mining.my_machines')}</h3>
                                                            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500" : ""}>
                                                              {isActive ? t('mining.running') : t('mining.ended')}
                                                            </Badge>
                            </div>
                            
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                                                          <div>
                                                            <span className="text-muted-foreground">{t('mining.investment_amount')}</span>
                                                            <p className="font-semibold">{rental.amount > 0 ? `${rental.amount.toLocaleString()} USDT` : t('mining.free')}</p>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted-foreground">{t('mining.daily_profit')}</span>
                                                            <p className="font-semibold text-green-500">+{rental.daily_profit.toFixed(2)} USDT</p>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted-foreground">{t('mining.accumulated_profit')}</span>
                                                            <p className="font-semibold text-amber-500">{rental.total_earned.toFixed(2)} USDT</p>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted-foreground">{t('mining.remaining_time')}</span>
                                                            <p className="font-semibold">{daysLeft} {t('mining.days')}</p>
                                                          </div>
                                                        </div>

                                                <div className="space-y-1">
                                                  <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{t('mining.progress')}</span>
                                                    <span>{progress.toFixed(0)}%</span>
                                                  </div>
                                                  <Progress value={progress} className="h-2" />
                                                  <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{format(startDate, 'yyyy-MM-dd')}</span>
                                                    <span>{format(endDate, 'yyyy-MM-dd')}</span>
                                                  </div>
                                                </div>

                                                {/* 提前赎回按钮 */}
                                                {isActive && rental.amount > 0 && rental.product?.allow_early_redemption !== false && (
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="mt-3 w-full border-orange-500 text-orange-500 hover:bg-orange-500/10"
                                                    onClick={() => handleRedeemClick(rental)}
                                                  >
                                                    {t('mining.early_redeem')}
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cloud" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {t('mining.cloud_pool_title')}
                </CardTitle>
                <CardDescription>
                  {t('mining.cloud_pool_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cloudMiningPools.map((pool, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardContent className="p-6">
                        <div className="grid gap-4 md:grid-cols-6 items-center">
                          <div className="md:col-span-1">
                            <div className="text-2xl font-bold">{pool.coin}</div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">{t('mining.annual_yield')}</div>
                            <div className="text-xl font-bold text-green-500">{pool.apy}</div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">{t('mining.participants')}</div>
                            <div className="font-medium">{pool.participants}</div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">{t('mining.tvl')}</div>
                            <div className="font-medium">{pool.tvl}</div>
                          </div>

                          <div>
                            <Badge variant="outline">
                              {pool.risk}
                            </Badge>
                          </div>

                          <div>
                            <Button className="w-full">{t('mining.join_pool')}</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mining Tips */}
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('mining.advantages')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 p-4 rounded-lg bg-background/50">
              <div className="font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                {t('mining.zero_threshold')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('mining.zero_threshold_desc')}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-background/50">
              <div className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {t('mining.stable_income')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('mining.stable_income_desc')}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-background/50">
              <div className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                {t('mining.flexible_exit')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('mining.flexible_exit_desc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rent Dialog */}
      <Dialog open={showRentDialog} onOpenChange={setShowRentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProduct && getIconComponent(selectedProduct.icon_type)}
              {selectedProduct?.name}
            </DialogTitle>
                        <DialogDescription>
                          {selectedProduct?.description || t('common.confirm')}
                        </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedProduct?.is_free ? (
                            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                              <p className="text-center font-semibold text-amber-600">
                                🎁 {t('mining.free')} {t('mining.experience')} {selectedProduct.period_days} {t('mining.days')}
                              </p>
                              <p className="text-center text-sm text-muted-foreground mt-1">
                                {t('mining.expected_roi')}: {selectedProduct.expected_profit} USDT
                              </p>
                            </div>
            ) : (
              <>
                                <div className="space-y-2">
                                  <Label>{t('mining.investment_amount')} (USDT)</Label>
                                  <Input
                                    type="number"
                                    value={rentAmount}
                                    onChange={(e) => setRentAmount(e.target.value)}
                                    placeholder={`${selectedProduct?.min_amount} - ${selectedProduct?.max_amount}`}
                                    min={selectedProduct?.min_amount}
                                    max={selectedProduct?.max_amount || undefined}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {t('mining.limit')}: {selectedProduct?.min_amount.toLocaleString()} - {selectedProduct?.max_amount?.toLocaleString()} USDT
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t('mining.daily_rate')}</p>
                                    <p className="font-semibold text-green-500">{selectedProduct?.daily_rate}%</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t('mining.period')}</p>
                                    <p className="font-semibold">{selectedProduct?.period_days} {t('mining.days')}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t('mining.daily_profit')}</p>
                                    <p className="font-semibold text-green-500">
                                      +{((parseFloat(rentAmount) || 0) * (selectedProduct?.daily_rate || 0) / 100).toFixed(2)} USDT
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t('mining.total_profit')}</p>
                                    <p className="font-semibold text-amber-500">
                                      +{((parseFloat(rentAmount) || 0) * (selectedProduct?.daily_rate || 0) / 100 * (selectedProduct?.period_days || 0)).toFixed(2)} USDT
                                    </p>
                                  </div>
                                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRentDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRent} disabled={renting}>
              {renting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.confirm')}{selectedProduct?.is_free ? t('mining.experience') : t('mining.rent')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-500">
              {t('mining.early_redeem_title')}
            </DialogTitle>
            <DialogDescription>
              {t('mining.early_redeem_desc')}
            </DialogDescription>
          </DialogHeader>

          {selectedRental && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <h4 className="font-semibold mb-2">{selectedRental.product?.name}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('mining.investment_amount')}</span>
                    <p className="font-semibold">{selectedRental.amount.toLocaleString()} USDT</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('mining.earned_profit')}</span>
                    <p className="font-semibold text-green-500">+{selectedRental.total_earned.toFixed(2)} USDT</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <h4 className="font-semibold text-red-500 mb-2">{t('mining.penalty_info')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('mining.penalty_rate')}</span>
                    <span className="font-semibold text-red-500">{selectedRental.product?.early_redemption_fee ?? 10}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('mining.penalty_amount')}</span>
                    <span className="font-semibold text-red-500">
                      -{(selectedRental.amount * ((selectedRental.product?.early_redemption_fee ?? 10) / 100)).toFixed(2)} USDT
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">{t('mining.return_amount')}</span>
                    <span className="font-bold text-primary">
                      {(selectedRental.amount * (1 - (selectedRental.product?.early_redemption_fee ?? 10) / 100) + selectedRental.total_earned).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRedeem} 
              disabled={redeeming}
            >
              {redeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('mining.confirm_redeem')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Mining;
