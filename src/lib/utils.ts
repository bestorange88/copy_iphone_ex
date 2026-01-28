import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export timezone utilities for convenience
export {
  getTaiwanNow,
  toTaiwanTime,
  formatTaiwanTime,
  formatTaiwanDateTime,
  formatTaiwanDateTimeFull,
  formatTaiwanDate,
  formatTaiwanTimeOnly,
  getSecondsRemaining,
  formatTimeRemaining,
  formatUSDT,
  formatUSDTWithSign
} from './timezone';
