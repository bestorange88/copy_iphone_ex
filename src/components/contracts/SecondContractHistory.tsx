import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatTaiwanDateTime, formatTimeRemaining, formatUSDT, formatUSDTWithSign } from "@/lib/timezone";

interface ContractOrder {
  id: string;
  symbol: string;
  duration: number;
  amount: number;
  entry_price: number;
  final_price: number | null;
  direction: string;
  status: string;
  result: string | null;
  profit: number;
  yield_rate: number;
  created_at: string;
  settlement_time: string;
  settled_at: string | null;
}

export const SecondContractHistory = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ContractOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('second_contract_orders')
        .select('*')
        .eq('user_id', user.id);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    settled: orders.filter(o => o.status === 'settled').length,
    win: orders.filter(o => o.result === 'win').length,
    lose: orders.filter(o => o.result === 'lose').length,
    totalProfit: orders.reduce((sum, o) => sum + Number(o.profit || 0), 0),
  };

  const getTimeRemaining = (settlementTime: string) => {
    return formatTimeRemaining(settlementTime, t);
  };

  const renderOrderCard = (order: ContractOrder) => (
    <Card key={order.id} className="mb-3">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {order.direction === 'up' ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            <div>
              <div className="font-medium">{order.symbol}</div>
              <div className="text-xs text-muted-foreground">
                {formatTaiwanDateTime(order.created_at)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={order.status === 'pending' ? 'outline' : 'secondary'}>
              {order.status === 'pending' ? t('secondContracts.pending') : t('secondContracts.settled')}
            </Badge>
            {order.status === 'pending' && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {getTimeRemaining(order.settlement_time)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <div className="text-muted-foreground text-xs">{t('secondContracts.entryPrice')}</div>
            <div className="font-medium">{formatUSDT(order.entry_price)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t('secondContracts.betAmount')}</div>
            <div className="font-medium">{formatUSDT(order.amount)}</div>
          </div>
          {order.status === 'settled' && (
            <>
              <div>
                <div className="text-muted-foreground text-xs">{t('secondContracts.finalPrice')}</div>
                <div className="font-medium">{formatUSDT(order.final_price)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">{t('secondContracts.profitLoss')}</div>
                <div className={`font-bold ${order.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatUSDTWithSign(order.profit)}
                </div>
              </div>
            </>
          )}
        </div>

        {order.status === 'settled' && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              {order.result === 'win' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">{t('secondContracts.win')}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{t('secondContracts.lose')}</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('secondContracts.yieldRate')}: {(order.yield_rate * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* 统计面板 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('secondContracts.statistics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">{t('secondContracts.totalOrders')}</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">{t('secondContracts.pending')}</div>
              <div className="text-xl font-bold text-orange-600">{stats.pending}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">{t('secondContracts.settled')}</div>
              <div className="text-xl font-bold text-blue-600">{stats.settled}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">{t('secondContracts.winCount')}</div>
              <div className="text-xl font-bold text-success">{stats.win}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">{t('secondContracts.loseCount')}</div>
              <div className="text-xl font-bold text-destructive">{stats.lose}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">{t('secondContracts.totalProfit')}</div>
              <div className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('secondContracts.orderHistory')}</CardTitle>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-2">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="all">{t('secondContracts.all')}</TabsTrigger>
              <TabsTrigger value="pending">{t('secondContracts.pending')}</TabsTrigger>
              <TabsTrigger value="settled">{t('secondContracts.settled')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {statusFilter === 'pending' ? t('secondContracts.noPendingOrders') :
                 statusFilter === 'settled' ? t('secondContracts.noSettledOrders') :
                 t('secondContracts.noOrders')}
              </div>
            ) : (
              orders.map(renderOrderCard)
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
