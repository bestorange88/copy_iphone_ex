import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, HardDrive, Zap, Gift } from "lucide-react";

interface MiningProduct {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number | null;
  daily_rate: number;
  period_days: number;
  expected_profit: number;
  is_active: boolean | null;
  is_free: boolean | null;
  icon_type: string | null;
  sort_order: number | null;
  created_at: string;
  return_type: string | null;
  early_redemption_fee: number | null;
  allow_early_redemption: boolean | null;
}

const AdminMiningManager = () => {
  const [products, setProducts] = useState<MiningProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MiningProduct | null>(null);
    const [formData, setFormData] = useState({
      name: "",
      description: "",
      min_amount: "",
      max_amount: "",
      daily_rate: "",
      period_days: "",
      expected_profit: "",
      is_active: true,
      is_free: false,
      icon_type: "standard",
      sort_order: "",
      return_type: "daily_interest",
      early_redemption_fee: "10",
      allow_early_redemption: true,
    });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await adminApi.select<MiningProduct[]>('mining_products', {
        order: { column: 'sort_order', ascending: true }
      });

      if (error) throw new Error(error);
      setProducts(data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error("獲取礦機產品失敗: " + message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.min_amount || !formData.daily_rate || !formData.period_days) {
      toast.error("請填寫必填欄位");
      return;
    }

    try {
            const productData = {
              name: formData.name,
              description: formData.description || null,
              min_amount: parseFloat(formData.min_amount),
              max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
              daily_rate: parseFloat(formData.daily_rate),
              period_days: parseInt(formData.period_days),
              expected_profit: formData.expected_profit ? parseFloat(formData.expected_profit) : 0,
              is_active: formData.is_active,
              is_free: formData.is_free,
              icon_type: formData.icon_type || null,
              sort_order: formData.sort_order ? parseInt(formData.sort_order) : null,
              return_type: formData.return_type,
              early_redemption_fee: formData.early_redemption_fee ? parseFloat(formData.early_redemption_fee) : 10,
              allow_early_redemption: formData.allow_early_redemption,
            };

      if (editingProduct) {
        const { error } = await adminApi.update('mining_products', productData, { id: editingProduct.id });

        if (error) throw new Error(error);
        toast.success("礦機產品更新成功");
      } else {
        const { error } = await adminApi.insert('mining_products', productData);

        if (error) throw new Error(error);
        toast.success("礦機產品創建成功");
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error("保存失敗: " + message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此礦機產品嗎？")) return;

    try {
      const { error } = await adminApi.delete('mining_products', { id });

      if (error) throw new Error(error);
      toast.success("礦機產品已刪除");
      fetchProducts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error("刪除失敗: " + message);
    }
  };

  const handleToggleActive = async (product: MiningProduct) => {
    try {
      const { error } = await adminApi.update('mining_products', { is_active: !product.is_active }, { id: product.id });

      if (error) throw new Error(error);
      toast.success(`礦機產品已${!product.is_active ? "啟用" : "停用"}`);
      fetchProducts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error("更新失敗: " + message);
    }
  };

    const openEditDialog = (product: MiningProduct) => {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        min_amount: product.min_amount.toString(),
        max_amount: product.max_amount?.toString() || "",
        daily_rate: product.daily_rate.toString(),
        period_days: product.period_days.toString(),
        expected_profit: product.expected_profit.toString(),
        is_active: product.is_active ?? true,
        is_free: product.is_free || false,
        icon_type: product.icon_type || "standard",
        sort_order: product.sort_order?.toString() || "",
        return_type: product.return_type || "daily_interest",
        early_redemption_fee: product.early_redemption_fee?.toString() || "10",
        allow_early_redemption: product.allow_early_redemption ?? true,
      });
      setDialogOpen(true);
    };

    const resetForm = () => {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        min_amount: "",
        max_amount: "",
        daily_rate: "",
        period_days: "",
        expected_profit: "",
        is_active: true,
        is_free: false,
        icon_type: "standard",
        sort_order: "",
        return_type: "daily_interest",
        early_redemption_fee: "10",
        allow_early_redemption: true,
      });
    };

  const getIconByType = (type: string | null) => {
    switch (type) {
      case 'free':
        return <Gift className="h-4 w-4 text-green-500" />;
      case 'premium':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <HardDrive className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">載入中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              礦機產品管理
            </CardTitle>
            <CardDescription>管理雲端挖礦產品配置</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新增礦機
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "編輯" : "新增"}礦機產品</DialogTitle>
                <DialogDescription>
                  配置礦機產品詳細資訊
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>產品名稱 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：入門級礦機"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>產品描述</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="產品詳細說明..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>最低投資額 (USDT) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>最高投資額 (USDT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                      placeholder="不限"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>每日收益率 (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                      placeholder="0.5"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>週期天數 *</Label>
                    <Input
                      type="number"
                      value={formData.period_days}
                      onChange={(e) => setFormData({ ...formData, period_days: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>預期收益 (USDT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.expected_profit}
                      onChange={(e) => setFormData({ ...formData, expected_profit: e.target.value })}
                      placeholder="15"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>排序順序</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                                <div className="grid gap-2">
                                  <Label>收益種類</Label>
                                  <Select value={formData.return_type} onValueChange={(value) => setFormData({ ...formData, return_type: value })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="daily_interest">到期返本，按日返息</SelectItem>
                                      <SelectItem value="maturity_interest">到期返本，到期返息</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <Label>提前贖回違約金 (%)</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={formData.early_redemption_fee}
                                      onChange={(e) => setFormData({ ...formData, early_redemption_fee: e.target.value })}
                                      placeholder="10"
                                    />
                                    <p className="text-xs text-muted-foreground">用戶提前贖回時扣除的違約金比例</p>
                                  </div>
                                  <div className="flex items-center space-x-2 pt-6">
                                    <Switch
                                      checked={formData.allow_early_redemption}
                                      onCheckedChange={(checked) => setFormData({ ...formData, allow_early_redemption: checked })}
                                    />
                                    <Label>允許提前贖回</Label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={formData.is_active}
                                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <Label>啟用產品</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={formData.is_free}
                                      onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
                                    />
                                    <Label>免費體驗</Label>
                                  </div>
                                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  取消
                </Button>
                <Button onClick={handleSave}>
                  儲存
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暫無礦機產品，請點擊「新增礦機」創建
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>產品</TableHead>
                <TableHead>投資範圍</TableHead>
                <TableHead>日收益率</TableHead>
                <TableHead>週期</TableHead>
                <TableHead>預期收益</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getIconByType(product.icon_type)}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {product.min_amount.toLocaleString()} USDT
                      {product.max_amount ? ` - ${product.max_amount.toLocaleString()} USDT` : '+'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-primary font-semibold">{product.daily_rate}%</span>
                  </TableCell>
                  <TableCell>{product.period_days}天</TableCell>
                  <TableCell>
                    <span className="text-green-600 font-medium">
                      {product.expected_profit.toLocaleString()} USDT
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.is_free ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <Gift className="h-3 w-3 mr-1" />
                        免費
                      </Badge>
                    ) : (
                      <Badge variant="outline">付費</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={() => handleToggleActive(product)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMiningManager;
