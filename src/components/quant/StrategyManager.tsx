import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Trash2 } from "lucide-react";

type Strategy = {
  id: string;
  exchange: 'okx' | 'htx';
  symbol: string;
  bar: '1m' | '5m' | '15m' | '1h';
  mode: 'paper' | 'live';
  type: 'sma-cross' | 'grid';
  params: any;
  risk?: any;
};

export const StrategyManager = () => {
  const [configs, setConfigs] = useState<Strategy[]>([]);
  const [instId, setInstId] = useState('BTC-USDT');
  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [type, setType] = useState<'sma-cross' | 'grid'>('sma-cross');
  const [events, setEvents] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const loadStrategies = async () => {
    try {
      const response = await fetch('/api/strategies/configs');
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error('加载策略失败:', error);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const startStrategy = async () => {
    const id = `${type}-${Date.now()}`;
    const cfg: Strategy = {
      id,
      exchange: 'okx',
      symbol: instId,
      bar: '1m',
      mode,
      type,
      params: type === 'sma-cross'
        ? { fast: 20, slow: 50, usdt: '10' }
        : { gridSize: 5, qty: '0.001' },
      risk: { priceBandPct: 0.01, maxOrdersPerMin: 20, maxNotional: 200 }
    };

    try {
      await fetch('/api/strategies/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      
      await loadStrategies();
      
      toast({
        title: "策略已启动",
        description: `${type} 策略已成功启动 (${mode} 模式)`,
      });

      if (!wsRef.current) {
        const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsProtocol}://${location.host}/ws/strategies`;
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onmessage = (m) => {
          setEvents(prev => [m.data, ...prev].slice(0, 100));
        };
      }
    } catch (error) {
      toast({
        title: "启动失败",
        description: "无法启动策略，请检查配置",
        variant: "destructive"
      });
    }
  };

  const stopStrategy = async (id: string) => {
    try {
      await fetch(`/api/strategies/stop/${id}`, { method: 'POST' });
      await loadStrategies();
      toast({
        title: "策略已停止",
        description: `策略 ${id} 已停止运行`,
      });
    } catch (error) {
      toast({
        title: "停止失败",
        description: "无法停止策略",
        variant: "destructive"
      });
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      await fetch(`/api/strategies/configs/${id}`, { method: 'DELETE' });
      await loadStrategies();
      toast({
        title: "策略已删除",
        description: `策略 ${id} 已删除`,
      });
    } catch (error) {
      toast({
        title: "删除失败",
        description: "无法删除策略",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>量化策略管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Input
              value={instId}
              onChange={(e) => setInstId(e.target.value)}
              placeholder="交易对 (如: BTC-USDT)"
            />
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sma-cross">均线交叉</SelectItem>
                <SelectItem value="grid">网格策略</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">模拟交易</SelectItem>
                <SelectItem value="live">实盘交易</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={startStrategy} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              启动策略
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>运行中的策略</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">策略ID</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">交易对</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">类型</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">模式</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      暂无运行中的策略
                    </td>
                  </tr>
                ) : (
                  configs.map((c) => (
                    <tr key={c.id} className="border-b border-border hover:bg-accent transition-colors">
                      <td className="py-3 px-2 text-sm">{c.id}</td>
                      <td className="py-3 px-2 text-sm text-center">{c.symbol}</td>
                      <td className="py-3 px-2 text-sm text-center">
                        {c.type === 'sma-cross' ? '均线交叉' : '网格策略'}
                      </td>
                      <td className="py-3 px-2 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          c.mode === 'live' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {c.mode === 'live' ? '实盘' : '模拟'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => stopStrategy(c.id)}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            停止
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteStrategy(c.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>实时事件流 (WebSocket)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-[300px] font-mono">
            {events.length === 0 ? '等待事件...' : events.join('\n')}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
