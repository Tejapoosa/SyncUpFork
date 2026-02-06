/**
 * Security Utilities Library
 * Comprehensive security functions for the SyncUp application
 */

import { z } from 'zod';
import crypto from 'crypto';

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export const ValidationSchemas = {
  // User input
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  username: z.string().min(3).max(50).alphanumeric(),

  // Meeting data
  meetingTitle: z.string().min(1).max(500),
  meetingDescription: z.string().max(5000).optional(),
  meetingDate: z.string().datetime(),

  // Chat/RAG
  chatMessage: z.string().min(1).max(5000),
  conversationId: z.string().uuid(),

  // Generic
  uuid: z.string().uuid(),
  positiveInt: z.number().int().positive(),
  safeString: z.string().min(1).max(10000),
};

/**
 * Validate input against schema
 */
export function validateInput<T>(schema: z.ZodSchema, data: unknown): T {
  return schema.parse(data) as T;
}

/**
 * Safe parse with error details
 */
export function safeValidate<T>(
  schema: z.ZodSchema,
  data: unknown
): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { success: true, data: result.data as T };
}

// ============================================================================
// OUTPUT ENCODING
// ============================================================================

/**
 * Encode HTML entities to prevent XSS
 */
export function encodeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Encode for JSON response
 */
export function encodeJSON(obj: unknown): string {
  return JSON.stringify(obj);
}

/**
 * Encode for URL
 */
export function encodeURL(str: string): string {
  return encodeURIComponent(str);
}

// ============================================================================
// AUTHENTICATION & TOKENS
// ============================================================================

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data with salt
 */
export function hashData(data: string, salt: string = ''): string {
  const combinedData = data + salt;
  return crypto
    .createHash('sha256')
    .update(combinedData)
    .digest('hex');
}

/**
 * Validate JWT structure (basic check)
 */
export function validateJWTStructure(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // Verify base64 encoding
    Buffer.from(parts[0], 'base64').toString();
    Buffer.from(parts[1], 'base64').toString();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Check rate limit
 */
export function checkRateLimit(
  key: string,
  config: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore[key];

  if (!record || now > record.resetTime) {
    // Create new window
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: rateLimitStore[key].resetTime
    };
  }

  // Within existing window
  if (record.count < config.maxRequests) {
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const ip = req.headers.get('x-real-ip');
  if (ip) return ip;

  // Fallback
  return 'unknown';
}

// ============================================================================
// CORS & CSRF PROTECTION
// ============================================================================

/**
 * Validate CORS origin
 */
export function validateCORSOrigin(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) return false;

  // Allow exact match
  if (allowedOrigins.includes(origin)) return true;

  // Allow wildcard patterns
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.includes('*')) {
      const pattern = allowed
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return false;
  });
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  token: string,
  sessionToken: string
): boolean {
  if (!token || !sessionToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Get recommended security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ============================================================================
// SECRETS MANAGEMENT
// ============================================================================

/**
 * Mask sensitive data in logs
 */
export function maskSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'creditCard',
    'ssn'
  ];

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '***REDACTED***';
    } else {
      result[key] = maskSensitiveData(value);
    }
  }
  return result;
}

/**
 * Validate environment variables are set
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// ============================================================================
// SQL INJECTION PREVENTION
// ============================================================================

/**
 * Detect potential SQL injection patterns
 */
export function detectSQLInjection(input: string): boolean {
  const sqlKeywords = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'EXEC',
    'EXECUTE',
    ';',
    '--',
    '/*',
    '*/',
    'xp_',
    'sp_'
  ];

  const upperInput = input.toUpperCase();
  return sqlKeywords.some(keyword => upperInput.includes(keyword));
}

/**
 * Sanitize input to reduce SQL injection risk
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Escape single quotes
  sanitized = sanitized.replace(/'/g, "''");

  // Remove other dangerous characters
  sanitized = sanitized.replace(/[<>\"]/g, '');

  return sanitized.trim();
}

// ============================================================================
// FILE UPLOAD SECURITY
// ============================================================================

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Check file size
 */
export function checkFileSize(
  size: number,
  maxSizeBytes: number
): boolean {
  return size <= maxSizeBytes;
}

/**
 * Generate safe filename
 */
export function generateSafeFilename(
  originalName: string,
  prefix: string = 'file'
): string {
  // Remove path traversal attempts
  const baseName = originalName.split(/[\\/]/).pop() || 'file';

  // Remove unsafe characters
  const safe = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .substring(0, 200);

  // Add timestamp to prevent collisions
  const timestamp = Date.now();
  const ext = safe.includes('.') ? safe.split('.').pop() : '';

  return `${prefix}_${timestamp}.${ext || 'bin'}`;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface SecurityAuditLog {
  timestamp: Date;
  type: 'AUTH' | 'AUTHZ' | 'INJECTION' | 'RATE_LIMIT' | 'CORS' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress: string;
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Log security event
 */
export function logSecurityEvent(event: SecurityAuditLog): void {
  const maskedEvent = {
    ...event,
    details: maskSensitiveData(event.details)
  };

  // Log based on severity
  if (event.severity === 'CRITICAL') {
    console.error('[SECURITY-CRITICAL]', maskedEvent);
  } else if (event.severity === 'HIGH') {
    console.warn('[SECURITY-HIGH]', maskedEvent);
  } else {
    console.log('[SECURITY-AUDIT]', maskedEvent);
  }

  // In production, send to security monitoring service
  // await sendToSecurityMonitoring(maskedEvent);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SecurityUtils = {
  // Validation
  validateInput,
  safeValidate,

  // Encoding
  encodeHTML,
  encodeJSON,
  encodeURL,

  // Auth
  generateSecureToken,
  hashData,
  validateJWTStructure,
  isTokenExpired,

  // Rate limiting
  checkRateLimit,
  getClientIP,

  // CORS & CSRF
  validateCORSOrigin,
  generateCSRFToken,
  validateCSRFToken,

  // Headers
  getSecurityHeaders,
  applySecurityHeaders,

  // Secrets
  maskSensitiveData,
  validateRequiredEnvVars,

  // SQL Injection
  detectSQLInjection,
  sanitizeInput,

  // Files
  validateFileType,
  checkFileSize,
  generateSafeFilename,

  // Audit
  logSecurityEvent
};

export default SecurityUtils;
