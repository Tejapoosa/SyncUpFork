/**
 * Integration Test Setup Helper
 * Provides utilities for testing API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

export interface TestRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: any;
  headers?: Record<string, string>;
  userId?: string;
  auth?: boolean;
}

export interface TestResponse {
  status: number;
  statusText: string;
  body: any;
  headers: Map<string, string>;
  requestId?: string;
}

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  path: string,
  options: TestRequestOptions = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, userId } = options;

  const url = `http://localhost:3000${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  // Create mock request - note: NextRequest is complex, this is a simplified version
  const request = new Request(url, init) as unknown as NextRequest;

  return request;
}

/**
 * Parse response from API handler
 */
export async function parseResponse(response: NextResponse): Promise<TestResponse> {
  const clonedResponse = response.clone();
  const body = await clonedResponse.json().catch(() => null);
  const requestId = response.headers.get('X-Request-Id');

  return {
    status: response.status,
    statusText: response.statusText || '',
    body,
    headers: response.headers,
    requestId: requestId || undefined,
  };
}

/**
 * Create a successful response matcher
 */
export function expectSuccessResponse(response: TestResponse) {
  expect(response.status).toBe(200);
  expect(response.body).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Create a validation error response matcher
 */
export function expectValidationError(response: TestResponse) {
  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Create an authentication error response matcher
 */
export function expectAuthError(response: TestResponse) {
  expect(response.status).toBe(401);
  expect(response.body.error).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Create an authorization error response matcher
 */
export function expectAuthorizationError(response: TestResponse) {
  expect(response.status).toBe(403);
  expect(response.body.error).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Create a not found error response matcher
 */
export function expectNotFoundError(response: TestResponse) {
  expect(response.status).toBe(404);
  expect(response.body.error).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Create a rate limit error response matcher
 */
export function expectRateLimitError(response: TestResponse) {
  expect(response.status).toBe(429);
  expect(response.body.error).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Create a server error response matcher
 */
export function expectServerError(response: TestResponse) {
  expect(response.status).toBe(500);
  expect(response.body.error).toBeDefined();
  expect(response.requestId).toBeDefined();
}

/**
 * Mock Prisma database
 */
export function createMockPrisma() {
  return {
    meeting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    actionItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userUsage: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

/**
 * Mock authentication context
 */
export function mockAuth(userId: string = 'user_test_123') {
  return jest.fn().mockResolvedValue({
    userId,
    sessionId: `session_${userId}`,
  });
}

/**
 * Mock Clerk auth
 */
export const mockClerkAuth = {
  auth: jest.fn(() => ({ userId: 'user_test_123' })),
};

/**
 * Test data builders
 */
export const testDataBuilders = {
  createMeeting: (overrides = {}) => ({
    id: 'meeting_123',
    title: 'Test Meeting',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T11:00:00Z'),
    userId: 'user_123',
    ...overrides,
  }),

  createUser: (overrides = {}) => ({
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    clerkId: 'clerk_123',
    ...overrides,
  }),

  createChat: (overrides = {}) => ({
    id: 'chat_123',
    question: 'What was discussed?',
    answer: 'We discussed the project timeline.',
    meetingId: 'meeting_123',
    userId: 'user_123',
    ...overrides,
  }),

  createActionItem: (overrides = {}) => ({
    id: 'action_123',
    title: 'Follow up with team',
    dueDate: new Date('2024-01-15'),
    meetingId: 'meeting_123',
    userId: 'user_123',
    ...overrides,
  }),
};

/**
 * Setup helper for endpoint tests
 */
export class EndpointTestSetup {
  mockPrisma: any;
  mockAuth: jest.Mock;

  constructor() {
    this.mockPrisma = createMockPrisma();
    this.mockAuth = mockAuth();
  }

  setupMeetingMocks(meeting = testDataBuilders.createMeeting()) {
    this.mockPrisma.meeting.findUnique.mockResolvedValue(meeting);
    this.mockPrisma.meeting.findMany.mockResolvedValue([meeting]);
    return this;
  }

  setupUserMocks(user = testDataBuilders.createUser()) {
    this.mockPrisma.user.findUnique.mockResolvedValue(user);
    this.mockPrisma.user.findMany.mockResolvedValue([user]);
    this.mockPrisma.user.upsert.mockResolvedValue(user);
    return this;
  }

  setupNotFoundMocks() {
    this.mockPrisma.meeting.findUnique.mockResolvedValue(null);
    this.mockPrisma.user.findUnique.mockResolvedValue(null);
    return this;
  }

  setupErrorMocks() {
    this.mockPrisma.meeting.findUnique.mockRejectedValue(
      new Error('Database error')
    );
    return this;
  }

  reset() {
    jest.clearAllMocks();
  }
}
