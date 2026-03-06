import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

// ─── Token Payloads ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;       // rider UUID
  tier: 'free' | 'pro';
  iat?: number;
  exp?: number;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

// ─── Refresh tokens ───────────────────────────────────────────────────────────

/** Generate a random refresh token, store its hash, return the raw token. */
export async function issueRefreshToken(riderId: string): Promise<string> {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await query(
    `INSERT INTO refresh_tokens (rider_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [riderId, hash, expiresAt],
  );

  return raw;
}

/**
 * Consume a refresh token (one-time use: revoke old, issue new).
 * Returns the rider id if valid, throws otherwise.
 */
export async function rotateRefreshToken(rawToken: string): Promise<{ riderId: string; newRefreshToken: string }> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const result = await query(
    `SELECT id, rider_id, expires_at, revoked
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [hash],
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid refresh token');
  }

  const row = result.rows[0];

  if (row.revoked) {
    // Possible token reuse — revoke all tokens for this rider (compromise response)
    await query('UPDATE refresh_tokens SET revoked = true WHERE rider_id = $1', [row.rider_id]);
    throw new Error('Refresh token already used — all sessions revoked');
  }

  if (new Date(row.expires_at) < new Date()) {
    throw new Error('Refresh token expired');
  }

  // Revoke old token (rotation)
  await query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [row.id]);

  // Issue new refresh token
  const newRefreshToken = await issueRefreshToken(row.rider_id);

  return { riderId: row.rider_id, newRefreshToken };
}

/** Revoke a specific refresh token (logout). */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [hash]);
}

/** Revoke all refresh tokens for a rider (logout everywhere). */
export async function revokeAllRefreshTokens(riderId: string): Promise<void> {
  await query('UPDATE refresh_tokens SET revoked = true WHERE rider_id = $1', [riderId]);
}

// ─── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Tier helper ──────────────────────────────────────────────────────────────

/** Resolve the effective tier for a rider (checks tier_expires_at for lapsed subs). */
export async function getEffectiveTier(riderId: string): Promise<'free' | 'pro'> {
  const result = await query(
    `SELECT tier, tier_expires_at FROM riders WHERE id = $1`,
    [riderId],
  );
  if (result.rows.length === 0) return 'free';
  const { tier, tier_expires_at } = result.rows[0];
  if (tier === 'pro' && tier_expires_at && new Date(tier_expires_at) < new Date()) {
    // Subscription lapsed — downgrade
    await query(`UPDATE riders SET tier = 'free' WHERE id = $1`, [riderId]);
    return 'free';
  }
  return tier === 'pro' ? 'pro' : 'free';
}
