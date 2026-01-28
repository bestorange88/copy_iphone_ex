import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Merchant {
  id: string;
  merchant_name: string;
  merchant_level: string;
  completion_rate: number;
  is_active: boolean;
  support_coins: string[];
}

interface MerchantPrice {
  id: string;
  merchant_id: string;
  coin_symbol: string;
  price: number;
  min_limit: number;
  max_limit: number;
  avg_response_time: number;
  is_active: boolean;
  otc_merchants?: { merchant_name: string };
}

export const AdminOTCManager = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [prices, setPrices] = useState<MerchantPrice[]>([]);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [editingPrice, setEditingPrice] = useState<MerchantPrice | null>(null);
  const [showMerchantDialog, setShowMerchantDialog] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  const [merchantForm, setMerchantForm] = useState({
    merchant_name: "",
    merchant_level: "silver" as "diamond" | "gold" | "silver",
    completion_rate: 0,
    is_active: true,
  });

  const [priceForm, setPriceForm] = useState({
    merchant_id: "",
    coin_symbol: "BTC",
    price: 0,
    min_limit: 0,
    max_limit: 0,
    avg_response_time: 300,
    is_active: true,
  });

  useEffect(() => {
    fetchMerchants();
    fetchPrices();
  }, []);

  const fetchMerchants = async () => {
    const { data, error } = await adminApi.select<Merchant[]>('otc_merchants', {
      order: { column: 'created_at', ascending: false }
    });

    if (error) {
      toast.error("加载商户数据失败");
      console.error(error);
      return;
    }

    setMerchants(data || []);
  };

  const fetchPrices = async () => {
    const { data, error } = await adminApi.select<MerchantPrice[]>('otc_prices', {
      select: '*, otc_merchants(merchant_name)',
      order: { column: 'created_at', ascending: false }
    });

    if (error) {
      toast.error("加载价格数据失败");
      console.error(error);
      return;
    }

    setPrices(data || []);
  };

  const handleSaveMerchant = async () => {
    if (!merchantForm.merchant_name) {
      toast.error("请输入商户名称");
      return;
    }

    const merchantData = {
      merchant_name: merchantForm.merchant_name,
      merchant_level: merchantForm.merchant_level,
      completion_rate: merchantForm.completion_rate,
      is_active: merchantForm.is_active,
    };

    if (editingMerchant) {
      const { error } = await adminApi.update('otc_merchants', merchantData, { id: editingMerchant.id });

      if (error) {
        toast.error("更新商户失败");
        console.error(error);
        return;
      }
      toast.success("商户更新成功");
    } else {
      const { error } = await adminApi.insert('otc_merchants', merchantData);

      if (error) {
        toast.error("添加商户失败");
        console.error(error);
        return;
      }
      toast.success("商户添加成功");
    }

    setShowMerchantDialog(false);
    resetMerchantForm();
    fetchMerchants();
  };

  const handleSavePrice = async () => {
    if (!priceForm.merchant_id || !priceForm.coin_symbol) {
      toast.error("请填写完整信息");
      return;
    }

    const priceData = {
      merchant_id: priceForm.merchant_id,
      coin_symbol: priceForm.coin_symbol,
      price: priceForm.price,
      min_limit: priceForm.min_limit,
      max_limit: priceForm.max_limit,
      avg_response_time: priceForm.avg_response_time,
      is_active: priceForm.is_active,
    };

    if (editingPrice) {
      const { error } = await adminApi.update('otc_prices', priceData, { id: editingPrice.id });

      if (error) {
        toast.error("更新价格失败");
        console.error(error);
        return;
      }
      toast.success("价格更新成功");
    } else {
      const { error } = await adminApi.insert('otc_prices', priceData);

      if (error) {
        toast.error("添加价格失败");
        console.error(error);
        return;
      }
      toast.success("价格添加成功");
    }

    setShowPriceDialog(false);
    resetPriceForm();
    fetchPrices();
  };

  const handleDeleteMerchant = async (id: string) => {
    if (!confirm("确认删除此商户？")) return;

    const { error } = await adminApi.delete('otc_merchants', { id });

    if (error) {
      toast.error("删除商户失败");
      console.error(error);
      return;
    }

    toast.success("商户已删除");
    fetchMerchants();
  };

  const handleDeletePrice = async (id: string) => {
    if (!confirm("确认删除此价格配置？")) return;

    const { error } = await adminApi.delete('otc_prices', { id });

    if (error) {
      toast.error("删除价格失败");
      console.error(error);
      return;
    }

    toast.success("价格已删除");
    fetchPrices();
  };

  const resetMerchantForm = () => {
    setMerchantForm({
      merchant_name: "",
      merchant_level: "silver",
      completion_rate: 0,
      is_active: true,
    });
    setEditingMerchant(null);
  };

  const resetPriceForm = () => {
    setPriceForm({
      merchant_id: "",
      coin_symbol: "BTC",
      price: 0,
      min_limit: 0,
      max_limit: 0,
      avg_response_time: 300,
      is_active: true,
    });
    setEditingPrice(null);
  };

  const openEditMerchant = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setMerchantForm({
      merchant_name: merchant.merchant_name,
      merchant_level: merchant.merchant_level as "diamond" | "gold" | "silver",
      completion_rate: merchant.completion_rate,
      is_active: merchant.is_active,
    });
    setShowMerchantDialog(true);
  };

  const openEditPrice = (price: MerchantPrice) => {
    setEditingPrice(price);
    setPriceForm({
      merchant_id: price.merchant_id,
      coin_symbol: price.coin_symbol,
      price: Number(price.price),
      min_limit: Number(price.min_limit),
      max_limit: Number(price.max_limit),
      avg_response_time: price.avg_response_time,
      is_active: price.is_active,
    });
    setShowPriceDialog(true);
  };

  const getLevelBadge = (level: string) => {
    const config = {
      diamond: { icon: "💎", label: "钻石", variant: "default" as const },
      gold: { icon: "🥇", label: "黄金", variant: "secondary" as const },
      silver: { icon: "🥈", label: "白银", variant: "outline" as const },
    };
    const c = config[level as keyof typeof config] || config.silver;
    return <Badge variant={c.variant}>{c.icon} {c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>OTC 商户管理</CardTitle>
            <Dialog open={showMerchantDialog} onOpenChange={setShowMerchantDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetMerchantForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加商户
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingMerchant ? "编辑商户" : "添加商户"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>商户名称</Label>
                    <Input
                      value={merchantForm.merchant_name}
                      onChange={(e) => setMerchantForm({ ...merchantForm, merchant_name: e.target.value })}
                      placeholder="例如: Diamond Merchant A"
                    />
                  </div>
                  <div>
                    <Label>商户等级</Label>
                    <Select
                      value={merchantForm.merchant_level}
                      onValueChange={(value: "diamond" | "gold" | "silver") => 
                        setMerchantForm({ ...merchantForm, merchant_level: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diamond">💎 钻石</SelectItem>
                        <SelectItem value="gold">🥇 黄金</SelectItem>
                        <SelectItem value="silver">🥈 白银</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>完成率 (%)</Label>
                    <Input
                      type="number"
                      value={merchantForm.completion_rate}
                      onChange={(e) => setMerchantForm({ ...merchantForm, completion_rate: parseFloat(e.target.value) })}
                      placeholder="98.5"
                      step="0.1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={merchantForm.is_active}
                      onCheckedChange={(checked) => setMerchantForm({ ...merchantForm, is_active: checked })}
                    />
                    <Label>启用商户</Label>
                  </div>
                  <Button onClick={handleSaveMerchant} className="w-full">保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {merchants.map((merchant) => (
              <div key={merchant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getLevelBadge(merchant.merchant_level)}
                  <div>
                    <div className="font-medium">{merchant.merchant_name}</div>
                    <div className="text-sm text-muted-foreground">
                      完成率: {merchant.completion_rate}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={merchant.is_active ? "default" : "secondary"}>
                    {merchant.is_active ? "启用" : "禁用"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditMerchant(merchant)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteMerchant(merchant.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>价格配置</CardTitle>
            <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetPriceForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加价格
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPrice ? "编辑价格" : "添加价格"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>选择商户</Label>
                    <Select
                      value={priceForm.merchant_id}
                      onValueChange={(value) => setPriceForm({ ...priceForm, merchant_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择商户" />
                      </SelectTrigger>
                      <SelectContent>
                        {merchants.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.merchant_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>币种</Label>
                    <Select
                      value={priceForm.coin_symbol}
                      onValueChange={(value) => setPriceForm({ ...priceForm, coin_symbol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">BTC</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>价格 (USD)</Label>
                    <Input
                      type="number"
                      value={priceForm.price}
                      onChange={(e) => setPriceForm({ ...priceForm, price: parseFloat(e.target.value) })}
                      placeholder="68500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>最小限额</Label>
                      <Input
                        type="number"
                        value={priceForm.min_limit}
                        onChange={(e) => setPriceForm({ ...priceForm, min_limit: parseFloat(e.target.value) })}
                        placeholder="0.01"
                        step="0.001"
                      />
                    </div>
                    <div>
                      <Label>最大限额</Label>
                      <Input
                        type="number"
                        value={priceForm.max_limit}
                        onChange={(e) => setPriceForm({ ...priceForm, max_limit: parseFloat(e.target.value) })}
                        placeholder="2"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>平均响应时间 (秒)</Label>
                    <Input
                      type="number"
                      value={priceForm.avg_response_time}
                      onChange={(e) => setPriceForm({ ...priceForm, avg_response_time: parseInt(e.target.value) })}
                      placeholder="300"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={priceForm.is_active}
                      onCheckedChange={(checked) => setPriceForm({ ...priceForm, is_active: checked })}
                    />
                    <Label>启用价格</Label>
                  </div>
                  <Button onClick={handleSavePrice} className="w-full">保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prices.map((price) => (
              <div key={price.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{price.otc_merchants?.merchant_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {price.coin_symbol}: ${Number(price.price).toLocaleString()} | 
                    限额: {price.min_limit} - {price.max_limit} | 
                    响应: {price.avg_response_time}s
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={price.is_active ? "default" : "secondary"}>
                    {price.is_active ? "启用" : "禁用"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditPrice(price)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePrice(price.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};