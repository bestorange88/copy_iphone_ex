import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple base32 encoding/decoding
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateRandomSecret(): string {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < array.length; i++) {
    result += BASE32_CHARS[array[i] % 32];
  }
  return result;
}

function base32ToBytes(base32: string): Uint8Array {
  const cleanedInput = base32.toUpperCase().replace(/=+$/, '');
  const result: number[] = [];
  let buffer = 0;
  let bitsInBuffer = 0;
  
  for (const char of cleanedInput) {
    const value = BASE32_CHARS.indexOf(char);
    if (value === -1) continue;
    
    buffer = (buffer << 5) | value;
    bitsInBuffer += 5;
    
    while (bitsInBuffer >= 8) {
      bitsInBuffer -= 8;
      result.push((buffer >> bitsInBuffer) & 0xff);
    }
  }
  
  return new Uint8Array(result);
}

async function generateTOTP(secret: string): Promise<string> {
  const key = base32ToBytes(secret);
  const time = Math.floor(Date.now() / 1000 / 30);
  const timeBytes = new Uint8Array(8);
  let t = time;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes.buffer as ArrayBuffer);
  const hash = new Uint8Array(signature);
  
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
  
  return String(binary % 1000000).padStart(6, '0');
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  // Check current and adjacent time windows for clock drift tolerance
  for (const offset of [0, -1, 1]) {
    const key = base32ToBytes(secret);
    const time = Math.floor(Date.now() / 1000 / 30) + offset;
    const timeBytes = new Uint8Array(8);
    let t = time;
    for (let i = 7; i >= 0; i--) {
      timeBytes[i] = t & 0xff;
      t = Math.floor(t / 256);
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes.buffer as ArrayBuffer);
    const hash = new Uint8Array(signature);
    
    const byteOffset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[byteOffset] & 0x7f) << 24) |
                   ((hash[byteOffset + 1] & 0xff) << 16) |
                   ((hash[byteOffset + 2] & 0xff) << 8) |
                   (hash[byteOffset + 3] & 0xff);
    
    const expectedToken = String(binary % 1000000).padStart(6, '0');
    if (expectedToken === token) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, admin_id, token, secret } = body;

    if (action === 'generate') {
      // Generate new TOTP secret
      const newSecret = generateRandomSecret();
      
      // Get admin info for issuer label
      const { data: admin } = await supabase
        .from('admin_users')
        .select('username')
        .eq('id', admin_id)
        .single();

      if (!admin) {
        return new Response(
          JSON.stringify({ error: 'Admin not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save secret temporarily
      await supabase
        .from('admin_users')
        .update({ totp_secret: newSecret })
        .eq('id', admin_id);

      // Generate OTP Auth URL for QR code
      const issuer = 'ARX Admin';
      const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(admin.username)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      return new Response(
        JSON.stringify({ secret: newSecret, otpAuthUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'enable') {
      // Verify the token before enabling
      const { data: admin } = await supabase
        .from('admin_users')
        .select('totp_secret')
        .eq('id', admin_id)
        .single();

      if (!admin?.totp_secret) {
        return new Response(
          JSON.stringify({ error: 'TOTP not setup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyTOTP(admin.totp_secret, token);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Enable TOTP
      await supabase
        .from('admin_users')
        .update({ totp_enabled: true })
        .eq('id', admin_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Verify TOTP token
      const { data: admin } = await supabase
        .from('admin_users')
        .select('totp_secret, totp_enabled')
        .eq('id', admin_id)
        .single();

      if (!admin?.totp_enabled || !admin?.totp_secret) {
        return new Response(
          JSON.stringify({ valid: true, message: 'TOTP not enabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyTOTP(admin.totp_secret, token);
      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disable') {
      // Verify current token before disabling
      const { data: admin } = await supabase
        .from('admin_users')
        .select('totp_secret')
        .eq('id', admin_id)
        .single();

      if (admin?.totp_secret) {
        const isValid = await verifyTOTP(admin.totp_secret, token);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid verification code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      await supabase
        .from('admin_users')
        .update({ totp_enabled: false, totp_secret: null })
        .eq('id', admin_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_status') {
      const { data: admin } = await supabase
        .from('admin_users')
        .select('totp_enabled')
        .eq('id', admin_id)
        .single();

      return new Response(
        JSON.stringify({ enabled: admin?.totp_enabled || false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('TOTP error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
