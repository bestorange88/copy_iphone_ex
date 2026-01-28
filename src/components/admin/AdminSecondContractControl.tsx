import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/hooks/useAdminData";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, TrendingUp, TrendingDown, Clock, RefreshCw, Plus, Trash2, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAdminAuditLog, AdminAuditActions, AdminResourceTypes } from "@/services/adminAuditLog";
import { formatTaiwanDateTime, formatTimeRemaining, formatUSDT, formatUSDTWithSign } from "@/lib/timezone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SecondContractOrder {
  id: string;
  user_id: string;
  symbol: string;
  duration: number;
  amount: number;
  entry_price: number;
  direction: string;
  status: string;
  result: string | null;
  admin_result: string | null;
  final_price: number | null;
  profit: number;
  yield_rate: number;
  created_at: string;
  settlement_time: string;
  settled_at: string | null;
  profiles?: { username: string; email: string; user_number?: number };
}

interface UserControlSetting {
  user_id: string;
  mode: 'win' | 'lose' | 'none';
  username?: string;
  user_number?: number;
}

export const AdminSecondContractControl = () => {
  const { admin } = useAdminAuth();
  const [orders, setOrders] = useState<SecondContractOrder[]>([]);
  const [loading, setLoading] = useState(true); // 初始为true
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resultSettings, setResultSettings] = useState<Record<string, string>>({});
  const [globalControl, setGlobalControl] = useState<string>("none");
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // 手动刷新状态
  
  // 用户级别输赢控制
  const [userControls, setUserControls] = useState<UserControlSetting[]>([]);
  const [newUserIdInput, setNewUserIdInput] = useState("");
  const [newUserMode, setNewUserMode] = useState<'win' | 'lose' | 'none'>('win');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isLoadingUserControls, setIsLoadingUserControls] = useState(false);
  
  // 确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });
  
  // 待添加用户信息（用于确认弹窗后执行添加）
  const [pendingAddUser, setPendingAddUser] = useState<{
    userId: string;
    userProfile: { id: string; username: string; user_number?: number };
    mode: 'win' | 'lose' | 'none';
  } | null>(null);
  
  // 待设置订单结果信息（用于确认弹窗后执行设置）
  const [pendingSetResult, setPendingSetResult] = useState<{
    orderId: string;
    adminResult: 'win' | 'lose' | 'real';
    order: SecondContractOrder;
  } | null>(null);

  // 静默刷新数据（不显示loading）
  const fetchOrdersSilent = async () => {
    try {
      const filters: Record<string, unknown> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const { data: ordersData, error } = await adminApi.select<SecondContractOrder[]>('second_contract_orders', {
        filters,
        order: { column: 'created_at', ascending: false },
        limit: 500
      });

      if (error || !ordersData) return;

      // 获取用户资料
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await adminApi.select<Array<{ id: string; username: string; email: string; user_number?: number }>>('profiles', {
          select: 'id, username, email, user_number',
          filters: { id: { in: userIds } }
        });

        const mergedData = ordersData.map(order => ({
          ...order,
          profiles: profilesData?.find(p => p.id === order.user_id) || { username: 'Unknown', email: '', user_number: undefined }
        }));

        setOrders(mergedData);
      } else {
        setOrders(ordersData);
      }
    } catch (err) {
      console.error('Silent fetch error:', err);
    }
  };

  useEffect(() => {
    // 初次加载
    const initialLoad = async () => {
      setLoading(true);
      await fetchOrdersSilent();
      setLoading(false);
    };
    
    initialLoad();
    fetchGlobalControl();
    fetchUserControls();
    
    // 设置自动刷新 - 每10秒静默刷新一次待结算订单
    const refreshInterval = setInterval(() => {
      if (statusFilter === 'pending' || statusFilter === 'all') {
        fetchOrdersSilent();
      }
    }, 10000);
    
    // 设置实时订单监听
    const channel = supabase
      .channel('second_contract_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'second_contract_orders',
        },
        () => {
          fetchOrdersSilent();
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  // 手动刷新（显示刷新按钮动画）
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrdersSilent();
    setIsRefreshing(false);
  };

  const fetchGlobalControl = async () => {
    const { data, error } = await adminApi.select<Array<{ config_value: { mode?: string } }>>('system_configs', {
      select: 'config_value',
      filters: { config_key: 'second_contract_global_control' },
      limit: 1
    });

    if (!error && data && data.length > 0 && data[0].config_value) {
      setGlobalControl(data[0].config_value.mode || 'none');
    }
  };

  // 获取用户级别输赢控制设置
  const fetchUserControls = async () => {
    setIsLoadingUserControls(true);
    try {
      const { data, error } = await adminApi.select<Array<{ config_value: { users?: Record<string, string> } }>>('system_configs', {
        select: 'config_value',
        filters: { config_key: 'second_contract_user_controls' },
        limit: 1
      });

      if (!error && data && data.length > 0 && data[0].config_value?.users) {
        const usersMap = data[0].config_value.users;
        const userIds = Object.keys(usersMap);
        
        if (userIds.length > 0) {
          // 获取用户信息
          const { data: profilesData } = await adminApi.select<Array<{ id: string; username: string; user_number?: number }>>('profiles', {
            select: 'id, username, user_number',
            filters: { id: { in: userIds } }
          });

          const userControlsList: UserControlSetting[] = userIds.map(userId => {
            const profile = profilesData?.find(p => p.id === userId);
            return {
              user_id: userId,
              mode: usersMap[userId] as 'win' | 'lose' | 'none',
              username: profile?.username,
              user_number: profile?.user_number
            };
          });
          setUserControls(userControlsList);
        } else {
          setUserControls([]);
        }
      } else {
        setUserControls([]);
      }
    } catch (err) {
      console.error('Failed to fetch user controls:', err);
    } finally {
      setIsLoadingUserControls(false);
    }
  };

  // 添加用户输赢控制 - 验证用户并显示确认弹窗
  const handleAddUserControl = async () => {
    if (!newUserIdInput.trim()) {
      toast.error("请输入用户ID或用户编号");
      return;
    }

    setIsAddingUser(true);
    try {
      // 先查找用户
      let userId = newUserIdInput.trim();
      let userProfile: { id: string; username: string; user_number?: number } | null = null;

      // 检查是否是用户编号（纯数字）
      if (/^\d+$/.test(userId)) {
        const { data: profileData } = await adminApi.select<Array<{ id: string; username: string; user_number?: number }>>('profiles', {
          select: 'id, username, user_number',
          filters: { user_number: parseInt(userId) },
          limit: 1
        });
        if (profileData && profileData.length > 0) {
          userProfile = profileData[0];
          userId = profileData[0].id;
        }
      } else {
        // 尝试通过 UUID 查找
        const { data: profileData } = await adminApi.select<Array<{ id: string; username: string; user_number?: number }>>('profiles', {
          select: 'id, username, user_number',
          filters: { id: userId },
          limit: 1
        });
        if (profileData && profileData.length > 0) {
          userProfile = profileData[0];
        }
      }

      if (!userProfile) {
        toast.error("未找到该用户");
        setIsAddingUser(false);
        return;
      }

      // 检查是否已存在
      if (userControls.some(u => u.user_id === userId)) {
        toast.error("该用户已在控制列表中");
        setIsAddingUser(false);
        return;
      }

      // 保存待添加用户信息并显示确认弹窗
      const modeText = newUserMode === 'win' ? '一直赢' : newUserMode === 'lose' ? '一直输' : '正常';
      setPendingAddUser({ userId, userProfile, mode: newUserMode });
      setConfirmDialog({
        open: true,
        title: '确认添加用户控制',
        description: `确定要将用户「${userProfile.username}」(ID: ${userProfile.user_number || userId.slice(0, 8)}) 添加到输赢控制列表，并设置为「${modeText}」吗？此设置将立即生效。`,
        onConfirm: () => executeAddUserControl()
      });
    } catch (err) {
      console.error('Failed to validate user:', err);
      toast.error("验证用户失败");
      setIsAddingUser(false);
    }
  };

  // 添加用户输赢控制 - 实际执行添加
  const executeAddUserControl = async () => {
    if (!pendingAddUser) {
      setIsAddingUser(false);
      return;
    }

    const { userId, userProfile, mode } = pendingAddUser;

    try {
      // 获取当前配置
      const { data: currentConfig } = await adminApi.select<Array<{ config_value: { users?: Record<string, string> } }>>('system_configs', {
        select: 'config_value',
        filters: { config_key: 'second_contract_user_controls' },
        limit: 1
      });

      const currentUsers = currentConfig?.[0]?.config_value?.users || {};
      const updatedUsers = { ...currentUsers, [userId]: mode };

      // 更新配置
      const { error } = await adminApi.upsert('system_configs', {
        config_key: 'second_contract_user_controls',
        config_value: { users: updatedUsers },
        description: '秒合约用户级别输赢控制'
      });

      if (error) throw error;

      // 记录审计日志
      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.CONFIG_UPDATE,
          resourceType: AdminResourceTypes.SYSTEM_CONFIG,
          resourceId: 'second_contract_user_controls',
          details: {
            action: 'add_user',
            user_id: userId,
            username: userProfile.username,
            user_number: userProfile.user_number,
            mode: mode
          }
        });
      }

      toast.success("用户已添加", {
        description: `${userProfile.username} (ID: ${userProfile.user_number}) - ${mode === 'win' ? '一直赢' : mode === 'lose' ? '一直输' : '正常'}`
      });

      setNewUserIdInput("");
      setPendingAddUser(null);
      fetchUserControls();
    } catch (err) {
      console.error('Failed to add user control:', err);
      toast.error("添加失败");
    } finally {
      setIsAddingUser(false);
    }
  };

  // 更新用户输赢模式 - 实际执行
  const executeUpdateUserMode = async (userId: string, mode: 'win' | 'lose' | 'none') => {
    try {
      const { data: currentConfig } = await adminApi.select<Array<{ config_value: { users?: Record<string, string> } }>>('system_configs', {
        select: 'config_value',
        filters: { config_key: 'second_contract_user_controls' },
        limit: 1
      });

      const currentUsers = currentConfig?.[0]?.config_value?.users || {};
      const updatedUsers = { ...currentUsers, [userId]: mode };

      const { error } = await adminApi.upsert('system_configs', {
        config_key: 'second_contract_user_controls',
        config_value: { users: updatedUsers },
        description: '秒合约用户级别输赢控制'
      });

      if (error) throw error;

      const user = userControls.find(u => u.user_id === userId);
      if (admin && user) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.CONFIG_UPDATE,
          resourceType: AdminResourceTypes.SYSTEM_CONFIG,
          resourceId: 'second_contract_user_controls',
          details: {
            action: 'update_user',
            user_id: userId,
            username: user.username,
            user_number: user.user_number,
            old_mode: user.mode,
            new_mode: mode
          }
        });
      }

      toast.success("已更新");
      fetchUserControls();
    } catch (err) {
      console.error('Failed to update user mode:', err);
      toast.error("更新失败");
    }
  };

  // 更新用户输赢模式 - 显示确认弹窗
  const handleUpdateUserMode = (userId: string, mode: 'win' | 'lose' | 'none') => {
    const user = userControls.find(u => u.user_id === userId);
    const modeText = mode === 'win' ? '一直赢' : mode === 'lose' ? '一直输' : '正常';
    const userName = user?.username || '未知用户';
    const userNumber = user?.user_number || userId.slice(0, 8);
    
    setConfirmDialog({
      open: true,
      title: '确认更改用户控制',
      description: `确定要将用户「${userName}」(ID: ${userNumber}) 的输赢模式设置为「${modeText}」吗？此设置将立即生效。`,
      onConfirm: () => executeUpdateUserMode(userId, mode)
    });
  };

  // 删除用户输赢控制 - 实际执行
  const executeRemoveUserControl = async (userId: string) => {
    try {
      const { data: currentConfig } = await adminApi.select<Array<{ config_value: { users?: Record<string, string> } }>>('system_configs', {
        select: 'config_value',
        filters: { config_key: 'second_contract_user_controls' },
        limit: 1
      });

      const currentUsers = currentConfig?.[0]?.config_value?.users || {};
      const { [userId]: removed, ...updatedUsers } = currentUsers;

      const { error } = await adminApi.upsert('system_configs', {
        config_key: 'second_contract_user_controls',
        config_value: { users: updatedUsers },
        description: '秒合约用户级别输赢控制'
      });

      if (error) throw error;

      const user = userControls.find(u => u.user_id === userId);
      if (admin && user) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.CONFIG_UPDATE,
          resourceType: AdminResourceTypes.SYSTEM_CONFIG,
          resourceId: 'second_contract_user_controls',
          details: {
            action: 'remove_user',
            user_id: userId,
            username: user.username,
            user_number: user.user_number
          }
        });
      }

      toast.success("已移除");
      fetchUserControls();
    } catch (err) {
      console.error('Failed to remove user control:', err);
      toast.error("移除失败");
    }
  };

  // 删除用户输赢控制 - 显示确认弹窗
  const handleRemoveUserControl = (userId: string) => {
    const user = userControls.find(u => u.user_id === userId);
    const userName = user?.username || '未知用户';
    const userNumber = user?.user_number || userId.slice(0, 8);
    
    setConfirmDialog({
      open: true,
      title: '确认移除用户控制',
      description: `确定要移除用户「${userName}」(ID: ${userNumber}) 的输赢控制设置吗？移除后该用户将按全局设置或真实市场结果结算。`,
      onConfirm: () => executeRemoveUserControl(userId)
    });
  };

  const executeUpdateGlobalControl = async () => {
    setIsUpdatingGlobal(true);
    try {
      const { error } = await adminApi.upsert('system_configs', {
        config_key: 'second_contract_global_control',
        config_value: { mode: globalControl },
        description: '秒合约全局输赢控制'
      });

      if (error) throw error;

      if (admin) {
        await createAdminAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: AdminAuditActions.CONFIG_UPDATE,
          resourceType: AdminResourceTypes.SYSTEM_CONFIG,
          resourceId: 'second_contract_global_control',
          details: {
            mode: globalControl,
            description: globalControl === 'none' ? '不控制，按真实市场结果' :
                        globalControl === 'win' ? '全局设为赢（所有用户盈利）' :
                        '全局设为输（所有用户亏损）'
          }
        });
      }

      toast.success("全局控制已更新", {
        description: globalControl === 'none' ? '已恢复按真实市场结果结算' :
                    globalControl === 'win' ? '已设置为全局赢' :
                    '已设置为全局输'
      });
    } catch (error) {
      console.error(error);
      toast.error("更新失败");
    } finally {
      setIsUpdatingGlobal(false);
    }
  };

  const handleUpdateGlobalControl = () => {
    const modeText = globalControl === 'none' ? '不控制（按真实市场结果）' :
                     globalControl === 'win' ? '全局赢（所有用户盈利）' :
                     '全局输（所有用户亏损）';
    setConfirmDialog({
      open: true,
      title: '确认更改全局控制',
      description: `确定要将全局输赢控制设置为「${modeText}」吗？此设置将立即对所有未单独设置的秒合约订单生效。`,
      onConfirm: executeUpdateGlobalControl
    });
  };

  // 设置订单结果 - 显示确认弹窗
  const handleSetResult = (orderId: string, adminResult: 'win' | 'lose' | 'real') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const resultText = adminResult === 'win' ? '赢' : adminResult === 'lose' ? '输' : '按真实市场结果';
    const username = order.profiles?.username || '未知用户';
    const userNumber = order.profiles?.user_number || '-';
    
    setPendingSetResult({ orderId, adminResult, order });
    setConfirmDialog({
      open: true,
      title: '确认设置订单结果',
      description: `确定要将用户「${username}」(ID: ${userNumber}) 的订单设置为「${resultText}」吗？此设置将在结算时生效。`,
      onConfirm: executeSetResult
    });
  };

  // 设置订单结果 - 实际执行
  const executeSetResult = async () => {
    if (!pendingSetResult) return;
    
    const { orderId, adminResult, order } = pendingSetResult;

    let estimatedFinalPrice = order.entry_price;
    let estimatedProfit = 0;

    if (adminResult === 'real') {
      estimatedFinalPrice = order.entry_price;
      estimatedProfit = 0;
    } else {
      if (adminResult === 'win') {
        estimatedProfit = Number(order.amount) * order.yield_rate;
        estimatedFinalPrice = order.direction === 'up' ? order.entry_price + 50 : order.entry_price - 50;
      } else {
        estimatedProfit = -Number(order.amount);
        estimatedFinalPrice = order.direction === 'up' ? order.entry_price - 50 : order.entry_price + 50;
      }
    }

    const { error: orderError } = await adminApi.update('second_contract_orders', {
      admin_result: adminResult,
      final_price: adminResult === 'real' ? null : estimatedFinalPrice,
      profit: adminResult === 'real' ? 0 : estimatedProfit
    }, { id: orderId });

    if (orderError) {
      toast.error("设置结果失败");
      console.error(orderError);
      setPendingSetResult(null);
      return;
    }

    if (admin) {
      await createAdminAuditLog({
        adminId: admin.id,
        adminUsername: admin.username,
        action: AdminAuditActions.CONTRACT_RESULT_SET,
        resourceType: AdminResourceTypes.SECOND_CONTRACT_ORDER,
        resourceId: orderId,
        details: {
          user_id: order.user_id,
          username: order.profiles?.username,
          symbol: order.symbol,
          admin_result: adminResult,
          settlement_time: order.settlement_time,
          amount: order.amount,
          direction: order.direction
        }
      });
    }

    const timeRemaining = formatTimeRemaining(order.settlement_time);
    
    toast.success("结果已预设", {
      description: `将在 ${timeRemaining} 后自动结算`
    });

    setPendingSetResult(null);
    setResultSettings(prev => ({ ...prev, [orderId]: "" }));
    fetchOrdersSilent();
  };

  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    const userNumberStr = order.profiles?.user_number?.toString() || '';
    // 支持通过 user_id (UUID)、user_number、username 或 symbol 搜索
    return (
      order.symbol.toLowerCase().includes(search) ||
      order.profiles?.username.toLowerCase().includes(search) ||
      userNumberStr.includes(search) ||
      order.user_id.toLowerCase().includes(search)
    );
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const settledOrders = orders.filter(o => o.status === 'settled').length;
  const upOrders = orders.filter(o => o.direction === 'up').length;
  const downOrders = orders.filter(o => o.direction === 'down').length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.amount), 0);

  const renderOrderCard = (order: SecondContractOrder) => (
    <div key={order.id} className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {order.direction === 'up' ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
          <div>
            <div className="font-medium">{order.symbol}</div>
            <div className="text-sm text-muted-foreground font-mono">
              ID: {order.profiles?.user_number || '-'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.direction === 'up' ? 'default' : 'secondary'}>
            {order.direction === 'up' ? '看涨' : '看跌'}
          </Badge>
          {order.status === 'pending' && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeRemaining(order.settlement_time)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">开仓价</div>
          <div className="font-medium">{Number(order.entry_price).toFixed(2)} USDT</div>
        </div>
        <div>
          <div className="text-muted-foreground">投注金额</div>
          <div className="font-medium">{formatUSDT(order.amount)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">收益率</div>
          <div className="font-medium text-green-600">{(order.yield_rate * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-muted-foreground">预期盈利</div>
          <div className="font-medium">{formatUSDT(Number(order.amount) * order.yield_rate)}</div>
        </div>
      </div>

      {order.status === 'pending' ? (
        <div className="flex gap-2">
          <Select
            value={resultSettings[order.id] || ""}
            onValueChange={(value) => setResultSettings(prev => ({ ...prev, [order.id]: value }))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="选择结果..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="win">赢（用户盈利）</SelectItem>
              <SelectItem value="lose">输（用户亏损）</SelectItem>
              <SelectItem value="real">真实结果（根据市场）</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              const result = resultSettings[order.id] as 'win' | 'lose' | 'real';
              if (!result) {
                toast.error("请选择结果");
                return;
              }
              handleSetResult(order.id, result);
            }}
            disabled={!resultSettings[order.id]}
          >
            确定结果
          </Button>
        </div>
      ) : (
        <div className="flex-1 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={order.result === 'win' ? 'default' : 'secondary'}>
                {order.result === 'win' ? '✓ 赢' : '✗ 输'}
              </Badge>
              {order.admin_result && (
                <Badge variant="outline" className="ml-2">
                  {order.admin_result === 'real' ? '真实结果' : 
                   order.admin_result === 'win' ? '管理员设为赢' : '管理员设为输'}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">最终盈亏</div>
              <div className={`font-bold ${order.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatUSDTWithSign(order.profit)}
              </div>
            </div>
          </div>
          {order.final_price && (
            <div className="text-xs text-muted-foreground mt-2">
              结算价: {Number(order.final_price).toFixed(2)} USDT | 
              结算时间: {formatTaiwanDateTime(order.settled_at)}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2">
        创建时间: {formatTaiwanDateTime(order.created_at)} | 
        结算时间: {formatTaiwanDateTime(order.settlement_time)} (台湾时间)
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 控制面板区域 - 全局控制和用户控制并排 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 全局控制卡片 */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">全局输赢控制</CardTitle>
            <p className="text-sm text-muted-foreground">
              设定后将对所有未单独设置的秒合约订单生效。单个订单的手动设置优先级更高。
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Select value={globalControl} onValueChange={setGlobalControl}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不控制（按真实市场结果）</SelectItem>
                  <SelectItem value="win">全局赢（所有用户盈利）</SelectItem>
                  <SelectItem value="lose">全局输（所有用户亏损）</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleUpdateGlobalControl}
                disabled={isUpdatingGlobal}
                className="min-w-24"
              >
                {isUpdatingGlobal ? "更新中..." : "应用设置"}
              </Button>
            </div>
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="font-medium mb-1">当前状态：</div>
              <div className={
                globalControl === 'win' ? 'text-green-600' :
                globalControl === 'lose' ? 'text-red-600' :
                'text-blue-600'
              }>
                {globalControl === 'none' && '✓ 不控制，按真实市场价格结算'}
                {globalControl === 'win' && '⚠️ 全局赢 - 未单独设置的订单都将盈利'}
                {globalControl === 'lose' && '⚠️ 全局输 - 未单独设置的订单都将亏损'}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                注意：单个订单的手动设置优先级更高，可以覆盖全局设置
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 用户级别输赢控制卡片 */}
        <Card className="border-2 border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-orange-500 flex items-center gap-2">
              <User className="h-5 w-5" />
              用户输赢控制
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              针对特定用户设置输赢模式，优先级高于全局设置。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 添加用户表单 */}
            <div className="flex gap-2">
              <Input
                placeholder="输入用户ID或用户编号..."
                value={newUserIdInput}
                onChange={(e) => setNewUserIdInput(e.target.value)}
                className="flex-1"
              />
              <Select value={newUserMode} onValueChange={(v) => setNewUserMode(v as 'win' | 'lose' | 'none')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="win">一直赢</SelectItem>
                  <SelectItem value="lose">一直输</SelectItem>
                  <SelectItem value="none">正常</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddUserControl}
                disabled={isAddingUser || !newUserIdInput.trim()}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* 用户列表 */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {isLoadingUserControls ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                  加载中...
                </div>
              ) : userControls.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  暂无用户设置
                </div>
              ) : (
                userControls.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{user.username || '未知用户'}</div>
                        <div className="text-xs text-muted-foreground">ID: {user.user_number || user.user_id.slice(0, 8)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={user.mode} 
                        onValueChange={(v) => handleUpdateUserMode(user.user_id, v as 'win' | 'lose' | 'none')}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="win">一直赢</SelectItem>
                          <SelectItem value="lose">一直输</SelectItem>
                          <SelectItem value="none">正常</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100"
                        onClick={() => handleRemoveUserControl(user.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {userControls.length > 0 && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                已设置 {userControls.length} 个用户的输赢控制
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>订单统计</CardTitle>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">总订单数</div>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">待结算</div>
              <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">已结算</div>
              <div className="text-2xl font-bold text-blue-600">{settledOrders}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">看涨/看跌</div>
              <div className="text-2xl font-bold">
                <span className="text-green-600">{upOrders}</span>/
                <span className="text-red-600">{downOrders}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">订单总额</div>
              <div className="text-2xl font-bold">{formatUSDT(totalAmount)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索交易对、用户名、用户编号或用户ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">全部订单</TabsTrigger>
              <TabsTrigger value="pending">进行中</TabsTrigger>
              <TabsTrigger value="settled">已完成</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无订单
                </div>
              ) : (
                filteredOrders.map(renderOrderCard)
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无进行中订单
                </div>
              ) : (
                filteredOrders.map(renderOrderCard)
              )}
            </TabsContent>

            <TabsContent value="settled" className="space-y-3 mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无已完成订单
                </div>
              ) : (
                filteredOrders.map(renderOrderCard)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 确认弹窗 */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmDialog.onConfirm();
              setConfirmDialog(prev => ({ ...prev, open: false }));
            }}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
