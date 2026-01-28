/**
 * Performance utilities for the application
 */

// Debounce function for search inputs, etc.
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// Throttle function for scroll events, etc.
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Request idle callback polyfill
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(cb, 1);

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

// Schedule low-priority work
export function scheduleIdleWork(callback: () => void, timeout: number = 2000): number {
  return requestIdleCallback(callback, { timeout });
}

// Batch DOM updates
export function batchDomUpdates(updates: (() => void)[]): void {
  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
}

// Measure render performance
export function measureRenderTime(label: string): () => void {
  if (process.env.NODE_ENV !== 'production') {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    };
  }
  return () => {};
}

// Lazy initialization helper
export function lazyInit<T>(factory: () => T): () => T {
  let instance: T | null = null;
  return () => {
    if (instance === null) {
      instance = factory();
    }
    return instance;
  };
}

// Memory-efficient array operations
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Efficient object comparison
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every((key) => obj1[key] === obj2[key]);
}

// Format numbers efficiently (cached)
const numberFormatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const key = JSON.stringify(options || {});
  let formatter = numberFormatters.get(key);
  
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, options);
    numberFormatters.set(key, formatter);
  }
  
  return formatter.format(value);
}

// Format dates efficiently (cached)
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const key = JSON.stringify(options || {});
  let formatter = dateFormatters.get(key);
  
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(undefined, options);
    dateFormatters.set(key, formatter);
  }
  
  return formatter.format(typeof date === 'string' || typeof date === 'number' ? new Date(date) : date);
}
