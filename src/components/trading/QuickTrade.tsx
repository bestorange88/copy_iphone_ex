import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpDown } from "lucide-react";
import { z } from "zod";

const TradeParamsSchema = z.object({
  exchange: z.enum(["okx", "htx"]),
  symbol: z.string()
    .regex(/^[A-Z0-9]+-[A-Z0-9]+$/, "Invalid symbol format (use format: BTC-USDT)")
    .max(20, "Symbol too long"),
  side: z.enum(["buy", "sell"]),
  amount: z.number()
    .positive("Amount must be positive")
    .max(1000000, "Amount exceeds maximum limit")
    .refine(val => Number.isFinite(val), "Amount must be a valid number"),
  price: z.number()
    .positive("Price must be positive")
    .max(10000000, "Price exceeds maximum limit")
    .refine(val => Number.isFinite(val), "Price must be a valid number"),
  type: z.literal("limit")
});

export function QuickTrade() {
  const { t } = useTranslation();
  const [exchange, setExchange] = useState("okx");
  const [symbol, setSymbol] = useState("BTC-USDT");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check if user has API keys configured
  useEffect(() => {
    checkApiKeys();
  }, [exchange]);

  const checkApiKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setHasApiKey(false);
      return;
    }

    const { data } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("exchange", exchange)
      .eq("is_active", true)
      .maybeSingle();

    setHasApiKey(!!data);
  };

  const handleTrade = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    try {
      // Validate inputs
      const validatedParams = TradeParamsSchema.parse({
        exchange,
        symbol: symbol.toUpperCase(),
        side,
        amount: parseFloat(amount),
        price: parseFloat(price),
        type: "limit" as const
      });

      // Call edge function to place order
      const { data, error } = await supabase.functions.invoke(
        `${validatedParams.exchange}-trade`,
        {
          body: {
            action: "place_order",
            params: {
              symbol: validatedParams.symbol,
              side: validatedParams.side,
              amount: validatedParams.amount,
              price: validatedParams.price,
              type: validatedParams.type,
            },
          },
        }
      );

      if (error) throw error;

      // Save order to database
      await supabase.from("trade_orders").insert({
        user_id: user.id,
        exchange: validatedParams.exchange,
        symbol: validatedParams.symbol,
        order_type: "limit",
        side: validatedParams.side,
        price: validatedParams.price,
        amount: validatedParams.amount,
        status: "pending",
        exchange_order_id: data.orderId,
      });

      toast({
        title: t('quickTrade.order_submitted'),
        description: t('quickTrade.order_desc', { 
          side: side === "buy" ? t('trade.buy') : t('trade.sell'), 
          amount, 
          symbol 
        }),
      });

      setAmount("");
      setPrice("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('quickTrade.validation_failed'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('quickTrade.trade_failed'),
          description: error.message || "An error occurred while processing your trade",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Hide component if no API key is configured
  if (hasApiKey === false) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5" />
          {t('quickTrade.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('quickTrade.exchange')}</Label>
            <Select value={exchange} onValueChange={setExchange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="okx">OKX</SelectItem>
                <SelectItem value="htx">HTX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('quickTrade.pair')}</Label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTC-USDT"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === "buy" ? "default" : "outline"}
            onClick={() => setSide("buy")}
            className={side === "buy" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {t('trade.buy')}
          </Button>
          <Button
            variant={side === "sell" ? "default" : "outline"}
            onClick={() => setSide("sell")}
            className={side === "sell" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            {t('trade.sell')}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>{t('trade.price')} (USDT)</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('trade.amount')}</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="pt-2">
          <div className="text-sm text-muted-foreground mb-2">
            {t('trade.total')}: {amount && price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : "0.00"} USDT
          </div>
          <Button
            className="w-full"
            onClick={handleTrade}
            disabled={loading || !amount || !price}
          >
            {loading ? t('common.submitting') : side === "buy" ? t('trade.buy') : t('trade.sell')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
