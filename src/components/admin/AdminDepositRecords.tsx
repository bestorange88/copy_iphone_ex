import { useEffect, useState } from "react";
import { adminApi } from "@/hooks/useAdminData";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, ExternalLink, Check, X } from "lucide-react";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";
import { sendDepositResultMessage } from "@/services/systemMessageService";

interface DepositRecord {
  id: string;
  user_id: string;
  coin_symbol: string;
  amount: number;
  network: string;
  to_address: string;
  from_address: string;
  tx_hash: string;
  status: string;
  confirmations: number;
  created_at: string;
  screenshot_url?: string;
  submit_method?: string;
  username?: string;
  email?: string;
  user_number?: number;
}

export const AdminDepositRecords = () => {
  const { admin } = useAdminAuth();
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    const { data, error } = await adminApi.getDepositsWithProfiles();
    if (error) {
      toast.error("加载充值记录失败");
      console.error(error);
      return;
    }
    setDeposits((data as DepositRecord[]) || []);
  };

  const filteredDeposits = deposits.filter(deposit => {
    const search = searchTerm.toLowerCase();
    return (
      deposit.coin_symbol.toLowerCase().includes(search) ||
      deposit.tx_hash?.toLowerCase().includes(search) ||
      deposit.username?.toLowerCase().includes(search)
    );
  });

  const handleApproveDeposit = async (deposit: DepositRecord) => {
    if (processingId) return;
    
    setProcessingId(deposit.id);
    try {
      // Update deposit record status
      const { error: updateError } = await adminApi.update('deposit_records', 
        { status: 'completed' }, 
        { id: deposit.id }
      );

      if (updateError) throw new Error(updateError);

      // Check if user balance exists
      const { data: existingBalances } = await adminApi.select<Array<{id: string; available: number}>>('user_balances', {
        filters: {
          user_id: deposit.user_id,
          currency: deposit.coin_symbol,
          account_type: 'spot'
        }
      });

      const existingBalance = existingBalances?.[0];

      if (existingBalance) {
        const { error: balanceError } = await adminApi.update('user_balances', {
          available: Number(existingBalance.available) + Number(deposit.amount)
        }, { id: existingBalance.id });

        if (balanceError) throw new Error(balanceError);
      } else {
        const { error: balanceError } = await adminApi.insert('user_balances', {
          user_id: deposit.user_id,
          currency: deposit.coin_symbol,
          available: deposit.amount,
          frozen: 0,
          account_type: 'spot'
        });

        if (balanceError) throw new Error(balanceError);
      }

      // 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.DEPOSIT_CONFIRM,
          resourceType: AdminResourceTypes.DEPOSIT_RECORD,
          resourceId: deposit.id,
          details: {
            amount: deposit.amount,
            coin: deposit.coin_symbol,
            tx_hash: deposit.tx_hash,
            user_id: deposit.user_id,
            username: deposit.username
          }
        });
      }

            // 发送系统消息通知用户
            await sendDepositResultMessage(
              deposit.user_id,
              true,
              deposit.amount,
              deposit.coin_symbol
            );
      
            toast.success("充值审核通过，余额已增加");
            fetchDeposits();
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast.error("审核失败，请重试");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDeposit = async (deposit: DepositRecord) => {
    if (processingId) return;
    
    setProcessingId(deposit.id);
    try {
      const { error: updateError } = await adminApi.update('deposit_records',
        { status: 'failed' },
        { id: deposit.id }
      );

      if (updateError) throw new Error(updateError);

      // 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: 'deposit_reject',
          resourceType: AdminResourceTypes.DEPOSIT_RECORD,
          resourceId: deposit.id,
          details: {
            amount: deposit.amount,
            coin: deposit.coin_symbol,
            tx_hash: deposit.tx_hash,
            user_id: deposit.user_id,
            username: deposit.username
          }
        });
      }

            // 发送系统消息通知用户
            await sendDepositResultMessage(
              deposit.user_id,
              false,
              deposit.amount,
              deposit.coin_symbol,
              '管理员拒绝'
            );
      
            toast.success("充值已拒绝");
            fetchDeposits();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast.error("操作失败，请重试");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "确认中" },
      completed: { variant: "default", label: "已完成" },
      failed: { variant: "destructive", label: "失败" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  
  const deriveStorageLocation = (url: string) => {
    try {
      const u = new URL(url);
      const afterObject = (u.pathname.split('/storage/v1/object/')[1] || '');
      const stripped = afterObject.startsWith('public/') ? afterObject.replace(/^public\//, '') : afterObject;
      const [bucket, ...rest] = stripped.split('/');
      return { bucket, filePath: rest.join('/') };
    } catch {
      const stripped = url.startsWith('public/') ? url.replace(/^public\//, '') : url;
      const [bucket, ...rest] = stripped.split('/');
      return { bucket, filePath: rest.join('/') };
    }
  };

  const handlePreviewScreenshot = async (url?: string) => {
    if (!url) return;
    setPreviewLoading(true);
    try {
      // Check if it's already a full URL or a storage path
      let bucket: string;
      let filePath: string;
      
      if (url.startsWith('http')) {
        // Try to derive bucket and path from URL
        const derived = deriveStorageLocation(url);
        bucket = derived.bucket;
        filePath = derived.filePath;
      } else {
        // Direct path - assume deposit-screenshots bucket
        bucket = 'deposit-screenshots';
        filePath = url;
      }
      
      // Use adminApi to get signed URL (bypasses RLS)
      const { data, error } = await adminApi.getSignedUrl(bucket, filePath);
      if (error) throw new Error(error);
      if (!data?.signedUrl) throw new Error('No signed URL returned');
      
      setPreviewImageUrl(data.signedUrl);
      setPreviewOpen(true);
    } catch (e) {
      console.error('Failed to load screenshot', e);
      toast.error('无法加载转账截图');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>充值统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">总充值笔数</div>
              <div className="text-2xl font-bold">{deposits.length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">已完成</div>
              <div className="text-2xl font-bold text-green-600">
                {deposits.filter(d => d.status === 'completed').length}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">确认中</div>
              <div className="text-2xl font-bold text-orange-600">
                {deposits.filter(d => d.status === 'pending').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>充值记录</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索币种、交易哈希或用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredDeposits.map((deposit) => (
              <div key={deposit.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {deposit.coin_symbol} - {Number(deposit.amount).toFixed(8)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {deposit.username} ({deposit.email})
                      {deposit.user_number && (
                        <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">ID: {deposit.user_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(deposit.status)}
                    <Badge variant="outline">{deposit.confirmations} 确认</Badge>
                    {deposit.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveDeposit(deposit)}
                          disabled={processingId === deposit.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          批准
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectDeposit(deposit)}
                          disabled={processingId === deposit.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">网络:</span>
                    <span>{deposit.network}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">充值地址:</span>
                    <span className="font-mono text-xs">{deposit.to_address}</span>
                  </div>
                   {deposit.tx_hash && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">交易哈希:</span>
                      <span className="font-mono text-xs">{deposit.tx_hash.substring(0, 20)}...</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  )}
                  {deposit.screenshot_url && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">转账截图:</span>
                      <Button 
                        size="sm" 
                        variant="link" 
                        className="px-0 flex items-center gap-1"
                        onClick={() => handlePreviewScreenshot(deposit.screenshot_url)}
                      >
                        查看截图 <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {deposit.submit_method && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">提交方式:</span>
                      <Badge variant="outline">
                        {deposit.submit_method === 'manual' ? '手动提交' : '哈希验证'}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">时间:</span>
                    <span>{new Date(deposit.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>转账截图</DialogTitle>
                <DialogDescription>仅管理员可见</DialogDescription>
              </DialogHeader>
              {previewLoading ? (
                <div className="py-12 text-center text-muted-foreground">加载中...</div>
              ) : previewImageUrl ? (
                <img src={previewImageUrl} alt="充值转账截图" className="w-full rounded-md" />
              ) : (
                <div className="text-muted-foreground">无可用截图</div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};
