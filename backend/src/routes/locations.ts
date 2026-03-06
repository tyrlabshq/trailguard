import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRider } from '../middleware/auth';
import { broadcastToGroup, getClientByRider } from '../ws';
import WebSocket from 'ws';

const router = Router();

// Sweep gap thresholds (miles)
const SWEEP_ALERT_MILES = 1.0;   // Sweep gets vibration alert
const LEADER_ALERT_MILES = 2.0;  // Leader gets alert if sweep falls too far back

// POST /locations — Ingest location update
router.post('/', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { groupId, lat, lng, heading, speedMph, altitudeFt, source, accuracy } = req.body;

  if (!groupId || lat == null || lng == null) {
    res.status(400).json({ error: 'groupId, lat, and lng are required' });
    return;
  }

  // Verify membership
  const member = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND rider_id = $2',
    [groupId, riderId],
  );
  if (member.rows.length === 0) {
    res.status(403).json({ error: 'Not a member of this group' });
    return;
  }

  // Insert location
  await query(
    `INSERT INTO rider_locations (rider_id, group_id, location, heading, speed_mph, altitude_ft, source, accuracy)
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9)`,
    [riderId, groupId, lng, lat, heading || null, speedMph || null, altitudeFt || null, source || 'cellular', accuracy || null],
  );

  // Broadcast to group via WebSocket
  broadcastToGroup(groupId, {
    type: 'location_update',
    riderId,
    location: { lat, lng },
    heading: heading || null,
    speedMph: speedMph || null,
    source: source || 'cellular',
    timestamp: Date.now(),
  }, riderId);

  // --- Sweep Gap calculation ---
  // Only compute if this group has a sweep assigned
  try {
    const groupResult = await query(
      'SELECT sweep_id, leader_id FROM groups WHERE id = $1',
      [groupId],
    );
    if (groupResult.rows.length > 0) {
      const { sweep_id: sweepId, leader_id: leaderId } = groupResult.rows[0];
      if (sweepId) {
        await computeAndBroadcastSweepGap(groupId, sweepId, leaderId, riderId);
      }
    }
  } catch (err) {
    // Non-fatal — don't block the location update response
    console.error('Sweep gap compute error:', err);
  }

  res.json({ ok: true });
});

/**
 * Compute the distance (miles) between the sweep rider's last known location
 * and the nearest non-sweep rider's last known location (the "last rider ahead").
 * Broadcast the result to the sweep; alert leader if threshold exceeded.
 */
async function computeAndBroadcastSweepGap(
  groupId: string,
  sweepId: string,
  leaderId: string,
  updatingRiderId: string,
): Promise<void> {
  // Only run when the sweep itself has a recorded location
  const sweepLocResult = await query(
    `SELECT ST_Y(location) AS lat, ST_X(location) AS lng
     FROM rider_locations
     WHERE rider_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [sweepId],
  );
  if (sweepLocResult.rows.length === 0) return;

  const sweepLat = parseFloat(sweepLocResult.rows[0].lat);
  const sweepLng = parseFloat(sweepLocResult.rows[0].lng);

  // Find the nearest non-sweep rider (= "last rider ahead of sweep")
  const gapResult = await query(
    `WITH latest_locs AS (
       SELECT DISTINCT ON (rl.rider_id)
         rl.rider_id,
         ST_Y(rl.location) AS lat,
         ST_X(rl.location) AS lng,
         rl.recorded_at
       FROM rider_locations rl
       JOIN group_members gm ON gm.rider_id = rl.rider_id AND gm.group_id = $1
       WHERE rl.rider_id != $2
         AND rl.recorded_at > now() - interval '5 minutes'
       ORDER BY rl.rider_id, rl.recorded_at DESC
     )
     SELECT
       rider_id,
       lat,
       lng,
       ST_Distance(
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
       ) / 1609.344 AS distance_miles
     FROM latest_locs
     ORDER BY distance_miles ASC
     LIMIT 1`,
    [groupId, sweepId, sweepLat, sweepLng],
  );

  if (gapResult.rows.length === 0) return;

  const { rider_id: nearestRiderId, distance_miles: rawMiles } = gapResult.rows[0];
  const distanceMiles: number = parseFloat(rawMiles);

  // Broadcast sweep_gap_update to the sweep rider
  const sweepClient = getClientByRider(sweepId);
  if (sweepClient && sweepClient.ws.readyState === WebSocket.OPEN) {
    sweepClient.ws.send(
      JSON.stringify({
        type: 'sweep_gap_update',
        lastRiderId: nearestRiderId,
        distanceMiles: Math.round(distanceMiles * 100) / 100,
        alert: distanceMiles >= SWEEP_ALERT_MILES,
      }),
    );
  }

  // Also broadcast gap state to the group so the map HUD on all devices can reflect it
  broadcastToGroup(groupId, {
    type: 'sweep_gap_update',
    lastRiderId: nearestRiderId,
    distanceMiles: Math.round(distanceMiles * 100) / 100,
    alert: distanceMiles >= SWEEP_ALERT_MILES,
  });

  // Alert the leader if sweep has fallen >2 miles behind
  if (distanceMiles >= LEADER_ALERT_MILES && leaderId) {
    const leaderClient = getClientByRider(leaderId);
    if (leaderClient && leaderClient.ws.readyState === WebSocket.OPEN) {
      leaderClient.ws.send(
        JSON.stringify({
          type: 'sweep_gap_leader_alert',
          sweepId,
          distanceMiles: Math.round(distanceMiles * 100) / 100,
          message: `Sweep is ${distanceMiles.toFixed(1)}mi behind — check on them`,
        }),
      );
    }
  }
}

export default router;
