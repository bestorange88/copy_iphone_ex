import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchOKXTicker } from "@/services/marketData";

interface Position {
  id: string;
  symbol: string;
  side: string;
  leverage: number;
  entry_price: number;
  amount: number;
  margin: number;
  unrealized_pnl: number;
  liquidation_price: number;
  status: string;
  created_at: string;
  closed_at: string | null;
  close_price: number | null;
}

export const PerpetualPositions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('perpetual_positions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    const symbols = [...new Set(positions.map(p => p.symbol))];
    const prices: Record<string, number> = {};
    
    for (const symbol of symbols) {
      try {
        const ticker = await fetchOKXTicker(symbol);
        if (ticker) {
          prices[symbol] = parseFloat(ticker.lastPrice);
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
    }
    
    setCurrentPrices(prices);
  };

  useEffect(() => {
    fetchPositions();
  }, [user]);

  useEffect(() => {
    if (positions.length > 0) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 5000);
      return () => clearInterval(interval);
    }
  }, [positions]);

  const calculatePnL = (position: Position) => {
    const currentPrice = currentPrices[position.symbol] || position.entry_price;
    const priceDiff = position.side === 'long' 
      ? currentPrice - position.entry_price
      : position.entry_price - currentPrice;
    return (priceDiff * position.amount * position.leverage) / position.entry_price;
  };

  const handleClosePosition = async (position: Position) => {
    if (!confirm(t('contracts.confirm_close'))) return;

    try {
      const currentPrice = currentPrices[position.symbol] || position.entry_price;
      const realizedPnl = calculatePnL(position);

      const { error } = await supabase
        .from('perpetual_positions')
        .update({
          status: 'closed',
          close_price: currentPrice,
          closed_at: new Date().toISOString(),
          unrealized_pnl: realizedPnl
        })
        .eq('id', position.id);

      if (error) throw error;

      toast.success(t('contracts.position_closed'), {
        description: `${t('contracts.pnl')}: ${realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)} USDT`,
      });

      fetchPositions();
    } catch (error) {
      console.error('Error closing position:', error);
      toast.error(t('common.error'));
    }
  };

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open');

  const totalPnL = openPositions.reduce((sum, pos) => sum + calculatePnL(pos), 0);
  const totalMargin = openPositions.reduce((sum, pos) => sum + pos.margin, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contracts.position_stats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.open_positions')}</p>
              <p className="text-2xl font-bold">{openPositions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.total_margin')}</p>
              <p className="text-2xl font-bold">{totalMargin.toFixed(2)} USDT</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.unrealized_pnl')}</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDT
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contracts.pnl_percentage')}</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalMargin > 0 ? `${((totalPnL / totalMargin) * 100).toFixed(2)}%` : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contracts.positions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="open">{t('contracts.open_positions')} ({openPositions.length})</TabsTrigger>
              <TabsTrigger value="closed">{t('contracts.closed_positions')} ({closedPositions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-4 mt-4">
              {openPositions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('contracts.no_open_positions')}</p>
              ) : (
                openPositions.map((position) => {
                  const pnl = calculatePnL(position);
                  const pnlPercent = (pnl / position.margin) * 100;
                  const currentPrice = currentPrices[position.symbol] || position.entry_price;

                  return (
                    <Card key={position.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{position.symbol}</span>
                              <Badge variant={position.side === 'long' ? 'default' : 'destructive'}>
                                {position.side === 'long' ? t('contracts.long') : t('contracts.short')} {position.leverage}x
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClosePosition(position)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {t('contracts.close')}
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">{t('contracts.entry_price')}</p>
                              <p className="font-medium">{position.entry_price.toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.current_price')}</p>
                              <p className="font-medium">{currentPrice.toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.amount')}</p>
                              <p className="font-medium">{position.amount}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.margin')}</p>
                              <p className="font-medium">{position.margin.toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.liquidation_price')}</p>
                              <p className="font-medium text-destructive">{position.liquidation_price.toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.unrealized_pnl')}</p>
                              <div className="flex items-center gap-1">
                                {pnl >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                                <p className={`font-bold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USDT ({pnlPercent.toFixed(2)}%)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="closed" className="space-y-4 mt-4">
              {closedPositions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('contracts.no_closed_positions')}</p>
              ) : (
                closedPositions.map((position) => {
                  const pnl = position.unrealized_pnl || 0;
                  const pnlPercent = (pnl / position.margin) * 100;

                  return (
                    <Card key={position.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{position.symbol}</span>
                              <Badge variant={position.side === 'long' ? 'default' : 'destructive'}>
                                {position.side === 'long' ? t('contracts.long') : t('contracts.short')} {position.leverage}x
                              </Badge>
                              <Badge variant="outline">{position.status === 'liquidated' ? t('contracts.liquidated') : t('contracts.closed')}</Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">{t('contracts.entry_price')}</p>
                              <p className="font-medium">{position.entry_price.toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.close_price')}</p>
                              <p className="font-medium">{(position.close_price || 0).toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.amount')}</p>
                              <p className="font-medium">{position.amount}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.margin')}</p>
                              <p className="font-medium">{position.margin.toFixed(2)} USDT</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.realized_pnl')}</p>
                              <div className="flex items-center gap-1">
                                {pnl >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                                <p className={`font-bold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USDT ({pnlPercent.toFixed(2)}%)
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('contracts.close_time')}</p>
                              <p className="font-medium text-xs">{new Date(position.closed_at || '').toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};