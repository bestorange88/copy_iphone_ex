import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CreateStrategyDialog({ onStrategyCreated }: { onStrategyCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    strategy_type: "grid",
    exchange: "okx",
    symbol: "BTC-USDT",
    gridLevels: "10",
    gridRange: "5",
    investAmount: "1000",
  });

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const config = {
      exchange: formData.exchange,
      symbol: formData.symbol,
      gridLevels: parseInt(formData.gridLevels),
      gridRange: parseFloat(formData.gridRange),
      investAmount: parseFloat(formData.investAmount),
    };

    const { error } = await supabase.from("strategies").insert({
      user_id: user.id,
      name: formData.name,
      description: formData.description,
      strategy_type: formData.strategy_type,
      config,
      is_active: false,
    });

    setLoading(false);

    if (error) {
      toast({
        title: t("quant.createFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("quant.createSuccess"),
      description: t("quant.strategyCreatedDesc"),
    });

    setOpen(false);
    setFormData({
      name: "",
      description: "",
      strategy_type: "grid",
      exchange: "okx",
      symbol: "BTC-USDT",
      gridLevels: "10",
      gridRange: "5",
      investAmount: "1000",
    });
    onStrategyCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("quant.createStrategy")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("quant.createStrategyTitle")}</DialogTitle>
          <DialogDescription>{t("quant.createStrategyDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>{t("quant.strategyName")}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("quant.strategyNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("quant.strategyDescription")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("quant.strategyDescPlaceholder")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("quant.strategyType")}</Label>
              <Select value={formData.strategy_type} onValueChange={(value) => setFormData({ ...formData, strategy_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">{t("quant.gridTrading")}</SelectItem>
                  <SelectItem value="dca">{t("quant.dcaStrategy")}</SelectItem>
                  <SelectItem value="arbitrage">{t("quant.arbitrageStrategy")}</SelectItem>
                  <SelectItem value="custom">{t("quant.customStrategy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("quant.exchange")}</Label>
              <Select value={formData.exchange} onValueChange={(value) => setFormData({ ...formData, exchange: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="okx">OKX</SelectItem>
                  <SelectItem value="htx">HTX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("quant.tradingPair")}</Label>
            <Input
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="BTC-USDT"
            />
          </div>

          {formData.strategy_type === "grid" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("quant.gridLevels")}</Label>
                  <Input
                    type="number"
                    value={formData.gridLevels}
                    onChange={(e) => setFormData({ ...formData, gridLevels: e.target.value })}
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("quant.priceRange")}</Label>
                  <Input
                    type="number"
                    value={formData.gridRange}
                    onChange={(e) => setFormData({ ...formData, gridRange: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("quant.investAmount")}</Label>
                <Input
                  type="number"
                  value={formData.investAmount}
                  onChange={(e) => setFormData({ ...formData, investAmount: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("quant.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={loading || !formData.name}>
            {loading ? t("quant.creating") : t("quant.createStrategy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
