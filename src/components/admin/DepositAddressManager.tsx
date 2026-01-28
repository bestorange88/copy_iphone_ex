import { useState, useEffect } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash } from "lucide-react";

interface DepositAddress {
  id: string;
  coin_symbol: string;
  coin_name: string;
  network: string;
  address: string;
  qr_code_url?: string;
  min_deposit: number;
  confirmations_required: number;
  is_active: boolean;
}

export const DepositAddressManager = () => {
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<DepositAddress | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    coin_symbol: "",
    coin_name: "",
    network: "",
    address: "",
    qr_code_url: "",
    min_deposit: 0,
    confirmations_required: 12,
    is_active: true,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await adminApi.select<DepositAddress[]>('deposit_addresses', {
        order: { column: 'coin_symbol', ascending: true }
      });

      if (error) throw new Error(error);
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error("获取充值地址失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAddress) {
        const { error } = await adminApi.update('deposit_addresses', formData, { id: editingAddress.id });
        if (error) throw new Error(error);
        toast.success("充值地址更新成功");
      } else {
        const { error } = await adminApi.insert('deposit_addresses', formData);
        if (error) throw new Error(error);
        toast.success("充值地址添加成功");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAddresses();
    } catch (error: unknown) {
      console.error("Error saving address:", error);
      toast.error(error instanceof Error ? error.message : "保存失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个充值地址吗?")) return;

    try {
      const { error } = await adminApi.delete('deposit_addresses', { id });
      if (error) throw new Error(error);
      toast.success("充值地址删除成功");
      fetchAddresses();
    } catch (error: unknown) {
      console.error("Error deleting address:", error);
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const handleEdit = (address: DepositAddress) => {
    setEditingAddress(address);
    setFormData({
      coin_symbol: address.coin_symbol,
      coin_name: address.coin_name,
      network: address.network,
      address: address.address,
      qr_code_url: address.qr_code_url || "",
      min_deposit: address.min_deposit,
      confirmations_required: address.confirmations_required,
      is_active: address.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAddress(null);
    setFormData({
      coin_symbol: "",
      coin_name: "",
      network: "",
      address: "",
      qr_code_url: "",
      min_deposit: 0,
      confirmations_required: 12,
      is_active: true,
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>充值地址管理</CardTitle>
            <CardDescription>管理各个币种的充值地址</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                添加地址
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAddress ? "编辑" : "添加"}充值地址</DialogTitle>
                <DialogDescription>
                  配置币种的充值地址信息
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coin_symbol">币种符号</Label>
                    <Input
                      id="coin_symbol"
                      value={formData.coin_symbol}
                      onChange={(e) => setFormData({ ...formData, coin_symbol: e.target.value })}
                      placeholder="BTC"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coin_name">币种名称</Label>
                    <Input
                      id="coin_name"
                      value={formData.coin_name}
                      onChange={(e) => setFormData({ ...formData, coin_name: e.target.value })}
                      placeholder="Bitcoin"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="network">网络</Label>
                  <Input
                    id="network"
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    placeholder="BTC / ERC20 / TRC20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">充值地址</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="bc1q..."
                    className="font-mono"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr_code_url">二维码URL (可选)</Label>
                  <Input
                    id="qr_code_url"
                    value={formData.qr_code_url}
                    onChange={(e) => setFormData({ ...formData, qr_code_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_deposit">最小充值</Label>
                    <Input
                      id="min_deposit"
                      type="number"
                      step="0.00000001"
                      value={formData.min_deposit}
                      onChange={(e) => setFormData({ ...formData, min_deposit: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmations">确认数</Label>
                    <Input
                      id="confirmations"
                      type="number"
                      value={formData.confirmations_required}
                      onChange={(e) => setFormData({ ...formData, confirmations_required: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">启用</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">
                    {editingAddress ? "更新" : "添加"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>币种</TableHead>
              <TableHead>网络</TableHead>
              <TableHead>地址</TableHead>
              <TableHead>最小充值</TableHead>
              <TableHead>确认数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses.map((address) => (
              <TableRow key={address.id}>
                <TableCell className="font-medium">
                  {address.coin_symbol}
                  <div className="text-xs text-muted-foreground">{address.coin_name}</div>
                </TableCell>
                <TableCell>{address.network}</TableCell>
                <TableCell className="font-mono text-xs max-w-[200px] truncate">
                  {address.address}
                </TableCell>
                <TableCell>{address.min_deposit} {address.coin_symbol}</TableCell>
                <TableCell>{address.confirmations_required}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    address.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {address.is_active ? '启用' : '禁用'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(address)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
