/**
 * Jest Setup
 * Configures test environment and global test utilities
 */

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_key';
process.env.CLERK_SECRET_KEY = 'test_secret';
process.env.CLERK_WEBHOOK_SECRET = 'test_webhook';
process.env.GOOGLE_CLIENT_ID = 'test_google_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_google_secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
process.env.PINECONE_API_KEY = 'test_pinecone_key';
process.env.PINECONE_INDEX_NAME = 'test-index';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test_aws_key';
process.env.AWS_SECRET_ACCESS_KEY = 'test_aws_secret';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.RESEND_API_KEY = 'test_resend_key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  /**
   * Create a mock user
   */
  createMockUser: (overrides = {}) => ({
    id: 'user_123',
    clerkId: 'clerk_123',
    email: 'test@example.com',
    name: 'Test User',
    currentPlan: 'premium',
    meetingsThisMonth: 0,
    chatMessagesToday: 0,
    ...overrides,
  }),

  /**
   * Create a mock meeting
   */
  createMockMeeting: (overrides = {}) => ({
    id: 'meeting_123',
    userId: 'user_123',
    title: 'Test Meeting',
    description: 'A test meeting',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    transcript: null,
    summary: null,
    actionItems: null,
    processed: false,
    ragProcessed: false,
    ...overrides,
  }),

  /**
   * Create a mock request
   */
  createMockRequest: (overrides = {}) => ({
    json: jest.fn(),
    headers: new Map(),
    ...overrides,
  }),

  /**
   * Create a mock response
   */
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    headers: new Map(),
  }),
};

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
