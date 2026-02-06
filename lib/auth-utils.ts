/**
 * Authentication & Authorization Utilities
 * Handles JWT, OAuth, RBAC, and permission management
 */

import crypto from 'crypto';
import { z } from 'zod';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string[];
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  permissions: Permission[];
  lastLogin?: Date;
  loginAttempts: number;
  isLocked: boolean;
}

export type UserRole = 'admin' | 'user' | 'viewer' | 'bot';
export type Permission = 'read' | 'write' | 'delete' | 'admin' | 'manage_users' | 'manage_meetings' | 'manage_settings';

export interface RBACRule {
  role: UserRole;
  resource: string;
  actions: Permission[];
  conditions?: Record<string, unknown>;
}

// ============================================================================
// JWT UTILITIES
// ============================================================================

const JWT_HEADER = {
  alg: 'HS256',
  typ: 'JWT'
};

/**
 * Generate JWT token
 */
export function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
    iss: 'syncup-app',
    sub: payload.userId
  };

  const header = base64url(JSON.stringify(JWT_HEADER));
  const body = base64url(JSON.stringify(fullPayload));
  const signature = createSignature(`${header}.${body}`, secret);

  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string, secret: string): { valid: boolean; payload?: JWTPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [header, body, signature] = parts;
    const expectedSignature = createSignature(`${header}.${body}`, secret);

    if (!constantTimeCompare(signature, expectedSignature)) {
      return { valid: false, error: 'Invalid signature' };
    }

    const payload: JWTPayload = JSON.parse(base64urlDecode(body));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Token verification failed' };
  }
}

/**
 * Refresh JWT token
 */
export function refreshJWT(refreshToken: string, secret: string, newExpiresIn: number = 3600): string | null {
  const verification = verifyJWT(refreshToken, secret);
  if (!verification.valid || !verification.payload) {
    return null;
  }

  const { userId, email, role, permissions } = verification.payload;
  return generateJWT({ userId, email, role, permissions }, secret, newExpiresIn);
}

// ============================================================================
// OAUTH UTILITIES
// ============================================================================

/**
 * Generate OAuth authorization code
 */
export function generateAuthCode(userId: string, clientId: string, expiresIn: number = 600): string {
  const payload = {
    userId,
    clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    code: crypto.randomBytes(32).toString('hex')
  };
  return base64url(JSON.stringify(payload));
}

/**
 * Verify OAuth authorization code
 */
export function verifyAuthCode(code: string): { valid: boolean; userId?: string; clientId?: string; error?: string } {
  try {
    const payload = JSON.parse(base64urlDecode(code));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return { valid: false, error: 'Authorization code expired' };
    }

    return { valid: true, userId: payload.userId, clientId: payload.clientId };
  } catch (error) {
    return { valid: false, error: 'Invalid authorization code' };
  }
}

/**
 * Generate OAuth tokens
 */
export function generateOAuthToken(userId: string, scope: string[] = []): OAuthToken {
  return {
    accessToken: crypto.randomBytes(32).toString('hex'),
    refreshToken: crypto.randomBytes(32).toString('hex'),
    tokenType: 'Bearer',
    expiresIn: 3600,
    scope
  };
}

// ============================================================================
// RBAC (ROLE-BASED ACCESS CONTROL)
// ============================================================================

const DEFAULT_RBAC_RULES: RBACRule[] = [
  {
    role: 'admin',
    resource: '*',
    actions: ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_meetings', 'manage_settings']
  },
  {
    role: 'user',
    resource: 'meetings',
    actions: ['read', 'write', 'delete']
  },
  {
    role: 'user',
    resource: 'chats',
    actions: ['read', 'write']
  },
  {
    role: 'viewer',
    resource: 'meetings',
    actions: ['read']
  },
  {
    role: 'viewer',
    resource: 'chats',
    actions: ['read']
  },
  {
    role: 'bot',
    resource: 'meetings',
    actions: ['read', 'write']
  },
  {
    role: 'bot',
    resource: 'chats',
    actions: ['read', 'write']
  }
];

/**
 * Check if user has permission
 */
export function hasPermission(
  user: SessionUser,
  resource: string,
  action: Permission,
  rules: RBACRule[] = DEFAULT_RBAC_RULES
): boolean {
  if (user.permissions.includes('admin')) {
    return true;
  }

  const applicableRules = rules.filter(
    rule => (rule.role === user.role || rule.role === '*') && (rule.resource === resource || rule.resource === '*')
  );

  return applicableRules.some(rule => rule.actions.includes(action));
}

/**
 * Check if user has all permissions
 */
export function hasAllPermissions(
  user: SessionUser,
  resource: string,
  actions: Permission[],
  rules: RBACRule[] = DEFAULT_RBAC_RULES
): boolean {
  return actions.every(action => hasPermission(user, resource, action, rules));
}

/**
 * Get user permissions
 */
export function getUserPermissions(role: UserRole): Permission[] {
  const rules = DEFAULT_RBAC_RULES.filter(rule => rule.role === role);
  const permissions = new Set<Permission>();

  rules.forEach(rule => {
    rule.actions.forEach(action => permissions.add(action));
  });

  return Array.from(permissions);
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

/**
 * Hash password with salt
 */
export function hashPassword(password: string, salt: string = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return { hash, salt };
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return constantTimeCompare(hash, computedHash);
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): { score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[!@#$%^&*]/.test(password)) score++;
  else feedback.push('Include special characters');

  return { score: Math.min(score, 5), feedback };
}

// ============================================================================
// SESSION & LOGIN UTILITIES
// ============================================================================

const LOGIN_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const failedLogins = new Map<string, { attempts: number; lockedUntil?: number }>();

/**
 * Check if account is locked
 */
export function isAccountLocked(userId: string): boolean {
  const loginData = failedLogins.get(userId);
  if (!loginData) return false;

  if (loginData.lockedUntil && loginData.lockedUntil > Date.now()) {
    return true;
  }

  if (loginData.lockedUntil && loginData.lockedUntil <= Date.now()) {
    failedLogins.delete(userId);
    return false;
  }

  return false;
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(userId: string): void {
  const loginData = failedLogins.get(userId) || { attempts: 0 };
  loginData.attempts++;

  if (loginData.attempts >= LOGIN_ATTEMPTS_LIMIT) {
    loginData.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  failedLogins.set(userId, loginData);
}

/**
 * Record successful login
 */
export function recordSuccessfulLogin(userId: string): void {
  failedLogins.delete(userId);
}

/**
 * Get login attempt count
 */
export function getLoginAttempts(userId: string): number {
  return failedLogins.get(userId)?.attempts || 0;
}

// ============================================================================
// MFA (MULTI-FACTOR AUTHENTICATION)
// ============================================================================

export interface MFASecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Generate TOTP secret for MFA
 */
export function generateMFASecret(): MFASecret {
  const secret = crypto.randomBytes(32).toString('base64');
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  return {
    secret,
    qrCode: `otpauth://totp/SyncUp?secret=${secret}`,
    backupCodes
  };
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(secret: string, code: string, window: number = 1): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;

  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now + i * timeStep) / timeStep);
    const expectedCode = generateTOTPCode(secret, counter);

    if (constantTimeCompare(code, expectedCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate TOTP code (internal)
 */
function generateTOTPCode(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
  hmac.update(buf);
  const digest = hmac.digest();

  const offset = digest[19] & 0x0f;
  const code = (digest[offset] & 0x7f) << 24 | (digest[offset + 1] & 0xff) << 16 | (digest[offset + 2] & 0xff) << 8 | (digest[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

// ============================================================================
// API KEY UTILITIES
// ============================================================================

export interface APIKey {
  id: string;
  key: string;
  hash: string;
  name: string;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  permissions: Permission[];
}

/**
 * Generate API key
 */
export function generateAPIKey(name: string, permissions: Permission[] = ['read']): { id: string; key: string } {
  const id = crypto.randomBytes(16).toString('hex');
  const key = crypto.randomBytes(32).toString('hex');

  return { id, key };
}

/**
 * Hash API key for storage
 */
export function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify API key
 */
export function verifyAPIKey(key: string, hash: string): boolean {
  return constantTimeCompare(hashAPIKey(key), hash);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Base64URL encode
 */
function base64url(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Base64URL decode
 */
function base64urlDecode(str: string): string {
  str += new Array(5 - (str.length % 4)).join('=');
  return Buffer.from(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

/**
 * Create HMAC signature
 */
function createSignature(message: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('base64url');
}

/**
 * Constant time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const AuthValidationSchemas = {
  jwt: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['admin', 'user', 'viewer', 'bot']),
    permissions: z.array(z.string())
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),

  mfa: z.object({
    code: z.string().length(6).regex(/^\d+$/)
  }),

  apiKey: z.object({
    name: z.string().min(1).max(100),
    permissions: z.array(z.enum(['read', 'write', 'delete', 'admin', 'manage_users', 'manage_meetings', 'manage_settings']))
  }),

  oauth: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string().url(),
    scope: z.array(z.string()).optional()
  })
};

export default {
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
  verifyAPIKey
};
