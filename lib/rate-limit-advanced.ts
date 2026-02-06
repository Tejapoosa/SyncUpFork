/**
 * Advanced Rate Limiting Middleware
 * Multi-level rate limiting: global, per-user, per-IP, per-endpoint
 */

import { Request, Response } from 'next';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response, context: RateLimitContext) => void;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, key: string) => Promise<void>;
}

export interface RateLimitContext {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  exceeded: boolean;
}

export interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastReset: number;
}

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueUsers: Set<string>;
  uniqueIPs: Set<string>;
  topViolators: Map<string, number>;
}

// ============================================================================
// STORAGE (In-Memory)
// ============================================================================

class RateLimitStore {
  private store: Map<string, RateLimitRecord> = new Map();
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    uniqueUsers: new Set(),
    uniqueIPs: new Set(),
    topViolators: new Map(),
  };

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  getMetrics(): RateLimitMetrics {
    return {
      ...this.metrics,
      totalRequests: this.metrics.totalRequests,
      blockedRequests: this.metrics.blockedRequests,
    };
  }

  recordRequest(): void {
    this.metrics.totalRequests++;
  }

  recordBlocked(key: string): void {
    this.metrics.blockedRequests++;
    const current = this.metrics.topViolators.get(key) || 0;
    this.metrics.topViolators.set(key, current + 1);
  }

  recordUser(userId: string): void {
    this.metrics.uniqueUsers.add(userId);
  }

  recordIP(ip: string): void {
    this.metrics.uniqueIPs.add(ip);
  }

  cleanup(now: number): void {
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// ============================================================================
// RATE LIMITER IMPLEMENTATION
// ============================================================================

export class RateLimiter {
  private store = new RateLimitStore();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req: Request) => getClientIP(req),
      ...config,
    };

    // Cleanup old entries periodically
    setInterval(() => {
      this.store.cleanup(Date.now());
    }, this.config.windowMs);
  }

  /**
   * Check rate limit
   */
  checkLimit(req: Request): RateLimitContext {
    this.store.recordRequest();

    if (this.config.skip?.(req)) {
      return {
        limit: this.config.maxRequests,
        current: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        exceeded: false,
      };
    }

    const key = this.config.keyGenerator!(req);
    const now = Date.now();

    this.store.recordIP(key);

    let record = this.store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
        lastReset: now,
      };
    }

    record.count++;
    this.store.set(key, record);

    const exceeded = record.count > this.config.maxRequests;

    if (exceeded) {
      this.store.recordBlocked(key);
      this.config.onLimitReached?.(req, key);
    }

    return {
      limit: this.config.maxRequests,
      current: record.count,
      remaining: Math.max(0, this.config.maxRequests - record.count),
      resetTime: record.resetTime,
      exceeded,
    };
  }

  /**
   * Reset limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return this.store.getMetrics();
  }
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RateLimitConfigs = {
  // Strict: For sensitive operations
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },

  // Standard: For general API endpoints
  standard: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  // Relaxed: For read-only operations
  relaxed: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Per-user: Based on authenticated user
  perUser: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    keyGenerator: (req: Request) => {
      const userId = extractUserId(req);
      return userId || getClientIP(req);
    },
  },

  // Per-endpoint: Specific to endpoint
  perEndpoint: (limit: number) => ({
    windowMs: 60 * 1000,
    maxRequests: limit,
  }),

  // Authentication: Very strict
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
  },

  // Chat: Moderate
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },

  // Slack: High volume
  slack: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const ip = req.headers.get('x-real-ip');
  if (ip) return ip;

  return 'unknown';
}

/**
 * Extract user ID from request
 */
export function extractUserId(req: Request): string | null {
  // Try to get from auth header
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.substring(7);
    try {
      // In production, decode JWT properly
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return decoded.userId || decoded.sub;
    } catch {
      return null;
    }
  }

  // Try to get from session
  const session = req.headers.get('x-session-id');
  return session || null;
}

/**
 * Create custom rate limiter
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
  options?: Partial<RateLimitConfig>
): RateLimiter {
  return new RateLimiter({
    windowMs,
    maxRequests,
    ...options,
  });
}

/**
 * Apply rate limiting to request
 */
export function applyRateLimit(
  limiter: RateLimiter,
  req: Request,
  onExceeded?: (context: RateLimitContext) => void
): RateLimitContext {
  const context = limiter.checkLimit(req);

  if (context.exceeded && onExceeded) {
    onExceeded(context);
  }

  return context;
}

// ============================================================================
// RATE LIMIT RESPONSE HELPERS
// ============================================================================

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(context: RateLimitContext): Response {
  const resetDate = new Date(context.resetTime);

  return new Response(
    JSON.stringify({
      error: {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: context.limit,
        current: context.current,
        remaining: context.remaining,
        resetTime: context.resetTime,
        resetDate: resetDate.toISOString(),
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((context.resetTime - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(context.limit),
        'X-RateLimit-Remaining': String(context.remaining),
        'X-RateLimit-Reset': String(context.resetTime),
      },
    }
  );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  context: RateLimitContext
): Response {
  response.headers.set('X-RateLimit-Limit', String(context.limit));
  response.headers.set('X-RateLimit-Remaining', String(context.remaining));
  response.headers.set('X-RateLimit-Reset', String(context.resetTime));

  return response;
}

// ============================================================================
// PREDEFINED LIMITERS
// ============================================================================

export const RateLimiters = {
  auth: createRateLimiter(15 * 60 * 1000, 5),
  chat: createRateLimiter(60 * 1000, 20),
  general: createRateLimiter(60 * 1000, 30),
  slack: createRateLimiter(60 * 1000, 100),
  meeting: createRateLimiter(60 * 1000, 10),
  calendar: createRateLimiter(60 * 1000, 50),
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  RateLimiter,
  RateLimitConfigs,
  createRateLimiter,
  applyRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
  RateLimiters,
  getClientIP,
  extractUserId,
};
