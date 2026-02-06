/**
 * Tests for Request Context
 */

import {
  createRequestContext,
  getRequestContext,
  getContextForLogging,
  generateRequestId,
  RequestContext,
} from './request-context';

describe('Request Context', () => {
  describe('createRequestContext', () => {
    it('should create context with required fields', () => {
      const context = createRequestContext('/api/test', 'POST', 'user_123');

      expect(context.requestId).toBeDefined();
      expect(context.endpoint).toBe('/api/test');
      expect(context.method).toBe('POST');
      expect(context.userId).toBe('user_123');
      expect(context.timestamp).toBeDefined();
      expect(context.startTime).toBeDefined();
    });

    it('should generate unique request IDs', () => {
      const context1 = createRequestContext('/api/test', 'GET');
      const context2 = createRequestContext('/api/test', 'GET');

      expect(context1.requestId).not.toBe(context2.requestId);
    });

    it('should create context without userId', () => {
      const context = createRequestContext('/api/test', 'GET');

      expect(context.requestId).toBeDefined();
      expect(context.userId).toBeUndefined();
      expect(context.endpoint).toBe('/api/test');
    });

    it('should store context for retrieval', () => {
      const context = createRequestContext('/api/test', 'POST', 'user_456');
      const retrieved = getRequestContext(context.requestId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.requestId).toBe(context.requestId);
      expect(retrieved?.userId).toBe('user_456');
    });
  });

  describe('getRequestContext', () => {
    it('should retrieve stored context', () => {
      const context = createRequestContext('/api/meetings', 'DELETE', 'user_789');
      const retrieved = getRequestContext(context.requestId);

      expect(retrieved).toEqual(context);
    });

    it('should return undefined for non-existent request ID', () => {
      const retrieved = getRequestContext('non_existent_id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getContextForLogging', () => {
    it('should create logging context from request context', () => {
      const context = createRequestContext('/api/test', 'POST', 'user_001');
      const loggingContext = getContextForLogging(context.requestId);

      expect(loggingContext.requestId).toBe(context.requestId);
      expect(loggingContext.userId).toBe('user_001');
      expect(loggingContext.endpoint).toBe('/api/test');
      expect(loggingContext.method).toBe('POST');
    });

    it('should include duration when context exists', () => {
      const context = createRequestContext('/api/test', 'GET');

      // Small delay to ensure measurable duration
      const start = performance.now();
      while (performance.now() - start < 5);

      const loggingContext = getContextForLogging(context.requestId);

      expect(loggingContext.duration).toBeDefined();
      expect(loggingContext.duration).toBeGreaterThan(0);
    });

    it('should merge additional context', () => {
      const context = createRequestContext('/api/test', 'POST', 'user_002');
      const loggingContext = getContextForLogging(context.requestId, {
        statusCode: 200,
        meetingId: 'meeting_123',
      });

      expect(loggingContext.requestId).toBe(context.requestId);
      expect(loggingContext.statusCode).toBe(200);
      expect(loggingContext.meetingId).toBe('meeting_123');
    });

    it('should handle missing context gracefully', () => {
      const loggingContext = getContextForLogging('missing_id', {
        statusCode: 404,
      });

      expect(loggingContext.requestId).toBe('missing_id');
      expect(loggingContext.duration).toBeUndefined();
      expect(loggingContext.userId).toBeUndefined();
      expect(loggingContext.statusCode).toBe(404);
    });
  });

  describe('generateRequestId', () => {
    it('should generate valid UUID format', () => {
      const id = generateRequestId();

      // UUID v4 format check
      const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidv4Regex.test(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      const id3 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate IDs quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        generateRequestId();
      }
      const duration = performance.now() - start;

      // Should generate 1000 IDs in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Context Lifecycle', () => {
    it('should handle multiple concurrent contexts', () => {
      const contexts: RequestContext[] = [];

      for (let i = 0; i < 10; i++) {
        const context = createRequestContext(
          `/api/endpoint${i}`,
          'POST',
          `user_${i}`
        );
        contexts.push(context);
      }

      contexts.forEach((context) => {
        const retrieved = getRequestContext(context.requestId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.userId).toBe(context.userId);
      });
    });

    it('should preserve context properties over time', async () => {
      const context = createRequestContext('/api/test', 'GET', 'user_timing');
      const original = { ...context };

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const retrieved = getRequestContext(context.requestId);
      expect(retrieved?.requestId).toBe(original.requestId);
      expect(retrieved?.userId).toBe(original.userId);
      expect(retrieved?.endpoint).toBe(original.endpoint);
      expect(retrieved?.method).toBe(original.method);
    });
  });
});
