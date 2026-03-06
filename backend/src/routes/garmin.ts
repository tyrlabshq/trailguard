/**
 * Garmin inReach routes (PL-10)
 * Pro-only: register/update/remove MapShare config, view satellite pings.
 */
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRider, requirePro } from '../middleware/auth';

const router = Router();

// ─── POST /garmin/config — Register or update MapShare identifier ─────────────

router.post('/config', requireRider, requirePro, async (req: Request, res: Response): Promise<void> => {
  const riderId = req.riderId;
  const { mapshareId, mapsharePassword, imei, pollIntervalSeconds } = req.body;

  if (!mapshareId) {
    res.status(400).json({ error: 'mapshareId is required' });
    return;
  }

  // Enforce minimum poll interval (Garmin rate-limits aggressive polling)
  const interval = Math.max(parseInt(pollIntervalSeconds, 10) || 60, 60);

  await query(
    `INSERT INTO garmin_configs
       (rider_id, mapshare_id, mapshare_password, imei, poll_interval_seconds, enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, now())
     ON CONFLICT (rider_id) DO UPDATE
       SET mapshare_id = EXCLUDED.mapshare_id,
           mapshare_password = EXCLUDED.mapshare_password,
           imei = EXCLUDED.imei,
           poll_interval_seconds = EXCLUDED.poll_interval_seconds,
           enabled = true,
           updated_at = now()`,
    [riderId, mapshareId, mapsharePassword || null, imei || null, interval],
  );

  res.json({
    ok: true,
    mapshareId,
    pollIntervalSeconds: interval,
    note: 'Satellite location will appear in your active group within one poll interval.',
  });
});

// ─── GET /garmin/config — Get current config ──────────────────────────────────

router.get('/config', requireRider, requirePro, async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT mapshare_id, imei, poll_interval_seconds, enabled,
            last_polled_at, last_location_at, created_at
     FROM garmin_configs WHERE rider_id = $1`,
    [req.riderId],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'No Garmin config registered', hint: 'POST /garmin/config to register' });
    return;
  }

  const cfg = result.rows[0];
  res.json({
    mapshareId: cfg.mapshare_id,
    imei: cfg.imei,
    pollIntervalSeconds: cfg.poll_interval_seconds,
    enabled: cfg.enabled,
    lastPolledAt: cfg.last_polled_at,
    lastLocationAt: cfg.last_location_at,
    createdAt: cfg.created_at,
  });
});

// ─── DELETE /garmin/config — Remove config ────────────────────────────────────

router.delete('/config', requireRider, requirePro, async (req: Request, res: Response): Promise<void> => {
  await query('DELETE FROM garmin_configs WHERE rider_id = $1', [req.riderId]);
  res.json({ ok: true });
});

// ─── PATCH /garmin/config/toggle — Enable/disable polling ────────────────────

router.patch('/config/toggle', requireRider, requirePro, async (req: Request, res: Response): Promise<void> => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled (boolean) is required' });
    return;
  }

  const result = await query(
    'UPDATE garmin_configs SET enabled = $1, updated_at = now() WHERE rider_id = $2 RETURNING enabled',
    [enabled, req.riderId],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'No Garmin config found' });
    return;
  }

  res.json({ ok: true, enabled: result.rows[0].enabled });
});

// ─── GET /garmin/pings — Recent satellite pings ───────────────────────────────

router.get('/pings', requireRider, requirePro, async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);

  const result = await query(
    `SELECT
       id,
       ST_Y(location) AS lat,
       ST_X(location) AS lng,
       altitude_m,
       speed_kmh,
       heading,
       event_type,
       garmin_at,
       received_at
     FROM garmin_pings
     WHERE rider_id = $1
     ORDER BY garmin_at DESC
     LIMIT $2`,
    [req.riderId, limit],
  );

  res.json({
    pings: result.rows.map(r => ({
      id: r.id,
      location: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
      altitudeM: r.altitude_m,
      speedKmh: r.speed_kmh,
      heading: r.heading,
      eventType: r.event_type,
      garminAt: r.garmin_at,
      receivedAt: r.received_at,
    })),
  });
});

// ─── GET /garmin/status — Quick status check for the app UI ──────────────────

router.get('/status', requireRider, async (req: Request, res: Response): Promise<void> => {
  if (req.riderTier !== 'pro') {
    res.json({ supported: false, reason: 'Pro subscription required' });
    return;
  }

  const result = await query(
    `SELECT enabled, last_location_at, last_polled_at FROM garmin_configs WHERE rider_id = $1`,
    [req.riderId],
  );

  if (result.rows.length === 0) {
    res.json({ configured: false, enabled: false });
    return;
  }

  const cfg = result.rows[0];
  const minutesSincePing = cfg.last_location_at
    ? Math.round((Date.now() - new Date(cfg.last_location_at).getTime()) / 60_000)
    : null;

  res.json({
    configured: true,
    enabled: cfg.enabled,
    lastLocationAt: cfg.last_location_at,
    minutesSinceLastPing: minutesSincePing,
    online: minutesSincePing !== null && minutesSincePing < 10,
  });
});

export default router;
