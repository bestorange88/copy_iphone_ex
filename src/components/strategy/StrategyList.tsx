import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Trash2, TrendingUp, Grid3x3, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Strategy {
  id: string;
  name: string;
  description: string;
  strategy_type: string;
  is_active: boolean;
  config: any;
}

const strategyIcons = {
  grid: Grid3x3,
  dca: DollarSign,
  arbitrage: TrendingUp,
  custom: TrendingUp,
};

export function StrategyList() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiKeys, setHasApiKeys] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadStrategies();
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    setHasApiKeys((data?.length || 0) > 0);
  };

  const loadStrategies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: t("quant.loadFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setStrategies(data || []);
    setLoading(false);
  };

  const toggleStrategy = async (id: string, currentState: boolean) => {
    if (!hasApiKeys && !currentState) {
      toast({
        title: t("quant.cannotStart"),
        description: t("quant.configApiFirst"),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("strategies")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast({
        title: t("quant.operationFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: currentState ? t("quant.strategyStopped") : t("quant.strategyStarted"),
      description: currentState ? t("quant.strategyStoppedDesc") : t("quant.strategyStartedDesc"),
    });

    loadStrategies();
  };

  const deleteStrategy = async (id: string) => {
    const { error } = await supabase
      .from("strategies")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: t("quant.deleteFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("quant.deleteSuccess"),
      description: t("quant.strategyDeleted"),
    });

    loadStrategies();
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>;
  }

  if (strategies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">{t("quant.noStrategies")}</p>
          {!hasApiKeys && (
            <p className="text-sm text-muted-foreground mt-2">
              {t("quant.apiKeyWarning")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {strategies.map((strategy) => {
        const Icon = strategyIcons[strategy.strategy_type as keyof typeof strategyIcons] || TrendingUp;
        return (
          <Card key={strategy.id} className={strategy.is_active ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {strategy.description || t("quant.noDescription")}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={strategy.is_active ? "default" : "secondary"}>
                    {strategy.strategy_type.toUpperCase()}
                  </Badge>
                  <Switch
                    checked={strategy.is_active}
                    onCheckedChange={() => toggleStrategy(strategy.id, strategy.is_active)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleStrategy(strategy.id, strategy.is_active)}
                  >
                    {strategy.is_active ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        {t("quant.stop")}
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {t("quant.start")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteStrategy(strategy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
