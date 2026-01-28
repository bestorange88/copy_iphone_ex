import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const TradeParamsSchema = {
  symbol: /^[A-Z0-9]+-[A-Z0-9]+$/,
  maxSymbolLength: 20,
  maxAmount: 1000000,
  maxPrice: 10000000,
};

function validateTradeParams(params: any): { valid: boolean; error?: string } {
  if (!params.symbol || typeof params.symbol !== 'string') {
    return { valid: false, error: 'Symbol is required and must be a string' };
  }
  if (!TradeParamsSchema.symbol.test(params.symbol)) {
    return { valid: false, error: 'Invalid symbol format' };
  }
  if (params.symbol.length > TradeParamsSchema.maxSymbolLength) {
    return { valid: false, error: 'Symbol too long' };
  }
  if (!['buy', 'sell'].includes(params.side)) {
    return { valid: false, error: 'Invalid side' };
  }
  if (typeof params.amount !== 'number' || params.amount <= 0 || params.amount > TradeParamsSchema.maxAmount) {
    return { valid: false, error: 'Invalid amount' };
  }
  if (typeof params.price !== 'number' || params.price <= 0 || params.price > TradeParamsSchema.maxPrice) {
    return { valid: false, error: 'Invalid price' };
  }
  if (!Number.isFinite(params.amount) || !Number.isFinite(params.price)) {
    return { valid: false, error: 'Amount and price must be finite numbers' };
  }
  return { valid: true };
}

function sanitizeError(error: Error): { message: string; code: string } {
  const errorMap: Record<string, string> = {
    'Unauthorized': 'Authentication required',
    'API keys not configured': 'Please configure your exchange API keys',
    'Invalid symbol': 'Invalid trading pair',
    'Invalid amount': 'Invalid trade amount',
    'Invalid price': 'Invalid price',
    'Invalid side': 'Invalid trade side',
    'Invalid action': 'Invalid operation',
  };

  for (const [key, message] of Object.entries(errorMap)) {
    if (error.message.includes(key)) {
      return { message, code: 'USER_ERROR' };
    }
  }

  return { 
    message: 'An error occurred. Please try again later.',
    code: 'INTERNAL_ERROR'
  };
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

    const { action, params } = await req.json();

    // Validate action
    const validActions = ['place_order', 'cancel_order', 'get_balance', 'get_ticker'];
    if (!validActions.includes(action)) {
      throw new Error('Invalid action');
    }

    // Get user's API keys
    const { data: apiKeys, error: apiKeysError } = await supabaseClient
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('exchange', 'okx')
      .eq('is_active', true)
      .single();

    if (apiKeysError || !apiKeys) {
      throw new Error('OKX API keys not configured');
    }

    let result;
    switch (action) {
      case 'place_order': {
        // Validate trade params
        const validation = validateTradeParams(params);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        result = await placeOrder(apiKeys, params);
        break;
      }
      case 'cancel_order':
        result = await cancelOrder(apiKeys, params);
        break;
      case 'get_balance':
        result = await getBalance(apiKeys);
        break;
      case 'get_ticker':
        result = await getTicker(apiKeys, params);
        break;
      default:
        throw new Error('Invalid action');
    }

    // Log the action using service role for audit logs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: logError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: `okx_${action}`,
      resource_type: 'trade',
      details: { action, result },
    });

    if (logError) {
      console.error('Failed to create audit log:', logError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log full error details server-side only
    console.error('OKX Trade Error [Internal]:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Sanitize error for client response
    const sanitizedError = sanitizeError(error as Error);
    
    return new Response(JSON.stringify({ 
      error: sanitizedError.message,
      code: sanitizedError.code 
    }), {
      status: sanitizedError.code === 'USER_ERROR' ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function placeOrder(apiKeys: any, params: any) {
  // Placeholder for OKX API integration
  // DO NOT log sensitive trading parameters in production
  console.log('Placing order with OKX for symbol:', params.symbol);
  return { orderId: 'mock-order-id', status: 'pending' };
}

async function cancelOrder(apiKeys: any, params: any) {
  console.log('Canceling OKX order:', params.orderId);
  return { orderId: params.orderId, status: 'cancelled' };
}

async function getBalance(apiKeys: any) {
  console.log('Getting balance from OKX');
  return { balances: [] };
}

async function getTicker(apiKeys: any, params: any) {
  console.log('Getting ticker from OKX for symbol:', params.symbol);
  return { symbol: params.symbol, price: 0 };
}
