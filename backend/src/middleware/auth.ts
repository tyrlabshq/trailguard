import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, getEffectiveTier } from '../services/auth';

// Extend Express Request with rider context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      riderId: string;
      riderTier: 'free' | 'pro';
    }
  }
}

/**
 * requireRider — validates Bearer JWT and attaches riderId + riderTier to req.
 *
 * Supports two modes:
 *   1. Authorization: Bearer <access_token>  (preferred)
 *   2. x-rider-id header (legacy stub — still accepted for dev convenience)
 */
export async function requireRider(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];

  // ── JWT path ──────────────────────────────────────────────────────────────
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.riderId = payload.sub;
      // Re-check tier from DB in case subscription lapsed
      req.riderTier = await getEffectiveTier(payload.sub);
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }
  }

  // ── Legacy header (dev fallback only) ────────────────────────────────────
  const legacyId = req.headers['x-rider-id'] as string | undefined;
  if (legacyId) {
    req.riderId = legacyId;
    req.riderTier = 'free'; // Legacy path gets free tier
    next();
    return;
  }

  res.status(401).json({ error: 'Authentication required' });
}

/**
 * requirePro — middleware that enforces pro tier.
 * Must be used AFTER requireRider.
 */
export function requirePro(req: Request, res: Response, next: NextFunction): void {
  if (req.riderTier !== 'pro') {
    res.status(403).json({
      error: 'Pro subscription required',
      upgrade: 'Visit /auth/upgrade to get PowderLink Pro',
    });
    return;
  }
  next();
}

/**
 * enforceFreeTracking — for free tier riders, blocks rides longer than 2 hours.
 * Attach to location POST endpoint.
 */
export async function enforceFreeTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.riderTier === 'pro') {
    next();
    return;
  }

  const { groupId } = req.body;
  if (!groupId) { next(); return; }

  // Check if there's an active ride started more than 2 hours ago
  const { query } = await import('../db');
  const result = await query(
    `SELECT id, started_at FROM rides
     WHERE group_id = $1 AND ended_at IS NULL
     AND started_at < now() - interval '2 hours'
     ORDER BY started_at DESC LIMIT 1`,
    [groupId],
  );

  if (result.rows.length > 0) {
    res.status(403).json({
      error: 'Free tier limit: 2-hour max tracking session',
      upgrade: 'Upgrade to PowderLink Pro for unlimited tracking',
    });
    return;
  }

  next();
}
