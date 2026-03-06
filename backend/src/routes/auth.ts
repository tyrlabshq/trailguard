import { Router, Request, Response } from 'express';
import { query } from '../db';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  hashPassword,
  verifyPassword,
  getEffectiveTier,
} from '../services/auth';
import { requireRider } from '../middleware/auth';

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────

/**
 * Register a new rider with email + password.
 * Returns access_token + refresh_token on success.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Check for existing email
  const existing = await query('SELECT id FROM riders WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO riders (name, email, password_hash, phone, tier)
     VALUES ($1, $2, $3, $4, 'free')
     RETURNING id, name, email, tier`,
    [name.trim(), email.toLowerCase(), passwordHash, phone || null],
  );

  const rider = result.rows[0];
  const tier = rider.tier as 'free' | 'pro';

  const accessToken = signAccessToken({ sub: rider.id, tier });
  const refreshToken = await issueRefreshToken(rider.id);

  res.status(201).json({
    rider: { id: rider.id, name: rider.name, email: rider.email, tier },
    accessToken,
    refreshToken,
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const result = await query(
    'SELECT id, name, email, tier, password_hash, tier_expires_at FROM riders WHERE email = $1',
    [email.toLowerCase()],
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const rider = result.rows[0];

  if (!rider.password_hash) {
    res.status(401).json({ error: 'Account uses phone login — use /auth/request-otp' });
    return;
  }

  const valid = await verifyPassword(password, rider.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const tier = await getEffectiveTier(rider.id);
  const accessToken = signAccessToken({ sub: rider.id, tier });
  const refreshToken = await issueRefreshToken(rider.id);

  res.json({
    rider: { id: rider.id, name: rider.name, email: rider.email, tier },
    accessToken,
    refreshToken,
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

/**
 * Exchange a refresh token for a new access token + rotated refresh token.
 * Old refresh token is revoked (rotation security).
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const { riderId, newRefreshToken } = await rotateRefreshToken(refreshToken);

    const riderResult = await query(
      'SELECT id, name, email FROM riders WHERE id = $1',
      [riderId],
    );
    if (riderResult.rows.length === 0) {
      res.status(401).json({ error: 'Rider not found' });
      return;
    }

    const tier = await getEffectiveTier(riderId);
    const accessToken = signAccessToken({ sub: riderId, tier });

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      tier,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ ok: true });
});

// ─── POST /auth/logout-all ────────────────────────────────────────────────────

router.post('/logout-all', requireRider, async (req: Request, res: Response): Promise<void> => {
  await revokeAllRefreshTokens(req.riderId);
  res.json({ ok: true, message: 'All sessions revoked' });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', requireRider, async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT id, name, email, phone, tier, stripe_customer_id, tier_expires_at, created_at
     FROM riders WHERE id = $1`,
    [req.riderId],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Rider not found' });
    return;
  }
  const rider = result.rows[0];
  // Re-check tier freshness
  const tier = await getEffectiveTier(rider.id);

  res.json({
    id: rider.id,
    name: rider.name,
    email: rider.email,
    phone: rider.phone,
    tier,
    tierExpiresAt: rider.tier_expires_at,
    createdAt: rider.created_at,
  });
});

// ─── POST /auth/request-otp ───────────────────────────────────────────────────

router.post('/request-otp', async (_req: Request, res: Response): Promise<void> => {
  // TODO PL-xx: Twilio integration for SMS OTP
  // For now: placeholder structure is correct, Twilio creds needed
  res.status(501).json({
    error: 'OTP via SMS requires Twilio — set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM',
  });
});

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────

router.post('/verify-otp', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: 'OTP verification pending Twilio integration' });
});

// ─── POST /auth/upgrade ───────────────────────────────────────────────────────

/**
 * Stripe Checkout: create a checkout session for Pro upgrade.
 * Returns { checkoutUrl } that the app opens in a browser/webview.
 */
router.post('/upgrade', requireRider, async (req: Request, res: Response): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(501).json({
      error: 'Stripe not configured — set STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID',
    });
    return;
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

    // Get or create Stripe customer
    const riderResult = await query(
      'SELECT name, email, stripe_customer_id FROM riders WHERE id = $1',
      [req.riderId],
    );
    if (riderResult.rows.length === 0) {
      res.status(404).json({ error: 'Rider not found' });
      return;
    }
    const rider = riderResult.rows[0];

    let customerId = rider.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: rider.email,
        name: rider.name,
        metadata: { riderId: req.riderId },
      });
      customerId = customer.id;
      await query('UPDATE riders SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.riderId]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.APP_URL || 'https://powderlink.app'}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://powderlink.app'}/upgrade/cancel`,
      metadata: { riderId: req.riderId },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ─── POST /auth/stripe-webhook ────────────────────────────────────────────────

/**
 * Stripe webhook — activates/deactivates Pro tier based on subscription events.
 * Endpoint must be registered in Stripe dashboard.
 */
router.post(
  '/stripe-webhook',
  express_raw_body_middleware(),
  async (req: Request, res: Response): Promise<void> => {
    if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
      res.status(501).json({ error: 'Stripe not configured' });
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: import('stripe').Stripe.Event;

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      console.error('Stripe webhook signature error:', err);
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;
        const riderId = sub.metadata?.riderId;
        if (riderId && sub.status === 'active') {
          const periodEnd = new Date((sub as any).current_period_end * 1000);
          await query(
            `UPDATE riders SET tier = 'pro', stripe_subscription_id = $1, tier_expires_at = $2 WHERE id = $3`,
            [sub.id, periodEnd, riderId],
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;
        const riderId = sub.metadata?.riderId;
        if (riderId) {
          await query(
            `UPDATE riders SET tier = 'free', stripe_subscription_id = NULL, tier_expires_at = NULL WHERE id = $1`,
            [riderId],
          );
        }
        break;
      }
    }

    res.json({ received: true });
  },
);

// Stripe requires raw body for webhook signature verification
function express_raw_body_middleware() {
  const express = require('express');
  return express.raw({ type: 'application/json' });
}

export default router;
