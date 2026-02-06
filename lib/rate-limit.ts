/**
 * Rate Limiting Utilities
 * Implements sliding window rate limiting with in-memory storage
 */

import { AppError, ErrorMessages } from './errors';

interface RateLimit {
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60000; // 1 minute

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(userId: string, limits: RateLimit): number {
  const now = Date.now();
  const key = `ratelimit:${userId}`;

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + limits.windowMs,
    };
    rateLimitStore.set(key, entry);
    return 1;
  }

  entry.count++;

  if (entry.count > limits.limit) {
    const waitTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);
    throw new AppError({
      ...ErrorMessages.RATE_LIMIT_EXCEEDED(
        limits.limit,
        `${Math.round(limits.windowMs / 1000)}s`
      ),
      originalError: new Error(`Rate limit exceeded: ${entry.count}/${limits.limit}`),
    });
  }

  return entry.count;
}

/**
 * Reset rate limit for a user
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(`ratelimit:${userId}`);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(userId: string, limits: RateLimit) {
  const key = `ratelimit:${userId}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      current: 0,
      limit: limits.limit,
      remaining: limits.limit,
      resetTime: Date.now() + limits.windowMs,
      resetIn: limits.windowMs,
    };
  }

  const now = Date.now();
  if (entry.resetTime < now) {
    return {
      current: 0,
      limit: limits.limit,
      remaining: limits.limit,
      resetTime: now + limits.windowMs,
      resetIn: limits.windowMs,
    };
  }

  return {
    current: entry.count,
    limit: limits.limit,
    remaining: Math.max(0, limits.limit - entry.count),
    resetTime: entry.resetTime,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Predefined rate limits
 */
export const RateLimits = {
  // Chat endpoints
  CHAT_MESSAGES: {
    limit: 50,
    windowMs: 86400000, // 24 hours
  } as RateLimit,

  // RAG processing
  RAG_PROCESS: {
    limit: 10,
    windowMs: 3600000, // 1 hour
  } as RateLimit,

  // Meeting creation
  CREATE_MEETING: {
    limit: 100,
    windowMs: 86400000, // 24 hours
  } as RateLimit,

  // Integration sync
  INTEGRATION_SYNC: {
    limit: 30,
    windowMs: 3600000, // 1 hour
  } as RateLimit,

  // Webhook processing
  WEBHOOK_PROCESS: {
    limit: 1000,
    windowMs: 3600000, // 1 hour
  } as RateLimit,

  // General API
  GENERAL_API: {
    limit: 100,
    windowMs: 60000, // 1 minute
  } as RateLimit,
};

/**
 * Usage quota tracking (per user, per period)
 */
export class UsageQuota {
  private quotaStore = new Map<string, number>();

  increment(userId: string, amount: number = 1): number {
    const current = this.quotaStore.get(userId) || 0;
    const newTotal = current + amount;
    this.quotaStore.set(userId, newTotal);
    return newTotal;
  }

  getCurrent(userId: string): number {
    return this.quotaStore.get(userId) || 0;
  }

  checkQuota(userId: string, limit: number): boolean {
    const current = this.getCurrent(userId);
    return current < limit;
  }

  reset(userId: string): void {
    this.quotaStore.delete(userId);
  }

  resetAll(): void {
    this.quotaStore.clear();
  }
}

export const dailyQuota = new UsageQuota();
export const monthlyQuota = new UsageQuota();
