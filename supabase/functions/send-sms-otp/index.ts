import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsOTPRequest {
  phone: string;
  action: "send" | "verify";
  code?: string;
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTPs in memory with expiration
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// IP-based rate limiting store
const ipRateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean expired OTPs and IP rate limits
function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
  for (const [key, value] of ipRateLimitStore.entries()) {
    if (value.resetAt < now) {
      ipRateLimitStore.delete(key);
    }
  }
}

// Check IP rate limit
function checkIpRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const limit = 10; // Max 10 OTP requests per IP per hour
  
  const existing = ipRateLimitStore.get(ip);
  
  if (!existing || existing.resetAt < now) {
    ipRateLimitStore.set(ip, { count: 1, resetAt: now + hourMs });
    return { allowed: true };
  }
  
  if (existing.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  
  existing.count++;
  return { allowed: true };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    const { phone, action, code }: SmsOTPRequest = await req.json();
    
    if (!phone || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
    
    // Validate phone format (should start with + and contain only digits after)
    if (!/^\+?[1-9]\d{6,14}$/.test(normalizedPhone.replace("+", ""))) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    cleanExpiredEntries();

    if (action === "send") {
      // Check IP-based rate limit
      const ipCheck = checkIpRateLimit(clientIp);
      if (!ipCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            error: "Too many requests from this IP. Please try again later.", 
            code: "IP_RATE_LIMIT",
            retryAfter: ipCheck.retryAfter 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting per phone: max 3 requests per phone per 10 minutes
      const existing = otpStore.get(normalizedPhone);
      if (existing && existing.attempts >= 3 && existing.expiresAt > Date.now()) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please try again later.", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otp = generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      otpStore.set(normalizedPhone, { 
        code: otp, 
        expiresAt, 
        attempts: (existing?.attempts || 0) + 1 
      });

      // Send SMS via 短信宝 API
      const smsbaoUsername = Deno.env.get("SMSBAO_USERNAME");
      const smsbaoApikey = Deno.env.get("SMSBAO_APIKEY");

      if (!smsbaoUsername || !smsbaoApikey) {
        console.error("SMSBAO credentials not configured");
        return new Response(
          JSON.stringify({ error: "SMS service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SMS message content
      const message = `【ARX】您的验证码是${otp}，5分钟内有效，请勿泄露给他人。`;
      
      // Use 短信宝 international SMS API
      // API docs: https://www.smsbao.com/openapi/52.html
      const smsUrl = new URL("https://api.smsbao.com/wsms");
      smsUrl.searchParams.set("u", smsbaoUsername);
      smsUrl.searchParams.set("p", smsbaoApikey);
      smsUrl.searchParams.set("m", normalizedPhone);
      smsUrl.searchParams.set("c", message);

      try {
        const smsResponse = await fetch(smsUrl.toString());
        const result = await smsResponse.text();
        
        console.log(`SMSBAO response for ${normalizedPhone} from IP ${clientIp}: ${result}`);
        
        // 短信宝返回码: 0=成功, 其他=失败
        if (result !== "0") {
          const errorMessages: Record<string, string> = {
            "30": "Password error",
            "40": "Account not exist",
            "41": "Overdue account",
            "42": "IP restriction",
            "43": "Insufficient balance",
            "50": "Content error",
            "51": "Phone number format error",
          };
          
          return new Response(
            JSON.stringify({ 
              error: errorMessages[result] || `SMS sending failed (code: ${result})` 
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`OTP sent to ${normalizedPhone}`);
        return new Response(
          JSON.stringify({ success: true, message: "Verification code sent" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (smsError: any) {
        console.error("SMS sending failed:", smsError);
        return new Response(
          JSON.stringify({ error: "Failed to send SMS" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

    } else if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Verification code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stored = otpStore.get(normalizedPhone);
      if (!stored) {
        return new Response(
          JSON.stringify({ error: "No verification code found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.expiresAt < Date.now()) {
        otpStore.delete(normalizedPhone);
        return new Response(
          JSON.stringify({ error: "Verification code expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.code !== code) {
        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // OTP verified successfully, delete it
      otpStore.delete(normalizedPhone);

      // Create or sign in user using Supabase Admin
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Create a fake email from phone number for the user
      const fakeEmail = `${normalizedPhone.replace("+", "")}@phone.arx.app`;

      let userId: string;
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { phone: normalizedPhone },
      });

      if (newUser?.user) {
        userId = newUser.user.id;
      } else if (createError?.message?.includes('already been registered')) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === fakeEmail);
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "Failed to find user account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = existingUser.id;
      } else {
        console.error("User creation failed:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a magic link for passwordless login
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      });

      if (linkError || !linkData) {
        console.error("Magic link generation failed:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract token from the link and verify it to get session
      const token = linkData.properties?.hashed_token;
      
      // Use the token to verify and get session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      });

      if (verifyError || !verifyData.session) {
        console.error("Session verification failed:", verifyError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`User ${normalizedPhone} logged in via SMS OTP`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          session: verifyData.session,
          user: verifyData.user
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-sms-otp:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);