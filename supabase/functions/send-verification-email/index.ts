import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEnvOrThrow(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`缺少環境變數：${key}`);
  return v;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = getEnvOrThrow("SUPABASE_URL");
    const supabaseKey = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    const actionRaw: string | undefined = body?.action;
    const codeInput: string | undefined = body?.code ?? body?.verifyCode;

    if (!email) return json({ error: "電子郵件地址不能為空" }, 400);
    if (!isValidEmail(email)) return json({ error: "電子郵件格式不正確" }, 400);

    // 兼容两套 action：
    // - main: send / verify
    // - dev : send_code / verify_code / check_verified
    const action = ((actionRaw ?? (codeInput ? "verify" : "send")) || "send").toLowerCase();

    if (action === "send" || action === "send_code") {
      // （可选）是否检查“邮箱已注册”
      // 如果你的 profiles 表不存在/不想拦截，把 ENV: CHECK_EMAIL_REGISTERED=false
      const checkRegistered = (Deno.env.get("CHECK_EMAIL_REGISTERED") ?? "true") !== "false";

      if (checkRegistered) {
        const { data: existingUser, error: existErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        // profiles 表不存在會報錯：你可以關掉 CHECK_EMAIL_REGISTERED 或改表名
        if (existErr) {
          console.warn("profiles 查詢失敗（可忽略/或關閉 CHECK_EMAIL_REGISTERED）:", existErr);
        } else if (existingUser) {
          return json({ error: "該電子郵件已被註冊" }, 400);
        }
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: upsertError } = await supabase
        .from("email_verifications")
        .upsert(
          {
            email,
            code,
            expires_at: expiresAt.toISOString(),
            verified: false,
            created_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        );

      if (upsertError) {
        console.error("儲存驗證碼失敗:", upsertError);
        throw new Error("儲存驗證碼失敗");
      }

      // SMTP from ENV（禁止硬編碼密碼）
      const smtpHost = getEnvOrThrow("SMTP_HOST");
      const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465", 10);
      const smtpUser = getEnvOrThrow("SMTP_USER");
      const smtpPass = getEnvOrThrow("SMTP_PASS");

      // denomailer: tls=true => implicit TLS (常用于 465), tls=false => STARTTLS (常用于 587)
      const smtpTlsEnv = (Deno.env.get("SMTP_TLS") ?? "").toLowerCase();
      const smtpTls = smtpTlsEnv === "true" || smtpTlsEnv === "1"
        ? true
        : smtpTlsEnv === "false" || smtpTlsEnv === "0"
          ? false
          : smtpPort === 465;

      const fromName = Deno.env.get("SMTP_FROM_NAME") || "ARX Trading";
      const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || smtpUser;
      const subject = Deno.env.get("SMTP_SUBJECT") || "電子郵件驗證碼";
      const brandFooter = Deno.env.get("SMTP_FOOTER") || "© 2024 ARX Trading. All rights reserved.";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; background-color:#f5f5f5; margin:0; padding:20px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 10px rgba(0,0,0,.08);">
            <h2 style="margin:0 0 12px 0;color:#111;text-align:center;">${subject}</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">您好，</p>
            <p style="color:#333;font-size:16px;line-height:1.6;">您的驗證碼是：</p>
            <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#d4af37;font-size:36px;font-weight:700;text-align:center;padding:18px;border-radius:10px;letter-spacing:8px;margin:18px 0;">
              ${code}
            </div>
            <p style="color:#555;font-size:14px;">驗證碼有效期為 <b>10 分鐘</b>，請盡快使用。</p>
            <p style="color:#777;font-size:13px;background:#f9f9f9;padding:12px;border-radius:8px;">
              如果這不是您的操作，請忽略此郵件。請勿將驗證碼分享給他人。
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#999;font-size:12px;text-align:center;margin:0;">${brandFooter}</p>
          </div>
        </body>
        </html>
      `;

      try {
        console.log('SMTP config:', { host: smtpHost, port: smtpPort, tls: smtpTls, fromEmail })

        const client = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: smtpPort,
            tls: smtpTls,
            auth: { username: smtpUser, password: smtpPass },
          },
        });

        await client.send({
          from: `${fromName} <${fromEmail}>`,
          to: email,
          subject,
          content: "auto",
          html: htmlContent,
        });

        await client.close();

        return json({ success: true, message: "驗證碼已發送" });
      } catch (smtpErr) {
        console.error("SMTP發送失敗:", smtpErr);
        return json({ error: "發送郵件失敗，請稍後重試" }, 500);
      }
    }

    if (action === "verify" || action === "verify_code") {
      if (!codeInput) return json({ error: "驗證碼不能為空" }, 400);

      const { data: verification, error: fetchError } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (fetchError || !verification) {
        return json({ error: "未找到驗證記錄，請重新發送驗證碼" }, 404);
      }

      if (new Date(verification.expires_at) < new Date()) {
        return json({ error: "驗證碼已過期，請重新發送" }, 400);
      }

      if (verification.code !== codeInput) {
        return json({ error: "驗證碼錯誤" }, 400);
      }

      await supabase
        .from("email_verifications")
        .update({ verified: true })
        .eq("email", email);

      return json({ success: true, verified: true, message: "電子郵件驗證成功" });
    }

    if (action === "check_verified") {
      const { data: row } = await supabase
        .from("email_verifications")
        .select("verified")
        .eq("email", email)
        .maybeSingle();

      return json({ verified: row?.verified === true });
    }

    return json({ error: "無效的操作" }, 400);
  } catch (error: unknown) {
    console.error("Error in send-verification-email:", error);
    const msg = error instanceof Error ? error.message : "操作失敗";
    return json({ error: msg }, 500);
  }
});
