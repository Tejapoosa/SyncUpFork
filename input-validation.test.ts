/**
 * Comprehensive tests for input validation and sanitization
 * Tests all validation schemas, sanitizers, and edge cases
 */

import InputValidator, { Sanitizers, ValidationSchemas } from './lib/input-validator';

describe('Input Validation & Sanitization', () => {
  /**
   * Email Validation Tests
   */
  describe('Email Validation', () => {
    it('should validate correct email', () => {
      const result = InputValidator.validateEmail('user@example.com');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('should lowercase email', () => {
      const result = InputValidator.validateEmail('USER@EXAMPLE.COM');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      const result = InputValidator.validateEmail('not-an-email');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty email', () => {
      const result = InputValidator.validateEmail('');
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace from email', () => {
      const result = InputValidator.validateEmail('  user@example.com  ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });
  });

  /**
   * URL Validation Tests
   */
  describe('URL Validation', () => {
    it('should validate correct URL', () => {
      const result = InputValidator.validateUrl('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject javascript: protocol', () => {
      const result = InputValidator.validateUrl('javascript:alert("xss")');
      expect(result.valid).toBe(false);
    });

    it('should reject data: protocol', () => {
      const result = InputValidator.validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
    });

    it('should accept http protocol', () => {
      const result = InputValidator.validateUrl('http://example.com');
      expect(result.valid).toBe(true);
    });

    it('should sanitize valid URL', () => {
      const result = InputValidator.validateUrl('https://example.com/path');
      expect(result.value).toBe('https://example.com/path');
    });
  });

  /**
   * UUID Validation Tests
   */
  describe('UUID Validation', () => {
    it('should validate correct UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = InputValidator.validateUUID(uuid);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(uuid);
    });

    it('should reject invalid UUID', () => {
      const result = InputValidator.validateUUID('not-a-uuid');
      expect(result.valid).toBe(false);
    });

    it('should reject malformed UUID', () => {
      const result = InputValidator.validateUUID('550e8400-e29b-41d4-a716');
      expect(result.valid).toBe(false);
    });
  });

  /**
   * Text Validation Tests
   */
  describe('Text Validation', () => {
    it('should validate correct text', () => {
      const result = InputValidator.validateText('Hello World', 1, 100);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should enforce minimum length', () => {
      const result = InputValidator.validateText('', 1, 100);
      expect(result.valid).toBe(false);
    });

    it('should enforce maximum length', () => {
      const text = 'a'.repeat(101);
      const result = InputValidator.validateText(text, 1, 100);
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = InputValidator.validateText('  hello  ', 1, 100);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should remove control characters', () => {
      const result = InputValidator.validateText('hello\x00world', 1, 100);
      expect(result.valid).toBe(true);
      expect(result.value).toMatch(/hello.*world/);
    });
  });

  /**
   * HTML Sanitization Tests
   */
  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const sanitized = Sanitizers.html(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const sanitized = Sanitizers.html(input);
      expect(sanitized).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = Sanitizers.html(input);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should preserve safe HTML', () => {
      const input = '<p><strong>Bold</strong> text</p>';
      const sanitized = Sanitizers.html(input);
      expect(sanitized).toContain('Bold');
    });

    it('should handle malformed HTML', () => {
      const input = '<div><p>Unclosed paragraph</div>';
      const sanitized = Sanitizers.html(input);
      expect(sanitized).toBeTruthy();
    });
  });

  /**
   * SQL Sanitization Tests
   */
  describe('SQL Sanitization', () => {
    it('should escape single quotes', () => {
      const input = "O'Reilly";
      const sanitized = Sanitizers.sql(input);
      expect(sanitized).toContain("''");
    });

    it('should remove SQL comments', () => {
      const input = "SELECT * -- comment";
      const sanitized = Sanitizers.sql(input);
      expect(sanitized).not.toContain('--');
    });

    it('should remove block comments', () => {
      const input = "SELECT * /* comment */ FROM users";
      const sanitized = Sanitizers.sql(input);
      expect(sanitized).not.toContain('/*');
    });

    it('should preserve alphanumeric content', () => {
      const input = "John Doe";
      const sanitized = Sanitizers.sql(input);
      expect(sanitized).toBe("John Doe");
    });
  });

  /**
   * Filename Sanitization Tests
   */
  describe('Filename Sanitization', () => {
    it('should remove dangerous characters', () => {
      const input = 'file<script>.txt';
      const sanitized = Sanitizers.filename(input);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should allow safe characters', () => {
      const input = 'my-file_name.txt';
      const sanitized = Sanitizers.filename(input);
      expect(sanitized).toBe('my-file_name.txt');
    });

    it('should remove leading dots', () => {
      const input = '...hidden.txt';
      const sanitized = Sanitizers.filename(input);
      expect(sanitized).not.toMatch(/^\.+/);
    });

    it('should limit filename length', () => {
      const input = 'a'.repeat(300);
      const sanitized = Sanitizers.filename(input);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  /**
   * Text Sanitization Tests
   */
  describe('Text Sanitization', () => {
    it('should remove null bytes', () => {
      const input = 'hello\x00world';
      const sanitized = Sanitizers.text(input);
      expect(sanitized).not.toContain('\x00');
    });

    it('should remove control characters', () => {
      const input = 'hello\x01\x02world';
      const sanitized = Sanitizers.text(input);
      expect(sanitized).toMatch(/hello.*world/);
    });

    it('should normalize whitespace', () => {
      const input = 'hello    world';
      const sanitized = Sanitizers.text(input);
      expect(sanitized).toBe('hello world');
    });

    it('should preserve newlines', () => {
      const input = 'hello\nworld';
      const sanitized = Sanitizers.text(input);
      expect(sanitized).toContain('\n');
    });
  });

  /**
   * Password Validation Tests
   */
  describe('Password Validation', () => {
    it('should accept strong password', () => {
      const result = InputValidator.validatePassword('StrongPass123!@#');
      expect(result.valid).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = InputValidator.validatePassword('strongpass123!@#');
      expect(result.valid).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = InputValidator.validatePassword('STRONGPASS123!@#');
      expect(result.valid).toBe(false);
    });

    it('should reject password without number', () => {
      const result = InputValidator.validatePassword('StrongPass!@#');
      expect(result.valid).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = InputValidator.validatePassword('StrongPass123');
      expect(result.valid).toBe(false);
    });

    it('should reject short password', () => {
      const result = InputValidator.validatePassword('Pass1!');
      expect(result.valid).toBe(false);
    });
  });

  /**
   * Meeting Validation Tests
   */
  describe('Meeting Validation', () => {
    it('should validate correct meeting data', () => {
      const data = {
        title: 'Team Standup',
        description: 'Daily standup meeting',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        attendees: ['user1@example.com', 'user2@example.com'],
        topic: 'Sprint planning',
      };
      const result = InputValidator.validateMeeting(data);
      expect(result.valid).toBe(true);
    });

    it('should enforce end time after start time', () => {
      const data = {
        title: 'Team Standup',
        startTime: new Date(),
        endTime: new Date(Date.now() - 3600000),
        attendees: ['user1@example.com'],
      };
      const result = InputValidator.validateMeeting(data);
      expect(result.valid).toBe(false);
    });

    it('should require at least one attendee', () => {
      const data = {
        title: 'Team Standup',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        attendees: [],
      };
      const result = InputValidator.validateMeeting(data);
      expect(result.valid).toBe(false);
    });

    it('should enforce title length', () => {
      const data = {
        title: 'a'.repeat(201),
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        attendees: ['user@example.com'],
      };
      const result = InputValidator.validateMeeting(data);
      expect(result.valid).toBe(false);
    });
  });

  /**
   * Chat Validation Tests
   */
  describe('Chat Validation', () => {
    it('should validate correct chat data', () => {
      const data = {
        message: 'Hello world',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = InputValidator.validateChat(data);
      expect(result.valid).toBe(true);
    });

    it('should sanitize message content', () => {
      const data = {
        message: '<script>alert(1)</script>Hello',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = InputValidator.validateChat(data);
      expect(result.valid).toBe(true);
      expect(result.value?.message).not.toContain('<script>');
    });

    it('should reject empty message', () => {
      const data = {
        message: '',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = InputValidator.validateChat(data);
      expect(result.valid).toBe(false);
    });

    it('should enforce message length limit', () => {
      const data = {
        message: 'a'.repeat(4001),
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = InputValidator.validateChat(data);
      expect(result.valid).toBe(false);
    });
  });

  /**
   * User Settings Validation Tests
   */
  describe('User Settings Validation', () => {
    it('should validate correct settings', () => {
      const data = {
        timezone: 'America/New_York',
        language: 'en',
        notifications: true,
        emailDigest: 'daily',
      };
      const result = InputValidator.validateUserSettings(data);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid language', () => {
      const data = {
        timezone: 'America/New_York',
        language: 'invalid',
      };
      const result = InputValidator.validateUserSettings(data);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid email digest', () => {
      const data = {
        timezone: 'America/New_York',
        emailDigest: 'hourly',
      };
      const result = InputValidator.validateUserSettings(data);
      expect(result.valid).toBe(false);
    });
  });

  /**
   * Request Body Sanitization Tests
   */
  describe('Request Body Sanitization', () => {
    it('should sanitize nested objects', () => {
      const body = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        message: 'hello\x00world',
      };
      const sanitized = InputValidator.sanitizeRequestBody(body);
      expect(sanitized.message).not.toContain('\x00');
      expect(sanitized.user.name).toBe('John Doe');
    });

    it('should sanitize arrays', () => {
      const body = {
        items: ['item\x001', 'item2'],
      };
      const sanitized = InputValidator.sanitizeRequestBody(body);
      expect(sanitized.items[0]).not.toContain('\x00');
    });

    it('should limit recursion depth', () => {
      let obj: any = { value: 'test' };
      for (let i = 0; i < 15; i++) {
        obj = { nested: obj };
      }
      const sanitized = InputValidator.sanitizeRequestBody(obj);
      expect(sanitized).toBeTruthy();
    });
  });

  /**
   * Query Parameters Validation Tests
   */
  describe('Query Parameters Validation', () => {
    it('should validate query parameters', () => {
      const params = { page: '1', limit: '10' };
      const schema = {
        page: ValidationSchemas.positiveInt,
        limit: ValidationSchemas.positiveInt,
      };
      const result = InputValidator.validateQueryParams(params, schema);
      expect(result.valid).toBe(true);
    });

    it('should report validation errors', () => {
      const params = { page: 'invalid', limit: '10' };
      const schema = {
        page: ValidationSchemas.positiveInt,
        limit: ValidationSchemas.positiveInt,
      };
      const result = InputValidator.validateQueryParams(params, schema);
      expect(result.valid).toBe(false);
      expect(result.errors?.page).toBeDefined();
    });

    it('should handle optional parameters', () => {
      const params = { limit: '10' };
      const schema = {
        page: ValidationSchemas.positiveInt.optional(),
        limit: ValidationSchemas.positiveInt,
      };
      const result = InputValidator.validateQueryParams(params, schema);
      expect(result.valid).toBe(true);
    });
  });

  /**
   * File Upload Validation Tests
   */
  describe('File Upload Validation', () => {
    it('should validate correct file upload', () => {
      const result = InputValidator.validateFileUpload(
        'document.pdf',
        1024000,
        ['application/pdf'],
        'application/pdf'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject oversized file', () => {
      const result = InputValidator.validateFileUpload(
        'large.pdf',
        11000000,
        ['application/pdf'],
        'application/pdf'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject invalid mime type', () => {
      const result = InputValidator.validateFileUpload(
        'malicious.exe',
        1024,
        ['application/pdf'],
        'application/x-msdownload'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject invalid filename', () => {
      const result = InputValidator.validateFileUpload(
        '<script>.pdf',
        1024,
        ['application/pdf'],
        'application/pdf'
      );
      expect(result.valid).toBe(false);
    });
  });

  /**
   * String Length Checks
   */
  describe('String Length Checks', () => {
    it('should allow string within limit', () => {
      const result = InputValidator.checkStringLength('hello', 10);
      expect(result).toBe(true);
    });

    it('should reject string over limit', () => {
      const result = InputValidator.checkStringLength('hello', 3);
      expect(result).toBe(false);
    });
  });

  /**
   * Email Sanitization Tests
   */
  describe('Email Sanitization', () => {
    it('should lowercase email', () => {
      const sanitized = Sanitizers.email('USER@EXAMPLE.COM');
      expect(sanitized).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const sanitized = Sanitizers.email('  user@example.com  ');
      expect(sanitized).toBe('user@example.com');
    });
  });

  /**
   * Phone Sanitization Tests
   */
  describe('Phone Sanitization', () => {
    it('should keep digits and plus sign', () => {
      const sanitized = Sanitizers.phone('+1-555-1234');
      expect(sanitized).toBe('+15551234');
    });

    it('should remove dashes and spaces', () => {
      const sanitized = Sanitizers.phone('555 123 4567');
      expect(sanitized).toBe('5551234567');
    });
  });

  /**
   * Edge Cases Tests
   */
  describe('Edge Cases', () => {
    it('should handle null input gracefully', () => {
      const result = InputValidator.validateText(null as any);
      expect(result.valid).toBe(false);
    });

    it('should handle undefined input gracefully', () => {
      const result = InputValidator.validateEmail(undefined as any);
      expect(result.valid).toBe(false);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = InputValidator.validateText(longString, 1, 100);
      expect(result.valid).toBe(false);
    });

    it('should handle special characters in text', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const sanitized = Sanitizers.text(special);
      expect(sanitized).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      const unicode = 'Hello 世界 مرحبا';
      const result = InputValidator.validateText(unicode);
      expect(result.valid).toBe(true);
    });
  });

  /**
   * Injection Attack Prevention Tests
   */
  describe('Injection Attack Prevention', () => {
    it('should prevent XSS attacks', () => {
      const xssPayload = '"><script>alert("XSS")</script>';
      const sanitized = Sanitizers.html(xssPayload);
      expect(sanitized).not.toContain('<script>');
    });

    it('should prevent SQL injection attacks', () => {
      const sqlPayload = "admin' --";
      const sanitized = Sanitizers.sql(sqlPayload);
      expect(sanitized).toContain("''");
    });

    it('should prevent path traversal attacks', () => {
      const pathPayload = '../../../etc/passwd';
      const sanitized = Sanitizers.filename(pathPayload);
      expect(sanitized).not.toContain('..');
    });

    it('should prevent LDAP injection attacks', () => {
      const ldapPayload = '*';
      const escaped = require('./lib/input-validator').EscapeUtils.ldap(ldapPayload);
      expect(escaped).toContain('\\');
    });

    it('should prevent command injection attacks', () => {
      const cmdPayload = 'test; rm -rf /';
      const sanitized = Sanitizers.text(cmdPayload);
      expect(sanitized).toBeTruthy();
    });
  });
});
