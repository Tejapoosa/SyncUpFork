/**
 * Tests for Rate Limiting
 */

import { AppError } from '../lib/errors';
import {
    checkRateLimit,
    getRateLimitStatus,
    RateLimits,
    resetRateLimit,
    UsageQuota
} from '../lib/rate-limit';

describe('Rate Limiting', () => {
  afterEach(() => {
    // Reset rate limits between tests
    resetRateLimit('user_123');
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const limit = { limit: 5, windowMs: 60000 };

      expect(() => checkRateLimit('user_123', limit)).not.toThrow();
      expect(() => checkRateLimit('user_123', limit)).not.toThrow();
      expect(() => checkRateLimit('user_123', limit)).not.toThrow();
    });

    it('should throw error when limit exceeded', () => {
      const limit = { limit: 2, windowMs: 60000 };

      checkRateLimit('user_123', limit); // 1st request
      checkRateLimit('user_123', limit); // 2nd request

      expect(() => checkRateLimit('user_123', limit)).toThrow(AppError);
    });

    it('should return current count', () => {
      const limit = { limit: 5, windowMs: 60000 };

      const count1 = checkRateLimit('user_123', limit);
      const count2 = checkRateLimit('user_123', limit);

      expect(count1).toBe(1);
      expect(count2).toBe(2);
    });

    it('should isolate limits per user', () => {
      const limit = { limit: 2, windowMs: 60000 };

      checkRateLimit('user_1', limit);
      checkRateLimit('user_2', limit);

      // User 1 should still be able to make requests
      expect(() => checkRateLimit('user_1', limit)).not.toThrow();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct status', () => {
      const limit = RateLimits.CHAT_MESSAGES;

      checkRateLimit('user_123', limit);
      checkRateLimit('user_123', limit);

      const status = getRateLimitStatus('user_123', limit);

      expect(status.current).toBe(2);
      expect(status.limit).toBe(50); // CHAT_MESSAGES default
      expect(status.remaining).toBe(48);
    });

    it('should show full limit for new user', () => {
      const limit = RateLimits.CHAT_MESSAGES;
      const status = getRateLimitStatus('new_user', limit);

      expect(status.current).toBe(0);
      expect(status.remaining).toBe(50);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset user rate limit', () => {
      const limit = RateLimits.CHAT_MESSAGES;

      checkRateLimit('user_123', limit);
      resetRateLimit('user_123');

      const status = getRateLimitStatus('user_123', limit);
      expect(status.current).toBe(0);
      expect(status.remaining).toBe(50);
    });
  });

  describe('RateLimits presets', () => {
    it('should have CHAT_MESSAGES limit', () => {
      expect(RateLimits.CHAT_MESSAGES.limit).toBe(50);
      expect(RateLimits.CHAT_MESSAGES.windowMs).toBe(86400000); // 24 hours
    });

    it('should have RAG_PROCESS limit', () => {
      expect(RateLimits.RAG_PROCESS.limit).toBe(10);
      expect(RateLimits.RAG_PROCESS.windowMs).toBe(3600000); // 1 hour
    });
  });
});

describe('UsageQuota', () => {
  let quota: UsageQuota;

  beforeEach(() => {
    quota = new UsageQuota();
  });

  it('should increment quota', () => {
    const newTotal = quota.increment('user_123');
    expect(newTotal).toBe(1);

    const newTotal2 = quota.increment('user_123', 5);
    expect(newTotal2).toBe(6);
  });

  it('should get current quota', () => {
    quota.increment('user_123', 3);
    const current = quota.getCurrent('user_123');
    expect(current).toBe(3);
  });

  it('should check quota', () => {
    quota.increment('user_123', 8);

    expect(quota.checkQuota('user_123', 10)).toBe(true);
    expect(quota.checkQuota('user_123', 5)).toBe(false);
  });

  it('should reset user quota', () => {
    quota.increment('user_123', 5);
    quota.reset('user_123');

    expect(quota.getCurrent('user_123')).toBe(0);
  });

  it('should reset all quotas', () => {
    quota.increment('user_123', 5);
    quota.increment('user_456', 10);
    quota.resetAll();

    expect(quota.getCurrent('user_123')).toBe(0);
    expect(quota.getCurrent('user_456')).toBe(0);
  });
});
