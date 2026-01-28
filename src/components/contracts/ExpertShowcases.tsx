import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Crown, Users, ArrowRight, Loader2 } from "lucide-react";

interface Showcase {
  id: string;
  title: string;
  description: string | null;
  profit_amount: number;
  profit_percent: number;
  symbol: string;
  direction: string;
  leverage: number;
  entry_price: number | null;
  exit_price: number | null;
  image_url: string | null;
  expert_name: string;
  expert_avatar: string | null;
  created_at: string;
}

export const ExpertShowcases = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShowcase, setSelectedShowcase] = useState<Showcase | null>(null);
  const [followDialogOpen, setFollowDialogOpen] = useState(false);
  const [followAmount, setFollowAmount] = useState("");
  const [followLeverage, setFollowLeverage] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchShowcases();
  }, []);

  const fetchShowcases = async () => {
    try {
      const { data, error } = await supabase
        .from('expert_showcases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setShowcases(data || []);
    } catch (error) {
      console.error('Error fetching showcases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowTrade = async () => {
    if (!selectedShowcase || !user) return;
    
    const amount = parseFloat(followAmount);
    const leverage = parseInt(followLeverage);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('contracts.showcase.invalid_amount', '無效金額'),
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('follow_trades')
        .insert({
          user_id: user.id,
          showcase_id: selectedShowcase.id,
          amount,
          leverage,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: t('contracts.showcase.follow_success', '跟單成功'),
        description: t('contracts.showcase.follow_success_desc', '您的跟單請求已提交')
      });
      setFollowDialogOpen(false);
      setFollowAmount("");
    } catch (error) {
      console.error('Error following trade:', error);
      toast({
        title: t('contracts.showcase.follow_error', '跟單失敗'),
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (showcases.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
        {/* 標題區 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t('contracts.showcase.title', '大神曬單')}</span>
          </div>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
            <Users className="h-3 w-3 mr-1" />
            {t('contracts.showcase.hot', '熱門')}
          </Badge>
        </div>
        
        {/* 曬單列表 - 橫向滾動 */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {showcases.map((showcase) => (
            <div
              key={showcase.id}
              className="flex-shrink-0 w-[200px] relative overflow-hidden rounded-lg bg-background/50 border border-border/30 p-3 cursor-pointer hover:border-primary/50 hover:bg-background/80 transition-all group"
              onClick={() => setSelectedShowcase(showcase)}
            >
              {/* 收益標籤 */}
              <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                showcase.profit_percent >= 0 
                  ? 'bg-success/20 text-success' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {showcase.profit_percent >= 0 ? '+' : ''}{showcase.profit_percent.toFixed(1)}%
              </div>

              {/* 專家信息 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/30">
                  {showcase.expert_avatar ? (
                    <img src={showcase.expert_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    showcase.expert_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs truncate">{showcase.expert_name}</div>
                  <div className="text-[10px] text-muted-foreground">{showcase.symbol}</div>
                </div>
              </div>

              {/* 交易信息 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  {showcase.direction === 'long' ? (
                    <Badge className="bg-success/15 text-success border-0 text-[10px] px-1.5 py-0">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      {t('contracts.long', '做多')}
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] px-1.5 py-0">
                      <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                      {t('contracts.short', '做空')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">{showcase.leverage}x</Badge>
                </div>
                
                <div className="text-sm font-bold text-success">
                  +{showcase.profit_amount.toLocaleString()} USDT
                </div>
              </div>

              {/* 查看詳情 */}
              <div className="mt-2 flex items-center text-[10px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                {t('contracts.showcase.view_detail', '查看詳情')}
                <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳情對話框 */}
      <Dialog open={!!selectedShowcase && !followDialogOpen} onOpenChange={(open) => !open && setSelectedShowcase(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {selectedShowcase?.title}
            </DialogTitle>
            <DialogDescription>
              {t('contracts.showcase.detail_desc', '交易詳情與跟單')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedShowcase && (
            <div className="space-y-4">
              {/* 專家信息 */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedShowcase.expert_avatar ? (
                    <img src={selectedShowcase.expert_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedShowcase.expert_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="font-bold">{selectedShowcase.expert_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedShowcase.symbol}</div>
                </div>
              </div>

              {/* 收益展示圖 */}
              {selectedShowcase.image_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src={selectedShowcase.image_url} 
                    alt="Profit Screenshot" 
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* 交易詳情 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.direction', '方向')}</div>
                  <div className="flex items-center gap-1">
                    {selectedShowcase.direction === 'long' ? (
                      <Badge className="bg-success/20 text-success border-0">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {t('contracts.long', '做多')}
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive/20 text-destructive border-0">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {t('contracts.short', '做空')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.leverage', '槓桿')}</div>
                  <div className="font-bold">{selectedShowcase.leverage}x</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.profit', '收益')}</div>
                  <div className="font-bold text-success">+{selectedShowcase.profit_amount.toLocaleString()} USDT</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.profit_rate', '收益率')}</div>
                  <div className="font-bold text-success">+{selectedShowcase.profit_percent.toFixed(2)}%</div>
                </div>
                {selectedShowcase.entry_price && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.entry', '入場價')}</div>
                    <div className="font-medium">{selectedShowcase.entry_price.toLocaleString()} USDT</div>
                  </div>
                )}
                {selectedShowcase.exit_price && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.exit', '出場價')}</div>
                    <div className="font-medium">{selectedShowcase.exit_price.toLocaleString()} USDT</div>
                  </div>
                )}
              </div>

              {/* 描述 */}
              {selectedShowcase.description && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-xs mb-1">{t('contracts.showcase.analysis', '交易分析')}</div>
                  <p className="text-sm">{selectedShowcase.description}</p>
                </div>
              )}

              {/* 跟單按鈕 */}
              <Button 
                className="w-full" 
                onClick={() => setFollowDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('contracts.showcase.follow_btn', '我要跟單')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 跟單對話框 */}
      <Dialog open={followDialogOpen} onOpenChange={setFollowDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('contracts.showcase.follow_trade', '跟單交易')}</DialogTitle>
            <DialogDescription>
              {t('contracts.showcase.follow_desc', '設置您的跟單參數')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">{t('contracts.showcase.following', '跟隨')}</span>
                <span className="font-medium">{selectedShowcase?.expert_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('contracts.showcase.pair', '交易對')}</span>
                <span className="font-medium">{selectedShowcase?.symbol}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('contracts.showcase.amount', '跟單金額')} (USDT)</Label>
              <Input
                type="number"
                placeholder="100"
                value={followAmount}
                onChange={(e) => setFollowAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('contracts.showcase.leverage', '槓桿倍數')}</Label>
              <Input
                type="number"
                placeholder="10"
                value={followLeverage}
                onChange={(e) => setFollowLeverage(e.target.value)}
                min="1"
                max="100"
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleFollowTrade}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('contracts.showcase.confirm_follow', '確認跟單')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
