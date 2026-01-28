import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/hooks/useAdminData";

export type SystemMessageType = 
  | "contract_win"
  | "contract_lose"
  | "deposit_approved"
  | "deposit_rejected"
  | "withdraw_approved"
  | "withdraw_rejected"
  | "kyc_basic_approved"
  | "kyc_basic_rejected"
  | "kyc_advanced_approved"
  | "kyc_advanced_rejected"
  | "system_notice";

export interface SystemMessage {
  id: string;
  user_id: string;
  type: SystemMessageType;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  details?: Record<string, unknown>;
}

export interface CreateMessageParams {
  userId: string;
  type: SystemMessageType;
  title: string;
  content: string;
  details?: Record<string, unknown>;
}

// 使用 adminApi 插入系统消息（管理后台调用）
// 注意：需要 admin-data Edge Function 部署最新版本（包含 system_messages 在 ALLOWED_TABLES 中）
export const createSystemMessage = async (params: CreateMessageParams): Promise<void> => {
  try {
    // 首先尝试使用 adminApi（需要 Edge Function 支持）
    const { error: adminError } = await adminApi.insert('system_messages', {
      user_id: params.userId,
      type: params.type,
      title: params.title,
      content: params.content,
      details: params.details || {},
      is_read: false
    });

    if (adminError) {
      console.warn('adminApi insert failed, trying direct supabase insert:', adminError);
      // 如果 adminApi 失败，尝试直接使用 supabase client 插入
      const { error: directError } = await supabase.from('system_messages').insert([{
        user_id: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : null,
        is_read: false
      }]);
      
      if (directError) {
        console.error('Direct supabase insert also failed:', directError);
      } else {
        console.log('System message created via direct supabase insert');
      }
    } else {
      console.log('System message created via adminApi');
    }
  } catch (error) {
    console.error('Error creating system message:', error);
    // 最后尝试直接插入
    try {
      await supabase.from('system_messages').insert([{
        user_id: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : null,
        is_read: false
      }]);
      console.log('System message created via fallback direct insert');
    } catch (fallbackError) {
      console.error('Fallback insert also failed:', fallbackError);
    }
  }
};

export const sendContractResultMessage = async (
  userId: string,
  isWin: boolean,
  symbol: string,
  amount: number,
  profit: number
): Promise<void> => {
  const type = isWin ? "contract_win" : "contract_lose";
  const title = isWin ? "合約交易盈利" : "合約交易虧損";
  const content = isWin 
    ? `您的 ${symbol} 合約訂單已結算，盈利 ${profit.toFixed(2)} USDT`
    : `您的 ${symbol} 合約訂單已結算，虧損 ${Math.abs(profit).toFixed(2)} USDT`;

  await createSystemMessage({
    userId,
    type,
    title,
    content,
    details: { symbol, amount, profit, isWin }
  });
};

export const sendDepositResultMessage = async (
  userId: string,
  approved: boolean,
  amount: number,
  coinSymbol: string,
  reason?: string
): Promise<void> => {
  const type = approved ? "deposit_approved" : "deposit_rejected";
  const title = approved ? "充值審核通過" : "充值審核未通過";
  const content = approved
    ? `您的 ${amount} ${coinSymbol} 充值申請已審核通過，資金已到賬`
    : `您的 ${amount} ${coinSymbol} 充值申請未通過${reason ? `，原因：${reason}` : ''}`;

  await createSystemMessage({
    userId,
    type,
    title,
    content,
    details: { amount, coinSymbol, approved, reason }
  });
};

export const sendWithdrawResultMessage = async (
  userId: string,
  approved: boolean,
  amount: number,
  coinSymbol: string,
  reason?: string
): Promise<void> => {
  const type = approved ? "withdraw_approved" : "withdraw_rejected";
  const title = approved ? "提現審核通過" : "提現審核未通過";
  const content = approved
    ? `您的 ${amount} ${coinSymbol} 提現申請已審核通過，請注意查收`
    : `您的 ${amount} ${coinSymbol} 提現申請未通過，資金已退回賬戶${reason ? `，原因：${reason}` : ''}`;

  await createSystemMessage({
    userId,
    type,
    title,
    content,
    details: { amount, coinSymbol, approved, reason }
  });
};

export const sendKycResultMessage = async (
  userId: string,
  level: 'basic' | 'advanced',
  approved: boolean,
  reason?: string
): Promise<void> => {
  const typeMap = {
    basic: approved ? "kyc_basic_approved" : "kyc_basic_rejected",
    advanced: approved ? "kyc_advanced_approved" : "kyc_advanced_rejected"
  } as const;
  
  const levelText = level === 'basic' ? '初級實名認證' : '高級實名認證';
  const type = typeMap[level];
  const title = approved ? `${levelText}通過` : `${levelText}未通過`;
  const content = approved
    ? `恭喜！您的${levelText}已審核通過`
    : `您的${levelText}審核未通過${reason ? `，原因：${reason}` : '，請重新提交'}`;

  await createSystemMessage({
    userId,
    type,
    title,
    content,
    details: { level, approved, reason }
  });
};

export const getUserMessages = async (userId: string, limit = 50): Promise<SystemMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('system_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch system messages:', error);
      return [];
    }

    return (data as SystemMessage[]) || [];
  } catch (error) {
    console.error('Error fetching system messages:', error);
    return [];
  }
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('system_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

export const markAsRead = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('system_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('Failed to mark message as read:', error);
    }
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('system_messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all messages as read:', error);
    }
  } catch (error) {
    console.error('Error marking all messages as read:', error);
  }
};
