/**
 * Cache Management System
 * Handles in-memory and Redis caching with automatic invalidation
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For grouping and invalidation
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private tags: Map<string, Set<string>> = new Map(); // Tag -> Set of keys
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup expired entries every 5 minutes
    this.startCleanup();
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.invalidateTaggedKeys(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options?: CacheOptions): void {
    const ttl = options?.ttl || 3600; // Default 1 hour
    const expiresAt = Date.now() + ttl * 1000;

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });

    // Register tags for invalidation
    if (options?.tags) {
      for (const tag of options.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(key);
      }
    }
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all values with a specific tag
   */
  invalidateTag(tag: string): number {
    const keys = this.tags.get(tag);
    if (!keys) {
      return 0;
    }

    let count = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        count++;
      }
    }

    this.tags.delete(tag);
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.tags.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const expired = entries.filter((e) => e.expiresAt < now).length;
    const valid = this.cache.size - expired;

    return {
      size: this.cache.size,
      valid,
      expired,
      tags: this.tags.size,
    };
  }

  /**
   * Get or compute pattern
   * If key exists and not expired, return cached value
   * Otherwise, compute value, cache it, and return
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, options);
    return value;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup on unref so it doesn't keep the process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[Cache] Cleaned up ${count} expired entries`);
    }
  }

  /**
   * Internal helper to invalidate tagged keys
   */
  private invalidateTaggedKeys(key: string): void {
    for (const [tag, keys] of this.tags.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tags.delete(tag);
        }
      }
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Cache key builders
export const cacheKeys = {
  // User data
  userSettings: (userId: string) => `user:${userId}:settings`,
  userUsage: (userId: string) => `user:${userId}:usage`,
  userSubscription: (userId: string) => `user:${userId}:subscription`,
  userCalendarStatus: (userId: string) => `user:${userId}:calendar:status`,

  // Meetings
  meetingsList: (userId: string, page: number = 1) =>
    `meetings:${userId}:list:page:${page}`,
  meetingDetail: (meetingId: string) => `meeting:${meetingId}:detail`,
  meetingAttendees: (meetingId: string) => `meeting:${meetingId}:attendees`,

  // Integrations
  integrationsList: (userId: string, page: number = 1) =>
    `integrations:${userId}:list:page:${page}`,
  calendarEvents: (userId: string, page: number = 1) =>
    `calendar:${userId}:events:page:${page}`,
  slackStatus: (userId: string) => `slack:${userId}:status`,

  // RAG/Chat
  chatHistory: (userId: string, sessionId: string, page: number = 1) =>
    `chat:${userId}:${sessionId}:history:page:${page}`,

  // Bot configuration
  botConfig: (userId: string) => `bot:${userId}:config`,

  // Rate limiting
  rateLimit: (userId: string, type: string) => `ratelimit:${userId}:${type}`,
};
