import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, DollarSign, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const OTC = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [merchants, setMerchants] = useState<any[]>([]);
  const [referencePrice, setReferencePrice] = useState(68500);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchMerchants();
  }, [selectedCoin]);

  const fetchMerchants = async () => {
    const { data, error } = await supabase
      .from('otc_prices')
      .select('*, otc_merchants(*)')
      .eq('coin_symbol', selectedCoin)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching merchants:', error);
      return;
    }

    setMerchants(data || []);
    if (data && data.length > 0) {
      setReferencePrice(Number(data[0].price));
    }
  };

  const handleCreateOrder = async (merchantId: string, price: number) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("請輸入有效金額");
      return;
    }

    const totalUsd = parseFloat(amount) * price;

    const { error } = await supabase
      .from('otc_orders')
      .insert([{
        user_id: user!.id,
        merchant_id: merchantId,
        order_type: orderType,
        coin_symbol: selectedCoin,
        amount: parseFloat(amount),
        price: price,
        total_usd: totalUsd,
      }]);

    if (error) {
      toast.error("創建訂單失敗");
      console.error(error);
      return;
    }

    toast.success("訂單創建成功", {
      description: `${orderType === 'buy' ? '購買' : '出售'} ${amount} ${selectedCoin}`
    });
  };

  if (loading || !user) {
    return null;
  }

  const getLevelIcon = (level: string) => {
    const icons = {
      diamond: "💎",
      gold: "🥇",
      silver: "🥈"
    };
    return icons[level as keyof typeof icons] || "🥈";
  };

  return (
    <AppLayout>
      <div className="space-y-4 lg:space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        <div className="text-center space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold">{t('otc.title')}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">{t('otc.subtitle')}</p>
        </div>

        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="buy" className="gap-1 lg:gap-2 text-xs lg:text-sm">
              <ShoppingCart className="h-3 w-3 lg:h-4 lg:w-4" />
              {t('otc.buy')}
            </TabsTrigger>
            <TabsTrigger value="sell" className="gap-1 lg:gap-2 text-xs lg:text-sm">
              <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" />
              {t('otc.sell')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={orderType} className="space-y-6 mt-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>
                  {orderType === "buy" ? t('otc.buy_crypto') : t('otc.sell_crypto')}
                </CardTitle>
                <CardDescription>
                  {t('otc.desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('otc.select_coin')}</Label>
                    <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">BTC - Bitcoin</SelectItem>
                        <SelectItem value="ETH">ETH - Ethereum</SelectItem>
                        <SelectItem value="USDT">USDT - Tether</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      {orderType === "buy" ? t('otc.buy_amount') : t('otc.sell_amount')} (USD)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{t('otc.reference_price')}</span>
                        <span className="font-medium">${referencePrice.toLocaleString()} / {selectedCoin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('otc.estimated_receive')}</span>
                        <span className="font-medium">
                          {amount ? (parseFloat(amount) / referencePrice).toFixed(6) : "0.000000"} {selectedCoin}
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t('otc.premium_merchants')}</h2>
                <Badge variant="outline">
                  <Shield className="h-3 w-3 mr-1" />
                  {t('otc.platform_verified')}
                </Badge>
              </div>

              <div className="grid gap-4">
                {merchants.map((merchant, index) => (
                  <Card key={merchant.id} className="hover:border-primary transition-colors">
                    <CardContent className="p-6">
                      <div className="grid gap-4 md:grid-cols-6 items-center">
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {getLevelIcon(merchant.otc_merchants?.merchant_level)}
                            </Badge>
                            <div>
                              <div className="font-medium">{merchant.otc_merchants?.merchant_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {t('otc.completion_rate')}: {merchant.otc_merchants?.completion_rate}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">{t('otc.price')}</div>
                          <div className="font-semibold text-lg">${Number(merchant.price).toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">{t('otc.limit')}</div>
                          <div className="font-medium text-sm">
                            {merchant.min_limit} - {merchant.max_limit} {merchant.coin_symbol}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {Math.floor(merchant.avg_response_time / 60)}{t('common.real_time')}
                        </div>

                        <div>
                          <Button 
                            className="w-full" 
                            variant={orderType === "buy" ? "default" : "destructive"}
                            onClick={() => handleCreateOrder(merchant.merchant_id, Number(merchant.price))}
                          >
                            {orderType === "buy" ? t('otc.buy') : t('otc.sell')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/50 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              {t('otc.safety_tips')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• {t('otc.tip_1')}</p>
            <p>• {t('otc.tip_2')}</p>
            <p>• {t('otc.tip_3')}</p>
            <p>• {t('otc.tip_4')}</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default OTC;
