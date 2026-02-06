/**
 * Integration Tests for /api/user/bot-settings endpoint
 * Tests bot configuration with authentication and validation
 */

import { GET, POST } from './route';
import { createMockRequest } from '@/lib/test-helpers';

jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/request-context', () => ({
  generateRequestId: jest.fn(() => 'req_123'),
}));

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

describe('GET /api/user/bot-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentUser as jest.Mock).mockResolvedValue({ id: 'user_123' });
  });

  // Test 1: Get bot settings successfully
  it('should return bot settings for authenticated user', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      botName: 'My Bot',
      botImageUrl: 'https://example.com/bot.png',
      currentPlan: 'pro',
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.botName).toBe('My Bot');
    expect(data.botImageUrl).toBe('https://example.com/bot.png');
    expect(data.plan).toBe('pro');
    expect(response.headers.get('X-Request-Id')).toBe('req_123');
  });

  // Test 2: Return default values when user has no custom settings
  it('should return default values when user has no custom settings', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      botName: null,
      botImageUrl: null,
      currentPlan: null,
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.botName).toBe('Meeting Bot');
    expect(data.botImageUrl).toBe(null);
    expect(data.plan).toBe('free');
  });

  // Test 3: Return 401 when not authenticated
  it('should return 401 when user is not authenticated', async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'GET',
      auth: false,
    });

    const response = await GET(mockRequest);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(response.headers.get('X-Request-Id')).toBe('req_123');
  });

  // Test 4: Handle database errors gracefully
  it('should handle database errors gracefully', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const response = await GET(mockRequest);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.get('X-Request-Id')).toBe('req_123');
  });

  // Test 5: Include requestId in all responses
  it('should include requestId in all GET responses', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'GET',
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      botName: 'Test Bot',
      botImageUrl: null,
      currentPlan: 'free',
    });

    const response = await GET(mockRequest);
    expect(response.headers.get('X-Request-Id')).toBe('req_123');
  });
});

describe('POST /api/user/bot-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentUser as jest.Mock).mockResolvedValue({ id: 'user_123' });
  });

  // Test 6: Update bot settings successfully
  it('should update bot settings successfully', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      userId: 'user_123',
      auth: true,
      body: {
        botName: 'Updated Bot',
        botImageUrl: 'https://example.com/new-bot.png',
      },
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user_123',
      botName: 'Updated Bot',
      botImageUrl: 'https://example.com/new-bot.png',
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // Test 7: Validate botName is required
  it('should validate that botName is required', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      userId: 'user_123',
      auth: true,
      body: {
        botImageUrl: 'https://example.com/bot.png',
      },
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  // Test 8: Validate botName is a string
  it('should validate that botName is a string', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      userId: 'user_123',
      auth: true,
      body: {
        botName: 12345,
      },
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  // Test 9: Reject POST when not authenticated
  it('should return 401 when user is not authenticated on POST', async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      auth: false,
      body: {
        botName: 'Test Bot',
      },
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  // Test 10: Handle database errors on update
  it('should handle database errors on update', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      userId: 'user_123',
      auth: true,
      body: {
        botName: 'Test Bot',
      },
    });

    (prisma.user.update as jest.Mock).mockRejectedValue(
      new Error('Database update failed')
    );

    const response = await POST(mockRequest);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.get('X-Request-Id')).toBe('req_123');
  });

  // Test 11: Allow optional botImageUrl field
  it('should allow optional botImageUrl field', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      userId: 'user_123',
      auth: true,
      body: {
        botName: 'Test Bot',
      },
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({
      botName: 'Test Bot',
      botImageUrl: null,
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
  });

  // Test 12: Include requestId in POST responses
  it('should include requestId in all POST responses', async () => {
    const mockRequest = createMockRequest('/api/user/bot-settings', {
      method: 'POST',
      userId: 'user_123',
      auth: true,
      body: {
        botName: 'Test Bot',
      },
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({
      botName: 'Test Bot',
    });

    const response = await POST(mockRequest);
    expect(response.headers.get('X-Request-Id')).toBe('req_123');
  });
});
