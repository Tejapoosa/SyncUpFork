/**
 * Performance optimization utilities for client-side code
 */

/**
 * Debounce function to limit how often a function can fire
 * Useful for search inputs, window resize handlers, etc.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once per interval
 * Useful for scroll handlers, mousemove handlers, etc.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load a module/component only when needed
 * Usage: const Component = await lazyLoad(() => import('./Component'))
 */
export async function lazyLoad<T>(
  importFunc: () => Promise<{ default: T }>
): Promise<T> {
  const module = await importFunc();
  return module.default;
}

/**
 * Check if code is running on server or client
 */
export const isServer = typeof window === 'undefined';
export const isClient = !isServer;

/**
 * Request idle callback wrapper for non-critical tasks
 * Falls back to setTimeout if not supported
 */
export function requestIdleCallbackPolyfill(callback: () => void, timeout = 2000) {
  if (isServer) return;

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  } else {
    return setTimeout(callback, 1);
  }
}

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Prefetch a route for faster navigation
 */
export function prefetchRoute(href: string) {
  if (isServer) return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}
