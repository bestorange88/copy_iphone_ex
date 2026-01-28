import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Crown, 
  TrendingUp, 
  Users, 
  Target, 
  BarChart3, 
  Zap,
  Shield,
  Loader2,
  Play,
  Star
} from "lucide-react";

interface ExpertStrategy {
  id: string;
  name: string;
  description: string | null;
  strategy_type: string;
  symbol: string;
  expert_name: string;
  expert_avatar: string | null;
  profit_rate: number;
  win_rate: number;
  total_profit: number;
  total_trades: number;
  followers_count: number;
  min_investment: number;
  risk_level: string;
  config: any;
}

const strategyTypeIcons: Record<string, any> = {
  'grid': BarChart3,
  'sma-cross': TrendingUp,
  'arbitrage': Zap,
  'dca': Target,
  'custom': Star
};

const riskLevelColors: Record<string, string> = {
  'low': 'bg-success/20 text-success border-success/30',
  'medium': 'bg-primary/20 text-primary border-primary/30',
  'high': 'bg-destructive/20 text-destructive border-destructive/30'
};

const riskLevelLabels: Record<string, string> = {
  'low': '低風險',
  'medium': '中風險',
  'high': '高風險'
};

export const ExpertStrategies = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<ExpertStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<ExpertStrategy | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('expert_strategies')
        .select('*')
        .eq('is_active', true)
        .order('followers_count', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedStrategy || !user) return;

    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount < selectedStrategy.min_investment) {
      toast.error(t('quant.expert.min_investment_error', `最低投資金額為 $${selectedStrategy.min_investment}`));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('expert_strategy_subscriptions')
        .insert({
          user_id: user.id,
          strategy_id: selectedStrategy.id,
          investment_amount: amount,
          status: 'active'
        });

      if (error) throw error;

      toast.success(t('quant.expert.subscribe_success', '訂閱成功'), {
        description: t('quant.expert.subscribe_success_desc', '策略已啟動運行')
      });

      setSubscribeDialogOpen(false);
      setSelectedStrategy(null);
      setInvestmentAmount("");
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(t('quant.expert.subscribe_error', '訂閱失敗'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h2 className="text-lg lg:text-xl font-semibold">{t('quant.expertStrategies', '大神策略')}</h2>
          <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
            {strategies.length} {t('quant.available', '可用')}
          </Badge>
        </div>

        {/* Strategy Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => {
            const Icon = strategyTypeIcons[strategy.strategy_type] || BarChart3;
            
            return (
              <Card 
                key={strategy.id} 
                className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedStrategy(strategy);
                  setSubscribeDialogOpen(true);
                }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
                
                <CardContent className="p-4 lg:p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm lg:text-base">{strategy.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{strategy.symbol}</span>
                          <span>•</span>
                          <span>{strategy.expert_name}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${riskLevelColors[strategy.risk_level]}`}
                    >
                      {riskLevelLabels[strategy.risk_level]}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-[10px] text-muted-foreground mb-0.5">{t('quant.expert.profit_rate', '收益率')}</div>
                      <div className="text-lg font-bold text-success">+{strategy.profit_rate}%</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-[10px] text-muted-foreground mb-0.5">{t('quant.expert.win_rate', '勝率')}</div>
                      <div className="text-lg font-bold">{strategy.win_rate}%</div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{strategy.followers_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{strategy.total_trades}</span>
                      </div>
                    </div>
                    <div className="text-primary font-medium">
                      ${strategy.min_investment}+
                    </div>
                  </div>

                  {/* Hover action */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {t('quant.expert.subscribe', '訂閱策略')}
            </DialogTitle>
            <DialogDescription>
              {t('quant.expert.subscribe_desc', '使用大神策略自動化交易')}
            </DialogDescription>
          </DialogHeader>

          {selectedStrategy && (
            <div className="space-y-4 py-2">
              {/* Strategy Info */}
              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedStrategy.name}</span>
                  <Badge 
                    variant="outline" 
                    className={riskLevelColors[selectedStrategy.risk_level]}
                  >
                    {riskLevelLabels[selectedStrategy.risk_level]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
                
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">+{selectedStrategy.profit_rate}%</div>
                    <div className="text-[10px] text-muted-foreground">{t('quant.expert.profit_rate', '收益率')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{selectedStrategy.win_rate}%</div>
                    <div className="text-[10px] text-muted-foreground">{t('quant.expert.win_rate', '勝率')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{selectedStrategy.followers_count}</div>
                    <div className="text-[10px] text-muted-foreground">{t('quant.expert.followers', '跟隨者')}</div>
                  </div>
                </div>
              </div>

              {/* Expert Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {selectedStrategy.expert_avatar ? (
                    <img src={selectedStrategy.expert_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedStrategy.expert_name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="font-medium">{selectedStrategy.expert_name}</div>
                  <div className="text-xs text-muted-foreground">{selectedStrategy.symbol} • {selectedStrategy.total_profit.toLocaleString()} USDT {t('quant.expert.total_profit', '總收益')}</div>
                </div>
              </div>

              {/* Investment Amount */}
              <div className="space-y-2">
                <Label>{t('quant.expert.investment', '投資金額')} (USDT)</Label>
                <Input
                  type="number"
                  placeholder={`${t('quant.expert.min', '最低')} $${selectedStrategy.min_investment}`}
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  {t('quant.expert.min_investment', '最低投資金額')}: ${selectedStrategy.min_investment}
                </p>
              </div>

              {/* Risk Warning */}
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {t('quant.expert.risk_warning', '量化交易存在風險，過往業績不代表未來表現，請謹慎投資。')}
                  </p>
                </div>
              </div>

              {/* Subscribe Button */}
              <Button 
                className="w-full h-12 gap-2" 
                onClick={handleSubscribe}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {t('quant.expert.start_strategy', '啟動策略')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};