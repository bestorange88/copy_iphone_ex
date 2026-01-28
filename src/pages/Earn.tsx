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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EarnProduct {
  id: string;
  product_type: string;
  coin_symbol: string;
  coin_name: string;
  apy_rate: number;
  min_amount: number;
  max_amount: number | null;
  lock_period_days: number | null;
  risk_level: string;
  total_value_locked: number;
  return_type: string | null;
}

interface EarnSubscription {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  earned_interest: number;
  status: string;
  created_at: string;
  earn_products: EarnProduct;
}

const Earn = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<EarnProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<EarnSubscription[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<EarnProduct | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [subscribeAmount, setSubscribeAmount] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchSubscriptions();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("earn_products")
        .select("*")
        .eq("is_active", true)
        .order("product_type", { ascending: true })
        .order("apy_rate", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("加載產品失敗: " + error.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("earn_subscriptions")
        .select(`
          *,
          earn_products (*)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedProduct || !subscribeAmount) {
      toast.error("請輸入金額");
      return;
    }

    const amount = parseFloat(subscribeAmount);
    if (amount < selectedProduct.min_amount) {
      toast.error(`最低金額: ${selectedProduct.min_amount} ${selectedProduct.coin_symbol}`);
      return;
    }

    if (selectedProduct.max_amount && amount > selectedProduct.max_amount) {
      toast.error(`最高金額: ${selectedProduct.max_amount} ${selectedProduct.coin_symbol}`);
      return;
    }

    setSubscribing(true);
    try {
      const endDate = selectedProduct.lock_period_days
        ? new Date(Date.now() + selectedProduct.lock_period_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from("earn_subscriptions")
        .insert([
          {
            user_id: user!.id,
            product_id: selectedProduct.id,
            amount,
            end_date: endDate,
          },
        ]);

      if (error) throw error;

      toast.success("訂閱成功！");
      setSubscribeDialogOpen(false);
      setSubscribeAmount("");
      setSelectedProduct(null);
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubscribing(false);
    }
  };

  const openSubscribeDialog = (product: EarnProduct) => {
    setSelectedProduct(product);
    setSubscribeDialogOpen(true);
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case "low": return "低風險";
      case "medium": return "中風險";
      case "high": return "高風險";
      default: return risk;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "";
    }
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      locked_staking: "鎖倉持幣生息",
      token_lending: "代幣質押借貸",
      crypto_savings: "活期理財",
      crypto_staking: "定期鎖倉",
      crypto_defi: "DeFi挖礦",
    };
    return labels[type] || type;
  };

  const getProductIcon = (type: string) => {
    if (type === "locked_staking") {
      return <Lock className="h-5 w-5" />;
    }
    return <Coins className="h-5 w-5" />;
  };

  const getReturnTypeLabel = (returnType: string | null) => {
    switch (returnType) {
      case "daily_interest": return "到期返本，按日返息";
      case "maturity_interest": return "到期返本，到期返息";
      default: return "到期返本，按日返息";
    }
  };

  // 分類產品
  const lockedStakingProducts = products.filter(p => p.product_type === 'locked_staking');
  const lendingProducts = products.filter(p => p.product_type === 'token_lending');

  if (loading || !user) {
    return null;
  }

  const renderProductCard = (product: EarnProduct) => (
    <Card key={product.id} className="bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all border-muted group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-bold text-primary">{product.coin_symbol.slice(0, 2)}</span>
            </div>
            <div>
              <CardTitle className="text-lg">{product.coin_symbol}</CardTitle>
              <CardDescription className="text-xs">{product.coin_name}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={getRiskColor(product.risk_level)}>
            {getRiskLabel(product.risk_level)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-primary">{product.apy_rate}%</div>
            <div className="text-sm text-muted-foreground">年化收益率</div>
          </div>
          {product.total_value_locked > 0 && (
            <div className="text-right">
              <div className="text-lg font-semibold">{(product.total_value_locked / 1000000).toFixed(1)}M USDT</div>
              <div className="text-xs text-muted-foreground">總鎖倉量</div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 p-3 bg-background/50 rounded-lg text-sm">
          <div>
            <span className="text-muted-foreground">最低金額</span>
            <p className="font-medium">{product.min_amount} {product.coin_symbol}</p>
          </div>
          <div>
            <span className="text-muted-foreground">鎖倉期限</span>
            <p className="font-medium">
              {product.lock_period_days 
                ? `${product.lock_period_days} 天` 
                : "活期"}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">收益方式</span>
            <p className="font-medium text-primary">{getReturnTypeLabel(product.return_type)}</p>
          </div>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80" 
          onClick={() => openSubscribeDialog(product)}
        >
          立即訂閱
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-4 lg:space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">理財中心</h1>
            <p className="text-muted-foreground text-sm mt-1">穩健收益，安全可靠</p>
          </div>
          <Badge variant="outline" className="text-xs lg:text-sm w-fit bg-green-500/10 text-green-500 border-green-500/20">
            安全穩定
          </Badge>
        </div>

        {/* 我的訂閱 */}
        {subscriptions.length > 0 && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                我的訂閱
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{sub.earn_products.coin_symbol}</span>
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className={sub.status === 'active' ? 'bg-green-500' : ''}>
                          {sub.status === 'active' ? '運行中' : '已結束'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getProductTypeLabel(sub.earn_products.product_type)} • {sub.earn_products.apy_rate}% APY
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-semibold">
                        {sub.amount} {sub.earn_products.coin_symbol}
                      </div>
                      <div className="text-sm text-green-500">
                        +{sub.earned_interest.toFixed(8)} {sub.earn_products.coin_symbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="locked_staking" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="locked_staking" className="gap-1 lg:gap-2 text-xs lg:text-sm">
              <Lock className="h-3 w-3 lg:h-4 lg:w-4" />
              <span>鎖倉持幣生息</span>
            </TabsTrigger>
            <TabsTrigger value="token_lending" className="gap-1 lg:gap-2 text-xs lg:text-sm">
              <Coins className="h-3 w-3 lg:h-4 lg:w-4" />
              <span>代幣質押借貸</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locked_staking" className="space-y-4 mt-6">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  鎖倉持幣生息
                </CardTitle>
                <CardDescription>
                  鎖定您的加密資產，享受穩定的利息收益。鎖倉期越長，收益越高。
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : lockedStakingProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
                    <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暫無可用產品</p>
                    <p className="text-sm mt-1">敬請期待更多理財產品</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {lockedStakingProducts.map(renderProductCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="token_lending" className="space-y-4 mt-6">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  代幣質押借貸
                </CardTitle>
                <CardDescription>
                  質押您的代幣獲取借貸收益，參與平台借貸池，賺取穩定利息。
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : lendingProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
                    <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暫無可用產品</p>
                    <p className="text-sm mt-1">敬請期待更多理財產品</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {lendingProducts.map(renderProductCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 說明卡片 */}
        <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
          <CardHeader>
            <CardTitle className="text-lg">理財須知</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 p-4 rounded-lg bg-background/50">
              <div className="font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                鎖倉持幣生息
              </div>
              <p className="text-sm text-muted-foreground">
                將您的加密貨幣鎖定一段時間，獲得穩定的年化收益。鎖倉期滿後自動解鎖並發放收益。
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-background/50">
              <div className="font-semibold flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                代幣質押借貸
              </div>
              <p className="text-sm text-muted-foreground">
                將代幣存入借貸池，為其他用戶提供流動性，賺取借貸利息收益。支持隨時贖回。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProduct && getProductIcon(selectedProduct.product_type)}
              訂閱 {selectedProduct?.coin_symbol}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct && getProductTypeLabel(selectedProduct.product_type)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">年化收益率</div>
                <div className="text-xl font-bold text-primary">{selectedProduct?.apy_rate}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">鎖倉期限</div>
                <div className="text-xl font-bold">
                  {selectedProduct?.lock_period_days 
                    ? `${selectedProduct.lock_period_days} 天` 
                    : "活期"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>投資金額</Label>
              <Input
                type="number"
                placeholder={`最低: ${selectedProduct?.min_amount}`}
                value={subscribeAmount}
                onChange={(e) => setSubscribeAmount(e.target.value)}
              />
              <div className="text-sm text-muted-foreground">
                最低: {selectedProduct?.min_amount} {selectedProduct?.coin_symbol}
                {selectedProduct?.max_amount && ` | 最高: ${selectedProduct.max_amount} ${selectedProduct.coin_symbol}`}
              </div>
            </div>

            {subscribeAmount && selectedProduct && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-sm text-muted-foreground">預計收益</div>
                <div className="text-lg font-bold text-green-500">
                  +{((parseFloat(subscribeAmount) || 0) * selectedProduct.apy_rate / 100 * (selectedProduct.lock_period_days || 365) / 365).toFixed(4)} {selectedProduct.coin_symbol}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedProduct.lock_period_days ? `${selectedProduct.lock_period_days}天後` : '每年'}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSubscribeDialogOpen(false)}>
                取消
              </Button>
              <Button className="flex-1" onClick={handleSubscribe} disabled={subscribing}>
                {subscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確認訂閱
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Earn;
