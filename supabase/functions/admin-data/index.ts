import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
}

// SECURITY: Table whitelist to prevent unrestricted database access
const ALLOWED_TABLES = [
  'profiles',
  'user_balances',
  'user_roles',
  'kyc_verifications',
  'advanced_kyc_verifications',
  'withdraw_records',
  'deposit_records',
  'deposit_addresses',
  'trade_orders',
  'second_contract_orders',
  'perpetual_positions',
  'futures_positions',
  'futures_orders',
  'stock_positions',
  'stock_orders',
  'user_feedback',
  'platform_announcements',
  'platform_notices',
  'user_announcements',
  'crypto_news',
  'earn_products',
  'earn_subscriptions',
  'otc_merchants',
  'otc_orders',
  'otc_prices',
  'expert_showcases',
  'expert_strategies',
  'expert_strategy_subscriptions',
  'time_contract_assets',
  'time_contract_configs',
  'system_configs',
  'admin_audit_logs',
  'mining_products',
  'user_mining_rentals',
  'pwa_installations',
  'system_messages',
] as const

// Tables that should not allow delete operations
const NO_DELETE_TABLES = ['profiles', 'user_roles', 'admin_audit_logs']

// Tables that should not allow direct modification (only via specific actions)
const RESTRICTED_TABLES = ['admin_users']

// Verify admin token
async function verifyAdminToken(token: string, secret: Uint8Array): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.type === 'admin'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SECURITY: Fail securely if JWT secret is not configured
    const adminJwtSecret = Deno.env.get('ADMIN_JWT_SECRET')
    if (!adminJwtSecret) {
      console.error('CRITICAL: ADMIN_JWT_SECRET environment variable is not configured')
      return new Response(
        JSON.stringify({ error: '服务器配置错误' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const ADMIN_JWT_SECRET = new TextEncoder().encode(adminJwtSecret)

    // Verify admin token
    const adminToken = req.headers.get('x-admin-token')
    if (!adminToken || !(await verifyAdminToken(adminToken, ADMIN_JWT_SECRET))) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { action, table, data, filters, select, order, limit } = await req.json()

    console.log(`Admin data request: ${action} on ${table}`)

    // SECURITY: Validate table name for generic CRUD operations
    const crudActions = ['select', 'count', 'insert', 'update', 'delete', 'upsert']
    if (crudActions.includes(action) && table) {
      if (!ALLOWED_TABLES.includes(table)) {
        console.error(`Attempted access to restricted table: ${table}`)
        return new Response(
          JSON.stringify({ error: '不允许访问该数据表' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (RESTRICTED_TABLES.includes(table)) {
        console.error(`Attempted direct access to restricted table: ${table}`)
        return new Response(
          JSON.stringify({ error: '该数据表不允许直接操作' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'delete' && NO_DELETE_TABLES.includes(table)) {
        console.error(`Attempted delete on protected table: ${table}`)
        return new Response(
          JSON.stringify({ error: '该数据表不允许删除操作' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    let result: { data: unknown; error: unknown } = { data: null, error: null }

    switch (action) {
      case 'select': {
        let query = supabaseAdmin.from(table).select(select || '*')
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (typeof value === 'object' && value !== null) {
              const filterObj = value as Record<string, unknown>
              if ('eq' in filterObj) query = query.eq(key, filterObj.eq)
              if ('neq' in filterObj) query = query.neq(key, filterObj.neq)
              if ('gt' in filterObj) query = query.gt(key, filterObj.gt)
              if ('gte' in filterObj) query = query.gte(key, filterObj.gte)
              if ('lt' in filterObj) query = query.lt(key, filterObj.lt)
              if ('lte' in filterObj) query = query.lte(key, filterObj.lte)
              if ('in' in filterObj) query = query.in(key, filterObj.in as unknown[])
            } else {
              query = query.eq(key, value)
            }
          }
        }
        
        if (order) {
          const { column, ascending = false } = order
          query = query.order(column, { ascending })
        }
        
        if (limit) {
          query = query.limit(limit)
        }
        
        result = await query
        break
      }

      case 'count': {
        let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value)
          }
        }
        
        const { count, error } = await query
        result = { data: { count }, error }
        break
      }

      case 'insert': {
        result = await supabaseAdmin.from(table).insert(data).select()
        break
      }

      case 'update': {
        let query = supabaseAdmin.from(table).update(data)
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value)
          }
        }
        
        result = await query.select()
        break
      }

      case 'delete': {
        let query = supabaseAdmin.from(table).delete()
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value)
          }
        }
        
        result = await query
        break
      }

      case 'upsert': {
        // For system_configs, use config_key as the conflict column
        if (table === 'system_configs') {
          result = await supabaseAdmin.from(table).upsert(data, { onConflict: 'config_key' }).select()
        } else {
          result = await supabaseAdmin.from(table).upsert(data, { onConflict: 'id' }).select()
        }
        break
      }

      // Special composite queries
      case 'get_stats': {
        const [usersRes, kycRes, withdrawRes, depositRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('kyc_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabaseAdmin.from('withdraw_records').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabaseAdmin.from('deposit_addresses').select('id', { count: 'exact', head: true }).eq('is_active', true)
        ])
        
        result = {
          data: {
            totalUsers: usersRes.count || 0,
            pendingKYC: kycRes.count || 0,
            pendingWithdraw: withdrawRes.count || 0,
            activeDeposits: depositRes.count || 0
          },
          error: null
        }
        break
      }

      case 'get_users': {
        const { data: profiles, error } = await supabaseAdmin
          .from('profiles')
          .select('*, user_roles(role)')
          .order('created_at', { ascending: false })
        result = { data: profiles, error }
        break
      }

      case 'search_users': {
        const searchTerm = filters?.search_term as string
        if (!searchTerm) {
          result = { data: [], error: null }
          break
        }

        // Try to parse as user_number (integer)
        const searchNumber = parseInt(searchTerm, 10)
        
        let query = supabaseAdmin
          .from('profiles')
          .select('*, user_roles(role)')

        if (!isNaN(searchNumber)) {
          // Search by user_number
          query = query.eq('user_number', searchNumber)
        } else {
          // Search by username or email (case-insensitive)
          query = query.or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        }

        const { data: profiles, error } = await query.order('created_at', { ascending: false })
        result = { data: profiles, error }
        break
      }

      case 'get_withdrawals_with_profiles': {
        const { data: withdrawals, error: withdrawError } = await supabaseAdmin
          .from('withdraw_records')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (withdrawError) {
          result = { data: null, error: withdrawError }
          break
        }

        const withdrawalsWithProfiles = await Promise.all(
          (withdrawals || []).map(async (w: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email, user_number')
              .eq('id', w.user_id)
              .maybeSingle()
            return { ...w, username: profile?.username, email: profile?.email, user_number: profile?.user_number }
          })
        )
        
        result = { data: withdrawalsWithProfiles, error: null }
        break
      }

      case 'get_deposits_with_profiles': {
        const { data: deposits, error: depositError } = await supabaseAdmin
          .from('deposit_records')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (depositError) {
          result = { data: null, error: depositError }
          break
        }

        const depositsWithProfiles = await Promise.all(
          (deposits || []).map(async (d: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email, user_number')
              .eq('id', d.user_id)
              .maybeSingle()
            return { ...d, username: profile?.username, email: profile?.email, user_number: profile?.user_number }
          })
        )
        
        result = { data: depositsWithProfiles, error: null }
        break
      }

      case 'get_kyc_with_profiles': {
        // Get basic KYC verifications
        const { data: basicKycs, error: basicKycError } = await supabaseAdmin
          .from('kyc_verifications')
          .select('*')
          .order('submitted_at', { ascending: false })
        
        if (basicKycError) {
          result = { data: null, error: basicKycError }
          break
        }

        // Get advanced KYC verifications
        const { data: advancedKycs, error: advancedKycError } = await supabaseAdmin
          .from('advanced_kyc_verifications')
          .select('*')
          .order('submitted_at', { ascending: false })
        
        // Don't fail if advanced_kyc_verifications table doesn't exist
        const advancedKycList = advancedKycError ? [] : (advancedKycs || [])

        // Create a map of advanced KYC by user_id for quick lookup
        const advancedKycMap = new Map(
          advancedKycList.map((ak: Record<string, unknown>) => [ak.user_id, ak])
        )

        const kycsWithProfiles = await Promise.all(
          (basicKycs || []).map(async (k: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email, user_number')
              .eq('id', k.user_id)
              .maybeSingle()
            
            if (!profile?.user_number) {
              console.log(`Warning: Missing user_number for user ${k.user_id}`)
            }
            
            // Check if user has advanced KYC
            const advancedKyc = advancedKycMap.get(k.user_id) as Record<string, unknown> | undefined
            
            // If user has advanced KYC pending/approved, show that instead
            if (advancedKyc && (advancedKyc.status === 'pending' || advancedKyc.status === 'approved')) {
              return {
                ...k,
                ...advancedKyc,
                id: advancedKyc.id, // Use advanced KYC id
                kyc_level: 'advanced',
                username: profile?.username,
                email: profile?.email,
                user_number: profile?.user_number,
                // Keep basic KYC document URLs
                id_front_url: k.id_front_url,
                id_back_url: k.id_back_url,
              }
            }
            
            return { ...k, kyc_level: 'basic', username: profile?.username, email: profile?.email, user_number: profile?.user_number }
          })
        )

        // Also add advanced KYC records that don't have corresponding basic KYC (shouldn't happen but just in case)
        const basicUserIds = new Set((basicKycs || []).map((k: Record<string, unknown>) => k.user_id))
        const orphanAdvancedKycs = advancedKycList.filter((ak: Record<string, unknown>) => !basicUserIds.has(ak.user_id))
        
        const orphanKycsWithProfiles = await Promise.all(
          orphanAdvancedKycs.map(async (ak: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email, user_number')
              .eq('id', ak.user_id)
              .maybeSingle()
            return { ...ak, kyc_level: 'advanced', username: profile?.username, email: profile?.email, user_number: profile?.user_number }
          })
        )
        
        result = { data: [...kycsWithProfiles, ...orphanKycsWithProfiles], error: null }
        break
      }

      case 'get_balances_with_profiles': {
        const { data: balances, error: balanceError } = await supabaseAdmin
          .from('user_balances')
          .select('*')
          .order('updated_at', { ascending: false })
        
        if (balanceError) {
          result = { data: null, error: balanceError }
          break
        }

        const balancesWithProfiles = await Promise.all(
          (balances || []).map(async (b: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email')
              .eq('id', b.user_id)
              .maybeSingle()
            return { ...b, username: profile?.username, email: profile?.email }
          })
        )
        
        result = { data: balancesWithProfiles, error: null }
        break
      }

      case 'get_trades_with_profiles': {
        const { data: trades, error: tradeError } = await supabaseAdmin
          .from('trade_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (tradeError) {
          result = { data: null, error: tradeError }
          break
        }

        const tradesWithProfiles = await Promise.all(
          (trades || []).map(async (t: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email')
              .eq('id', t.user_id)
              .maybeSingle()
            return { ...t, username: profile?.username, email: profile?.email }
          })
        )
        
        result = { data: tradesWithProfiles, error: null }
        break
      }

      case 'get_second_contracts_with_profiles': {
        const { data: orders, error: orderError } = await supabaseAdmin
          .from('second_contract_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (orderError) {
          result = { data: null, error: orderError }
          break
        }

        const ordersWithProfiles = await Promise.all(
          (orders || []).map(async (o: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email')
              .eq('id', o.user_id)
              .maybeSingle()
            return { ...o, username: profile?.username, email: profile?.email }
          })
        )
        
        result = { data: ordersWithProfiles, error: null }
        break
      }

      case 'get_perpetual_positions_with_profiles': {
        const { data: positions, error: posError } = await supabaseAdmin
          .from('perpetual_positions')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (posError) {
          result = { data: null, error: posError }
          break
        }

        const positionsWithProfiles = await Promise.all(
          (positions || []).map(async (p: Record<string, unknown>) => {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username, email')
              .eq('id', p.user_id)
              .maybeSingle()
            return { ...p, username: profile?.username, email: profile?.email }
          })
        )
        
        result = { data: positionsWithProfiles, error: null }
        break
      }

      case 'get_feedback_with_profiles': {
        const { data: feedbacks, error: feedbackError } = await supabaseAdmin
          .from('user_feedback')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (feedbackError) {
          result = { data: null, error: feedbackError }
          break
        }

        const feedbacksWithProfiles = await Promise.all(
          (feedbacks || []).map(async (f: Record<string, unknown>) => {
            if (!f.user_id) return f
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username')
              .eq('id', f.user_id)
              .maybeSingle()
            return { ...f, username: profile?.username }
          })
        )
        
        result = { data: feedbacksWithProfiles, error: null }
        break
      }

      case 'backfill_profiles': {
        // Get all auth users using admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (authError) {
          console.error('Failed to list auth users:', authError)
          result = { data: null, error: authError }
          break
        }

        const authUsers = authData?.users || []
        console.log(`Found ${authUsers.length} auth users`)

        // Get existing profile IDs and usernames
        const { data: existingProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, username')
        
        const existingIds = new Set((existingProfiles || []).map((p: { id: string }) => p.id))
        const existingUsernames = new Set((existingProfiles || []).map((p: { username: string }) => p.username))
        console.log(`Found ${existingIds.size} existing profiles`)

        // Filter users that don't have profiles
        const missingUsers = authUsers.filter((u: { id: string }) => !existingIds.has(u.id))
        console.log(`Found ${missingUsers.length} users missing profiles`)

        if (missingUsers.length === 0) {
          result = { data: { backfilled: 0, total: authUsers.length }, error: null }
          break
        }

        // Generate unique usernames for missing profiles
        const usedUsernames = new Set(existingUsernames)
        const profilesToInsert = missingUsers.map((u: { id: string; email?: string; user_metadata?: { username?: string } }) => {
          const baseUsername = u.user_metadata?.username || u.email?.split('@')[0] || 'user'
          let username = baseUsername
          let suffix = 1
          
          // Ensure username is unique
          while (usedUsernames.has(username)) {
            username = `${baseUsername}_${u.id.slice(0, 4)}${suffix > 1 ? `_${suffix}` : ''}`
            suffix++
          }
          usedUsernames.add(username)
          
          return {
            id: u.id,
            email: u.email || '',
            username: username
          }
        })

        // Insert profiles one by one to handle any remaining conflicts
        let backfilledCount = 0
        const errors: string[] = []
        
        for (const profile of profilesToInsert) {
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert(profile)
          
          if (insertError) {
            console.error(`Failed to insert profile for ${profile.id}:`, insertError)
            errors.push(`${profile.email}: ${insertError.message}`)
          } else {
            backfilledCount++
          }
        }

        console.log(`Successfully backfilled ${backfilledCount} profiles`)
        
        result = { 
          data: { 
            backfilled: backfilledCount, 
            total: authUsers.length,
            errors: errors.length > 0 ? errors : undefined
          }, 
          error: null 
        }
        break
      }

      case 'create_admin_audit_log': {
        const { adminId, adminUsername, logAction, resourceType, resourceId, details } = data
        
        const { error: logError } = await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_id: adminId,
            admin_username: adminUsername,
            action: logAction,
            resource_type: resourceType,
            resource_id: resourceId,
            details: details || {}
          })
        
        if (logError) {
          console.error('Failed to create admin audit log:', logError)
          result = { data: null, error: logError }
        } else {
          result = { data: { success: true }, error: null }
        }
        break
      }

      case 'update_user_password': {
        const { userId, newPassword } = data
        
        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: '缺少必要参数' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: '密码至少需要6个字符' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        )

        if (updateError) {
          console.error('Failed to update user password:', updateError)
          result = { data: null, error: updateError }
        } else {
          result = { data: { success: true }, error: null }
        }
        break
      }

      case 'delete_user': {
        const { userId } = data
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: '缺少用户ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // First delete related data (balances, roles, etc.)
        await supabaseAdmin.from('user_balances').delete().eq('user_id', userId)
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
        await supabaseAdmin.from('kyc_verifications').delete().eq('user_id', userId)
        await supabaseAdmin.from('profiles').delete().eq('id', userId)

        // Then delete the auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
          console.error('Failed to delete user:', deleteError)
          result = { data: null, error: deleteError }
        } else {
          result = { data: { success: true }, error: null }
        }
        break
      }

      case 'get_signed_url': {
        // 获取存储文件的签名 URL
        const { bucket, filePath } = data
        if (!bucket || !filePath) {
          result = { data: null, error: { message: '缺少 bucket 或 filePath 参数' } }
          break
        }

        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(filePath, 600) // 10 分钟有效期

        if (signedUrlError) {
          console.error('Failed to create signed URL:', signedUrlError)
          result = { data: null, error: signedUrlError }
        } else {
          result = { data: { signedUrl: signedUrlData.signedUrl }, error: null }
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `未知操作: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (result.error) {
      console.error(`Admin data error:`, result.error)
      return new Response(
        JSON.stringify({ error: (result.error as { message?: string }).message || '操作失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: result.data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Admin data error:', error)
    return new Response(
      JSON.stringify({ error: '操作失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
