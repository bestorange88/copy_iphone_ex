import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Order {
  id: string;
  user_id: string;
  symbol: string;
  side: string;
  price: number;
  amount: number;
  filled: number;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json();
    
    console.log('Processing order matching for:', orderId);

    // Get the new order
    const { data: newOrder, error: orderError } = await supabase
      .from('trade_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !newOrder) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (newOrder.status !== 'pending') {
      console.log('Order already processed:', newOrder.status);
      return new Response(
        JSON.stringify({ message: 'Order already processed', status: newOrder.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find matching orders (opposite side, matching price)
    const oppositeSide = newOrder.side === 'buy' ? 'sell' : 'buy';
    const isMarketOrder = newOrder.order_type === 'market';

    let query = supabase
      .from('trade_orders')
      .select('*')
      .eq('symbol', newOrder.symbol)
      .eq('side', oppositeSide)
      .in('status', ['pending', 'open'])
      .neq('user_id', newOrder.user_id);

    // For market orders, match with any available orders at best price
    // For limit orders, apply price filter
    if (!isMarketOrder) {
      // Limit order: only match at acceptable prices
      if (newOrder.side === 'buy') {
        query = query.lte('price', newOrder.price);
      } else {
        query = query.gte('price', newOrder.price);
      }
    }

    query = query
      .order('price', { ascending: newOrder.side === 'buy' }) // Best price first
      .order('created_at', { ascending: true }); // Oldest first (FIFO)

    const { data: matchingOrders, error: matchError } = await query;

    if (matchError) {
      console.error('Error finding matching orders:', matchError);
      throw matchError;
    }

    console.log('Found potential matching orders:', matchingOrders?.length || 0);

    // For limit orders, also filter in code (belt and suspenders)
    const validMatches = isMarketOrder 
      ? (matchingOrders || [])
      : (matchingOrders || []).filter(order => {
          if (newOrder.side === 'buy') {
            return order.price <= newOrder.price;
          } else {
            return order.price >= newOrder.price;
          }
        });

    let remainingAmount = newOrder.amount - newOrder.filled;
    let totalFilled = newOrder.filled;
    const matchedTrades: any[] = [];

    for (const matchOrder of validMatches) {
      if (remainingAmount <= 0) break;

      const matchRemainingAmount = matchOrder.amount - matchOrder.filled;
      const fillAmount = Math.min(remainingAmount, matchRemainingAmount);
      const fillPrice = matchOrder.price; // Use the maker's price

      console.log(`Matching ${fillAmount} at price ${fillPrice}`);

      // Update the matching order
      const matchNewFilled = matchOrder.filled + fillAmount;
      const matchNewStatus = matchNewFilled >= matchOrder.amount ? 'filled' : 'open';
      
      const { error: updateMatchError } = await supabase
        .from('trade_orders')
        .update({ 
          filled: matchNewFilled, 
          status: matchNewStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchOrder.id);

      if (updateMatchError) {
        console.error('Error updating match order:', updateMatchError);
        continue;
      }

      // Update user balances for the matched order
      await updateBalances(supabase, matchOrder, fillAmount, fillPrice);

      remainingAmount -= fillAmount;
      totalFilled += fillAmount;

      matchedTrades.push({
        orderId: matchOrder.id,
        amount: fillAmount,
        price: fillPrice
      });
    }

    // Update the new order
    const newStatus = totalFilled >= newOrder.amount ? 'filled' : (totalFilled > 0 ? 'open' : 'pending');
    
    const { error: updateError } = await supabase
      .from('trade_orders')
      .update({ 
        filled: totalFilled, 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating new order:', updateError);
      throw updateError;
    }

    // Update balances for the new order
    if (totalFilled > newOrder.filled) {
      const filledAmount = totalFilled - newOrder.filled;
      // Calculate average fill price from matched trades
      const avgPrice = matchedTrades.length > 0 
        ? matchedTrades.reduce((sum, t) => sum + t.price * t.amount, 0) / 
          matchedTrades.reduce((sum, t) => sum + t.amount, 0)
        : newOrder.price;
      
      await updateBalances(supabase, newOrder, filledAmount, avgPrice);
    }

    console.log('Order matching complete:', {
      orderId,
      totalFilled,
      status: newStatus,
      matchedTrades: matchedTrades.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId,
        filled: totalFilled,
        status: newStatus,
        matchedTrades 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Order matching error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function updateBalances(
  supabase: any, 
  order: Order, 
  filledAmount: number, 
  price: number
) {
  const symbol = order.symbol;
  // Parse symbol (e.g., "BTCUSDT" -> base: "BTC", quote: "USDT")
  const quoteCurrencies = ['USDT', 'USDC', 'BTC', 'ETH'];
  let baseCurrency = symbol;
  let quoteCurrency = 'USDT';
  
  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      baseCurrency = symbol.slice(0, -quote.length);
      quoteCurrency = quote;
      break;
    }
  }

  const totalValue = filledAmount * price;

  console.log(`Updating balances for user ${order.user_id}: ${order.side} ${filledAmount} ${baseCurrency} at ${price} ${quoteCurrency}`);

  if (order.side === 'buy') {
    // Buyer receives base currency, pays quote currency
    // Deduct quote currency
    await adjustBalance(supabase, order.user_id, quoteCurrency, -totalValue);
    // Add base currency
    await adjustBalance(supabase, order.user_id, baseCurrency, filledAmount);
  } else {
    // Seller pays base currency, receives quote currency
    // Deduct base currency
    await adjustBalance(supabase, order.user_id, baseCurrency, -filledAmount);
    // Add quote currency
    await adjustBalance(supabase, order.user_id, quoteCurrency, totalValue);
  }
}

async function adjustBalance(
  supabase: any, 
  userId: string, 
  currency: string, 
  amount: number
) {
  // Get current balance
  const { data: balance, error: getError } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', currency)
    .eq('account_type', 'spot')
    .maybeSingle();

  if (getError) {
    console.error('Error getting balance:', getError);
    return;
  }

  if (balance) {
    // Update existing balance
    const newAvailable = Math.max(0, balance.available + amount);
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ 
        available: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', balance.id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
    }
  } else if (amount > 0) {
    // Create new balance record only if adding funds
    const { error: insertError } = await supabase
      .from('user_balances')
      .insert({
        user_id: userId,
        currency: currency,
        account_type: 'spot',
        available: amount,
        frozen: 0,
        usd_value: 0
      });

    if (insertError) {
      console.error('Error creating balance:', insertError);
    }
  }
}
