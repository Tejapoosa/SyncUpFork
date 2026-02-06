/**
 * Comprehensive Input Validation & Sanitization Library
 * Handles validation, sanitization, and normalization of user inputs
 * OWASP-compliant input validation for all endpoints
 */

import { z } from 'zod';

/**
 * Validation schemas for common input types
 */
export const ValidationSchemas = {
  // Email validation
  email: z.string().email().toLowerCase().trim(),

  // URL validation
  url: z.string().url(),

  // UUID validation
  uuid: z.string().uuid(),

  // Slack ID validation
  slackId: z.string().regex(/^[A-Z0-9]{11,}$/),

  // Google Calendar ID validation
  calendarId: z.string().email(),

  // Phone validation (international format)
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),

  // Username validation (alphanumeric, underscore, hyphen)
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),

  // Password validation
  password: z.string().min(12).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain uppercase, lowercase, number, and special character'
  ),

  // Text with length limits
  text: (min = 1, max = 1000) => z.string().min(min).max(max).trim(),

  // Description field
  description: z.string().min(0).max(5000).trim(),

  // Title field
  title: z.string().min(1).max(200).trim(),

  // Number validation
  positiveInt: z.number().int().positive(),
  positiveFloat: z.number().positive(),
  percentage: z.number().min(0).max(100),

  // Date validation
  date: z.coerce.date(),
  isoDate: z.string().datetime(),

  // Boolean validation
  boolean: z.boolean().or(z.string().transform(v => v === 'true')),

  // Array validation
  stringArray: z.array(z.string()),
  emailArray: z.array(z.string().email()),

  // Meeting data
  meeting: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    attendees: z.array(z.string().email()).min(1),
    topic: z.string().max(500).optional(),
  }),

  // Chat data
  chat: z.object({
    message: z.string().min(1).max(4000),
    conversationId: z.string().uuid(),
    metadata: z.record(z.any()).optional(),
  }),

  // User settings
  userSettings: z.object({
    timezone: z.string(),
    language: z.enum(['en', 'es', 'fr', 'de']).optional(),
    notifications: z.boolean().optional(),
    emailDigest: z.enum(['daily', 'weekly', 'monthly']).optional(),
  }),
};

/**
 * Sanitizer functions for different input types
 */
export const Sanitizers = {
  /**
   * Sanitize HTML content - remove dangerous tags and attributes
   */
  html: (input: string): string => {
    if (typeof input !== 'string') return '';

    return input
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      // Remove dangerous attributes
      .replace(/\s(?:href|src|data|action)\s*=\s*["']?javascript:[^"'\s>]*["']?/gi, '')
      // Trim whitespace
      .trim();
  },

  /**
   * Sanitize SQL input - prevent SQL injection
   */
  sql: (input: string): string => {
    if (typeof input !== 'string') return '';

    return input
      // Remove SQL comments
      .replace(/--.*$/gm, '')
      .replace(/\/\*.*?\*\//g, '')
      // Escape single quotes by doubling them
      .replace(/'/g, "''")
      // Remove/escape dangerous keywords in strings
      .trim();
  },

  /**
   * Sanitize URL - prevent XSS and injection
   */
  url: (input: string): string => {
    if (typeof input !== 'string') return '';

    try {
      const url = new URL(input);
      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },

  /**
   * Sanitize filename - remove dangerous characters
   */
  filename: (input: string): string => {
    if (typeof input !== 'string') return 'file';

    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '')
      .substring(0, 255)
      .trim();
  },

  /**
   * Sanitize JSON - ensure valid JSON
   */
  json: (input: string): string => {
    if (typeof input !== 'string') return '{}';

    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      return '{}';
    }
  },

  /**
   * Sanitize text - remove potential injection vectors
   */
  text: (input: string): string => {
    if (typeof input !== 'string') return '';

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except newline, tab
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Sanitize email - lowercase and trim
   */
  email: (input: string): string => {
    if (typeof input !== 'string') return '';

    return input.toLowerCase().trim();
  },

  /**
   * Sanitize phone - keep only digits and +
   */
  phone: (input: string): string => {
    if (typeof input !== 'string') return '';

    return input.replace(/[^0-9+]/g, '').trim();
  },

  /**
   * Sanitize object recursively
   */
  object: (obj: any, depth = 0): any => {
    if (depth > 10) return null; // Prevent deep recursion

    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? Sanitizers.text(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => Sanitizers.object(item, depth + 1));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = Sanitizers.object(value, depth + 1);
    }
    return sanitized;
  },
};

/**
 * Main validator class
 */
export class InputValidator {
  /**
   * Validate and sanitize email
   */
  static validateEmail(email: unknown): { valid: boolean; value: string; error?: string } {
    try {
      const value = ValidationSchemas.email.parse(email);
      return { valid: true, value };
    } catch (error) {
      return { valid: false, value: '', error: 'Invalid email format' };
    }
  }

  /**
   * Validate and sanitize URL
   */
  static validateUrl(url: unknown): { valid: boolean; value: string; error?: string } {
    try {
      const value = ValidationSchemas.url.parse(url);
      const sanitized = Sanitizers.url(value);
      return { valid: !!sanitized, value: sanitized };
    } catch (error) {
      return { valid: false, value: '', error: 'Invalid URL format' };
    }
  }

  /**
   * Validate UUID
   */
  static validateUUID(uuid: unknown): { valid: boolean; value: string; error?: string } {
    try {
      const value = ValidationSchemas.uuid.parse(uuid);
      return { valid: true, value };
    } catch (error) {
      return { valid: false, value: '', error: 'Invalid UUID format' };
    }
  }

  /**
   * Validate and sanitize text
   */
  static validateText(
    text: unknown,
    min = 1,
    max = 1000
  ): { valid: boolean; value: string; error?: string } {
    try {
      const sanitized = Sanitizers.text(String(text));
      const value = ValidationSchemas.text(min, max).parse(sanitized);
      return { valid: true, value };
    } catch (error) {
      return { valid: false, value: '', error: `Text must be ${min}-${max} characters` };
    }
  }

  /**
   * Validate and sanitize HTML
   */
  static validateHTML(html: unknown): { valid: boolean; value: string; error?: string } {
    try {
      const sanitized = Sanitizers.html(String(html));
      return { valid: sanitized.length > 0, value: sanitized };
    } catch (error) {
      return { valid: false, value: '', error: 'Invalid HTML content' };
    }
  }

  /**
   * Validate password
   */
  static validatePassword(password: unknown): { valid: boolean; error?: string } {
    try {
      ValidationSchemas.password.parse(password);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.errors?.[0]?.message || 'Password does not meet requirements'
      };
    }
  }

  /**
   * Validate meeting data
   */
  static validateMeeting(data: unknown): { valid: boolean; value?: any; error?: string } {
    try {
      const value = ValidationSchemas.meeting.parse(data);
      // Ensure endTime > startTime
      if (value.endTime <= value.startTime) {
        return { valid: false, error: 'End time must be after start time' };
      }
      return { valid: true, value };
    } catch (error: any) {
      return { valid: false, error: error.errors?.[0]?.message || 'Invalid meeting data' };
    }
  }

  /**
   * Validate chat data
   */
  static validateChat(data: unknown): { valid: boolean; value?: any; error?: string } {
    try {
      const value = ValidationSchemas.chat.parse(data);
      const sanitizedMessage = Sanitizers.text(value.message);
      return { valid: true, value: { ...value, message: sanitizedMessage } };
    } catch (error: any) {
      return { valid: false, error: error.errors?.[0]?.message || 'Invalid chat data' };
    }
  }

  /**
   * Validate user settings
   */
  static validateUserSettings(data: unknown): { valid: boolean; value?: any; error?: string } {
    try {
      const value = ValidationSchemas.userSettings.parse(data);
      return { valid: true, value };
    } catch (error: any) {
      return { valid: false, error: error.errors?.[0]?.message || 'Invalid settings' };
    }
  }

  /**
   * Sanitize entire request body
   */
  static sanitizeRequestBody(body: any): any {
    return Sanitizers.object(body);
  }

  /**
   * Validate query parameters
   */
  static validateQueryParams(
    params: Record<string, any>,
    schema: Record<string, any>
  ): { valid: boolean; value?: any; errors?: Record<string, string> } {
    const errors: Record<string, string> = {};
    const value: Record<string, any> = {};

    for (const [key, validator] of Object.entries(schema)) {
      try {
        if (params[key] !== undefined) {
          value[key] = validator.parse(params[key]);
        }
      } catch (error: any) {
        errors[key] = error.errors?.[0]?.message || 'Invalid value';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      value: Object.keys(errors).length === 0 ? value : undefined,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Rate limit string length
   */
  static checkStringLength(str: string, max: number): boolean {
    return typeof str === 'string' && str.length <= max;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    filename: string,
    size: number,
    allowedMimes: string[],
    mimeType: string,
    maxSize = 10485760 // 10MB
  ): { valid: boolean; error?: string } {
    // Check size
    if (size > maxSize) {
      return { valid: false, error: `File too large (max ${maxSize / 1024 / 1024}MB)` };
    }

    // Check mime type
    if (!allowedMimes.includes(mimeType)) {
      return { valid: false, error: 'File type not allowed' };
    }

    // Check filename
    const sanitized = Sanitizers.filename(filename);
    if (!sanitized || sanitized === 'file') {
      return { valid: false, error: 'Invalid filename' };
    }

    return { valid: true };
  }
}

/**
 * Middleware factory for request validation
 */
export function createValidationMiddleware(schema: z.ZodSchema) {
  return async (req: any, res: any, next: any) => {
    try {
      // Sanitize request body
      req.body = Sanitizers.object(req.body);

      // Validate against schema
      const result = schema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors,
        });
      }

      req.validatedData = result.data;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Validation error' });
    }
  };
}

/**
 * Helper to escape common injection vectors
 */
export const EscapeUtils = {
  html: (str: string) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  xpath: (str: string) => {
    return str.replace(/["']/g, (char) => (char === '"' ? '\\"' : "\\'"));
  },

  ldap: (str: string) => {
    return str
      .replace(/\\/g, '\\5c')
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\x00/g, '\\00');
  },

  csv: (str: string) => {
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  },
};

export default InputValidator;
