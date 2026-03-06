import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRider } from '../middleware/auth';
import { broadcastToGroup } from '../ws';

const router = Router();

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
    [groupId, riderId]
  );
  if (member.rows.length === 0) {
    res.status(403).json({ error: 'Not a member of this group' });
    return;
  }

  // Insert location
  await query(
    `INSERT INTO rider_locations (rider_id, group_id, location, heading, speed_mph, altitude_ft, source, accuracy)
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9)`,
    [riderId, groupId, lng, lat, heading || null, speedMph || null, altitudeFt || null, source || 'cellular', accuracy || null]
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

  res.json({ ok: true });
});

export default router;
