import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Position {
  id: string;
  user_id: string;
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
  profiles?: { username: string; email: string };
}

export const AdminPerpetualControl = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceAdjustments, setPriceAdjustments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    const { data: positionsData, error } = await adminApi.select<Position[]>('perpetual_positions', {
      filters: { status: 'open' },
      order: { column: 'created_at', ascending: false }
    });

    if (error) {
      toast.error("加载持仓数据失败");
      console.error(error);
      return;
    }

    const userIds = [...new Set(positionsData?.map(p => p.user_id) || [])];
    if (userIds.length > 0) {
      const { data: profilesData } = await adminApi.select<Array<{ id: string; username: string; email: string }>>('profiles', {
        select: 'id, username, email',
        filters: { id: { in: userIds } }
      });

      const mergedData = positionsData?.map(position => ({
        ...position,
        profiles: profilesData?.find(p => p.id === position.user_id) || { username: 'Unknown', email: '' }
      })) || [];

      setPositions(mergedData);
    } else {
      setPositions(positionsData || []);
    }
  };

  const handlePriceAdjustment = async (positionId: string, symbol: string, adjustment: number) => {
    if (!adjustment) {
      toast.error("请输入调整价格");
      return;
    }

    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    const newPrice = position.entry_price + adjustment;
    const priceDiff = newPrice - position.entry_price;
    const pnlMultiplier = position.side === 'long' ? 1 : -1;
    const newPnl = priceDiff * position.amount * position.leverage * pnlMultiplier;

    const shouldLiquidate = position.liquidation_price && (
      (position.side === 'long' && newPrice <= position.liquidation_price) ||
      (position.side === 'short' && newPrice >= position.liquidation_price)
    );

    const { error } = await adminApi.update('perpetual_positions', {
      unrealized_pnl: newPnl,
      status: shouldLiquidate ? 'liquidated' : 'open',
      closed_at: shouldLiquidate ? new Date().toISOString() : null,
      close_price: shouldLiquidate ? newPrice : null
    }, { id: positionId });

    if (error) {
      toast.error("调整价格失败");
      console.error(error);
      return;
    }

    toast.success(shouldLiquidate ? "已触发爆仓" : "价格调整成功", {
      description: `${symbol} 价格${adjustment > 0 ? '上涨' : '下跌'} ${Math.abs(adjustment)} USDT`
    });

    setPriceAdjustments(prev => ({ ...prev, [positionId]: "" }));
    fetchPositions();
  };

  const handleLiquidate = async (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    const { error } = await adminApi.update('perpetual_positions', {
      status: 'liquidated',
      closed_at: new Date().toISOString(),
      close_price: position.entry_price,
      unrealized_pnl: -position.margin
    }, { id: positionId });

    if (error) {
      toast.error("强制平仓失败");
      console.error(error);
      return;
    }

    toast.success("强制平仓成功");
    fetchPositions();
  };

  const filteredPositions = positions.filter(position => {
    const search = searchTerm.toLowerCase();
    return (
      position.symbol.toLowerCase().includes(search) ||
      position.profiles?.username.toLowerCase().includes(search)
    );
  });

  const totalPositions = positions.length;
  const longPositions = positions.filter(p => p.side === 'long').length;
  const shortPositions = positions.filter(p => p.side === 'short').length;
  const totalMargin = positions.reduce((sum, p) => sum + Number(p.margin), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>永续合约持仓统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">总持仓数</div>
              <div className="text-2xl font-bold">{totalPositions}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">多单</div>
              <div className="text-2xl font-bold text-green-600">{longPositions}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">空单</div>
              <div className="text-2xl font-bold text-red-600">{shortPositions}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">总保证金</div>
              <div className="text-2xl font-bold">{totalMargin.toFixed(2)} USDT</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>价格控制</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索交易对或用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPositions.map((position) => (
              <div key={position.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {position.side === 'long' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.profiles?.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={position.side === 'long' ? 'default' : 'secondary'}>
                      {position.side === 'long' ? '多单' : '空单'} {position.leverage}x
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">开仓价</div>
                    <div className="font-medium">{Number(position.entry_price).toFixed(2)} USDT</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">数量</div>
                    <div className="font-medium">{Number(position.amount).toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">保证金</div>
                    <div className="font-medium">{Number(position.margin).toFixed(2)} USDT</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">未实现盈亏</div>
                    <div className={`font-medium ${Number(position.unrealized_pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(position.unrealized_pnl).toFixed(2)} USDT
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">价格调整（正数拉高，负数拉低）</Label>
                    <Input
                      type="number"
                      placeholder="例如: +100 或 -100"
                      value={priceAdjustments[position.id] || ""}
                      onChange={(e) => setPriceAdjustments(prev => ({ ...prev, [position.id]: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={() => handlePriceAdjustment(position.id, position.symbol, Number(priceAdjustments[position.id]))}
                    size="sm"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    执行调整
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleLiquidate(position.id)}
                    size="sm"
                  >
                    强制爆仓
                  </Button>
                </div>

                {position.liquidation_price && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    爆仓价: {Number(position.liquidation_price).toFixed(2)} USDT
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};