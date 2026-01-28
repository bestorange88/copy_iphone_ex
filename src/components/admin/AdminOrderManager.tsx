import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Search, TrendingUp, TrendingDown, RefreshCw, 
  XCircle, CheckCircle, Clock, Filter, Download
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

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
  updated_at: string;
  username?: string;
  email?: string;
}

export const AdminOrderManager = () => {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sideFilter, setSideFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<TradeOrder | null>(null);
  const [actionType, setActionType] = useState<"cancel" | "fill" | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await adminApi.getTradesWithProfiles();
      if (error) {
        toast.error("加載交易數據失敗");
        console.error(error);
        return;
      }
      setOrders((data as TradeOrder[]) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      order.symbol.toLowerCase().includes(search) ||
      order.exchange.toLowerCase().includes(search) ||
      order.username?.toLowerCase().includes(search) ||
      order.id.toLowerCase().includes(search);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSide = sideFilter === "all" || order.side === sideFilter;
    const matchesType = typeFilter === "all" || order.order_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesSide && matchesType;
  });

  const handleCancelOrder = async (order: TradeOrder) => {
    setProcessing(true);
    try {
      const adminToken = localStorage.getItem('binarycent_admin_token') || localStorage.getItem('admin_token');
      if (!adminToken) {
        toast.error("管理員登錄已失效，請重新登錄");
        return;
      }

      const { error } = await supabase.functions.invoke('admin-data', {
        body: {
          action: 'update',
          table: 'trade_orders',
          data: { status: 'cancelled', updated_at: new Date().toISOString() },
          filters: { id: order.id }
        },
        headers: { 'x-admin-token': adminToken }
      });

      if (error) throw error;
      
      toast.success(`訂單 ${order.id.slice(0, 8)}... 已取消`);
      fetchOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error("取消訂單失敗");
    } finally {
      setProcessing(false);
      setSelectedOrder(null);
      setActionType(null);
    }
  };

  const handleFillOrder = async (order: TradeOrder) => {
    setProcessing(true);
    try {
      const adminToken = localStorage.getItem('binarycent_admin_token') || localStorage.getItem('admin_token');
      if (!adminToken) {
        toast.error("管理員登錄已失效，請重新登錄");
        return;
      }

      const { error } = await supabase.functions.invoke('admin-data', {
        body: {
          action: 'update',
          table: 'trade_orders',
          data: { 
            status: 'filled', 
            filled: order.amount,
            updated_at: new Date().toISOString() 
          },
          filters: { id: order.id }
        },
        headers: { 'x-admin-token': adminToken }
      });

      if (error) throw error;
      
      toast.success(`訂單 ${order.id.slice(0, 8)}... 已手動成交`);
      fetchOrders();
    } catch (error) {
      console.error('Failed to fill order:', error);
      toast.error("成交訂單失敗");
    } finally {
      setProcessing(false);
      setSelectedOrder(null);
      setActionType(null);
    }
  };

  const handleConfirmAction = () => {
    if (!selectedOrder || !actionType) return;
    
    if (actionType === 'cancel') {
      handleCancelOrder(selectedOrder);
    } else if (actionType === 'fill') {
      handleFillOrder(selectedOrder);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      pending: { variant: "outline", label: "待處理" },
      open: { variant: "secondary", label: "掛單中", className: "bg-blue-500/20 text-blue-500" },
      filled: { variant: "default", label: "已成交", className: "bg-green-500/20 text-green-500" },
      partial: { variant: "secondary", label: "部分成交", className: "bg-yellow-500/20 text-yellow-500" },
      cancelled: { variant: "destructive", label: "已取消" },
      failed: { variant: "destructive", label: "失敗" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getOrderTypeBadge = (type: string) => {
    if (type === 'market') {
      return <Badge variant="secondary" className="bg-purple-500/20 text-purple-500">市價</Badge>;
    }
    return <Badge variant="outline">限價</Badge>;
  };

  const exportOrders = () => {
    const csv = [
      ['ID', '用戶', '交易對', '類型', '方向', '價格', '數量', '成交量', '狀態', '創建時間'].join(','),
      ...filteredOrders.map(o => [
        o.id,
        o.username || o.user_id,
        o.symbol,
        o.order_type,
        o.side,
        o.price,
        o.amount,
        o.filled,
        o.status,
        o.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'open').length,
    filled: orders.filter(o => o.status === 'filled').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    volume: orders.filter(o => o.status === 'filled').reduce((sum, o) => sum + (Number(o.amount) * Number(o.price || 0)), 0),
    marketOrders: orders.filter(o => o.order_type === 'market').length,
    limitOrders: orders.filter(o => o.order_type === 'limit').length,
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">總訂單</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">待處理</div>
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">已成交</div>
            <div className="text-2xl font-bold text-green-500">{stats.filled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">已取消</div>
            <div className="text-2xl font-bold text-red-500">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">成交額</div>
            <div className="text-2xl font-bold">{stats.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">市價單</div>
            <div className="text-2xl font-bold text-purple-500">{stats.marketOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">限價單</div>
            <div className="text-2xl font-bold">{stats.limitOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              訂單管理
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button variant="outline" size="sm" onClick={exportOrders}>
                <Download className="h-4 w-4 mr-2" />
                導出
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索ID、交易對、用戶..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="pending">待處理</SelectItem>
                <SelectItem value="open">掛單中</SelectItem>
                <SelectItem value="filled">已成交</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
                <SelectItem value="failed">失敗</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sideFilter} onValueChange={setSideFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="方向" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方向</SelectItem>
                <SelectItem value="buy">買入</SelectItem>
                <SelectItem value="sell">賣出</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部類型</SelectItem>
                <SelectItem value="limit">限價單</SelectItem>
                <SelectItem value="market">市價單</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>訂單ID</TableHead>
                  <TableHead>用戶</TableHead>
                  <TableHead>交易對</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead className="text-right">價格</TableHead>
                  <TableHead className="text-right">數量</TableHead>
                  <TableHead className="text-right">成交</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      暫無訂單數據
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.slice(0, 100).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{order.username || '-'}</div>
                        <div className="text-xs text-muted-foreground">{order.email?.slice(0, 20) || '-'}</div>
                      </TableCell>
                      <TableCell className="font-medium">{order.symbol}</TableCell>
                      <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {order.side === 'buy' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant={order.side === 'buy' ? 'default' : 'secondary'} 
                                 className={order.side === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}>
                            {order.side === 'buy' ? '買入' : '賣出'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {order.order_type === 'market' ? '市價' : `${Number(order.price || 0).toFixed(2)} USDT`}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(order.amount).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono">{Number(order.filled || 0).toFixed(4)}</div>
                        <div className="text-xs text-muted-foreground">
                          {((Number(order.filled || 0) / Number(order.amount)) * 100).toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {(order.status === 'pending' || order.status === 'open') && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => { setSelectedOrder(order); setActionType('fill'); }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => { setSelectedOrder(order); setActionType('cancel'); }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredOrders.length > 100 && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              顯示前 100 條記錄，共 {filteredOrders.length} 條
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedOrder && !!actionType} onOpenChange={() => { setSelectedOrder(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'cancel' ? '確認取消訂單' : '確認手動成交'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'cancel' 
                ? `您確定要取消訂單 ${selectedOrder?.id.slice(0, 8)}... 嗎？此操作無法撤銷。`
                : `您確定要手動成交訂單 ${selectedOrder?.id.slice(0, 8)}... 嗎？這將把訂單標記為完全成交。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              disabled={processing}
              className={actionType === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processing ? <Clock className="h-4 w-4 animate-spin mr-2" /> : null}
              確認
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
