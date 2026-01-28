import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { SignJWT, jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts'
import { encode as base32Encode } from 'https://deno.land/std@0.168.0/encoding/base32.ts'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

// TOTP helper functions
function generateTotpSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes).replace(/=/g, '')
}

function generateTotpQrCode(secret: string, username: string): string {
  const issuer = 'ARX Admin'
  const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`
}

async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const timeStep = 30
  const digits = 6
  const currentTime = Math.floor(Date.now() / 1000)
  
  // Check current and adjacent time windows for clock drift tolerance
  for (const offset of [-1, 0, 1]) {
    const counter = Math.floor((currentTime / timeStep) + offset)
    const expectedCode = await generateTotpCode(secret, counter, digits)
    if (expectedCode === code) {
      return true
    }
  }
  return false
}

async function generateTotpCode(secret: string, counter: number, digits: number): Promise<string> {
  // Decode base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const secretBytes: number[] = []
  let bits = 0
  let value = 0
  
  for (const char of secret.toUpperCase()) {
    const idx = base32Chars.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      secretBytes.push((value >> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  
  // Convert counter to 8-byte big-endian
  const counterBytes = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  
  // HMAC-SHA1
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(secretBytes),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, counterBytes)
  const hash = new Uint8Array(signature)
  
  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f
  const binary = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff)
  
  const otp = binary % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Secret key for admin JWT tokens - MUST be configured in environment
const adminJwtSecretValue = Deno.env.get('ADMIN_JWT_SECRET')
if (!adminJwtSecretValue) {
  console.error('CRITICAL: ADMIN_JWT_SECRET environment variable is not configured')
}
const ADMIN_JWT_SECRET = new TextEncoder().encode(adminJwtSecretValue || '')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Check if ADMIN_JWT_SECRET is configured
  if (!adminJwtSecretValue) {
    console.error('Admin login failed: ADMIN_JWT_SECRET not configured')
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { action, username, password, token, admin_id, current_password, new_password, totp_code, totp_secret } = body

    if (action === 'login') {
      // Verify admin credentials using database function
      const { data, error } = await supabase.rpc('verify_admin_password', {
        _username: username,
        _password: password
      })

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!data || data.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const admin = data[0]

      // Check if TOTP is enabled
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('totp_enabled')
        .eq('id', admin.admin_id)
        .single()

      if (adminData?.totp_enabled) {
        // TOTP is required, return pending state
        return new Response(
          JSON.stringify({ 
            success: true, 
            requiresTotp: true,
            adminId: admin.admin_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate admin JWT token
      const adminToken = await new SignJWT({ 
        admin_id: admin.admin_id, 
        username: admin.admin_username,
        type: 'admin'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(ADMIN_JWT_SECRET)

      console.log(`Admin login successful: ${admin.admin_username}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          token: adminToken,
          admin: {
            id: admin.admin_id,
            username: admin.admin_username
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'complete_totp_login') {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id, username')
        .eq('id', admin_id)
        .single()

      if (!adminData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const adminToken = await new SignJWT({ 
        admin_id: adminData.id, 
        username: adminData.username,
        type: 'admin'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(ADMIN_JWT_SECRET)

      return new Response(
        JSON.stringify({ 
          success: true, 
          token: adminToken,
          admin: {
            id: adminData.id,
            username: adminData.username
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify') {
      // Verify admin token
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No token provided' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET)
        
        if (payload.type !== 'admin') {
          throw new Error('Invalid token type')
        }

        return new Response(
          JSON.stringify({ 
            valid: true, 
            admin: {
              id: payload.admin_id,
              username: payload.username
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (verifyError) {
        console.error('Token verification failed:', verifyError)
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get security settings
    if (action === 'get_security_settings') {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('totp_enabled')
        .eq('id', admin_id)
        .single()

      return new Response(
        JSON.stringify({ totp_enabled: adminData?.totp_enabled || false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Change password
    if (action === 'change_password') {
      // Get admin username
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('username')
        .eq('id', admin_id)
        .single()

      if (!adminData) {
        return new Response(
          JSON.stringify({ success: false, error: '管理員不存在' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify current password
      const { data: verifyData } = await supabase.rpc('verify_admin_password', {
        _username: adminData.username,
        _password: current_password
      })

      if (!verifyData || verifyData.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: '當前密碼錯誤' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update password using database function
      const { error: updateError } = await supabase.rpc('update_admin_password', {
        _admin_id: admin_id,
        _new_password: new_password
      })

      if (updateError) {
        console.error('Failed to update password:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: '密碼更新失敗' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Setup TOTP
    if (action === 'setup_totp') {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('username')
        .eq('id', admin_id)
        .single()

      if (!adminData) {
        return new Response(
          JSON.stringify({ success: false, error: '管理員不存在' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const secret = generateTotpSecret()
      const qrCode = generateTotpQrCode(secret, adminData.username)

      return new Response(
        JSON.stringify({ success: true, secret, qr_code: qrCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify TOTP setup
    if (action === 'verify_totp_setup') {
      const isValid = await verifyTotp(totp_secret, totp_code)
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: '驗證碼錯誤' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Save TOTP secret and enable TOTP
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ totp_secret: totp_secret, totp_enabled: true })
        .eq('id', admin_id)

      if (updateError) {
        console.error('Failed to enable TOTP:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: '啟用失敗' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify TOTP during login
    if (action === 'verify_totp_login') {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id, username, totp_secret')
        .eq('id', admin_id)
        .single()

      if (!adminData || !adminData.totp_secret) {
        return new Response(
          JSON.stringify({ success: false, error: '管理員不存在或未啟用二次驗證' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const isValid = await verifyTotp(adminData.totp_secret, totp_code)
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: '驗證碼錯誤' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate token
      const adminToken = await new SignJWT({ 
        admin_id: adminData.id, 
        username: adminData.username,
        type: 'admin'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(ADMIN_JWT_SECRET)

      return new Response(
        JSON.stringify({ 
          success: true, 
          token: adminToken,
          admin: {
            id: adminData.id,
            username: adminData.username
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Disable TOTP
    if (action === 'disable_totp') {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ totp_secret: null, totp_enabled: false })
        .eq('id', admin_id)

      if (updateError) {
        console.error('Failed to disable TOTP:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: '關閉失敗' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in admin-login:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
