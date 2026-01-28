import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Balance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  usdValue: number;
  accountType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // 查询用户余额
    const { data: balances, error: balancesError } = await supabaseClient
      .from('user_balances')
      .select('*')
      .eq('user_id', user.id);

    if (balancesError) {
      console.error('Failed to fetch balances:', balancesError);
      throw balancesError;
    }

    // 按账户类型分组
    const spot = balances?.filter(b => b.account_type === 'spot').map(b => ({
      currency: b.currency,
      available: Number(b.available),
      frozen: Number(b.frozen),
      total: Number(b.total),
      usdValue: Number(b.usd_value),
      accountType: b.account_type
    })) || [];

    const futures = balances?.filter(b => b.account_type === 'futures').map(b => ({
      currency: b.currency,
      available: Number(b.available),
      frozen: Number(b.frozen),
      total: Number(b.total),
      usdValue: Number(b.usd_value),
      accountType: b.account_type
    })) || [];

    const earn = balances?.filter(b => b.account_type === 'earn').map(b => ({
      currency: b.currency,
      available: Number(b.available),
      frozen: Number(b.frozen),
      total: Number(b.total),
      usdValue: Number(b.usd_value),
      accountType: b.account_type
    })) || [];

    // 计算总资产 (使用 Map 去重并修正稳定币价值)
    const STABLES = new Set(["USDT", "USDC", "USD"]);
    const uniqueBalances = new Map<string, number>();

    balances?.forEach(b => {
      const key = `${b.account_type}_${b.currency}`;
      const totalNum = Number(b.total) || (Number(b.available) + Number(b.frozen));
      const usdVal = STABLES.has(b.currency) ? totalNum : (Number(b.usd_value) || 0);
      uniqueBalances.set(key, usdVal);
    });

    const totalAssets = Array.from(uniqueBalances.values()).reduce((sum, val) => sum + val, 0);

    // 查询24小时前的快照计算收益
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: snapshot } = await supabaseClient
      .from('user_balance_snapshots')
      .select('total_usd_value')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousTotal = snapshot ? Number(snapshot.total_usd_value) : totalAssets;
    const profit24h = totalAssets - previousTotal;
    const profitPercent24h = previousTotal > 0 ? (profit24h / previousTotal) * 100 : 0;

    return new Response(
      JSON.stringify({
        spot,
        futures,
        earn,
        totalAssets,
        profit24h,
        profitPercent24h,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('User balance error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
