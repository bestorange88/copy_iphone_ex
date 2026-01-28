import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, RefreshCw, ClipboardList, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UnifiedOrder {
  id: string;
  type: 'spot' | 'second_contract' | 'perpetual';
  symbol: string;
  side: string;
  amount: number;
  price?: number;
  status: string;
  profit?: number;
  result?: string;
  created_at: string;
}

export function OrderHistory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const loadOrders = useCallback(async () => {
    if (!user) return;

    try {
      // 获取现货订单
      const { data: spotOrders } = await supabase
        .from("trade_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // 获取分钟合约订单
      const { data: secondOrders } = await supabase
        .from("second_contract_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // 获取永续合约订单
      const { data: perpetualOrders } = await supabase
        .from("perpetual_positions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // 合并所有订单
      const allOrders: UnifiedOrder[] = [
        ...(spotOrders || []).map(o => ({
          id: o.id,
          type: 'spot' as const,
          symbol: o.symbol,
          side: o.side,
          amount: o.amount,
          price: o.price,
          status: o.status,
          created_at: o.created_at,
        })),
        ...(secondOrders || []).map(o => ({
          id: o.id,
          type: 'second_contract' as const,
          symbol: o.symbol,
          side: o.direction,
          amount: o.amount,
          price: o.entry_price,
          status: o.status,
          profit: o.profit,
          result: o.result,
          created_at: o.created_at,
        })),
        ...(perpetualOrders || []).map(o => ({
          id: o.id,
          type: 'perpetual' as const,
          symbol: o.symbol,
          side: o.side,
          amount: o.amount,
          price: o.entry_price,
          status: o.status,
          profit: o.unrealized_pnl,
          created_at: o.created_at,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast({
        title: t('orderHistory.load_failed'),
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast, t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const getStatusIcon = (status: string, result?: string) => {
    if (result === 'win') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (result === 'lose') return <XCircle className="h-4 w-4 text-red-500" />;
    
    switch (status) {
      case "filled":
      case "settled":
      case "closed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
      case "failed":
      case "liquidated":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      spot: t('assets.spot_order'),
      second_contract: t('assets.second_contract_order'),
      perpetual: t('assets.perpetual_order'),
    };
    return typeMap[type] || type;
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case 'spot': return 'outline';
      case 'second_contract': return 'secondary';
      case 'perpetual': return 'default';
      default: return 'outline';
    }
  };

  const openOrders = orders.filter(o => ['pending', 'open'].includes(o.status));
  const completedOrders = orders.filter(o => !['pending', 'open'].includes(o.status));

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3 lg:py-4">
        <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
          <ClipboardList className="h-4 w-4 lg:h-5 lg:w-5" />
          {t('assets.orders')}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-2 lg:p-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="all" className="text-xs lg:text-sm">
              {t('common.all')} ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs lg:text-sm">
              {t('orderHistory.current_orders')} ({openOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs lg:text-sm">
              {t('orderHistory.history_orders')} ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[400px]">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('assets.no_orders')}
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} getStatusIcon={getStatusIcon} getTypeLabel={getTypeLabel} getTypeBadgeVariant={getTypeBadgeVariant} t={t} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="open" className="mt-4">
            <ScrollArea className="h-[400px]">
              {openOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('orderHistory.no_current')}
                </div>
              ) : (
                <div className="space-y-2">
                  {openOrders.map((order) => (
                    <OrderCard key={order.id} order={order} getStatusIcon={getStatusIcon} getTypeLabel={getTypeLabel} getTypeBadgeVariant={getTypeBadgeVariant} t={t} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[400px]">
              {completedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('orderHistory.no_history')}
                </div>
              ) : (
                <div className="space-y-2">
                  {completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} getStatusIcon={getStatusIcon} getTypeLabel={getTypeLabel} getTypeBadgeVariant={getTypeBadgeVariant} t={t} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface OrderCardProps {
  order: UnifiedOrder;
  getStatusIcon: (status: string, result?: string) => React.ReactNode;
  getTypeLabel: (type: string) => string;
  getTypeBadgeVariant: (type: string) => "default" | "secondary" | "outline";
  t: (key: string) => string;
}

function OrderCard({ order, getStatusIcon, getTypeLabel, getTypeBadgeVariant, t }: OrderCardProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getTypeBadgeVariant(order.type)} className="text-[10px] lg:text-xs">
            {getTypeLabel(order.type)}
          </Badge>
          <span className="font-medium text-sm">{order.symbol}</span>
          <Badge variant={order.side === "buy" || order.side === "up" || order.side === "long" ? "default" : "destructive"} className="text-[10px] lg:text-xs">
            {order.side === "up" || order.side === "long" ? (
              <><TrendingUp className="h-3 w-3 mr-1" />{t('contracts.buy_up')}</>
            ) : order.side === "down" || order.side === "short" ? (
              <><TrendingDown className="h-3 w-3 mr-1" />{t('contracts.buy_down')}</>
            ) : order.side === "buy" ? t('trade.buy') : t('trade.sell')}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {t('trade.amount')}: {order.amount} USDT
          {order.price && <> | {t('trade.price')}: {order.price}</>}
          {order.profit !== undefined && order.profit !== null && (
            <span className={order.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
              {' '}| {t('assets.profit')}: {order.profit >= 0 ? '+' : ''}{order.profit.toFixed(2)}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {new Date(order.created_at).toLocaleString('zh-CN')}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {getStatusIcon(order.status, order.result)}
      </div>
    </div>
  );
}
