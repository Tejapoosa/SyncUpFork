/**
 * Integration Tests for /api/user/calendar-status endpoint
 * Tests calendar connectivity status with token refresh
 */

import { GET } from './route';
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
  generateRequestId: jest.fn(() => 'req_cal_123'),
}));

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { refreshGoogleTokenIfNeeded } from '@/lib/integrations/refreshTokenIfNeeded';

describe('GET /api/user/calendar-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ userId: 'user_123' });
  });

  // Test 1: Return connected status for authenticated user with calendar
  it('should return connected: true for user with valid calendar connection', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(Date.now() + 3600000),
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(true);
  });

  // Test 2: Return disconnected status when calendar not connected
  it('should return connected: false when calendar is not connected', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: false,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(false);
  });

  // Test 3: Return disconnected when access token is missing
  it('should return connected: false when access token is missing', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: null,
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: null,
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(false);
  });

  // Test 4: Return disconnected when user not authenticated
  it('should return connected: false when user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.connected).toBe(false);
  });

  // Test 5: Return disconnected when user not found
  it('should return connected: false when user is not found in database', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(false);
  });

  // Test 6: Refresh token when user has refresh token and calendar is connected
  it('should refresh token when user has valid refresh token', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        calenderConnected: true,
        googleAccessToken: 'old_access_token',
        googleRefreshToken: 'refresh_token_123',
        googleTokenExpiry: new Date(Date.now() - 3600000),
      })
      .mockResolvedValueOnce({
        calenderConnected: true,
        googleAccessToken: 'new_access_token',
      });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockResolvedValue(true);

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    expect(refreshGoogleTokenIfNeeded).toHaveBeenCalledWith('user_123');
  });

  // Test 7: Fall back to original status if token refresh fails
  it('should fall back to original status if token refresh fails', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: new Date(Date.now() - 3600000),
    });

    (refreshGoogleTokenIfNeeded as jest.Mock).mockRejectedValue(
      new Error('Token refresh failed')
    );

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(true);
  });

  // Test 8: Handle database errors gracefully
  it('should handle database errors gracefully', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(false);
  });

  // Test 9: Skip token refresh when calendar is not connected
  it('should skip token refresh when calendar is not connected', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: false,
      googleAccessToken: null,
      googleRefreshToken: 'refresh_token_123',
      googleTokenExpiry: null,
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    expect(refreshGoogleTokenIfNeeded).not.toHaveBeenCalled();

    const data = await response.json();
    expect(data.connected).toBe(false);
  });

  // Test 10: Skip token refresh when no refresh token available
  it('should skip token refresh when no refresh token is available', async () => {
    const mockRequest = createMockRequest('/api/user/calendar-status', {
      method: 'GET',
      userId: 'user_123',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      calenderConnected: true,
      googleAccessToken: 'access_token_123',
      googleRefreshToken: null,
      googleTokenExpiry: new Date(Date.now() + 3600000),
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
    expect(refreshGoogleTokenIfNeeded).not.toHaveBeenCalled();
  });
});
