/**
 * Integration Tests for /api/rag/chat-meeting endpoint
 * Tests meeting-specific RAG functionality
 */

import { POST } from './chat-meeting/route';
import { createMockRequest } from '@/lib/test-helpers';

jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    meeting: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/pinecone', () => ({
  searchMeetingVectors: jest.fn(),
}));

jest.mock('@/lib/openai', () => ({
  generateCompletion: jest.fn(),
}));

import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/db';

describe('POST /api/rag/chat-meeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockReturnValue({ userId: 'user_123' });
  });

  // Test 1: Valid request
  it('should handle valid meeting chat request', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        query: 'What was the main topic discussed?',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
    });

    (prisma.meeting.findFirst as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      userId: 'user_123',
      title: 'Team Sync',
      transcript: 'Discussion content...',
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('response');
    expect(data).toHaveProperty('requestId');
  });

  // Test 2: Missing meeting ID validation
  it('should return 400 for missing meetingId', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        query: 'What was discussed?',
        // Missing meetingId
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('meetingId');
  });

  // Test 3: Missing query validation
  it('should return 400 for missing query', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        // Missing query
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('query');
  });

  // Test 4: Meeting not found
  it('should return 404 when meeting not found', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'nonexistent',
        query: 'What was discussed?',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  // Test 5: Authorization - wrong user
  it('should return 403 when accessing another user\'s meeting', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_456',
        query: 'What was discussed?',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.findFirst as jest.Mock).mockResolvedValue({
      id: 'meeting_456',
      userId: 'user_999', // Different user
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('authorized');
  });

  // Test 6: Authentication required
  it('should return 401 when not authenticated', async () => {
    (auth as jest.Mock).mockReturnValue({ userId: null });

    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        query: 'What was discussed?',
      },
      auth: false,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  // Test 7: Response structure
  it('should return response with consistent structure', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        query: 'test',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.findFirst as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      userId: 'user_123',
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(data).toEqual(
      expect.objectContaining({
        response: expect.any(String),
        requestId: expect.any(String),
      })
    );
  });

  // Test 8: Database error
  it('should handle database errors gracefully', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        query: 'What was discussed?',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(data).toHaveProperty('requestId');
  });

  // Test 9: Query length validation
  it('should validate query length', async () => {
    const tooLongQuery = 'a'.repeat(5001);

    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        query: tooLongQuery,
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('query');
  });

  // Test 10: Successfully processes meeting context
  it('should include meeting context in response', async () => {
    const mockRequest = createMockRequest('/api/rag/chat-meeting', {
      method: 'POST',
      body: {
        meetingId: 'meeting_123',
        query: 'Summarize this meeting',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.findFirst as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      userId: 'user_123',
      title: 'Q1 Review',
      date: new Date('2024-02-15'),
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('response');
  });
});
