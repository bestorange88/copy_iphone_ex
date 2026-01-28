import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/hooks/useAdminData";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DollarSign, Plus, Minus, Lock, Unlock, Edit, UserPlus, RefreshCw, Search, Trash2, Crown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
  user_number?: number;
  user_roles?: { role: string }[];
  is_vip?: boolean;
  vip_level?: number;
}

interface UserBalance {
  id: string;
  user_id: string;
  currency: string;
  available: number;
  frozen: number;
  account_type: string;
}

export const AdminUsersManager = () => {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USDT");
  const [accountType, setAccountType] = useState("spot");
  const [loading, setLoading] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const currencies = ["USDT", "BTC", "ETH", "BNB", "SOL"];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await adminApi.getUsers();
      
      if (error) {
        console.error('获取用户列表失败:', error);
        toast.error("加载用户数据失败");
        return;
      }
      
      setUsers(data || []);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      toast.error("加载用户数据失败");
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchUsers();
      return;
    }
    
    setSearchLoading(true);
    try {
      const { data, error } = await adminApi.searchUsers(searchTerm.trim());
      
      if (error) {
        console.error('搜索用户失败:', error);
        toast.error("搜索失败");
        return;
      }
      
      setUsers(data || []);
      if ((data || []).length === 0) {
        toast.info("未找到匹配的用户");
      }
    } catch (err) {
      console.error('搜索用户失败:', err);
      toast.error("搜索失败");
    } finally {
      setSearchLoading(false);
    }
  };

    const fetchUserBalances = async (userId: string) => {
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('account_type', 'spot');

      if (error) {
        console.error('Failed to fetch user balances:', error);
        setUserBalances([]);
      } else {
        setUserBalances(data || []);
      }
    };

  const openBalanceDialog = async (user: UserProfile) => {
    setSelectedUser(user);
    await fetchUserBalances(user.id);
    setBalanceDialogOpen(true);
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setEditEmail(user.email);
    setEditPassword("");
    setEditDialogOpen(true);
  };

  const handleFreezeUser = async (user: UserProfile, freeze: boolean) => {
    try {
      const { data: balances } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id);

      if (!balances || balances.length === 0) {
        toast.error("该用户没有余额记录");
        return;
      }

      for (const balance of balances) {
        if (freeze) {
          // 冻结：将可用余额转为冻结
          await supabase
            .from('user_balances')
            .update({ 
              frozen: balance.available + balance.frozen,
              available: 0
            })
            .eq('id', balance.id);
        } else {
          // 解冻：将冻结余额转为可用
          await supabase
            .from('user_balances')
            .update({ 
              available: balance.available + balance.frozen,
              frozen: 0
            })
            .eq('id', balance.id);
        }
      }

      // 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: freeze ? AdminAuditActions.USER_SUSPEND : AdminAuditActions.USER_ACTIVATE,
          resourceType: AdminResourceTypes.USER,
          resourceId: user.id,
          details: { username: user.username, email: user.email }
        });
      }

      toast.success(freeze ? "用户已冻结" : "用户已解冻");
      fetchUsers();
    } catch (error) {
      console.error('冻结/解冻用户失败:', error);
      toast.error("操作失败");
    }
  };

    const handleEditUser = async () => {
      if (!selectedUser) return;

      try {
        // 更新邮箱
        if (editEmail !== selectedUser.email) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ email: editEmail })
            .eq('id', selectedUser.id);

          if (profileError) throw profileError;
        }

        // 更新密码（如果填写了）- 使用 Edge Function API
        if (editPassword) {
          const { error: passwordError } = await adminApi.updateUserPassword(
            selectedUser.id,
            editPassword
          );

          if (passwordError) throw new Error(passwordError);
        }

        // 记录管理员审计日志
        if (admin) {
          await createAdminAuditLog({
            adminId: admin.id,
            adminUsername: admin.username,
            action: AdminAuditActions.USER_UPDATE,
            resourceType: AdminResourceTypes.USER,
            resourceId: selectedUser.id,
            details: { 
              username: selectedUser.username, 
              email: editEmail,
              password_changed: !!editPassword 
            }
          });
        }

        toast.success("用户信息更新成功");
        setEditDialogOpen(false);
        setEditEmail("");
        setEditPassword("");
        fetchUsers();
      } catch (error) {
        console.error('更新用户信息失败:', error);
        toast.error("更新失败");
      }
    };

    const handleDeleteUser = async () => {
      if (!userToDelete) return;

      setDeleteLoading(true);
      try {
        const { error } = await adminApi.deleteUser(userToDelete.id);

        if (error) throw new Error(error);

        // 记录管理员审计日志
        if (admin) {
          await createAdminAuditLog({
            adminId: admin.id,
            adminUsername: admin.username,
            action: AdminAuditActions.USER_DELETE,
            resourceType: AdminResourceTypes.USER,
            resourceId: userToDelete.id,
            details: { 
              username: userToDelete.username, 
              email: userToDelete.email
            }
          });
        }

        toast.success("用户已删除");
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchUsers();
      } catch (error) {
        console.error('删除用户失败:', error);
        toast.error("删除失败");
      } finally {
        setDeleteLoading(false);
      }
    };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      toast.error("请输入有效的金额");
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(adjustmentAmount);
      const finalAmount = adjustmentType === "subtract" ? -amount : amount;

      // Check if balance record exists
      const existingBalance = userBalances.find(
        b => b.currency === selectedCurrency && b.account_type === accountType
      );

      if (existingBalance) {
        // Update existing balance
        const newAvailable = existingBalance.available + finalAmount;
        
        if (newAvailable < 0) {
          toast.error("余额不足，无法减少");
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('user_balances')
          .update({ 
            available: newAvailable,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBalance.id);

        if (error) throw error;
      } else {
        // Create new balance record
        if (adjustmentType === "subtract") {
          toast.error("该币种余额不存在，无法减少");
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('user_balances')
          .insert([{
            user_id: selectedUser.id,
            currency: selectedCurrency,
            account_type: accountType,
            available: finalAmount,
            frozen: 0
          }]);

        if (error) throw error;
      }

      toast.success(`成功${adjustmentType === "add" ? "增加" : "减少"}余额`);
      await fetchUserBalances(selectedUser.id);
      setAdjustmentAmount("");
    } catch (error: any) {
      toast.error("调整余额失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newEmail || !newPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("密码至少需要6个字符");
      return;
    }

    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          username: newUsername,
          email: newEmail,
          password: newPassword
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 记录管理员审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.USER_CREATE,
          resourceType: AdminResourceTypes.USER,
          resourceId: data?.user?.id,
          details: { username: newUsername, email: newEmail }
        });
      }

      toast.success("用户创建成功");
      setCreateDialogOpen(false);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      fetchUsers();
    } catch (error: any) {
      console.error('创建用户失败:', error);
      toast.error(error.message || "创建用户失败");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBackfillProfiles = async () => {
    setBackfillLoading(true);
    try {
      const { data, error } = await adminApi.backfillProfiles();
      
      if (error) {
        toast.error(`回填失败: ${error}`);
        return;
      }

      if (data?.backfilled === 0) {
        toast.info(`所有用户已同步，共 ${data.total} 个用户`);
      } else {
        toast.success(`成功回填 ${data?.backfilled} 个用户档案，共 ${data?.total} 个用户`);
      }
      
      // Refresh user list
      await fetchUsers();
    } catch (error) {
      console.error('回填用户档案失败:', error);
      toast.error("回填失败");
    } finally {
      setBackfillLoading(false);
    }
  };

    const handleToggleVip = async (user: UserProfile, isVip: boolean) => {
      try {
        // 使用 adminApi 绕过 RLS 策略
        const { error } = await adminApi.update('profiles', 
          { is_vip: isVip, vip_level: isVip ? (user.vip_level || 1) : 0 },
          { id: user.id }
        );

        if (error) throw new Error(error);

        // 记录管理员审计日志
        if (admin) {
          await createAdminAuditLog({
            adminId: admin.id,
            adminUsername: admin.username,
            action: AdminAuditActions.USER_UPDATE,
            resourceType: AdminResourceTypes.USER,
            resourceId: user.id,
            details: { 
              username: user.username, 
              email: user.email,
              is_vip: isVip,
              vip_level: isVip ? (user.vip_level || 1) : 0
            }
          });
        }

        toast.success(isVip ? "已设为VIP用户" : "已取消VIP身份");
      
        // 更新本地状态
        setUsers(users.map(u => 
          u.id === user.id ? { ...u, is_vip: isVip, vip_level: isVip ? (u.vip_level || 1) : 0 } : u
        ));
      } catch (error) {
        console.error('切换VIP状态失败:', error);
        toast.error("操作失败");
      }
    };

    const handleChangeVipLevel = async (user: UserProfile, level: number) => {
      try {
        // 使用 adminApi 绕过 RLS 策略
        const { error } = await adminApi.update('profiles', 
          { vip_level: level },
          { id: user.id }
        );

        if (error) throw new Error(error);

        // 记录管理员审计日志
        if (admin) {
          await createAdminAuditLog({
            adminId: admin.id,
            adminUsername: admin.username,
            action: AdminAuditActions.USER_UPDATE,
            resourceType: AdminResourceTypes.USER,
            resourceId: user.id,
            details: { 
              username: user.username, 
              email: user.email,
              vip_level: level
            }
          });
        }

        toast.success(`已设为 VIP${level}`);
      
        // 更新本地状态
        setUsers(users.map(u => 
          u.id === user.id ? { ...u, vip_level: level } : u
        ));
      } catch (error) {
        console.error('修改VIP等级失败:', error);
        toast.error("操作失败");
      }
    };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>用户管理</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleBackfillProfiles}
            disabled={backfillLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${backfillLoading ? 'animate-spin' : ''}`} />
            {backfillLoading ? '同步中...' : '同步用户'}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            新增用户
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="搜索会员ID、用户名或邮箱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
          <Button 
            variant="outline" 
            onClick={handleSearch}
            disabled={searchLoading}
          >
            <Search className={`h-4 w-4 mr-2 ${searchLoading ? 'animate-spin' : ''}`} />
            搜索
          </Button>
          {searchTerm && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm("");
                fetchUsers();
              }}
            >
              清除
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>会员ID</TableHead>
                            <TableHead>用户名</TableHead>
                            <TableHead>邮箱</TableHead>
                            <TableHead>VIP</TableHead>
                            <TableHead>角色</TableHead>
                            <TableHead>注册时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-primary">
                    {user.user_number || '-'}
                  </TableCell>
                  <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                                                        <TableCell>
                                                                          <div className="flex items-center gap-2">
                                                                            <Switch
                                                                              checked={user.is_vip || false}
                                                                              onCheckedChange={(checked) => handleToggleVip(user, checked)}
                                                                            />
                                                                            {user.is_vip && (
                                                                              <>
                                                                                <Crown className="h-4 w-4 text-yellow-500" />
                                                                                <Select
                                                                                  value={String(user.vip_level || 1)}
                                                                                  onValueChange={(value) => handleChangeVipLevel(user, parseInt(value))}
                                                                                >
                                                                                  <SelectTrigger className="w-20 h-7 text-xs">
                                                                                    <SelectValue />
                                                                                  </SelectTrigger>
                                                                                  <SelectContent>
                                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                                                                                      <SelectItem key={level} value={String(level)}>
                                                                                        VIP{level}
                                                                                      </SelectItem>
                                                                                    ))}
                                                                                  </SelectContent>
                                                                                </Select>
                                                                              </>
                                                                            )}
                                                                          </div>
                                                                        </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2">
                                        {user.user_roles?.map((roleObj) => (
                                          <Badge key={roleObj.role} variant="secondary">
                                            {roleObj.role}
                                          </Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFreezeUser(user, true)}
                        title="冻结用户"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFreezeUser(user, false)}
                        title="解冻用户"
                      >
                        <Unlock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                        title="编辑用户"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBalanceDialog(user)}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              加减金
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              title="删除用户"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

      {/* 调整余额对话框 */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>调整用户余额</DialogTitle>
            <DialogDescription>
              用户: {selectedUser?.username} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Balances */}
            <div className="space-y-2">
              <Label>当前余额</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {userBalances.length > 0 ? (
                  userBalances.map((balance) => (
                    <div key={balance.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">
                        {balance.currency} ({balance.account_type})
                      </span>
                      <span className="text-muted-foreground">
                        可用: {balance.available.toFixed(8)} | 冻结: {balance.frozen.toFixed(8)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center">暂无余额记录</div>
                )}
              </div>
            </div>

            {/* Adjustment Form */}
            <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>操作类型</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant={adjustmentType === "add" ? "default" : "outline"}
                                  className="flex-1"
                                  onClick={() => setAdjustmentType("add")}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  增加
                                </Button>
                                <Button
                                  variant={adjustmentType === "subtract" ? "default" : "outline"}
                                  className="flex-1"
                                  onClick={() => setAdjustmentType("subtract")}
                                >
                                  <Minus className="h-4 w-4 mr-1" />
                                  减少
                                </Button>
                              </div>
                            </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>币种</Label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>金额</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    placeholder="输入金额"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdjustBalance} disabled={loading}>
                {loading ? "处理中..." : "确认调整"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>用户名（不可编辑）</Label>
              <Input value={selectedUser?.username || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input 
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="输入新邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>新密码（可选）</Label>
              <Input 
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="留空则不修改密码"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditUser}>
                确认修改
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增用户</DialogTitle>
            <DialogDescription>
              创建新用户，用户可以使用邮箱和密码在前端登录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input 
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>密码</Label>
              <Input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入密码（至少6个字符）"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateUser} disabled={createLoading}>
                {createLoading ? "创建中..." : "确认创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除用户确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除用户 <strong>{userToDelete?.username}</strong> ({userToDelete?.email}) 吗？
              <br /><br />
              此操作将删除该用户的所有数据，包括余额、角色、KYC 记录等，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
