import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";
import { sendWithdrawResultMessage } from "@/services/systemMessageService";

interface WithdrawRecord {
  id: string;
  user_id: string;
  coin_symbol: string;
  amount: number;
  fee: number;
  to_address: string;
  network: string;
  status: string;
  created_at: string;
  username?: string;
  email?: string;
  user_number?: number;
}

export const AdminWithdrawManager = () => {
  const { admin } = useAdminAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWithdrawals = async () => {
    const { data, error } = await adminApi.getWithdrawalsWithProfiles();
    if (error) {
      toast.error("加载提现数据失败");
      console.error('Fetch withdrawals error:', error);
      return;
    }
    setWithdrawals((data as WithdrawRecord[]) || []);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleApprove = async (id: string) => {
    setLoading(true);
    
    const withdrawal = withdrawals.find(w => w.id === id);
    if (!withdrawal) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. 更新提现记录状态为已完成
      const { error: updateError } = await adminApi.update('withdraw_records',
        { status: 'completed' },
        { id }
      );

      if (updateError) throw new Error(updateError);

      // 2. 扣除用户冻结余额
      const totalAmount = withdrawal.amount + withdrawal.fee;
      
      const { data: balances } = await adminApi.select<Array<{id: string; frozen: number; available: number}>>('user_balances', {
        filters: {
          user_id: withdrawal.user_id,
          currency: withdrawal.coin_symbol,
          account_type: 'spot'
        }
      });

      const balance = balances?.[0];

      if (!balance) {
        throw new Error('用户余额记录不存在');
      }

      if (Number(balance.frozen) < totalAmount) {
        throw new Error('冻结余额不足');
      }

      const newFrozen = Number(balance.frozen) - totalAmount;

      const { error: deductError } = await adminApi.update('user_balances', {
        frozen: newFrozen
      }, { id: balance.id });

      if (deductError) throw new Error(deductError);

      // 3. 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.WITHDRAW_APPROVE,
          resourceType: AdminResourceTypes.WITHDRAW_RECORD,
          resourceId: id,
          details: {
            user_id: withdrawal.user_id,
            username: withdrawal.username,
            coin_symbol: withdrawal.coin_symbol,
            amount: withdrawal.amount,
            fee: withdrawal.fee,
            total_deducted: totalAmount,
            to_address: withdrawal.to_address,
            network: withdrawal.network
          }
        });
      }
      
            // 4. 发送系统消息通知用户
            await sendWithdrawResultMessage(
              withdrawal.user_id,
              true,
              withdrawal.amount,
              withdrawal.coin_symbol
            );
      
            toast.success("已批准提现并扣除余额");
            fetchWithdrawals();
    } catch (error) {
      console.error('Approve withdraw error:', error);
      toast.error(`审核失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    setLoading(false);
  };

  const handleReject = async (id: string) => {
    setLoading(true);
    
    const withdrawal = withdrawals.find(w => w.id === id);
    if (!withdrawal) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. 更新提现记录状态为已拒绝
      const { error: updateError } = await adminApi.update('withdraw_records', {
        status: 'rejected',
        reject_reason: '管理员拒绝'
      }, { id });

      if (updateError) throw new Error(updateError);

      // 2. 解冻用户余额
      const totalAmount = withdrawal.amount + withdrawal.fee;
      
      const { data: balances } = await adminApi.select<Array<{id: string; frozen: number; available: number}>>('user_balances', {
        filters: {
          user_id: withdrawal.user_id,
          currency: withdrawal.coin_symbol,
          account_type: 'spot'
        }
      });

      const balance = balances?.[0];

      if (!balance) {
        throw new Error('用户余额记录不存在');
      }

      const newFrozen = Number(balance.frozen) - totalAmount;
      const newAvailable = Number(balance.available) + totalAmount;

      const { error: refundError } = await adminApi.update('user_balances', {
        frozen: newFrozen,
        available: newAvailable
      }, { id: balance.id });

      if (refundError) throw new Error(refundError);

      // 3. 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.WITHDRAW_REJECT,
          resourceType: AdminResourceTypes.WITHDRAW_RECORD,
          resourceId: id,
          details: {
            user_id: withdrawal.user_id,
            username: withdrawal.username,
            coin_symbol: withdrawal.coin_symbol,
            amount: withdrawal.amount,
            fee: withdrawal.fee,
            total_refunded: totalAmount,
            to_address: withdrawal.to_address,
            network: withdrawal.network,
            reject_reason: '管理员拒绝'
          }
        });
      }
      
            // 4. 发送系统消息通知用户
            await sendWithdrawResultMessage(
              withdrawal.user_id,
              false,
              withdrawal.amount,
              withdrawal.coin_symbol,
              '管理员拒绝'
            );
      
            toast.success("已拒绝提现并退还余额");
            fetchWithdrawals();
    } catch (error) {
      console.error('Reject withdraw error:', error);
      toast.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "待审核" },
      completed: { variant: "default", label: "已完成" },
      rejected: { variant: "destructive", label: "已拒绝" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>提现审核</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">
                  {withdrawal.coin_symbol} - {Number(withdrawal.amount).toFixed(8)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {withdrawal.username} ({withdrawal.email})
                  {withdrawal.user_number && (
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">ID: {withdrawal.user_number}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  网络: {withdrawal.network} | 手续费: {withdrawal.fee}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  地址: {withdrawal.to_address}
                </div>
                <div className="text-xs text-muted-foreground">
                  时间: {new Date(withdrawal.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(withdrawal.status)}
                {withdrawal.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(withdrawal.id)}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      批准
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(withdrawal.id)}
                      disabled={loading}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      拒绝
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
