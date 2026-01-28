import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Minus } from "lucide-react";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";

interface UserBalance {
  id: string;
  user_id: string;
  currency: string;
  available: number;
  frozen: number;
  total: number;
  usd_value: number;
  account_type: string;
  updated_at: string;
  username?: string;
  email?: string;
}

export const AdminBalanceManager = () => {
  const { admin } = useAdminAuth();
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBalance, setSelectedBalance] = useState<UserBalance | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustRemark, setAdjustRemark] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    const { data, error } = await adminApi.getBalancesWithProfiles();
    if (error) {
      toast.error("加载余额数据失败");
      console.error(error);
      return;
    }
    setBalances((data as UserBalance[]) || []);
  };

  const handleAdjustBalance = async (type: 'add' | 'subtract') => {
    if (!selectedBalance || !adjustAmount) {
      toast.error("请输入调整金额");
      return;
    }

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("请输入有效的金额");
      return;
    }

    try {
      setIsAdjusting(true);

      const adjustValue = type === 'add' ? amount : -amount;
      const newAvailable = Number(selectedBalance.available) + adjustValue;
      const newTotal = newAvailable + Number(selectedBalance.frozen);

      if (newAvailable < 0) {
        toast.error("余额不足，无法扣减");
        return;
      }

      // Note: 'total' is a generated column, only update 'available' and 'usd_value'
      const { error: updateError } = await adminApi.update('user_balances', {
        available: newAvailable,
        usd_value: newTotal, // For USDT, usd_value = available + frozen
        updated_at: new Date().toISOString()
      }, { id: selectedBalance.id });

      if (updateError) throw new Error(updateError);

      if (type === 'add') {
        await adminApi.insert('deposit_records', {
          user_id: selectedBalance.user_id,
          coin_symbol: selectedBalance.currency,
          amount: amount,
          network: 'Admin',
          to_address: 'Manual Adjustment',
          from_address: 'Admin',
          tx_hash: `ADMIN-${Date.now()}`,
          status: 'completed',
          confirmations: 999
        });
      }

      // 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.BALANCE_ADJUST,
          resourceType: AdminResourceTypes.USER_BALANCE,
          resourceId: selectedBalance.id,
          details: {
            user_id: selectedBalance.user_id,
            username: selectedBalance.username,
            currency: selectedBalance.currency,
            account_type: selectedBalance.account_type,
            adjustment_type: type,
            amount: adjustValue,
            old_available: selectedBalance.available,
            new_available: newAvailable,
            remark: adjustRemark
          }
        });
      }

      toast.success(`余额${type === 'add' ? '增加' : '扣减'}成功`, {
        description: `${type === 'add' ? '+' : ''}${adjustValue} ${selectedBalance.currency}`
      });

      setSelectedBalance(null);
      setAdjustAmount("");
      setAdjustRemark("");
      
      fetchBalances();
    } catch (error) {
      console.error('Adjust balance error:', error);
      toast.error("余额调整失败");
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredBalances = balances.filter(balance => {
    const search = searchTerm.toLowerCase();
    return (
      balance.currency.toLowerCase().includes(search) ||
      balance.username?.toLowerCase().includes(search) ||
      balance.email?.toLowerCase().includes(search)
    );
  });

  const totalUSD = balances.reduce((sum, b) => sum + Number(b.usd_value || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>财务总览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">总用户资产</div>
              <div className="text-2xl font-bold">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">持仓用户数</div>
              <div className="text-2xl font-bold">{new Set(balances.map(b => b.user_id)).size}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">币种数量</div>
              <div className="text-2xl font-bold">{new Set(balances.map(b => b.currency)).size}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户余额明细</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名、邮箱或币种..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredBalances.map((balance) => (
              <div key={balance.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{balance.username || 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">{balance.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    账户类型: {balance.account_type}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right space-y-1">
                    <div className="font-medium">{balance.currency}</div>
                    <div className="text-sm">
                      可用: <span className="text-green-600">{Number(balance.available).toFixed(4)}</span>
                    </div>
                    <div className="text-sm">
                      冻结: <span className="text-orange-600">{Number(balance.frozen).toFixed(4)}</span>
                    </div>
                    <div className="text-sm font-medium">
                      总计: {Number(balance.total || 0).toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ≈ ${Number(balance.usd_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBalance(balance)}
                      >
                        调整余额
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>调整用户余额</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">用户：</span>
                            <span className="font-medium ml-2">{balance.username}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">币种：</span>
                            <span className="font-medium ml-2">{balance.currency}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">当前可用：</span>
                            <span className="font-medium ml-2">{Number(balance.available).toFixed(4)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>调整金额</Label>
                          <Input
                            type="number"
                            placeholder="输入金额"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>备注说明</Label>
                          <Input
                            placeholder="调整原因（可选）"
                            value={adjustRemark}
                            onChange={(e) => setAdjustRemark(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 gap-2"
                            onClick={() => handleAdjustBalance('add')}
                            disabled={isAdjusting}
                          >
                            <Plus className="h-4 w-4" />
                            增加余额
                          </Button>
                          <Button
                            className="flex-1 gap-2"
                            variant="destructive"
                            onClick={() => handleAdjustBalance('subtract')}
                            disabled={isAdjusting}
                          >
                            <Minus className="h-4 w-4" />
                            扣减余额
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
