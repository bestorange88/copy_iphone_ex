import { supabase } from "@/integrations/supabase/client";

interface AdminAuditLogParams {
  adminId: string;
  adminUsername: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
}

const ADMIN_TOKEN_KEY = 'binarycent_admin_token';

/**
 * Create an audit log entry for admin actions
 * Uses the admin-data edge function to bypass RLS
 */
export const createAdminAuditLog = async ({
  adminId,
  adminUsername,
  action,
  resourceType,
  resourceId,
  details
}: AdminAuditLogParams) => {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      console.error('No admin token for audit log');
      return;
    }

    const { error } = await supabase.functions.invoke('admin-data', {
      headers: {
        'x-admin-token': token
      },
      body: {
        action: 'create_admin_audit_log',
        data: {
          adminId,
          adminUsername,
          logAction: action,
          resourceType,
          resourceId,
          details: details || {}
        }
      }
    });

    if (error) {
      console.error('Failed to create admin audit log:', error);
    }
  } catch (error) {
    console.error('Error creating admin audit log:', error);
  }
};

// Admin audit log actions
export const AdminAuditActions = {
  // Authentication
  LOGIN: 'admin_login',
  LOGOUT: 'admin_logout',
  SESSION_TIMEOUT: 'session_timeout',
  
  // Balance management
  BALANCE_VIEW: 'balance_view',
  BALANCE_ADJUST: 'balance_adjust',
  
  // User management
  USER_LIST_VIEW: 'user_list_view',
  USER_DETAIL_VIEW: 'user_detail_view',
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_SUSPEND: 'user_suspend',
  USER_ACTIVATE: 'user_activate',
  USER_DELETE: 'user_delete',
  
  // KYC management
  KYC_LIST_VIEW: 'kyc_list_view',
  KYC_APPROVE: 'kyc_approve',
  KYC_REJECT: 'kyc_reject',
  
  // Withdrawal management
  WITHDRAW_LIST_VIEW: 'withdraw_list_view',
  WITHDRAW_APPROVE: 'withdraw_approve',
  WITHDRAW_REJECT: 'withdraw_reject',
  
  // Deposit management
  DEPOSIT_LIST_VIEW: 'deposit_list_view',
  DEPOSIT_CONFIRM: 'deposit_confirm',
  
  // Order management
  ORDER_LIST_VIEW: 'order_list_view',
  ORDER_SETTLE: 'order_settle',
  ORDER_CANCEL: 'order_cancel',
  
  // Contract control
  CONTRACT_RESULT_SET: 'contract_result_set',
  
  // System configuration
  CONFIG_VIEW: 'config_view',
  CONFIG_UPDATE: 'config_update',
  
  // News management
  NEWS_CREATE: 'news_create',
  NEWS_UPDATE: 'news_update',
  NEWS_DELETE: 'news_delete',
  
  // Announcement management
  ANNOUNCEMENT_CREATE: 'announcement_create',
  ANNOUNCEMENT_UPDATE: 'announcement_update',
  ANNOUNCEMENT_DELETE: 'announcement_delete',
  
  // OTC management
  OTC_MERCHANT_CREATE: 'otc_merchant_create',
  OTC_MERCHANT_UPDATE: 'otc_merchant_update',
  OTC_ORDER_UPDATE: 'otc_order_update',
  
  // Earn products
  EARN_PRODUCT_CREATE: 'earn_product_create',
  EARN_PRODUCT_UPDATE: 'earn_product_update',
  
  // Expert showcase
  SHOWCASE_CREATE: 'showcase_create',
  SHOWCASE_UPDATE: 'showcase_update',
  SHOWCASE_DELETE: 'showcase_delete',
} as const;

export const AdminResourceTypes = {
  USER: 'user',
  USER_BALANCE: 'user_balance',
  KYC_VERIFICATION: 'kyc_verification',
  WITHDRAW_RECORD: 'withdraw_record',
  DEPOSIT_RECORD: 'deposit_record',
  SECOND_CONTRACT_ORDER: 'second_contract_order',
  PERPETUAL_POSITION: 'perpetual_position',
  FUTURES_POSITION: 'futures_position',
  SYSTEM_CONFIG: 'system_config',
  NEWS: 'news',
  ANNOUNCEMENT: 'announcement',
  OTC_MERCHANT: 'otc_merchant',
  OTC_ORDER: 'otc_order',
  EARN_PRODUCT: 'earn_product',
  EXPERT_SHOWCASE: 'expert_showcase',
  ADMIN_SESSION: 'admin_session',
} as const;

// Action labels for display in Chinese
export const ActionLabels: Record<string, string> = {
  [AdminAuditActions.LOGIN]: '管理员登录',
  [AdminAuditActions.LOGOUT]: '管理员登出',
  [AdminAuditActions.SESSION_TIMEOUT]: '会话超时',
  [AdminAuditActions.BALANCE_VIEW]: '查看余额',
  [AdminAuditActions.BALANCE_ADJUST]: '调整余额',
  [AdminAuditActions.USER_LIST_VIEW]: '查看用户列表',
  [AdminAuditActions.USER_DETAIL_VIEW]: '查看用户详情',
  [AdminAuditActions.USER_CREATE]: '创建用户',
  [AdminAuditActions.USER_UPDATE]: '更新用户',
  [AdminAuditActions.USER_SUSPEND]: '禁用用户',
  [AdminAuditActions.USER_ACTIVATE]: '启用用户',
  [AdminAuditActions.USER_DELETE]: '删除用户',
  [AdminAuditActions.KYC_LIST_VIEW]: '查看KYC列表',
  [AdminAuditActions.KYC_APPROVE]: '通过KYC',
  [AdminAuditActions.KYC_REJECT]: '拒绝KYC',
  [AdminAuditActions.WITHDRAW_LIST_VIEW]: '查看提现列表',
  [AdminAuditActions.WITHDRAW_APPROVE]: '通过提现',
  [AdminAuditActions.WITHDRAW_REJECT]: '拒绝提现',
  [AdminAuditActions.DEPOSIT_LIST_VIEW]: '查看充值列表',
  [AdminAuditActions.DEPOSIT_CONFIRM]: '确认充值',
  [AdminAuditActions.ORDER_LIST_VIEW]: '查看订单列表',
  [AdminAuditActions.ORDER_SETTLE]: '结算订单',
  [AdminAuditActions.ORDER_CANCEL]: '取消订单',
  [AdminAuditActions.CONTRACT_RESULT_SET]: '设置合约结果',
  [AdminAuditActions.CONFIG_VIEW]: '查看系统配置',
  [AdminAuditActions.CONFIG_UPDATE]: '更新系统配置',
  [AdminAuditActions.NEWS_CREATE]: '创建新闻',
  [AdminAuditActions.NEWS_UPDATE]: '更新新闻',
  [AdminAuditActions.NEWS_DELETE]: '删除新闻',
  [AdminAuditActions.ANNOUNCEMENT_CREATE]: '创建公告',
  [AdminAuditActions.ANNOUNCEMENT_UPDATE]: '更新公告',
  [AdminAuditActions.ANNOUNCEMENT_DELETE]: '删除公告',
  [AdminAuditActions.OTC_MERCHANT_CREATE]: '创建OTC商户',
  [AdminAuditActions.OTC_MERCHANT_UPDATE]: '更新OTC商户',
  [AdminAuditActions.OTC_ORDER_UPDATE]: '更新OTC订单',
  [AdminAuditActions.EARN_PRODUCT_CREATE]: '创建理财产品',
  [AdminAuditActions.EARN_PRODUCT_UPDATE]: '更新理财产品',
  [AdminAuditActions.SHOWCASE_CREATE]: '创建专家展示',
  [AdminAuditActions.SHOWCASE_UPDATE]: '更新专家展示',
  [AdminAuditActions.SHOWCASE_DELETE]: '删除专家展示',
};

// Resource type labels for display in Chinese
export const ResourceTypeLabels: Record<string, string> = {
  [AdminResourceTypes.USER]: '用户',
  [AdminResourceTypes.USER_BALANCE]: '用户余额',
  [AdminResourceTypes.KYC_VERIFICATION]: 'KYC验证',
  [AdminResourceTypes.WITHDRAW_RECORD]: '提现记录',
  [AdminResourceTypes.DEPOSIT_RECORD]: '充值记录',
  [AdminResourceTypes.SECOND_CONTRACT_ORDER]: '秒合约订单',
  [AdminResourceTypes.PERPETUAL_POSITION]: '永续合约持仓',
  [AdminResourceTypes.FUTURES_POSITION]: '期货持仓',
  [AdminResourceTypes.SYSTEM_CONFIG]: '系统配置',
  [AdminResourceTypes.NEWS]: '新闻',
  [AdminResourceTypes.ANNOUNCEMENT]: '公告',
  [AdminResourceTypes.OTC_MERCHANT]: 'OTC商户',
  [AdminResourceTypes.OTC_ORDER]: 'OTC订单',
  [AdminResourceTypes.EARN_PRODUCT]: '理财产品',
  [AdminResourceTypes.EXPERT_SHOWCASE]: '专家展示',
  [AdminResourceTypes.ADMIN_SESSION]: '管理员会话',
};
