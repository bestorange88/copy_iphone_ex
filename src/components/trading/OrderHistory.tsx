import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Order {
  id: string;
  exchange: string;
  symbol: string;
  order_type: string;
  side: string;
  price: number;
  amount: number;
  filled: number;
  status: string;
  created_at: string;
  exchange_order_id: string | null;
}

export function OrderHistory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const loadOrders = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: t('orderHistory.load_failed'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setOrders(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user, toast, t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("trade_orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      toast({
        title: t('orderHistory.cancel_failed'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('orderHistory.order_canceled'),
      description: t('orderHistory.order_canceled'),
    });

    loadOrders();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filled":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: t('orderHistory.status_pending'),
      open: t('orderHistory.status_open'),
      filled: t('orderHistory.status_filled'),
      cancelled: t('orderHistory.status_cancelled'),
      failed: t('orderHistory.status_failed'),
    };
    return statusMap[status] || status;
  };

  const openOrders = orders.filter((o) => ["pending", "open"].includes(o.status));
  const completedOrders = orders.filter((o) => !["pending", "open"].includes(o.status));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('orderHistory.title')}</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">{t('orderHistory.current_orders')} ({openOrders.length})</TabsTrigger>
            <TabsTrigger value="history">{t('orderHistory.history_orders')} ({completedOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-4">
            {openOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('orderHistory.no_current')}</div>
            ) : (
              <div className="space-y-2">
                {openOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={order.side === "buy" ? "default" : "destructive"}>
                          {order.side === "buy" ? t('trade.buy') : t('trade.sell')}
                        </Badge>
                        <span className="font-medium">{order.symbol}</span>
                        <Badge variant="outline">{order.exchange.toUpperCase()}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('trade.price')}: {order.price} | {t('trade.amount')}: {order.amount} | {t('orderHistory.filled')}: {order.filled}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelOrder(order.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t('orderHistory.cancel')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {completedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('orderHistory.no_history')}</div>
            ) : (
              <div className="space-y-2">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={order.side === "buy" ? "default" : "destructive"}>
                          {order.side === "buy" ? t('trade.buy') : t('trade.sell')}
                        </Badge>
                        <span className="font-medium">{order.symbol}</span>
                        <Badge variant="outline">{order.exchange.toUpperCase()}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('trade.price')}: {order.price} | {t('trade.amount')}: {order.amount} | {t('orderHistory.filled')}: {order.filled}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="text-sm font-medium">{getStatusText(order.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
