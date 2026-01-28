import { useCallback, useEffect, useState } from 'react';
import { useBrowserNotification } from './useBrowserNotification';

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  currentPrice?: number;
}

export interface TradingSignal {
  symbol: string;
  action: 'buy' | 'sell';
  confidence: number;
  reason?: string;
}

export const usePushNotification = () => {
  const { permission, requestPermission, sendNotification, isSupported } = useBrowserNotification();
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // Load saved alerts from localStorage
  useEffect(() => {
    const savedAlerts = localStorage.getItem('price_alerts');
    if (savedAlerts) {
      try {
        setPriceAlerts(JSON.parse(savedAlerts));
      } catch {
        // Ignore parse errors
      }
    }

    const enabled = localStorage.getItem('push_notification_enabled');
    setNotificationEnabled(enabled === 'true');
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('price_alerts', JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  const enableNotifications = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      setNotificationEnabled(true);
      localStorage.setItem('push_notification_enabled', 'true');
      
      // Send a test notification
      sendNotification('通知已啟用', {
        body: '您現在可以接收價格提醒和交易信號通知了！',
        tag: 'notification-enabled',
      });
    }
    return granted;
  }, [requestPermission, sendNotification]);

  const disableNotifications = useCallback(() => {
    setNotificationEnabled(false);
    localStorage.setItem('push_notification_enabled', 'false');
  }, []);

  const addPriceAlert = useCallback((alert: PriceAlert) => {
    setPriceAlerts(prev => {
      // Check if alert already exists
      const exists = prev.some(
        a => a.symbol === alert.symbol && 
             a.targetPrice === alert.targetPrice && 
             a.direction === alert.direction
      );
      if (exists) return prev;
      return [...prev, alert];
    });
  }, []);

  const removePriceAlert = useCallback((index: number) => {
    setPriceAlerts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setPriceAlerts([]);
  }, []);

  const checkPriceAlert = useCallback((symbol: string, currentPrice: number) => {
    if (!notificationEnabled || permission !== 'granted') return;

    priceAlerts.forEach((alert, index) => {
      if (alert.symbol !== symbol) return;

      const triggered = 
        (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.direction === 'below' && currentPrice <= alert.targetPrice);

      if (triggered) {
        const direction = alert.direction === 'above' ? '突破' : '跌破';
        sendNotification(`📊 ${symbol} 價格提醒`, {
          body: `${symbol} 已${direction} ${alert.targetPrice} USDT\n當前價格: ${currentPrice} USDT`,
          tag: `price-alert-${symbol}-${index}`,
          requireInteraction: true,
        });

        // Remove triggered alert
        removePriceAlert(index);
      }
    });
  }, [notificationEnabled, permission, priceAlerts, sendNotification, removePriceAlert]);

  const sendTradingSignal = useCallback((signal: TradingSignal) => {
    if (!notificationEnabled || permission !== 'granted') return;

    const emoji = signal.action === 'buy' ? '🟢' : '🔴';
    const action = signal.action === 'buy' ? '買入' : '賣出';
    const confidence = Math.round(signal.confidence * 100);

    sendNotification(`${emoji} ${signal.symbol} 交易信號`, {
      body: `建議${action} | 信心度: ${confidence}%${signal.reason ? `\n原因: ${signal.reason}` : ''}`,
      tag: `trading-signal-${signal.symbol}-${Date.now()}`,
      requireInteraction: true,
    });
  }, [notificationEnabled, permission, sendNotification]);

  const sendDepositNotification = useCallback((amount: number, currency: string) => {
    if (!notificationEnabled || permission !== 'granted') return;

    sendNotification('💰 充值到賬', {
      body: `您已成功充值 ${amount} ${currency}`,
      tag: `deposit-${Date.now()}`,
    });
  }, [notificationEnabled, permission, sendNotification]);

  const sendWithdrawNotification = useCallback((status: 'approved' | 'rejected', amount: number, currency: string) => {
    if (!notificationEnabled || permission !== 'granted') return;

    const emoji = status === 'approved' ? '✅' : '❌';
    const statusText = status === 'approved' ? '已批准' : '已拒絕';

    sendNotification(`${emoji} 提現${statusText}`, {
      body: `您的 ${amount} ${currency} 提現請求${statusText}`,
      tag: `withdraw-${Date.now()}`,
    });
  }, [notificationEnabled, permission, sendNotification]);

  const sendOrderFilledNotification = useCallback((symbol: string, side: string, amount: number, price: number) => {
    if (!notificationEnabled || permission !== 'granted') return;

    const emoji = side === 'buy' ? '🟢' : '🔴';
    const action = side === 'buy' ? '買入' : '賣出';

    sendNotification(`${emoji} 訂單成交`, {
      body: `${symbol} ${action} ${amount} @ ${price}`,
      tag: `order-filled-${Date.now()}`,
    });
  }, [notificationEnabled, permission, sendNotification]);

  return {
    isSupported,
    permission,
    notificationEnabled,
    priceAlerts,
    enableNotifications,
    disableNotifications,
    addPriceAlert,
    removePriceAlert,
    clearAllAlerts,
    checkPriceAlert,
    sendTradingSignal,
    sendDepositNotification,
    sendWithdrawNotification,
    sendOrderFilledNotification,
  };
};
