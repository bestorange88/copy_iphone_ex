import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { phone, token } = await req.json();

    if (!phone || !token) {
      return new Response(
        JSON.stringify({ error: 'Phone number and verification code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting - count failed attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: recentAttempts, error: attemptsError } = await supabaseClient
      .from('otp_attempts')
      .select('id')
      .eq('phone', phone)
      .eq('success', false)
      .gte('created_at', fifteenMinutesAgo);

    if (attemptsError) {
      console.error('Error checking OTP attempts:', attemptsError);
    }

    // Rate limit: 5 failed attempts per 15 minutes
    if (recentAttempts && recentAttempts.length >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification attempts. Please try again in 15 minutes.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt to verify OTP
    const { error: verifyError } = await supabaseClient.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    // Log the attempt using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: logError } = await supabaseAdmin
      .from('otp_attempts')
      .insert({
        phone,
        success: !verifyError,
      });

    if (logError) {
      console.error('Failed to log OTP attempt:', logError);
    }

    if (verifyError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid verification code',
          code: 'INVALID_CODE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OTP Verification Error [Internal]:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        error: 'An error occurred during verification',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
