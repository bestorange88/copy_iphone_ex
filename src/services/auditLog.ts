import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export const createAuditLog = async ({
  action,
  resource_type,
  resource_id,
  details
}: AuditLogParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user for audit log');
      return;
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action,
        resource_type,
        resource_id,
        details: details || {},
        ip_address: null // 可以从请求中获取真实IP
      });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

// 常用的审计日志操作
export const AuditActions = {
  // 余额管理
  BALANCE_MANUAL_ADJUST: 'balance_manual_adjust',
  BALANCE_DEPOSIT: 'balance_deposit',
  BALANCE_WITHDRAW: 'balance_withdraw',
  
  // 订单管理
  ORDER_SETTLE: 'order_settle',
  ORDER_CANCEL: 'order_cancel',
  ORDER_APPROVE: 'order_approve',
  ORDER_REJECT: 'order_reject',
  
  // 用户管理
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_SUSPEND: 'user_suspend',
  USER_ACTIVATE: 'user_activate',
  
  // KYC管理
  KYC_APPROVE: 'kyc_approve',
  KYC_REJECT: 'kyc_reject',
  
  // 提现管理
  WITHDRAW_APPROVE: 'withdraw_approve',
  WITHDRAW_REJECT: 'withdraw_reject',
  
  // 系统配置
  CONFIG_UPDATE: 'config_update',
  
  // OTC管理
  OTC_ORDER_UPDATE: 'otc_order_update',
} as const;

export const ResourceTypes = {
  USER_BALANCE: 'user_balance',
  SECOND_CONTRACT_ORDER: 'second_contract_order',
  PERPETUAL_POSITION: 'perpetual_position',
  WITHDRAW_RECORD: 'withdraw_record',
  DEPOSIT_RECORD: 'deposit_record',
  KYC_VERIFICATION: 'kyc_verification',
  OTC_ORDER: 'otc_order',
  USER: 'user',
  SYSTEM_CONFIG: 'system_config',
} as const;
