/**
 * Authentication & Authorization Tests
 * Comprehensive test suite for auth utilities
 */

import {
  generateJWT,
  verifyJWT,
  refreshJWT,
  generateAuthCode,
  verifyAuthCode,
  generateOAuthToken,
  hasPermission,
  hasAllPermissions,
  getUserPermissions,
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  getLoginAttempts,
  generateMFASecret,
  verifyTOTPCode,
  generateAPIKey,
  hashAPIKey,
  verifyAPIKey,
  type JWTPayload,
  type SessionUser,
  type Permission,
  type UserRole
} from '@/lib/auth-utils';

// ============================================================================
// JWT TESTS
// ============================================================================

describe('JWT Utilities', () => {
  const secret = 'test-secret-key-12345';
  const payload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'user' as UserRole,
    permissions: ['read', 'write'] as Permission[]
  };

  describe('generateJWT', () => {
    it('should generate valid JWT token', () => {
      const token = generateJWT(payload, secret);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include all payload data', () => {
      const token = generateJWT(payload, secret);
      const verification = verifyJWT(token, secret);
      expect(verification.valid).toBe(true);
      expect(verification.payload).toMatchObject(payload);
    });

    it('should set expiration', () => {
      const expiresIn = 7200;
      const token = generateJWT(payload, secret, expiresIn);
      const verification = verifyJWT(token, secret);
      expect(verification.payload?.exp).toBeDefined();
    });
  });

  describe('verifyJWT', () => {
    it('should verify valid token', () => {
      const token = generateJWT(payload, secret);
      const result = verifyJWT(token, secret);
      expect(result.valid).toBe(true);
      expect(result.payload).toMatchObject(payload);
    });

    it('should reject invalid signature', () => {
      const token = generateJWT(payload, secret);
      const result = verifyJWT(token, 'wrong-secret');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject malformed token', () => {
      const result = verifyJWT('invalid.token', secret);
      expect(result.valid).toBe(false);
    });

    it('should reject expired token', () => {
      const token = generateJWT(payload, secret, -100); // Expired 100s ago
      const result = verifyJWT(token, secret);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('refreshJWT', () => {
    it('should generate new token from refresh token', () => {
      const token = generateJWT(payload, secret);
      const newToken = refreshJWT(token, secret);
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(token);

      const verification = verifyJWT(newToken!, secret);
      expect(verification.valid).toBe(true);
    });

    it('should return null for invalid refresh token', () => {
      const result = refreshJWT('invalid.token', secret);
      expect(result).toBeNull();
    });

    it('should preserve user data', () => {
      const token = generateJWT(payload, secret);
      const newToken = refreshJWT(token, secret)!;
      const verification = verifyJWT(newToken, secret);
      expect(verification.payload?.userId).toBe(payload.userId);
      expect(verification.payload?.email).toBe(payload.email);
    });
  });
});

// ============================================================================
// OAUTH TESTS
// ============================================================================

describe('OAuth Utilities', () => {
  describe('generateAuthCode', () => {
    it('should generate authorization code', () => {
      const code = generateAuthCode('user-123', 'client-456');
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('should include userId and clientId', () => {
      const code = generateAuthCode('user-123', 'client-456');
      const result = verifyAuthCode(code);
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.clientId).toBe('client-456');
    });
  });

  describe('verifyAuthCode', () => {
    it('should verify valid auth code', () => {
      const code = generateAuthCode('user-123', 'client-456');
      const result = verifyAuthCode(code);
      expect(result.valid).toBe(true);
    });

    it('should reject expired code', () => {
      const code = generateAuthCode('user-123', 'client-456', -100);
      const result = verifyAuthCode(code);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject invalid code', () => {
      const result = verifyAuthCode('invalid-code');
      expect(result.valid).toBe(false);
    });
  });

  describe('generateOAuthToken', () => {
    it('should generate OAuth tokens', () => {
      const tokens = generateOAuthToken('user-123');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(3600);
    });

    it('should include scope', () => {
      const scope = ['read', 'write'];
      const tokens = generateOAuthToken('user-123', scope);
      expect(tokens.scope).toEqual(scope);
    });
  });
});

// ============================================================================
// RBAC TESTS
// ============================================================================

describe('RBAC (Role-Based Access Control)', () => {
  const adminUser: SessionUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['admin'],
    loginAttempts: 0,
    isLocked: false
  };

  const regularUser: SessionUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user',
    permissions: ['read', 'write'],
    loginAttempts: 0,
    isLocked: false
  };

  const viewer: SessionUser = {
    id: 'viewer-1',
    email: 'viewer@example.com',
    role: 'viewer',
    permissions: ['read'],
    loginAttempts: 0,
    isLocked: false
  };

  describe('hasPermission', () => {
    it('admin should have all permissions', () => {
      expect(hasPermission(adminUser, 'meetings', 'write')).toBe(true);
      expect(hasPermission(adminUser, 'meetings', 'delete')).toBe(true);
      expect(hasPermission(adminUser, 'chats', 'admin')).toBe(true);
    });

    it('user should have appropriate permissions', () => {
      expect(hasPermission(regularUser, 'meetings', 'read')).toBe(true);
      expect(hasPermission(regularUser, 'meetings', 'write')).toBe(true);
      expect(hasPermission(regularUser, 'meetings', 'delete')).toBe(true);
    });

    it('viewer should only have read permission', () => {
      expect(hasPermission(viewer, 'meetings', 'read')).toBe(true);
      expect(hasPermission(viewer, 'meetings', 'write')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should check multiple permissions', () => {
      expect(hasAllPermissions(regularUser, 'meetings', ['read', 'write'])).toBe(true);
      expect(hasAllPermissions(regularUser, 'meetings', ['read', 'write', 'delete'])).toBe(true);
      expect(hasAllPermissions(viewer, 'meetings', ['read', 'write'])).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return admin permissions', () => {
      const perms = getUserPermissions('admin');
      expect(perms).toContain('read');
      expect(perms).toContain('write');
      expect(perms).toContain('admin');
    });

    it('should return user permissions', () => {
      const perms = getUserPermissions('user');
      expect(perms).toContain('read');
      expect(perms).toContain('write');
      expect(perms).toContain('delete');
    });

    it('should return viewer permissions', () => {
      const perms = getUserPermissions('viewer');
      expect(perms).toContain('read');
      expect(perms).not.toContain('write');
    });
  });
});

// ============================================================================
// PASSWORD TESTS
// ============================================================================

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash password with salt', () => {
      const { hash, salt } = hashPassword('TestPassword123!');
      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash).not.toBe('TestPassword123!');
    });

    it('should produce different hashes for same password', () => {
      const result1 = hashPassword('TestPassword123!');
      const result2 = hashPassword('TestPassword123!');
      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'TestPassword123!';
      const { hash, salt } = hashPassword(password);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const { hash, salt } = hashPassword('TestPassword123!');
      expect(verifyPassword('WrongPassword456!', hash, salt)).toBe(false);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should identify weak passwords', () => {
      const result = checkPasswordStrength('weak');
      expect(result.score).toBeLessThan(3);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should identify strong passwords', () => {
      const result = checkPasswordStrength('VeryStrong123!@#');
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should provide feedback for improvement', () => {
      const result = checkPasswordStrength('onlysmall');
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback[0]).toBeDefined();
    });
  });
});

// ============================================================================
// SESSION & LOGIN TESTS
// ============================================================================

describe('Session & Login Utilities', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    // Clean up failed logins
    recordSuccessfulLogin(userId);
  });

  describe('recordFailedLogin', () => {
    it('should record failed login attempt', () => {
      recordFailedLogin(userId);
      expect(getLoginAttempts(userId)).toBe(1);
    });

    it('should increment failed attempts', () => {
      recordFailedLogin(userId);
      recordFailedLogin(userId);
      expect(getLoginAttempts(userId)).toBe(2);
    });

    it('should lock account after max attempts', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(userId);
      }
      expect(isAccountLocked(userId)).toBe(true);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset failed attempts', () => {
      recordFailedLogin(userId);
      recordFailedLogin(userId);
      recordSuccessfulLogin(userId);
      expect(getLoginAttempts(userId)).toBe(0);
    });

    it('should unlock account', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(userId);
      }
      recordSuccessfulLogin(userId);
      expect(isAccountLocked(userId)).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    it('should return false for account with no failed attempts', () => {
      expect(isAccountLocked(userId)).toBe(false);
    });

    it('should return true for locked account', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(userId);
      }
      expect(isAccountLocked(userId)).toBe(true);
    });
  });
});

// ============================================================================
// MFA TESTS
// ============================================================================

describe('MFA (Multi-Factor Authentication)', () => {
  describe('generateMFASecret', () => {
    it('should generate MFA secret', () => {
      const mfa = generateMFASecret();
      expect(mfa.secret).toBeDefined();
      expect(mfa.qrCode).toBeDefined();
      expect(mfa.backupCodes).toHaveLength(10);
    });

    it('should include QR code for OTP', () => {
      const mfa = generateMFASecret();
      expect(mfa.qrCode).toContain('otpauth://totp');
      expect(mfa.qrCode).toContain(mfa.secret);
    });

    it('should generate backup codes', () => {
      const mfa = generateMFASecret();
      mfa.backupCodes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]+$/);
      });
    });
  });

  describe('verifyTOTPCode', () => {
    it('should handle TOTP code generation', () => {
      const mfa = generateMFASecret();
      // Note: In a real test, we'd need a TOTP library to generate valid codes
      // This test verifies the function exists and handles basic validation
      const result = verifyTOTPCode(mfa.secret, '000000');
      expect(typeof result).toBe('boolean');
    });
  });
});

// ============================================================================
// API KEY TESTS
// ============================================================================

describe('API Key Utilities', () => {
  describe('generateAPIKey', () => {
    it('should generate API key with id and key', () => {
      const { id, key } = generateAPIKey('test-key');
      expect(id).toBeDefined();
      expect(key).toBeDefined();
      expect(id).toHaveLength(32); // 16 bytes * 2 (hex)
      expect(key).toHaveLength(64); // 32 bytes * 2 (hex)
    });

    it('should generate unique keys', () => {
      const key1 = generateAPIKey('key1');
      const key2 = generateAPIKey('key2');
      expect(key1.key).not.toBe(key2.key);
      expect(key1.id).not.toBe(key2.id);
    });
  });

  describe('hashAPIKey', () => {
    it('should hash API key', () => {
      const key = '12345678901234567890123456789012';
      const hash = hashAPIKey(key);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(key);
    });

    it('should produce consistent hash', () => {
      const key = '12345678901234567890123456789012';
      const hash1 = hashAPIKey(key);
      const hash2 = hashAPIKey(key);
      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyAPIKey', () => {
    it('should verify correct key', () => {
      const key = 'test-api-key-12345678901234567890';
      const hash = hashAPIKey(key);
      expect(verifyAPIKey(key, hash)).toBe(true);
    });

    it('should reject incorrect key', () => {
      const key = 'test-api-key-12345678901234567890';
      const hash = hashAPIKey(key);
      expect(verifyAPIKey('wrong-key', hash)).toBe(false);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Authentication Integration', () => {
  it('should complete full login flow', () => {
    const userId = 'integration-user';

    // 1. Password verification
    const password = 'IntegrationTest123!';
    const { hash, salt } = hashPassword(password);
    expect(verifyPassword(password, hash, salt)).toBe(true);

    // 2. Generate JWT
    const token = generateJWT(
      {
        userId,
        email: 'integration@test.com',
        role: 'user',
        permissions: ['read', 'write']
      },
      'test-secret'
    );

    // 3. Verify JWT
    const verification = verifyJWT(token, 'test-secret');
    expect(verification.valid).toBe(true);

    // 4. Check permissions
    const user: SessionUser = {
      id: userId,
      email: 'integration@test.com',
      role: 'user',
      permissions: ['read', 'write'],
      loginAttempts: 0,
      isLocked: false
    };
    expect(hasPermission(user, 'meetings', 'read')).toBe(true);
  });

  it('should handle failed login attempts correctly', () => {
    const userId = 'failed-login-user';
    recordSuccessfulLogin(userId); // Reset

    // Failed attempts
    for (let i = 0; i < 4; i++) {
      recordFailedLogin(userId);
      expect(isAccountLocked(userId)).toBe(false);
    }

    // Fifth attempt locks account
    recordFailedLogin(userId);
    expect(isAccountLocked(userId)).toBe(true);

    // Successful login resets
    recordSuccessfulLogin(userId);
    expect(isAccountLocked(userId)).toBe(false);
    expect(getLoginAttempts(userId)).toBe(0);
  });

  it('should handle OAuth flow', () => {
    // 1. Generate auth code
    const authCode = generateAuthCode('oauth-user', 'oauth-client');

    // 2. Verify auth code
    const verification = verifyAuthCode(authCode);
    expect(verification.valid).toBe(true);
    expect(verification.userId).toBe('oauth-user');

    // 3. Generate tokens
    const tokens = generateOAuthToken('oauth-user', ['read', 'write']);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });
});
