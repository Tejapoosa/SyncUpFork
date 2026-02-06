/**
 * Integration Tests for /api/meetings/create endpoint
 * Tests meeting creation with validation, auth, and error handling
 */

import { POST } from './create/route';
import { createMockRequest } from '@/lib/test-helpers';

jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    meeting: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/slack', () => ({
  postToSlack: jest.fn(),
}));

import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/db';

describe('POST /api/meetings/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockReturnValue({ userId: 'user_123' });
  });

  // Test 1: Valid meeting creation
  it('should create a meeting successfully with valid data', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Q1 Planning Session',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        attendees: ['person1@example.com', 'person2@example.com'],
        transcript: 'Meeting discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.create as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      title: 'Q1 Planning Session',
      userId: 'user_123',
      createdAt: new Date(),
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('requestId');
    expect(data.title).toBe('Q1 Planning Session');
  });

  // Test 2: Validation - missing required fields
  it('should return 400 when required fields are missing', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Q1 Planning',
        // Missing date, duration, and transcript
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  // Test 3: Validation - invalid date format
  it('should return 400 for invalid date format', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Q1 Planning',
        date: 'invalid-date',
        duration: 60,
        transcript: 'Discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('date');
  });

  // Test 4: Validation - invalid duration
  it('should return 400 for invalid duration', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Q1 Planning',
        date: '2024-02-15T10:00:00Z',
        duration: -60, // Negative duration
        transcript: 'Discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('duration');
  });

  // Test 5: Authentication required
  it('should return 401 when not authenticated', async () => {
    (auth as jest.Mock).mockReturnValue({ userId: null });

    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Test Meeting',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
      },
      auth: false,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('authenticated');
  });

  // Test 6: Database error handling
  it('should handle database errors gracefully', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Q1 Planning',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.create as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('requestId');
  });

  // Test 7: Response includes request ID
  it('should include requestId in response', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Test Meeting',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.create as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      title: 'Test Meeting',
      userId: 'user_123',
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(data).toHaveProperty('requestId');
    expect(data.requestId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  // Test 8: Successful response structure
  it('should return meeting with all required fields', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Test Meeting',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
        attendees: ['user@example.com'],
      },
      userId: 'user_123',
      auth: true,
    });

    const meetingData = {
      id: 'meeting_123',
      title: 'Test Meeting',
      date: new Date('2024-02-15T10:00:00Z'),
      duration: 60,
      userId: 'user_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.meeting.create as jest.Mock).mockResolvedValue(meetingData);

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('date');
    expect(data).toHaveProperty('duration');
    expect(data).toHaveProperty('userId');
  });

  // Test 9: Title field validation
  it('should reject empty title', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: '',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('title');
  });

  // Test 10: Title length validation
  it('should reject title exceeding max length', async () => {
    const longTitle = 'a'.repeat(501); // Assuming max 500 chars

    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: longTitle,
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
      },
      userId: 'user_123',
      auth: true,
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('title');
  });

  // Test 11: Transcript length validation
  it('should accept long transcripts', async () => {
    const longTranscript = 'a'.repeat(10000); // Long but valid

    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Test Meeting',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: longTranscript,
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.create as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      title: 'Test Meeting',
      userId: 'user_123',
      transcript: longTranscript,
    });

    const response = await POST(mockRequest as any);

    expect(response.status).toBe(201);
  });

  // Test 12: Attendees field optional
  it('should allow creation without attendees field', async () => {
    const mockRequest = createMockRequest('/api/meetings/create', {
      method: 'POST',
      body: {
        title: 'Test Meeting',
        date: '2024-02-15T10:00:00Z',
        duration: 60,
        transcript: 'Discussion...',
        // No attendees field
      },
      userId: 'user_123',
      auth: true,
    });

    (prisma.meeting.create as jest.Mock).mockResolvedValue({
      id: 'meeting_123',
      title: 'Test Meeting',
      userId: 'user_123',
    });

    const response = await POST(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
  });
});
