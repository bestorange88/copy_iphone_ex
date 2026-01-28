/**
 * 台湾时间工具函数 (UTC+8)
 * 全局统一使用台湾时间
 */

// 台湾时区偏移量（毫秒）
const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 获取当前台湾时间
 */
export function getTaiwanNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + TAIWAN_OFFSET_MS);
}

/**
 * 将任意日期转换为台湾时间
 */
export function toTaiwanTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + TAIWAN_OFFSET_MS);
}

/**
 * 格式化日期为台湾时间字符串
 * @param date 日期
 * @param options 格式选项
 */
export function formatTaiwanTime(
  date: Date | string | null | undefined,
  options: {
    showDate?: boolean;
    showTime?: boolean;
    showSeconds?: boolean;
  } = { showDate: true, showTime: true }
): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // 使用 Intl.DateTimeFormat 以台湾时区格式化
  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei',
    hour12: false,
  };
  
  if (options.showDate) {
    formatOptions.year = 'numeric';
    formatOptions.month = '2-digit';
    formatOptions.day = '2-digit';
  }
  
  if (options.showTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    if (options.showSeconds) {
      formatOptions.second = '2-digit';
    }
  }
  
  return new Intl.DateTimeFormat('zh-TW', formatOptions).format(d);
}

/**
 * 格式化日期为简短台湾时间字符串 (YYYY/MM/DD HH:mm)
 */
export function formatTaiwanDateTime(date: Date | string | null | undefined): string {
  return formatTaiwanTime(date, { showDate: true, showTime: true, showSeconds: false });
}

/**
 * 格式化日期为完整台湾时间字符串 (YYYY/MM/DD HH:mm:ss)
 */
export function formatTaiwanDateTimeFull(date: Date | string | null | undefined): string {
  return formatTaiwanTime(date, { showDate: true, showTime: true, showSeconds: true });
}

/**
 * 仅格式化日期 (YYYY/MM/DD)
 */
export function formatTaiwanDate(date: Date | string | null | undefined): string {
  return formatTaiwanTime(date, { showDate: true, showTime: false });
}

/**
 * 仅格式化时间 (HH:mm:ss)
 */
export function formatTaiwanTimeOnly(date: Date | string | null | undefined): string {
  return formatTaiwanTime(date, { showDate: false, showTime: true, showSeconds: true });
}

/**
 * 计算距离目标时间的剩余时间（秒）
 */
export function getSecondsRemaining(targetTime: Date | string): number {
  const target = typeof targetTime === 'string' ? new Date(targetTime) : targetTime;
  const now = new Date();
  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

/**
 * 格式化剩余时间 (MM:SS 或 已到期)
 */
export function formatTimeRemaining(targetTime: Date | string, t?: (key: string) => string): string {
  const seconds = getSecondsRemaining(targetTime);
  
  if (seconds <= 0) {
    return t ? t('common.expired') : '已到期';
  }
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化货币金额 (统一使用 USDT)
 */
export function formatUSDT(amount: number | string | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return '0.00 USDT';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00 USDT';
  return `${num.toFixed(decimals)} USDT`;
}

/**
 * 格式化带符号的货币金额
 */
export function formatUSDTWithSign(amount: number | string | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return '0.00 USDT';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00 USDT';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)} USDT`;
}
