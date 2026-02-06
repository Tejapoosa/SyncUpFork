/**
 * Integration Tests for /api/user/usage endpoint
 * Tests user usage tracking with auth and authorization
 */

import { GET } from './usage/route';
import { createMockRequest } from '@/lib/test-helpers';

jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    usageRecord: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/db';

describe('GET /api/user/usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockReturnValue({ userId: 'user_123' });
  });

  // Test 1: Get usage successfully
  it('should return user usage data', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
      plan: 'pro',
    });

    (prisma.usageRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: {
        tokensUsed: 15000,
        requestCount: 250,
      },
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('usage');
    expect(data.usage).toHaveProperty('tokensUsed');
    expect(data.usage).toHaveProperty('requestCount');
  });

  // Test 2: Authentication required
  it('should return 401 when not authenticated', async () => {
    (auth as jest.Mock).mockReturnValue({ userId: null });

    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      auth: false,
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('authenticated');
  });

  // Test 3: User not found
  it('should return 404 when user not found', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_nonexistent',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  // Test 4: Request ID in response
  it('should include requestId in response', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
    });

    (prisma.usageRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: { tokensUsed: 0, requestCount: 0 },
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(data).toHaveProperty('requestId');
    expect(data.requestId).toMatch(/^[a-f0-9-]{36}$/);
  });

  // Test 5: Database error handling
  it('should handle database errors gracefully', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('requestId');
  });

  // Test 6: Usage with time range filter
  it('should support timeRange query parameter', async () => {
    const mockRequest = createMockRequest('/api/user/usage?timeRange=7days', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
    });

    (prisma.usageRecord.findMany as jest.Mock).mockResolvedValue([
      { date: '2024-02-01', tokensUsed: 5000 },
      { date: '2024-02-02', tokensUsed: 3000 },
    ]);

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('usage');
  });

  // Test 7: Zero usage returns valid response
  it('should handle user with zero usage', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
      plan: 'free',
    });

    (prisma.usageRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: { tokensUsed: 0, requestCount: 0 },
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usage.tokensUsed).toBe(0);
    expect(data.usage.requestCount).toBe(0);
  });

  // Test 8: Response structure validation
  it('should return usage with all required fields', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
      plan: 'pro',
    });

    (prisma.usageRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: { tokensUsed: 100000, requestCount: 5000 },
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(data).toEqual(
      expect.objectContaining({
        usage: expect.objectContaining({
          tokensUsed: expect.any(Number),
          requestCount: expect.any(Number),
        }),
        requestId: expect.any(String),
      })
    );
  });

  // Test 9: Invalid timeRange parameter
  it('should handle invalid timeRange gracefully', async () => {
    const mockRequest = createMockRequest(
      '/api/user/usage?timeRange=invalid',
      {
        method: 'GET',
        userId: 'user_123',
        auth: true,
      }
    );

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    // Should either use default or return error with proper status
    expect([200, 400]).toContain(response.status);
  });

  // Test 10: Large usage numbers
  it('should handle large usage numbers correctly', async () => {
    const mockRequest = createMockRequest('/api/user/usage', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
    });

    const largeNumber = 9999999999;
    (prisma.usageRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: { tokensUsed: largeNumber, requestCount: 1000000 },
    });

    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usage.tokensUsed).toBe(largeNumber);
  });
});
