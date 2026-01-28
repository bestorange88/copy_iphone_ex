import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Percent, Calendar, RefreshCw } from "lucide-react";
import { formatUSDT } from "@/lib/timezone";

interface TimeContractConfig {
  id: string;
  duration_minutes: number;
  duration_value: number;
  duration_unit: 'seconds' | 'minutes' | 'hours' | 'days';
  profit_rate: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
  loss_type: 'full' | 'rate';
}

interface TimeContractAsset {
  id: string;
  coin_symbol: string;
  coin_name: string;
  category: string;
  min_stake_amount: number;
  is_active: boolean;
}

export const AdminTimeContractManager = () => {
  const [configs, setConfigs] = useState<TimeContractConfig[]>([]);
  const [assets, setAssets] = useState<TimeContractAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TimeContractConfig | null>(null);
  const [editingAsset, setEditingAsset] = useState<TimeContractAsset | null>(null);

    // Config form state
    const [configForm, setConfigForm] = useState({
      duration_value: 1,
      duration_unit: 'minutes' as 'seconds' | 'minutes' | 'hours' | 'days',
      profit_rate: 0,
      min_amount: 10,
      max_amount: 10000,
      is_active: true,
      loss_type: 'rate' as 'full' | 'rate'
    });

  // Asset form state
  const [assetForm, setAssetForm] = useState({
    coin_symbol: "",
    coin_name: "",
    category: "crypto",
    min_stake_amount: 10,
    is_active: true
  });

  useEffect(() => {
    fetchConfigs();
    fetchAssets();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await adminApi.select<TimeContractConfig[]>('time_contract_configs', {
        order: { column: 'duration_minutes', ascending: true }
      });

      if (error) {
        toast.error("加载时间合约配置失败: " + error);
        return;
      }
      
      const typedData = (data || []).map(config => ({
        ...config,
        duration_unit: (config.duration_unit || 'minutes') as 'seconds' | 'minutes' | 'hours' | 'days'
      }));
      setConfigs(typedData);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await adminApi.select<TimeContractAsset[]>('time_contract_assets', {
        order: { column: 'coin_symbol', ascending: true }
      });

      if (error) {
        toast.error("加载资产配置失败: " + error);
        return;
      }
      setAssets(data || []);
    } catch (err) {
      console.error('Fetch assets error:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (configForm.duration_value <= 0) {
      toast.error("时长必须大于0");
      return;
    }
    if (configForm.profit_rate <= 0 || configForm.profit_rate > 100) {
      toast.error("收益率必须在0-100之间");
      return;
    }
    if (configForm.min_amount <= 0) {
      toast.error("最小金额必须大于0");
      return;
    }
    if (configForm.max_amount <= configForm.min_amount) {
      toast.error("最大金额必须大于最小金额");
      return;
    }

    const durationInMinutes = convertToMinutes(configForm.duration_value, configForm.duration_unit);
    
        const dataToSave = {
          duration_value: configForm.duration_value,
          duration_unit: configForm.duration_unit,
          duration_minutes: durationInMinutes,
          profit_rate: configForm.profit_rate / 100,
          min_amount: configForm.min_amount,
          max_amount: configForm.max_amount,
          is_active: configForm.is_active,
          loss_type: configForm.loss_type
        };

    if (editingConfig) {
      const { error } = await adminApi.update('time_contract_configs', dataToSave, { id: editingConfig.id });

      if (error) {
        toast.error("更新失败: " + error);
        return;
      }
      toast.success("更新成功");
    } else {
      const { error } = await adminApi.insert('time_contract_configs', dataToSave);

      if (error) {
        toast.error("添加失败: " + error);
        return;
      }
      toast.success("添加成功");
    }

    setIsConfigDialogOpen(false);
    setEditingConfig(null);
    resetConfigForm();
    fetchConfigs();
  };

  const convertToMinutes = (value: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return value / 60;
      case 'minutes': return value;
      case 'hours': return value * 60;
      case 'days': return value * 1440;
      default: return value;
    }
  };

  const getDurationDisplay = (value: number, unit: string): string => {
    const unitLabels: Record<string, string> = {
      seconds: '秒',
      minutes: '分钟',
      hours: '小时',
      days: '天'
    };
    return `${value} ${unitLabels[unit] || unit}`;
  };

  const handleSaveAsset = async () => {
    if (!assetForm.coin_symbol.trim()) {
      toast.error("币种代码不能为空");
      return;
    }
    if (!assetForm.coin_name.trim()) {
      toast.error("币种名称不能为空");
      return;
    }
    if (assetForm.min_stake_amount <= 0) {
      toast.error("最小质押数量必须大于0");
      return;
    }

    const dataToSave = {
      coin_symbol: assetForm.coin_symbol.toUpperCase(),
      coin_name: assetForm.coin_name,
      category: assetForm.category,
      min_stake_amount: assetForm.min_stake_amount,
      is_active: assetForm.is_active
    };

    if (editingAsset) {
      const { error } = await adminApi.update('time_contract_assets', dataToSave, { id: editingAsset.id });

      if (error) {
        toast.error("更新失败: " + error);
        return;
      }
      toast.success("更新成功");
    } else {
      const { error } = await adminApi.insert('time_contract_assets', dataToSave);

      if (error) {
        toast.error("添加失败: " + error);
        return;
      }
      toast.success("添加成功");
    }

    setIsAssetDialogOpen(false);
    setEditingAsset(null);
    resetAssetForm();
    fetchAssets();
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("确定要删除此配置吗？")) return;

    const { error } = await adminApi.delete('time_contract_configs', { id });

    if (error) {
      toast.error("删除失败: " + error);
      return;
    }
    toast.success("删除成功");
    fetchConfigs();
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("确定要删除此资产吗？")) return;

    const { error } = await adminApi.delete('time_contract_assets', { id });

    if (error) {
      toast.error("删除失败: " + error);
      return;
    }
    toast.success("删除成功");
    fetchAssets();
  };

    const resetConfigForm = () => {
      setConfigForm({
        duration_value: 1,
        duration_unit: 'minutes',
        profit_rate: 80,
        min_amount: 10,
        max_amount: 10000,
        is_active: true,
        loss_type: 'rate'
      });
    };

  const resetAssetForm = () => {
    setAssetForm({
      coin_symbol: "",
      coin_name: "",
      category: "crypto",
      min_stake_amount: 10,
      is_active: true
    });
  };

    const openEditConfig = (config: TimeContractConfig) => {
      setEditingConfig(config);
      setConfigForm({
        duration_value: config.duration_value || 1,
        duration_unit: config.duration_unit || 'minutes',
        profit_rate: Number(config.profit_rate) * 100,
        min_amount: Number(config.min_amount),
        max_amount: Number(config.max_amount),
        is_active: config.is_active,
        loss_type: config.loss_type || 'rate'
      });
      setIsConfigDialogOpen(true);
    };

  const openEditAsset = (asset: TimeContractAsset) => {
    setEditingAsset(asset);
    setAssetForm({
      coin_symbol: asset.coin_symbol,
      coin_name: asset.coin_name,
      category: asset.category || 'crypto',
      min_stake_amount: Number(asset.min_stake_amount),
      is_active: asset.is_active
    });
    setIsAssetDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 收益配置 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            <CardTitle>收益比例配置</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchConfigs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetConfigForm(); setEditingConfig(null); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加配置
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingConfig ? "编辑" : "添加"}收益配置</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>时长</Label>
                      <Input
                        type="number"
                        min="1"
                        value={configForm.duration_value}
                        onChange={(e) => setConfigForm({...configForm, duration_value: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div>
                      <Label>单位</Label>
                      <Select
                        value={configForm.duration_unit}
                        onValueChange={(value: 'seconds' | 'minutes' | 'hours' | 'days') => 
                          setConfigForm({...configForm, duration_unit: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">秒</SelectItem>
                          <SelectItem value="minutes">分钟</SelectItem>
                          <SelectItem value="hours">小时</SelectItem>
                          <SelectItem value="days">天</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                                    <div>
                                      <Label>收益率 (%)</Label>
                                      <Input
                                        type="number"
                                        step="1"
                                        min="1"
                                        max="100"
                                        value={configForm.profit_rate}
                                        onChange={(e) => setConfigForm({...configForm, profit_rate: parseFloat(e.target.value) || 0})}
                                      />
                                    </div>
                                    <div>
                                      <Label>亏损类型</Label>
                                      <Select
                                        value={configForm.loss_type}
                                        onValueChange={(value: 'full' | 'rate') => setConfigForm({...configForm, loss_type: value})}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="full">全部金额</SelectItem>
                                          <SelectItem value="rate">与收益率相同比例</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label>最小金额 (USDT)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={configForm.min_amount}
                      onChange={(e) => setConfigForm({...configForm, min_amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>最大金额 (USDT)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={configForm.max_amount}
                      onChange={(e) => setConfigForm({...configForm, max_amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={configForm.is_active}
                      onCheckedChange={(checked) => setConfigForm({...configForm, is_active: checked})}
                    />
                    <Label>启用</Label>
                  </div>
                  <Button onClick={handleSaveConfig} className="w-full">保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无配置，请点击"添加配置"创建
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{getDurationDisplay(config.duration_value, config.duration_unit)}</div>
                      <div className="text-sm text-muted-foreground">
                        收益率: {(Number(config.profit_rate) * 100).toFixed(0)}% | 
                        限额: {formatUSDT(config.min_amount, 0)} - {formatUSDT(config.max_amount, 0)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${config.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {config.is_active ? '启用' : '禁用'}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => openEditConfig(config)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteConfig(config.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 资产配置 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>可参与币种配置</CardTitle>
          <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetAssetForm(); setEditingAsset(null); }}>
                <Plus className="h-4 w-4 mr-1" />
                添加币种
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAsset ? "编辑" : "添加"}币种</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>币种代码</Label>
                  <Input
                    value={assetForm.coin_symbol}
                    onChange={(e) => setAssetForm({...assetForm, coin_symbol: e.target.value.toUpperCase()})}
                    placeholder="BTC"
                  />
                </div>
                <div>
                  <Label>币种名称</Label>
                  <Input
                    value={assetForm.coin_name}
                    onChange={(e) => setAssetForm({...assetForm, coin_name: e.target.value})}
                    placeholder="Bitcoin"
                  />
                </div>
                <div>
                  <Label>分类</Label>
                  <Select
                    value={assetForm.category}
                    onValueChange={(value) => setAssetForm({...assetForm, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">加密货币</SelectItem>
                      <SelectItem value="forex">外汇</SelectItem>
                      <SelectItem value="stock">股票</SelectItem>
                      <SelectItem value="commodity">商品</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>最小质押数量 (USDT)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={assetForm.min_stake_amount}
                    onChange={(e) => setAssetForm({...assetForm, min_stake_amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={assetForm.is_active}
                    onCheckedChange={(checked) => setAssetForm({...assetForm, is_active: checked})}
                  />
                  <Label>启用</Label>
                </div>
                <Button onClick={handleSaveAsset} className="w-full">保存</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无币种配置，请点击"添加币种"创建
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{asset.coin_symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {asset.coin_name} | 最小: {formatUSDT(asset.min_stake_amount)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${asset.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {asset.is_active ? '启用' : '禁用'}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => openEditAsset(asset)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteAsset(asset.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
