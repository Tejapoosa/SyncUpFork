/**
 * Tests for Error Handling
 */

import { AppError, ErrorCode, ErrorMessages, createErrorResponse } from '../lib/errors';

describe('AppError', () => {
  it('should create error with all properties', () => {
    const error = new AppError({
      code: ErrorCode.MEETING_NOT_FOUND,
      message: 'Meeting does not exist',
      userMessage: 'The meeting you are looking for could not be found',
      statusCode: 404,
    });

    expect(error.code).toBe(ErrorCode.MEETING_NOT_FOUND);
    expect(error.message).toBe('Meeting does not exist');
    expect(error.userMessage).toBe('The meeting you are looking for could not be found');
    expect(error.statusCode).toBe(404);
  });

  it('should create error with default userMessage', () => {
    const error = new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Validation error occurred',
    });

    expect(error.userMessage).toBe('Validation error occurred');
  });

  it('should serialize to JSON', () => {
    const error = new AppError({
      code: ErrorCode.MEETING_NOT_FOUND,
      message: 'Not found',
      userMessage: 'Meeting not found',
      statusCode: 404,
    });

    const json = error.toJSON();
    expect(json.code).toBe(ErrorCode.MEETING_NOT_FOUND);
    expect(json.statusCode).toBe(404);
    expect(json.timestamp).toBeDefined();
  });

  it('should preserve original error', () => {
    const originalError = new Error('Original problem');
    const error = new AppError({
      code: ErrorCode.DATABASE_ERROR,
      message: 'Database error',
      originalError,
    });

    expect(error.originalError).toBe(originalError);
  });
});

describe('ErrorMessages', () => {
  it('should have predefined error messages', () => {
    expect(ErrorMessages.NOT_AUTHENTICATED).toBeDefined();
    expect(ErrorMessages.MEETING_NOT_FOUND).toBeDefined();
    expect(ErrorMessages.RAG_NO_CONTEXT).toBeDefined();
  });

  it('should generate validation error', () => {
    const error = ErrorMessages.VALIDATION_FAILED('email');
    expect(error.message).toContain('email');
    expect(error.statusCode).toBe(400);
  });

  it('should generate rate limit error', () => {
    const error = ErrorMessages.RATE_LIMIT_EXCEEDED(100, '1h');
    expect(error.message).toContain('100');
    expect(error.statusCode).toBe(429);
  });
});

describe('createErrorResponse', () => {
  it('should format AppError response', () => {
    const error = new AppError({
      code: ErrorCode.MEETING_NOT_FOUND,
      message: 'Meeting does not exist',
      userMessage: 'Meeting not found',
      statusCode: 404,
    });

    const response = createErrorResponse(error, 'req_123');
    expect(response.error).toBe('Meeting not found');
    expect(response.code).toBe(ErrorCode.MEETING_NOT_FOUND);
    expect(response.requestId).toBe('req_123');
    expect(response.statusCode).toBe(404);
  });

  it('should format generic Error response', () => {
    const error = new Error('Some random error');
    const response = createErrorResponse(error, 'req_456');

    expect(response.error).toBe('An unexpected error occurred');
    expect(response.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(response.requestId).toBe('req_456');
    expect(response.statusCode).toBe(500);
  });

  it('should include timestamp in response', () => {
    const error = new AppError(ErrorMessages.NOT_AUTHENTICATED);
    const response = createErrorResponse(error);

    expect(response.timestamp).toBeDefined();
  });
});
