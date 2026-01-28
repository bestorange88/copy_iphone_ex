import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  notification_type: "login" | "withdrawal" | "deposit" | "trade";
  details?: Record<string, any>;
}

// Multi-language translations
const translations: Record<string, Record<string, Record<string, string>>> = {
  login: {
    "zh-CN": {
      title: "🔐 账户登录提醒",
      dear: "尊敬的用户",
      message: "您的账户刚刚成功登录。",
      login_time: "登录时间",
      ip_address: "IP地址",
      device: "设备信息",
      warning: "⚠️ 如果这不是您本人操作，请立即修改密码并联系客服。",
      subject: "Binarycent 登录提醒",
    },
    "zh-TW": {
      title: "🔐 帳戶登入提醒",
      dear: "尊敬的用戶",
      message: "您的帳戶剛剛成功登入。",
      login_time: "登入時間",
      ip_address: "IP地址",
      device: "設備資訊",
      warning: "⚠️ 如果這不是您本人操作，請立即修改密碼並聯繫客服。",
      subject: "Binarycent 登入提醒",
    },
    en: {
      title: "🔐 Account Login Alert",
      dear: "Dear",
      message: "Your account has just been logged in.",
      login_time: "Login Time",
      ip_address: "IP Address",
      device: "Device",
      warning: "⚠️ If this was not you, please change your password immediately and contact support.",
      subject: "Binarycent Login Alert",
    },
    ja: {
      title: "🔐 アカウントログイン通知",
      dear: "お客様",
      message: "お客様のアカウントにログインがありました。",
      login_time: "ログイン時刻",
      ip_address: "IPアドレス",
      device: "デバイス",
      warning: "⚠️ 心当たりがない場合は、すぐにパスワードを変更し、サポートにご連絡ください。",
      subject: "Binarycent ログイン通知",
    },
    ko: {
      title: "🔐 계정 로그인 알림",
      dear: "고객님",
      message: "귀하의 계정에 로그인이 발생했습니다.",
      login_time: "로그인 시간",
      ip_address: "IP 주소",
      device: "기기",
      warning: "⚠️ 본인이 아닌 경우, 즉시 비밀번호를 변경하고 고객센터에 연락해 주세요.",
      subject: "Binarycent 로그인 알림",
    },
  },
  withdrawal: {
    "zh-CN": {
      title: "💰 提款申请已提交",
      dear: "尊敬的用户",
      message: "您的提款申请已成功提交，正在处理中。",
      amount: "提款金额",
      network: "网络",
      to_address: "目标地址",
      fee: "手续费",
      request_time: "申请时间",
      warning: "⚠️ 如果这不是您本人操作，请立即联系客服冻结账户。",
      subject: "Binarycent 提款申请通知",
    },
    "zh-TW": {
      title: "💰 提款申請已提交",
      dear: "尊敬的用戶",
      message: "您的提款申請已成功提交，正在處理中。",
      amount: "提款金額",
      network: "網絡",
      to_address: "目標地址",
      fee: "手續費",
      request_time: "申請時間",
      warning: "⚠️ 如果這不是您本人操作，請立即聯繫客服凍結帳戶。",
      subject: "Binarycent 提款申請通知",
    },
    en: {
      title: "💰 Withdrawal Request Submitted",
      dear: "Dear",
      message: "Your withdrawal request has been submitted and is being processed.",
      amount: "Amount",
      network: "Network",
      to_address: "To Address",
      fee: "Fee",
      request_time: "Request Time",
      warning: "⚠️ If this was not you, please contact support immediately to freeze your account.",
      subject: "Binarycent Withdrawal Request",
    },
    ja: {
      title: "💰 出金申請が送信されました",
      dear: "お客様",
      message: "出金申請が送信され、処理中です。",
      amount: "金額",
      network: "ネットワーク",
      to_address: "送金先アドレス",
      fee: "手数料",
      request_time: "申請時刻",
      warning: "⚠️ 心当たりがない場合は、すぐにサポートに連絡してアカウントを凍結してください。",
      subject: "Binarycent 出金申請通知",
    },
    ko: {
      title: "💰 출금 신청이 제출되었습니다",
      dear: "고객님",
      message: "출금 신청이 제출되었으며 처리 중입니다.",
      amount: "금액",
      network: "네트워크",
      to_address: "받는 주소",
      fee: "수수료",
      request_time: "신청 시간",
      warning: "⚠️ 본인이 아닌 경우, 즉시 고객센터에 연락하여 계정을 동결해 주세요.",
      subject: "Binarycent 출금 신청 알림",
    },
  },
  deposit: {
    "zh-CN": {
      title: "✅ 充值到账通知",
      dear: "尊敬的用户",
      message: "您的充值已成功到账！",
      amount: "充值金额",
      network: "网络",
      tx_hash: "交易哈希",
      subject: "Binarycent 充值到账通知",
    },
    "zh-TW": {
      title: "✅ 充值到帳通知",
      dear: "尊敬的用戶",
      message: "您的充值已成功到帳！",
      amount: "充值金額",
      network: "網絡",
      tx_hash: "交易哈希",
      subject: "Binarycent 充值到帳通知",
    },
    en: {
      title: "✅ Deposit Confirmed",
      dear: "Dear",
      message: "Your deposit has been successfully credited!",
      amount: "Amount",
      network: "Network",
      tx_hash: "Transaction Hash",
      subject: "Binarycent Deposit Confirmed",
    },
    ja: {
      title: "✅ 入金完了通知",
      dear: "お客様",
      message: "入金が完了しました！",
      amount: "金額",
      network: "ネットワーク",
      tx_hash: "トランザクションハッシュ",
      subject: "Binarycent 入金完了通知",
    },
    ko: {
      title: "✅ 입금 완료 알림",
      dear: "고객님",
      message: "입금이 완료되었습니다!",
      amount: "금액",
      network: "네트워크",
      tx_hash: "트랜잭션 해시",
      subject: "Binarycent 입금 완료 알림",
    },
  },
  trade: {
    "zh-CN": {
      title: "📈 交易通知",
      dear: "尊敬的用户",
      message: "您的交易已完成。",
      symbol: "交易对",
      side: "方向",
      amount: "金额",
      profit: "盈亏",
      subject: "Binarycent 交易通知",
    },
    "zh-TW": {
      title: "📈 交易通知",
      dear: "尊敬的用戶",
      message: "您的交易已完成。",
      symbol: "交易對",
      side: "方向",
      amount: "金額",
      profit: "盈虧",
      subject: "Binarycent 交易通知",
    },
    en: {
      title: "📈 Trade Notification",
      dear: "Dear",
      message: "Your trade has been completed.",
      symbol: "Symbol",
      side: "Side",
      amount: "Amount",
      profit: "P/L",
      subject: "Binarycent Trade Notification",
    },
    ja: {
      title: "📈 取引通知",
      dear: "お客様",
      message: "取引が完了しました。",
      symbol: "取引ペア",
      side: "方向",
      amount: "金額",
      profit: "損益",
      subject: "Binarycent 取引通知",
    },
    ko: {
      title: "📈 거래 알림",
      dear: "고객님",
      message: "거래가 완료되었습니다.",
      symbol: "거래쌍",
      side: "방향",
      amount: "금액",
      profit: "손익",
      subject: "Binarycent 거래 알림",
    },
  },
  common: {
    "zh-CN": {
      footer_auto: "此邮件由系统自动发送，请勿回复。",
      footer_copyright: "保留所有权利。",
    },
    "zh-TW": {
      footer_auto: "此郵件由系統自動發送，請勿回覆。",
      footer_copyright: "保留所有權利。",
    },
    en: {
      footer_auto: "This is an automated message, please do not reply.",
      footer_copyright: "All rights reserved.",
    },
    ja: {
      footer_auto: "これは自動送信メールです。返信しないでください。",
      footer_copyright: "All rights reserved.",
    },
    ko: {
      footer_auto: "이 메일은 자동 발송되었습니다. 회신하지 마세요.",
      footer_copyright: "All rights reserved.",
    },
  },
};

// Get translation with fallback
const getTranslation = (type: string, lang: string, key: string): string => {
  const langKey = lang.startsWith("zh-TW") ? "zh-TW" : 
                  lang.startsWith("zh") ? "zh-CN" : 
                  lang.startsWith("ja") ? "ja" :
                  lang.startsWith("ko") ? "ko" : "en";
  
  return translations[type]?.[langKey]?.[key] || 
         translations[type]?.["en"]?.[key] || 
         key;
};

const getEmailTemplate = (
  type: string,
  username: string,
  details: Record<string, any>,
  language: string = "zh-CN"
) => {
  const t = (key: string) => getTranslation(type, language, key);
  const tc = (key: string) => getTranslation("common", language, key);

  let contentHtml = "";
  let titleColor = "#d4a54a";

  switch (type) {
    case "login":
      contentHtml = `
        <h2 style="color: ${titleColor}; margin-bottom: 20px;">${t("title")}</h2>
        <p>${t("dear")} <strong>${username}</strong>,</p>
        <p>${t("message")}</p>
        <div class="info-box">
          <p><strong>${t("login_time")}:</strong> ${details.login_time || new Date().toLocaleString()}</p>
          <p><strong>${t("ip_address")}:</strong> ${details.ip_address || "Unknown"}</p>
          <p><strong>${t("device")}:</strong> ${details.device || "Unknown"}</p>
        </div>
        <p class="warning">${t("warning")}</p>
      `;
      break;

    case "withdrawal":
      contentHtml = `
        <h2 style="color: ${titleColor}; margin-bottom: 20px;">${t("title")}</h2>
        <p>${t("dear")} <strong>${username}</strong>,</p>
        <p>${t("message")}</p>
        <div class="info-box">
          <p><strong>${t("amount")}:</strong> ${details.amount} ${details.coin_symbol}</p>
          <p><strong>${t("network")}:</strong> ${details.network}</p>
          <p><strong>${t("to_address")}:</strong> <span class="address">${details.to_address}</span></p>
          <p><strong>${t("fee")}:</strong> ${details.fee} ${details.coin_symbol}</p>
          <p><strong>${t("request_time")}:</strong> ${details.request_time || new Date().toLocaleString()}</p>
        </div>
        <p class="warning">${t("warning")}</p>
      `;
      break;

    case "deposit":
      titleColor = "#4ade80";
      contentHtml = `
        <h2 style="color: ${titleColor}; margin-bottom: 20px;">${t("title")}</h2>
        <p>${t("dear")} <strong>${username}</strong>,</p>
        <p>${t("message")}</p>
        <div class="info-box">
          <p><strong>${t("amount")}:</strong> ${details.amount} ${details.coin_symbol}</p>
          <p><strong>${t("network")}:</strong> ${details.network}</p>
          <p><strong>${t("tx_hash")}:</strong> <span class="address">${details.tx_hash || "N/A"}</span></p>
        </div>
      `;
      break;

    case "trade":
      contentHtml = `
        <h2 style="color: ${titleColor}; margin-bottom: 20px;">${t("title")}</h2>
        <p>${t("dear")} <strong>${username}</strong>,</p>
        <p>${t("message")}</p>
        <div class="info-box">
          <p><strong>${t("symbol")}:</strong> ${details.symbol}</p>
          <p><strong>${t("side")}:</strong> ${details.side}</p>
          <p><strong>${t("amount")}:</strong> ${details.amount}</p>
          <p><strong>${t("profit")}:</strong> ${details.profit || "0"} USDT</p>
        </div>
      `;
      break;

    default:
      contentHtml = `<p>${t("message")}</p>`;
  }

  return {
    subject: t("subject"),
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', 'Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', Arial, sans-serif; 
            background-color: #0a0a0c; 
            color: #ffffff; 
            padding: 20px;
            margin: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: linear-gradient(135deg, #1a1a1e 0%, #141416 100%); 
            border-radius: 16px; 
            padding: 40px; 
            border: 1px solid #d4a54a33;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          }
          .logo { 
            text-align: center; 
            margin-bottom: 30px; 
            color: #d4a54a; 
            font-size: 24px; 
            font-weight: bold;
            letter-spacing: 2px;
          }
          .content { 
            color: #e0e0e0; 
            font-size: 15px; 
            line-height: 1.8; 
          }
          .content p {
            margin: 12px 0;
          }
          .info-box {
            background: rgba(212, 165, 74, 0.1);
            border: 1px solid #d4a54a33;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
          }
          .info-box p {
            margin: 10px 0;
            color: #c0c0c0;
          }
          .info-box strong {
            color: #d4a54a;
          }
          .address {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            word-break: break-all;
            color: #888;
          }
          .warning { 
            background: linear-gradient(135deg, rgba(240, 84, 84, 0.15) 0%, rgba(240, 84, 84, 0.05) 100%);
            border: 1px solid rgba(240, 84, 84, 0.3);
            color: #f05454; 
            font-size: 13px; 
            padding: 15px;
            border-radius: 8px;
            margin-top: 25px; 
          }
          .footer { 
            color: #666; 
            font-size: 12px; 
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
          }
          .footer a {
            color: #d4a54a;
            text-decoration: none;
          }
          @media only screen and (max-width: 600px) {
            .container {
              padding: 20px;
            }
            body {
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">✦ BINARYCENT ✦</div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p>${tc("footer_auto")}</p>
            <p>© ${new Date().getFullYear()} Binarycent. ${tc("footer_copyright")}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, notification_type, details = {} }: NotificationRequest = await req.json();

    if (!user_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user profile and email with language preference
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, email, language_preference")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to get user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use user's language preference, default to zh-CN
    const userLanguage = profile.language_preference || "zh-CN";

    // Get SMTP configuration
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

    // Generate email content with user's language
    const { subject, html } = getEmailTemplate(
      notification_type,
      profile.username || profile.email.split("@")[0],
      details,
      userLanguage
    );

    // Send email
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
        to: profile.email,
        subject,
        content: "auto",
        html,
      });

      await client.close();

      console.log(`Notification email (${notification_type}) sent to ${profile.email} in ${userLanguage}`);
      
      return new Response(
        JSON.stringify({ success: true, message: "Notification sent", language: userLanguage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError: any) {
      console.error("Failed to send notification email:", emailError);
      await client.close();
      
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
