import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Crown, Loader2 } from "lucide-react";

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
  is_active: boolean;
  created_at: string;
}

interface FollowTrade {
  id: string;
  user_id: string;
  showcase_id: string;
  amount: number;
  leverage: number;
  status: string;
  created_at: string;
}

export const AdminShowcaseManager = () => {
  const { toast } = useToast();
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [followTrades, setFollowTrades] = useState<FollowTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShowcase, setEditingShowcase] = useState<Showcase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'showcases' | 'follows'>('showcases');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    profit_amount: '',
    profit_percent: '',
    symbol: 'BTC-USDT',
    direction: 'long',
    leverage: '10',
    entry_price: '',
    exit_price: '',
    image_url: '',
    expert_name: '',
    expert_avatar: '',
    is_active: true
  });

  useEffect(() => {
    fetchShowcases();
    fetchFollowTrades();
  }, []);

  const fetchShowcases = async () => {
    try {
      const { data, error } = await adminApi.select<Showcase[]>('expert_showcases', {
        order: { column: 'created_at', ascending: false }
      });

      if (error) throw new Error(error);
      setShowcases(data || []);
    } catch (error) {
      console.error('Error fetching showcases:', error);
      toast({ title: '獲取數據失敗', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowTrades = async () => {
    try {
      const { data, error } = await adminApi.select<FollowTrade[]>('follow_trades', {
        order: { column: 'created_at', ascending: false }
      });

      if (error) throw new Error(error);
      setFollowTrades(data || []);
    } catch (error) {
      console.error('Error fetching follow trades:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      profit_amount: '',
      profit_percent: '',
      symbol: 'BTC-USDT',
      direction: 'long',
      leverage: '10',
      entry_price: '',
      exit_price: '',
      image_url: '',
      expert_name: '',
      expert_avatar: '',
      is_active: true
    });
    setEditingShowcase(null);
  };

  const handleEdit = (showcase: Showcase) => {
    setEditingShowcase(showcase);
    setFormData({
      title: showcase.title,
      description: showcase.description || '',
      profit_amount: showcase.profit_amount.toString(),
      profit_percent: showcase.profit_percent.toString(),
      symbol: showcase.symbol,
      direction: showcase.direction,
      leverage: showcase.leverage.toString(),
      entry_price: showcase.entry_price?.toString() || '',
      exit_price: showcase.exit_price?.toString() || '',
      image_url: showcase.image_url || '',
      expert_name: showcase.expert_name,
      expert_avatar: showcase.expert_avatar || '',
      is_active: showcase.is_active
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.expert_name) {
      toast({ title: '請填寫必填欄位', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        profit_amount: parseFloat(formData.profit_amount) || 0,
        profit_percent: parseFloat(formData.profit_percent) || 0,
        symbol: formData.symbol,
        direction: formData.direction,
        leverage: parseInt(formData.leverage) || 10,
        entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        image_url: formData.image_url || null,
        expert_name: formData.expert_name,
        expert_avatar: formData.expert_avatar || null,
        is_active: formData.is_active
      };

      if (editingShowcase) {
        const { error } = await adminApi.update('expert_showcases', payload, { id: editingShowcase.id });
        if (error) throw new Error(error);
        toast({ title: '更新成功' });
      } else {
        const { error } = await adminApi.insert('expert_showcases', payload);
        if (error) throw new Error(error);
        toast({ title: '創建成功' });
      }

      setDialogOpen(false);
      resetForm();
      fetchShowcases();
    } catch (error) {
      console.error('Error saving showcase:', error);
      toast({ title: '保存失敗', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此曬單嗎？')) return;

    try {
      const { error } = await adminApi.delete('expert_showcases', { id });
      if (error) throw new Error(error);
      toast({ title: '刪除成功' });
      fetchShowcases();
    } catch (error) {
      console.error('Error deleting showcase:', error);
      toast({ title: '刪除失敗', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await adminApi.update('expert_showcases', { is_active: isActive }, { id });
      if (error) throw new Error(error);
      fetchShowcases();
    } catch (error) {
      console.error('Error updating showcase:', error);
    }
  };

  const updateFollowStatus = async (id: string, status: string) => {
    try {
      const { error } = await adminApi.update('follow_trades', { status }, { id });
      if (error) throw new Error(error);
      toast({ title: '狀態更新成功' });
      fetchFollowTrades();
    } catch (error) {
      console.error('Error updating follow trade:', error);
      toast({ title: '更新失敗', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab 切換 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'showcases' ? 'default' : 'outline'}
          onClick={() => setActiveTab('showcases')}
        >
          <Crown className="h-4 w-4 mr-2" />
          大神曬單
        </Button>
        <Button
          variant={activeTab === 'follows' ? 'default' : 'outline'}
          onClick={() => setActiveTab('follows')}
        >
          跟單記錄 ({followTrades.length})
        </Button>
      </div>

      {activeTab === 'showcases' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              大神曬單管理
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新增曬單
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingShowcase ? '編輯曬單' : '新增曬單'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>標題 *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="交易標題"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>專家名稱 *</Label>
                      <Input
                        value={formData.expert_name}
                        onChange={(e) => setFormData({ ...formData, expert_name: e.target.value })}
                        placeholder="交易大神"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>交易對</Label>
                      <Select value={formData.symbol} onValueChange={(v) => setFormData({ ...formData, symbol: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTC-USDT">BTC-USDT</SelectItem>
                          <SelectItem value="ETH-USDT">ETH-USDT</SelectItem>
                          <SelectItem value="SOL-USDT">SOL-USDT</SelectItem>
                          <SelectItem value="XRP-USDT">XRP-USDT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>方向</Label>
                      <Select value={formData.direction} onValueChange={(v) => setFormData({ ...formData, direction: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="long">做多</SelectItem>
                          <SelectItem value="short">做空</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>收益金額</Label>
                      <Input
                        type="number"
                        value={formData.profit_amount}
                        onChange={(e) => setFormData({ ...formData, profit_amount: e.target.value })}
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>收益率 (%)</Label>
                      <Input
                        type="number"
                        value={formData.profit_percent}
                        onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })}
                        placeholder="85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>槓桿</Label>
                      <Input
                        type="number"
                        value={formData.leverage}
                        onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>入場價</Label>
                      <Input
                        type="number"
                        value={formData.entry_price}
                        onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                        placeholder="42000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>出場價</Label>
                      <Input
                        type="number"
                        value={formData.exit_price}
                        onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                        placeholder="45000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>收益截圖URL</Label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>專家頭像URL</Label>
                    <Input
                      value={formData.expert_avatar}
                      onChange={(e) => setFormData({ ...formData, expert_avatar: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>描述/分析</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="交易分析和心得..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>啟用</Label>
                  </div>

                  <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingShowcase ? '更新' : '創建'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>專家</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>交易對</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead>收益</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showcases.map((showcase) => (
                  <TableRow key={showcase.id}>
                    <TableCell className="font-medium">{showcase.expert_name}</TableCell>
                    <TableCell>{showcase.title}</TableCell>
                    <TableCell>{showcase.symbol}</TableCell>
                    <TableCell>
                      {showcase.direction === 'long' ? (
                        <Badge className="bg-success/20 text-success border-0">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          做多
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/20 text-destructive border-0">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          做空
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-success font-medium">
                        +${showcase.profit_amount} ({showcase.profit_percent}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={showcase.is_active}
                        onCheckedChange={(checked) => handleToggleActive(showcase.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(showcase)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(showcase.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {showcases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      暫無數據
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>跟單記錄</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用戶ID</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>槓桿</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-xs">{trade.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>${trade.amount}</TableCell>
                    <TableCell>{trade.leverage}x</TableCell>
                    <TableCell>
                      <Badge variant={
                        trade.status === 'completed' ? 'default' :
                        trade.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {trade.status === 'pending' ? '待處理' :
                         trade.status === 'completed' ? '已完成' : trade.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(trade.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={trade.status}
                        onValueChange={(v) => updateFollowStatus(trade.id, v)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">待處理</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="cancelled">已取消</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {followTrades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暫無跟單記錄
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
