import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/database.js';
import type { UserRecord } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pulse_reserve_super_secure_distributed_key_2026';

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export class AuthService {
  /**
   * Evaluates password strength
   */
  public static evaluatePasswordStrength(password: string): {
    score: number; // 0 to 4
    isValid: boolean;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (!password || password.length < 8) {
      feedback.push('Must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one uppercase letter');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one number');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one special character');
    }

    return {
      score,
      isValid: score >= 3 && password.length >= 8,
      feedback
    };
  }

  /**
   * Registers a new user with hashed password
   */
  public static async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: Omit<UserRecord, 'password_hash'>; token: string }> {
    const { name, email, password } = data;

    if (!name || name.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const strength = this.evaluatePasswordStrength(password);
    if (!strength.isValid) {
      throw new Error(`Password requirement: ${strength.feedback.join(', ')}`);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const created = await db.createUser({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'user'
    });

    db.logAudit({
      id: `aud_reg_${Date.now()}`,
      event_type: 'USER_REGISTERED',
      entity_id: created.id,
      user_id: created.id,
      details: { email: created.email, name: created.name },
      created_at: new Date().toISOString()
    });

    const token = this.generateSessionToken({
      userId: created.id,
      email: created.email,
      name: created.name,
      role: created.role
    });

    const { password_hash, ...safeUser } = created;
    return { user: safeUser, token };
  }

  /**
   * Authenticates user credentials
   */
  public static async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: Omit<UserRecord, 'password_hash'>; token: string }> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const normalized = email.trim().toLowerCase();
    const user = await db.findUserByEmail(normalized);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      db.logAudit({
        id: `aud_fail_${Date.now()}`,
        event_type: 'AUTH_FAILED',
        entity_id: user.id,
        user_id: user.id,
        details: { email: normalized, reason: 'Invalid password' },
        created_at: new Date().toISOString()
      });
      throw new Error('Invalid email or password.');
    }

    db.logAudit({
      id: `aud_login_${Date.now()}`,
      event_type: 'USER_LOGIN',
      entity_id: user.id,
      user_id: user.id,
      details: { email: user.email },
      created_at: new Date().toISOString()
    });

    const token = this.generateSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /**
   * Generates a signed tamper-proof token
   */
  public static generateSessionToken(payload: UserSessionPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 // 7 days
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Validates and decodes session token
   */
  public static verifySessionToken(token: string): UserSessionPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, body, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (expectedSignature !== signature) return null;

      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      };
    } catch {
      return null;
    }
  }
}
