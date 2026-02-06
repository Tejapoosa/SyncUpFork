/**
 * Tests for Validation
 */

import { chatRequestSchema, createMeetingSchema, validateRequest } from '../validation';

describe('Validation', () => {
  describe('chatRequestSchema', () => {
    it('should validate correct chat request', () => {
      const data = { question: 'What was discussed?' };
      const result = validateRequest(chatRequestSchema, data);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.question).toBe('What was discussed?');
      }
    });

    it('should reject empty question', () => {
      const data = { question: '' };
      const result = validateRequest(chatRequestSchema, data);

      expect(result.valid).toBe(false);
    });

    it('should reject non-string question', () => {
      const data = { question: 123 };
      const result = validateRequest(chatRequestSchema, data);

      expect(result.valid).toBe(false);
    });

    it('should accept optional userId', () => {
      const data = { question: 'test?', userId: 'user_123' };
      const result = validateRequest(chatRequestSchema, data);

      expect(result.valid).toBe(true);
    });
  });

  describe('createMeetingSchema', () => {
    it('should validate correct meeting', () => {
      const data = {
        title: 'Team Meeting',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
      };
      const result = validateRequest(createMeetingSchema, data);

      expect(result.valid).toBe(true);
    });

    it('should reject missing title', () => {
      const data = {
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
      };
      const result = validateRequest(createMeetingSchema, data);

      expect(result.valid).toBe(false);
    });

    it('should accept optional description', () => {
      const data = {
        title: 'Meeting',
        description: 'A long description',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
      };
      const result = validateRequest(createMeetingSchema, data);

      expect(result.valid).toBe(true);
    });
  });
});
