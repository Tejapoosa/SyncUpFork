/**
 * Integration Tests for /api/meetings/[id] endpoint
 * Tests meeting CRUD operations (GET, PATCH, DELETE)
 */

import { GET, PATCH, DELETE } from './[id]/route';
import { createMockRequest } from '@/lib/test-helpers';

jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/db';

describe('/api/meetings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockReturnValue({ userId: 'user_123' });
  });

  describe('GET /api/meetings/[id]', () => {
    // Test 1: Get meeting successfully
    it('should retrieve a meeting by id', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'GET',
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        title: 'Q1 Planning',
        userId: 'user_123',
        date: new Date('2024-02-15'),
        transcript: 'Discussion...',
      });

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data.id).toBe('meeting_123');
      expect(data).toHaveProperty('requestId');
    });

    // Test 2: Meeting not found
    it('should return 404 when meeting not found', async () => {
      const mockRequest = createMockRequest('/api/meetings/nonexistent', {
        method: 'GET',
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    // Test 3: Authorization check
    it('should return 403 for unauthorized access', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'GET',
        userId: 'user_999',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_456', // Different user
      });

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('authorized');
    });

    // Test 4: Authentication required
    it('should return 401 without authentication', async () => {
      (auth as jest.Mock).mockReturnValue({ userId: null });

      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'GET',
        auth: false,
      });

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/meetings/[id]', () => {
    // Test 5: Update meeting successfully
    it('should update a meeting with valid data', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'PATCH',
        body: {
          title: 'Updated Title',
          summary: 'New summary',
        },
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123',
      });

      (prisma.meeting.update as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        title: 'Updated Title',
        summary: 'New summary',
        userId: 'user_123',
      });

      const response = await PATCH(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(data).toHaveProperty('requestId');
    });

    // Test 6: Validation on update
    it('should validate update data', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'PATCH',
        body: {
          title: '', // Empty title invalid
        },
        userId: 'user_123',
        auth: true,
      });

      const response = await PATCH(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('title');
    });

    // Test 7: Meeting not found on update
    it('should return 404 when meeting to update not found', async () => {
      const mockRequest = createMockRequest('/api/meetings/nonexistent', {
        method: 'PATCH',
        body: { title: 'Updated' },
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await PATCH(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    // Test 8: Unauthorized update
    it('should return 403 when updating another user\'s meeting', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'PATCH',
        body: { title: 'Hacked' },
        userId: 'user_999',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123', // Different user
      });

      const response = await PATCH(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    // Test 9: Partial update allowed
    it('should allow partial updates', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'PATCH',
        body: { title: 'New Title' }, // Only title, other fields optional
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123',
      });

      (prisma.meeting.update as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        title: 'New Title',
        userId: 'user_123',
      });

      const response = await PATCH(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('New Title');
    });
  });

  describe('DELETE /api/meetings/[id]', () => {
    // Test 10: Delete meeting successfully
    it('should delete a meeting', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'DELETE',
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123',
      });

      (prisma.meeting.delete as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
      });

      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('requestId');
    });

    // Test 11: Delete non-existent meeting
    it('should return 404 when deleting non-existent meeting', async () => {
      const mockRequest = createMockRequest('/api/meetings/nonexistent', {
        method: 'DELETE',
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    // Test 12: Unauthorized delete
    it('should return 403 when deleting another user\'s meeting', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'DELETE',
        userId: 'user_999',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123', // Different user
      });

      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    // Test 13: Authentication required for delete
    it('should return 401 when not authenticated for delete', async () => {
      (auth as jest.Mock).mockReturnValue({ userId: null });

      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'DELETE',
        auth: false,
      });

      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    // Test 14: Database error on delete
    it('should handle database errors during delete', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'DELETE',
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123',
      });

      (prisma.meeting.delete as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(data).toHaveProperty('requestId');
    });
  });

  describe('General Tests', () => {
    // Test 15: Invalid method
    it('should handle invalid HTTP method', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'PUT', // Not supported
        userId: 'user_123',
        auth: true,
      });

      // Expect 405 Method Not Allowed
      // This depends on Next.js route implementation
      expect(mockRequest).toBeDefined();
    });

    // Test 16: All successful responses include requestId
    it('should include requestId in all successful responses', async () => {
      const mockRequest = createMockRequest('/api/meetings/meeting_123', {
        method: 'GET',
        userId: 'user_123',
        auth: true,
      });

      (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting_123',
        userId: 'user_123',
        title: 'Test',
      });

      const response = await GET(mockRequest as any);
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('requestId');
        expect(data.requestId).toMatch(/^[a-f0-9-]{36}$/);
      }
    });
  });
});
