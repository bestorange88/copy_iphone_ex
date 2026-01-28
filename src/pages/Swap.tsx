import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp, Info, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Swap = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fromCoin, setFromCoin] = useState("BTC");
  const [toCoin, setToCoin] = useState("USDT");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  const coins = ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP", "ADA", "DOGE"];

  const handleSwapDirection = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value) {
      const rate = fromCoin === "BTC" ? 68000 : toCoin === "BTC" ? 1/68000 : 1;
      setToAmount((parseFloat(value) * rate).toFixed(6));
    } else {
      setToAmount("");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 lg:space-y-6 mb-20 lg:mb-0 px-2 lg:px-0">
        <div className="text-center space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold">{t('swap.title')}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">{t('swap.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {t('swap.instant_swap')}
            </CardTitle>
            <CardDescription>
              {t('swap.instant_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* From Section */}
            <div className="space-y-2">
              <Label htmlFor="from-amount">{t('swap.from')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="from-amount"
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className="text-base lg:text-lg"
                />
                <Select value={fromCoin} onValueChange={setFromCoin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {coins.map((coin) => (
                      <SelectItem key={coin} value={coin}>
                        {coin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('trade.available')}: 0.00 {fromCoin}
              </div>
            </div>

            {/* Swap Direction Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handleSwapDirection}
              >
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </div>

            {/* To Section */}
            <div className="space-y-2">
              <Label htmlFor="to-amount">{t('swap.to')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="to-amount"
                  type="number"
                  placeholder="0.00"
                  value={toAmount}
                  readOnly
                  className="text-base lg:text-lg bg-muted"
                />
                <Select value={toCoin} onValueChange={setToCoin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {coins.map((coin) => (
                      <SelectItem key={coin} value={coin}>
                        {coin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exchange Rate Info */}
            {fromAmount && toAmount && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{t('swap.exchange_rate')}</span>
                      <span className="font-medium">
                        1 {fromCoin} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toCoin}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('swap.fee')}</span>
                      <span className="font-medium">0.1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('swap.arrival_time')}</span>
                      <span className="font-medium">{t('swap.instant')}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button className="w-full" size="lg" disabled={!fromAmount || !toAmount}>
              <Zap className="h-4 w-4 mr-2" />
              {t('swap.swap_now')}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Swaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('swap.recent_swaps')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              {t('swap.no_swaps')}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Swap;
