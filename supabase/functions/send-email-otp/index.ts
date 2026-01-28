import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailOTPRequest {
  email: string;
  action: "send" | "verify";
  code?: string;
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTPs in memory with expiration (in production, use Redis or database)
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

    const { email, action, code }: EmailOTPRequest = await req.json();
    
    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
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

      // Rate limiting per email: max 3 requests per email per 10 minutes
      const existing = otpStore.get(email);
      if (existing && existing.attempts >= 3 && existing.expiresAt > Date.now()) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please try again later.", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otp = generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      otpStore.set(email, { 
        code: otp, 
        expiresAt, 
        attempts: (existing?.attempts || 0) + 1 
      });

      // Send email via SMTP
      const smtpHost = Deno.env.get("SMTP_HOST") || "mail.privateemail.com";
      const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPass = Deno.env.get("SMTP_PASS");

      if (!smtpUser || !smtpPass) {
        console.error("SMTP credentials not configured");
        return new Response(
          JSON.stringify({ error: "Email service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const client = new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: smtpPort,
          tls: true,
          auth: {
            username: smtpUser,
            password: smtpPass,
          },
        },
      });

      try {
        await client.send({
          from: smtpUser,
          to: email,
          subject: "Binarycent 驗證碼 / Verification Code",
          content: "auto",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; background-color: #0a0a0c; color: #ffffff; padding: 40px; }
                .container { max-width: 600px; margin: 0 auto; background: #1a1a1e; border-radius: 12px; padding: 40px; border: 1px solid #d4a54a33; }
                .logo { text-align: center; margin-bottom: 30px; color: #d4a54a; font-size: 32px; font-weight: bold; }
                .code { background: linear-gradient(135deg, #d4a54a, #c89a3a); color: #0a0a0c; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 30px 0; }
                .text { color: #888888; font-size: 14px; line-height: 1.6; text-align: center; }
                .warning { color: #f05454; font-size: 12px; margin-top: 20px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">Binarycent</div>
                <p class="text">您的驗證碼是 / Your verification code is:</p>
                <div class="code">${otp}</div>
                <p class="text">此驗證碼將在 5 分鐘後過期。<br/>This code will expire in 5 minutes.</p>
                <p class="warning">如果您沒有請求此驗證碼，請忽略此郵件。<br/>If you didn't request this code, please ignore this email.</p>
              </div>
            </body>
            </html>
          `,
        });

        await client.close();
        
        console.log(`OTP sent to ${email} from IP ${clientIp}`);
        return new Response(
          JSON.stringify({ success: true, message: "Verification code sent" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (emailError: any) {
        console.error("Email sending failed:", emailError);
        await client.close();
        return new Response(
          JSON.stringify({ error: "Failed to send email" }),
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

      const stored = otpStore.get(email);
      if (!stored) {
        return new Response(
          JSON.stringify({ error: "No verification code found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.expiresAt < Date.now()) {
        otpStore.delete(email);
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
      otpStore.delete(email);

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

      // Try to create user first, handle if already exists
      let userId: string;
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

      if (newUser?.user) {
        userId = newUser.user.id;
      } else if (createError?.message?.includes('already been registered')) {
        // User exists, list to find them
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
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
        email,
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

      console.log(`User ${email} logged in via email OTP`);
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
    console.error("Error in send-email-otp:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);