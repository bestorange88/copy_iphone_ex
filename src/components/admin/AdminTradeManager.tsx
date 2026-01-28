import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

interface TradeOrder {
  id: string;
  user_id: string;
  exchange: string;
  symbol: string;
  side: string;
  order_type: string;
  amount: number;
  price: number;
  filled: number;
  status: string;
  created_at: string;
  username?: string;
  email?: string;
}

export const AdminTradeManager = () => {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await adminApi.getTradesWithProfiles();
    if (error) {
      toast.error("加载交易数据失败");
      console.error(error);
      return;
    }
    setOrders((data as TradeOrder[]) || []);
  };

  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    return (
      order.symbol.toLowerCase().includes(search) ||
      order.exchange.toLowerCase().includes(search) ||
      order.username?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "待处理" },
      open: { variant: "secondary", label: "部分成交" },
      filled: { variant: "default", label: "已成交" },
      cancelled: { variant: "destructive", label: "已取消" },
      failed: { variant: "destructive", label: "失败" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalVolume = orders
    .filter(o => o.status === 'filled')
    .reduce((sum, o) => sum + (Number(o.amount) * Number(o.price || 0)), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>交易统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">总订单数</div>
              <div className="text-2xl font-bold">{orders.length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">已成交</div>
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'filled').length}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">待处理</div>
              <div className="text-2xl font-bold text-orange-600">
                {orders.filter(o => o.status === 'pending').length}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">成交额</div>
              <div className="text-2xl font-bold">
                {totalVolume.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索交易对、交易所或用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {order.side === 'buy' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">{order.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.username} • {order.exchange}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex gap-2 items-center justify-end">
                    <Badge variant={order.side === 'buy' ? 'default' : 'secondary'}>
                      {order.side === 'buy' ? '买入' : '卖出'}
                    </Badge>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="text-sm">
                    数量: {Number(order.amount).toFixed(4)}
                  </div>
                  <div className="text-sm">
                    价格: {Number(order.price || 0).toFixed(2)} USDT
                  </div>
                  <div className="text-sm font-medium">
                    成交: {Number(order.filled || 0).toFixed(4)} ({((Number(order.filled || 0) / Number(order.amount)) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
