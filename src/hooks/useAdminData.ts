import { supabase } from "@/integrations/supabase/client";

const ADMIN_TOKEN_KEY = 'binarycent_admin_token';

interface AdminDataRequest {
  action: string;
  table?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Record<string, unknown>;
  select?: string;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

interface AdminDataResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

export async function adminDataRequest<T = unknown>(
  request: AdminDataRequest
): Promise<AdminDataResponse<T>> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  
  if (!token) {
    return { data: null, error: '未登录' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('admin-data', {
      body: request,
      headers: {
        'x-admin-token': token
      }
    });

    if (error) {
      console.error('Admin data request error:', error);
      return { data: null, error: error.message || '请求失败' };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data: data?.data as T, error: null };
  } catch (err) {
    console.error('Admin data request exception:', err);
    return { data: null, error: err instanceof Error ? err.message : '请求异常' };
  }
}

// Convenience methods
export const adminApi = {
  // Generic CRUD
  select: <T = unknown>(table: string, options?: {
    select?: string;
    filters?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  }) => adminDataRequest<T>({
    action: 'select',
    table,
    ...options
  }),

  count: (table: string, filters?: Record<string, unknown>) => 
    adminDataRequest<{ count: number }>({
      action: 'count',
      table,
      filters
    }),

  insert: <T = unknown>(table: string, data: Record<string, unknown> | Record<string, unknown>[]) =>
    adminDataRequest<T>({
      action: 'insert',
      table,
      data
    }),

  update: <T = unknown>(table: string, data: Record<string, unknown>, filters: Record<string, unknown>) =>
    adminDataRequest<T>({
      action: 'update',
      table,
      data,
      filters
    }),

  delete: (table: string, filters: Record<string, unknown>) =>
    adminDataRequest({
      action: 'delete',
      table,
      filters
    }),

  upsert: <T = unknown>(table: string, data: Record<string, unknown> | Record<string, unknown>[]) =>
    adminDataRequest<T>({
      action: 'upsert',
      table,
      data
    }),

  // Special composite queries
  getStats: () => adminDataRequest<{
    totalUsers: number;
    pendingKYC: number;
    pendingWithdraw: number;
    activeDeposits: number;
  }>({ action: 'get_stats' }),

  getUsers: () => adminDataRequest<Array<{
    id: string;
    username: string;
    email: string;
    created_at: string;
    user_number?: number;
    user_roles?: { role: string }[];
  }>>({ action: 'get_users' }),

  searchUsers: (searchTerm: string) => adminDataRequest<Array<{
    id: string;
    username: string;
    email: string;
    created_at: string;
    user_number?: number;
    user_roles?: { role: string }[];
  }>>({ action: 'search_users', filters: { search_term: searchTerm } }),

  getWithdrawalsWithProfiles: () => adminDataRequest<Array<{
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
  }>>({ action: 'get_withdrawals_with_profiles' }),

  getDepositsWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id: string;
    coin_symbol: string;
    amount: number;
    network: string;
    status: string;
    created_at: string;
    tx_hash?: string;
    screenshot_url?: string;
    username?: string;
    email?: string;
  }>>({ action: 'get_deposits_with_profiles' }),

  getKycWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id: string;
    real_name: string;
    id_type: string;
    id_number: string;
    status: string;
    submitted_at: string;
    username?: string;
    email?: string;
    user_number?: number;
  }>>({ action: 'get_kyc_with_profiles' }),

  getBalancesWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id: string;
    currency: string;
    available: number;
    frozen: number;
    account_type: string;
    username?: string;
    email?: string;
  }>>({ action: 'get_balances_with_profiles' }),

  getTradesWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id: string;
    symbol: string;
    side: string;
    amount: number;
    price?: number;
    status: string;
    created_at: string;
    username?: string;
    email?: string;
  }>>({ action: 'get_trades_with_profiles' }),

  getSecondContractsWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id: string;
    symbol: string;
    direction: string;
    amount: number;
    entry_price: number;
    status: string;
    result?: string;
    admin_result?: string;
    created_at: string;
    username?: string;
    email?: string;
  }>>({ action: 'get_second_contracts_with_profiles' }),

  getPerpetualPositionsWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id: string;
    symbol: string;
    side: string;
    amount: number;
    entry_price: number;
    leverage: number;
    status: string;
    created_at: string;
    username?: string;
    email?: string;
  }>>({ action: 'get_perpetual_positions_with_profiles' }),

  getFeedbackWithProfiles: () => adminDataRequest<Array<{
    id: string;
    user_id?: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: string;
    created_at: string;
    username?: string;
  }>>({ action: 'get_feedback_with_profiles' }),

  // Backfill profiles from auth.users
  backfillProfiles: () => adminDataRequest<{
    backfilled: number;
    total: number;
    users?: Array<{ id: string; email: string; username: string }>;
  }>({ action: 'backfill_profiles' }),

  // Update user password (requires service_role_key via Edge Function)
  updateUserPassword: (userId: string, newPassword: string) => adminDataRequest<{
    success: boolean;
  }>({ action: 'update_user_password', data: { userId, newPassword } }),

  // Delete user (requires service_role_key via Edge Function)
  deleteUser: (userId: string) => adminDataRequest<{
    success: boolean;
  }>({ action: 'delete_user', data: { userId } }),

  // Get signed URL for storage files (bypasses RLS)
  getSignedUrl: (bucket: string, filePath: string) => adminDataRequest<{
    signedUrl: string;
  }>({ action: 'get_signed_url', data: { bucket, filePath } }),
};
