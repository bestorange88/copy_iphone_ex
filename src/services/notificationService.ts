import { supabase } from "@/integrations/supabase/client";

interface NotificationDetails {
  [key: string]: any;
}

export type NotificationType = "login" | "withdrawal" | "deposit" | "trade";

/**
 * Send email notification to user
 * This is a fire-and-forget operation - it won't block the main flow
 */
export const sendNotificationEmail = async (
  userId: string,
  notificationType: NotificationType,
  details: NotificationDetails = {}
): Promise<void> => {
  try {
    // Check if user has enabled notifications (stored in localStorage for now)
    const notificationSettings = localStorage.getItem("notificationSettings");
    let settings = { login: true, withdrawal: true, deposit: true, trade: true };
    
    if (notificationSettings) {
      try {
        settings = JSON.parse(notificationSettings);
      } catch {
        // Use default settings if parsing fails
      }
    }

    // Check if this notification type is enabled
    const notificationTypeMap: Record<NotificationType, keyof typeof settings> = {
      login: "login",
      withdrawal: "withdrawal",
      deposit: "deposit",
      trade: "trade",
    };

    const settingKey = notificationTypeMap[notificationType];
    if (!settings[settingKey]) {
      console.log(`Notification type ${notificationType} is disabled by user`);
      return;
    }

    // Call the edge function to send notification email
    const response = await supabase.functions.invoke("send-notification-email", {
      body: {
        user_id: userId,
        notification_type: notificationType,
        details: {
          ...details,
          request_time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        },
      },
    });

    if (response.error) {
      console.error("Failed to send notification email:", response.error);
    } else {
      console.log(`Notification email (${notificationType}) sent successfully`);
    }
  } catch (error) {
    // Don't throw - just log the error so it doesn't break the main flow
    console.error("Error sending notification email:", error);
  }
};

/**
 * Send login notification
 */
export const sendLoginNotification = async (
  userId: string,
  ipAddress?: string,
  device?: string
): Promise<void> => {
  return sendNotificationEmail(userId, "login", {
    login_time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    ip_address: ipAddress || "Unknown",
    device: device || navigator.userAgent.substring(0, 100) || "Unknown",
  });
};

/**
 * Send withdrawal notification
 */
export const sendWithdrawalNotification = async (
  userId: string,
  amount: number,
  coinSymbol: string,
  network: string,
  toAddress: string,
  fee: number
): Promise<void> => {
  return sendNotificationEmail(userId, "withdrawal", {
    amount: amount.toString(),
    coin_symbol: coinSymbol,
    network,
    to_address: toAddress,
    fee: fee.toString(),
  });
};

/**
 * Send deposit notification
 */
export const sendDepositNotification = async (
  userId: string,
  amount: number,
  coinSymbol: string,
  network: string,
  txHash?: string
): Promise<void> => {
  return sendNotificationEmail(userId, "deposit", {
    amount: amount.toString(),
    coin_symbol: coinSymbol,
    network,
    tx_hash: txHash || "N/A",
  });
};

/**
 * Send trade notification
 */
export const sendTradeNotification = async (
  userId: string,
  symbol: string,
  side: string,
  amount: number,
  profit?: number
): Promise<void> => {
  return sendNotificationEmail(userId, "trade", {
    symbol,
    side,
    amount: amount.toString(),
    profit: profit?.toString() || "0",
  });
};
