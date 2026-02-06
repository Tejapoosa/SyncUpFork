/**
 * Integration Tests for /api/user/refresh-calendar endpoint
 * Tests calendar token refresh functionality
 */

import { POST } from './route';
import { createMockRequest } from '@/lib/test-helpers';

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/integrations/refreshTokenIfNeeded', () => ({
  refreshGoogleTokenIfNeeded: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/request-context', () => ({
  generateRequestId: jest.fn(() => 'req_refresh_123'),
}));

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { refreshGoogleTokenIfNeeded } from '@/lib/integrations/refreshTokenIfNeeded';

describe('POST /api/user/refresh-calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ userId: 'user_123' });
  });

  // Test 1: Successfully refresh calendar connection
  it('should successfully refresh calendar token', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(Date.now() - 3600000),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue({
      success: true,
      newAccessToken: 'new_access_token_123',
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.connected).toBe(true);
    expect(data.refreshed).toBe(true);
    expect(response.headers.get('X-Request-Id')).toBe('req_refresh_123');
  });

  // Test 2: Return correct status when calendar is not connected
  it('should indicate when calendar is not connected', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: false,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue({
      success: false,
      error: 'No refresh token available',
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.connected).toBe(false);
    expect(data.message).toContain('needs to be re-established');
  });

  // Test 3: Return 401 when not authenticated
  it('should return 401 when user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(response.headers.get('X-Request-Id')).toBe('req_refresh_123');
  });

  // Test 4: Return 404 when user not found
  it('should return 404 when user is not found in database', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  // Test 5: Call refreshGoogleTokenIfNeeded with correct user ID
  it('should call refreshGoogleTokenIfNeeded with correct user ID', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue({
      success: true,
    });

    await POST(mockRequest);

    expect(refreshGoogleTokenIfNeeded).toHaveBeenCalledWith('user_123');
  });

  // Test 6: Handle refresh failure gracefully
  it('should handle token refresh failures gracefully', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockRejectedValue(
      new Error('Token refresh failed')
    );

    const response = await POST(mockRequest);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.get('X-Request-Id')).toBe('req_refresh_123');
  });

  // Test 7: Handle database errors gracefully
  it('should handle database errors gracefully', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const response = await POST(mockRequest);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.get('X-Request-Id')).toBe('req_refresh_123');
  });

  // Test 8: Include correct response fields
  it('should include all required response fields', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue({
      success: true,
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('connected');
    expect(data).toHaveProperty('refreshed');
    expect(data).toHaveProperty('message');
  });

  // Test 9: Proper message when calendar is connected
  it('should show calendar connected message when connected', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue({
      success: true,
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.message).toContain('Calendar is connected');
  });

  // Test 10: Include requestId in all responses
  it('should include requestId in all responses', async () => {
    const mockRequest = createMockRequest('/api/user/refresh-calendar', {
      method: 'POST',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue({
      success: true,
    });

    const response = await POST(mockRequest);
    expect(response.headers.get('X-Request-Id')).toBe('req_refresh_123');
  });
});
