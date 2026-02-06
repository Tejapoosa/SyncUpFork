/**
 * Security Tests
 * Comprehensive test suite for security features
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  SecurityUtils,
  validateInput,
  safeValidate,
  encodeHTML,
  generateSecureToken,
  validateJWTStructure,
  isTokenExpired,
  checkRateLimit,
  validateCORSOrigin,
  generateCSRFToken,
  validateCSRFToken,
  getSecurityHeaders,
  maskSensitiveData,
  detectSQLInjection,
  sanitizeInput,
  validateFileType,
  generateSafeFilename,
  logSecurityEvent,
} from '@/lib/security';

import { ValidationSchemas } from '@/lib/validation-schemas';

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Input Validation', () => {
  it('should validate email', () => {
    expect(() => {
      validateInput(ValidationSchemas.email, 'test@example.com');
    }).not.toThrow();
  });

  it('should reject invalid email', () => {
    expect(() => {
      validateInput(ValidationSchemas.email, 'invalid-email');
    }).toThrow();
  });

  it('should validate password', () => {
    expect(() => {
      validateInput(ValidationSchemas.password, 'securePassword123');
    }).not.toThrow();
  });

  it('should reject weak password', () => {
    expect(() => {
      validateInput(ValidationSchemas.password, 'weak');
    }).toThrow();
  });

  it('should safely parse invalid data', () => {
    const result = safeValidate(ValidationSchemas.email, 'invalid-email');
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should safely parse valid data', () => {
    const result = safeValidate(ValidationSchemas.email, 'test@example.com');
    expect(result.success).toBe(true);
    expect(result.data).toBe('test@example.com');
  });
});

// ============================================================================
// OUTPUT ENCODING TESTS
// ============================================================================

describe('Output Encoding', () => {
  it('should encode HTML entities', () => {
    const dangerous = '<script>alert("xss")</script>';
    const encoded = encodeHTML(dangerous);
    expect(encoded).not.toContain('<script>');
    expect(encoded).toContain('&lt;');
  });

  it('should handle HTML with special characters', () => {
    const input = '<div class="test">Content</div>';
    const encoded = encodeHTML(input);
    expect(encoded).not.toContain('<div');
    expect(encoded).toContain('&lt;');
  });

  it('should preserve safe characters in encoding', () => {
    const safe = 'Hello World 123';
    const encoded = encodeHTML(safe);
    expect(encoded).toBe(safe);
  });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Authentication & Tokens', () => {
  it('should generate secure tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toEqual(token2);
    expect(token1.length).toBe(64); // 32 bytes * 2 for hex
  });

  it('should generate tokens of custom length', () => {
    const token = generateSecureToken(16);
    expect(token.length).toBe(32); // 16 bytes * 2 for hex
  });

  it('should validate correct JWT structure', () => {
    const validJWT =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
    expect(validateJWTStructure(validJWT)).toBe(true);
  });

  it('should reject invalid JWT structure', () => {
    expect(validateJWTStructure('invalid.token')).toBe(false);
    expect(validateJWTStructure('invalid')).toBe(false);
    expect(validateJWTStructure('')).toBe(false);
  });

  it('should detect expired tokens', () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    expect(isTokenExpired(pastDate)).toBe(true);
  });

  it('should detect non-expired tokens', () => {
    const futureDate = new Date(Date.now() + 1000); // 1 second in future
    expect(isTokenExpired(futureDate)).toBe(false);
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const config = { windowMs: 1000, maxRequests: 3 };
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit('test-key', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3 - i - 1);
    }
  });

  it('should reject requests exceeding limit', () => {
    const config = { windowMs: 1000, maxRequests: 2 };
    checkRateLimit('test-key-2', config);
    checkRateLimit('test-key-2', config);
    const result = checkRateLimit('test-key-2', config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset limit after window expires', (done) => {
    const config = { windowMs: 100, maxRequests: 1 };
    checkRateLimit('test-key-3', config);

    setTimeout(() => {
      const result = checkRateLimit('test-key-3', config);
      expect(result.allowed).toBe(true);
      done();
    }, 150);
  });
});

// ============================================================================
// CORS & CSRF TESTS
// ============================================================================

describe('CORS & CSRF Protection', () => {
  it('should allow exact origin match', () => {
    const allowed = ['https://example.com'];
    expect(validateCORSOrigin('https://example.com', allowed)).toBe(true);
  });

  it('should reject non-matching origin', () => {
    const allowed = ['https://example.com'];
    expect(validateCORSOrigin('https://evil.com', allowed)).toBe(false);
  });

  it('should allow wildcard origin', () => {
    const allowed = ['*'];
    expect(validateCORSOrigin('https://any.com', allowed)).toBe(true);
  });

  it('should allow pattern matching', () => {
    const allowed = ['https://*.example.com'];
    expect(validateCORSOrigin('https://sub.example.com', allowed)).toBe(true);
  });

  it('should reject null origin', () => {
    const allowed = ['https://example.com'];
    expect(validateCORSOrigin(null, allowed)).toBe(false);
  });

  it('should generate CSRF tokens', () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    expect(token1).not.toEqual(token2);
    expect(token1.length).toBe(64);
  });

  it('should validate matching CSRF tokens', () => {
    const token = generateCSRFToken();
    expect(validateCSRFToken(token, token)).toBe(true);
  });

  it('should reject mismatched CSRF tokens', () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    expect(validateCSRFToken(token1, token2)).toBe(false);
  });
});

// ============================================================================
// SECURITY HEADERS TESTS
// ============================================================================

describe('Security Headers', () => {
  it('should include CSP header', () => {
    const headers = getSecurityHeaders();
    expect(headers['Content-Security-Policy']).toBeDefined();
  });

  it('should include X-Content-Type-Options', () => {
    const headers = getSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('should include X-Frame-Options', () => {
    const headers = getSecurityHeaders();
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('should include HSTS header', () => {
    const headers = getSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toBeDefined();
  });

  it('should include all required headers', () => {
    const headers = getSecurityHeaders();
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Referrer-Policy',
      'Permissions-Policy',
    ];
    requiredHeaders.forEach(header => {
      expect(headers[header]).toBeDefined();
    });
  });
});

// ============================================================================
// SECRETS MANAGEMENT TESTS
// ============================================================================

describe('Secrets Management', () => {
  it('should mask password in object', () => {
    const obj = { username: 'john', password: 'secret123' };
    const masked = maskSensitiveData(obj);
    expect((masked as any).password).toBe('***REDACTED***');
    expect((masked as any).username).toBe('john');
  });

  it('should mask token in object', () => {
    const obj = { userId: '123', token: 'secret-token' };
    const masked = maskSensitiveData(obj);
    expect((masked as any).token).toBe('***REDACTED***');
  });

  it('should mask nested sensitive data', () => {
    const obj = {
      user: {
        name: 'John',
        password: 'secret123',
      },
    };
    const masked = maskSensitiveData(obj);
    expect((masked as any).user.password).toBe('***REDACTED***');
    expect((masked as any).user.name).toBe('John');
  });

  it('should mask sensitive data in arrays', () => {
    const obj = [
      { username: 'john', password: 'secret1' },
      { username: 'jane', password: 'secret2' },
    ];
    const masked = maskSensitiveData(obj);
    expect((masked as any)[0].password).toBe('***REDACTED***');
    expect((masked as any)[1].password).toBe('***REDACTED***');
  });
});

// ============================================================================
// SQL INJECTION DETECTION TESTS
// ============================================================================

describe('SQL Injection Detection', () => {
  it('should detect SELECT injection', () => {
    expect(detectSQLInjection("'; SELECT * FROM users; --")).toBe(true);
  });

  it('should detect INSERT injection', () => {
    expect(detectSQLInjection("'; INSERT INTO users VALUES ('test'); --")).toBe(
      true
    );
  });

  it('should detect DROP injection', () => {
    expect(detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
  });

  it('should allow safe input', () => {
    expect(detectSQLInjection('normal user input')).toBe(false);
    expect(detectSQLInjection('test@example.com')).toBe(false);
  });

  it('should sanitize input', () => {
    const dangerous = "'; DROP TABLE users; --";
    const sanitized = sanitizeInput(dangerous);
    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain(';');
  });

  it('should preserve safe characters in sanitization', () => {
    const safe = 'John Doe john@example.com';
    const sanitized = sanitizeInput(safe);
    expect(sanitized).toContain('John');
    expect(sanitized).toContain('@');
  });
});

// ============================================================================
// FILE UPLOAD SECURITY TESTS
// ============================================================================

describe('File Upload Security', () => {
  it('should validate allowed file types', () => {
    expect(validateFileType('image/jpeg', ['image/jpeg', 'image/png'])).toBe(true);
    expect(validateFileType('application/pdf', ['image/jpeg'])).toBe(false);
  });

  it('should check file size limits', () => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    expect(checkFileSize(3 * 1024 * 1024, maxSize)).toBe(true);
    expect(checkFileSize(10 * 1024 * 1024, maxSize)).toBe(false);
  });

  it('should generate safe filenames', () => {
    const filename = generateSafeFilename('../../etc/passwd', 'upload');
    expect(filename).not.toContain('..');
    expect(filename).toContain('upload');
  });

  it('should remove path traversal attempts', () => {
    const malicious = '../../windows/system32/config';
    const safe = generateSafeFilename(malicious, 'file');
    expect(safe).not.toContain('..');
    expect(safe).not.toContain('/');
  });

  it('should handle files without extensions', () => {
    const filename = generateSafeFilename('testfile', 'upload');
    expect(filename).toContain('upload');
    expect(filename).toMatch(/\.\w+$/); // Should have extension
  });
});

// ============================================================================
// AUDIT LOGGING TESTS
// ============================================================================

describe('Security Audit Logging', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should log security events', () => {
    logSecurityEvent({
      timestamp: new Date(),
      type: 'AUTH',
      severity: 'HIGH',
      ipAddress: '192.168.1.1',
      action: 'Failed login attempt',
    });

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toContain('[SECURITY-HIGH]');
  });

  it('should mask sensitive data in logs', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    logSecurityEvent({
      timestamp: new Date(),
      type: 'AUTH',
      severity: 'CRITICAL',
      ipAddress: '192.168.1.1',
      action: 'Unauthorized access',
      details: {
        password: 'secret123',
        apiKey: 'key123',
      },
    });

    const logged = warnSpy.mock.calls[0][1];
    expect(JSON.stringify(logged)).toContain('***REDACTED***');

    warnSpy.mockRestore();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Security Integration', () => {
  it('should handle complete authentication flow', () => {
    // Generate token
    const token = generateSecureToken();

    // Validate structure
    expect(validateJWTStructure(token)).toBe(true);

    // Check expiration
    const expiresAt = new Date(Date.now() + 3600000);
    expect(isTokenExpired(expiresAt)).toBe(false);
  });

  it('should handle complete validation flow', () => {
    const email = 'test@example.com';

    // Validate input
    const result = safeValidate(ValidationSchemas.email, email);
    expect(result.success).toBe(true);

    // Encode output
    const encoded = encodeHTML(email);
    expect(encoded).toBe(email);
  });

  it('should apply multiple security checks', () => {
    const input = 'test@example.com';

    // Validate
    expect(safeValidate(ValidationSchemas.email, input).success).toBe(true);

    // Check injection
    expect(detectSQLInjection(input)).toBe(false);

    // Check CORS
    const headers = getSecurityHeaders();
    expect(headers).toBeDefined();
  });
});
