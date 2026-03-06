import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRider } from '../middleware/auth';
import { broadcastToGroup } from '../ws';

const router = Router();

// Characters excluding ambiguous: 0/O/I/1
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// POST /groups — Create group
router.post('/', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  // Generate unique code with retry
  let code: string;
  let attempts = 0;
  while (true) {
    code = generateCode();
    const existing = await query('SELECT id FROM groups WHERE code = $1', [code]);
    if (existing.rows.length === 0) break;
    attempts++;
    if (attempts > 10) {
      res.status(500).json({ error: 'Could not generate unique code' });
      return;
    }
  }

  const result = await query(
    `INSERT INTO groups (code, name, leader_id) VALUES ($1, $2, $3) RETURNING *`,
    [code, name, riderId]
  );
  const group = result.rows[0];

  // Add creator as leader
  await query(
    `INSERT INTO group_members (group_id, rider_id, role) VALUES ($1, $2, 'leader')`,
    [group.id, riderId]
  );

  res.status(201).json({ group: formatGroup(group), code });
});

// POST /groups/join — Join by code
router.post('/join', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  // Find group by code (case-insensitive)
  const groupResult = await query(
    'SELECT * FROM groups WHERE UPPER(code) = UPPER($1)',
    [code]
  );
  if (groupResult.rows.length === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const group = groupResult.rows[0];

  // Check if already a member
  const existingMember = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND rider_id = $2',
    [group.id, riderId]
  );
  if (existingMember.rows.length > 0) {
    res.status(409).json({ error: 'Already a member of this group' });
    return;
  }

  // Check member count limit — get leader's tier
  const leaderTier = await query(
    'SELECT tier FROM riders WHERE id = $1',
    [group.leader_id]
  );
  const tier = leaderTier.rows[0]?.tier || 'free';
  const maxMembers = tier === 'pro' ? 30 : 12;

  const countResult = await query(
    'SELECT COUNT(*)::int AS cnt FROM group_members WHERE group_id = $1',
    [group.id]
  );
  if (countResult.rows[0].cnt >= maxMembers) {
    res.status(403).json({ error: `Group is full (max ${maxMembers} members)` });
    return;
  }

  // Add rider as member
  await query(
    `INSERT INTO group_members (group_id, rider_id, role) VALUES ($1, $2, 'member')`,
    [group.id, riderId]
  );

  // Broadcast rider joined
  broadcastToGroup(group.id, { type: 'rider_joined', riderId });

  // Return group with members
  const members = await getGroupMembers(group.id);
  res.json({ group: formatGroup(group), members });
});

// GET /groups/:id — Get group state
router.get('/:id', requireRider, async (req: Request, res: Response) => {
  const { id } = req.params;

  const groupResult = await query('SELECT * FROM groups WHERE id = $1', [id]);
  if (groupResult.rows.length === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const group = groupResult.rows[0];

  // Members with latest location
  const members = await query(`
    SELECT
      r.id, r.name, r.avatar_url,
      gm.role, gm.joined_at,
      loc.lat, loc.lng, loc.heading, loc.speed_mph, loc.source, loc.recorded_at
    FROM group_members gm
    JOIN riders r ON r.id = gm.rider_id
    LEFT JOIN LATERAL (
      SELECT
        ST_Y(rl.location) AS lat,
        ST_X(rl.location) AS lng,
        rl.heading, rl.speed_mph, rl.source, rl.recorded_at
      FROM rider_locations rl
      WHERE rl.rider_id = r.id
      ORDER BY rl.recorded_at DESC
      LIMIT 1
    ) loc ON true
    WHERE gm.group_id = $1
  `, [id]);

  // Active alerts
  const alerts = await query(
    `SELECT id, type, rider_id, ST_Y(location) AS lat, ST_X(location) AS lng, fired_at
     FROM alerts
     WHERE group_id = $1 AND acknowledged_at IS NULL
     ORDER BY fired_at DESC`,
    [id]
  );

  res.json({
    group: formatGroup(group),
    members: members.rows.map(formatMemberWithLocation),
    alerts: alerts.rows,
  });
});

// PATCH /groups/:id — Update group (leader only)
router.patch('/:id', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { id } = req.params;

  // Verify leader
  const groupResult = await query('SELECT * FROM groups WHERE id = $1', [id]);
  if (groupResult.rows.length === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const group = groupResult.rows[0];
  if (group.leader_id !== riderId) {
    res.status(403).json({ error: 'Only the leader can update the group' });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (req.body.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    values.push(req.body.name);
  }
  if (req.body.sweep_id !== undefined) {
    updates.push(`sweep_id = $${paramIdx++}`);
    values.push(req.body.sweep_id || null);
  }
  if (req.body.rally_point !== undefined) {
    const rp = req.body.rally_point;
    if (rp === null) {
      updates.push(`rally_point = NULL`);
    } else {
      updates.push(`rally_point = ST_SetSRID(ST_MakePoint($${paramIdx++}, $${paramIdx++}), 4326)`);
      values.push(rp.lng, rp.lat);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  values.push(id);
  const result = await query(
    `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    values
  );

  res.json({ group: formatGroup(result.rows[0]) });
});

// DELETE /groups/:id/leave — Leave group
router.delete('/:id/leave', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { id } = req.params;

  const groupResult = await query('SELECT * FROM groups WHERE id = $1', [id]);
  if (groupResult.rows.length === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const group = groupResult.rows[0];

  // Remove from group_members
  const deleteResult = await query(
    'DELETE FROM group_members WHERE group_id = $1 AND rider_id = $2',
    [id, riderId]
  );
  if (deleteResult.rowCount === 0) {
    res.status(404).json({ error: 'Not a member of this group' });
    return;
  }

  // If was sweep, clear sweep_id
  if (group.sweep_id === riderId) {
    await query('UPDATE groups SET sweep_id = NULL WHERE id = $1', [id]);
  }

  // If was leader, transfer or delete
  if (group.leader_id === riderId) {
    const remaining = await query(
      'SELECT rider_id FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC LIMIT 1',
      [id]
    );
    if (remaining.rows.length > 0) {
      const newLeaderId = remaining.rows[0].rider_id;
      await query('UPDATE groups SET leader_id = $1 WHERE id = $2', [newLeaderId, id]);
      await query(
        `UPDATE group_members SET role = 'leader' WHERE group_id = $1 AND rider_id = $2`,
        [id, newLeaderId]
      );
    } else {
      // No members left — delete group
      await query('DELETE FROM groups WHERE id = $1', [id]);
    }
  }

  // Broadcast rider left
  broadcastToGroup(id, { type: 'rider_left', riderId });

  res.json({ message: 'Left group' });
});

// POST /groups/:id/end-ride — End ride session
router.post('/:id/end-ride', requireRider, async (req: Request, res: Response) => {
  const { id } = req.params;

  const groupResult = await query('SELECT * FROM groups WHERE id = $1', [id]);
  if (groupResult.rows.length === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Compute stats from rider_locations for this group
  const statsResult = await query(`
    WITH ordered_locs AS (
      SELECT
        rider_id,
        location,
        speed_mph,
        recorded_at,
        LAG(location) OVER (PARTITION BY rider_id ORDER BY recorded_at) AS prev_loc
      FROM rider_locations
      WHERE group_id = $1
    ),
    distances AS (
      SELECT
        rider_id,
        COALESCE(SUM(ST_Distance(location::geography, prev_loc::geography) / 1609.344), 0) AS total_distance_miles,
        MAX(COALESCE(speed_mph, 0)) AS top_speed_mph,
        AVG(COALESCE(speed_mph, 0)) AS avg_speed_mph,
        MIN(recorded_at) AS first_at,
        MAX(recorded_at) AS last_at
      FROM ordered_locs
      WHERE prev_loc IS NOT NULL
      GROUP BY rider_id
    )
    SELECT
      COALESCE(SUM(total_distance_miles), 0) AS total_distance_miles,
      COALESCE(MAX(top_speed_mph), 0) AS top_speed_mph,
      COALESCE(AVG(avg_speed_mph), 0) AS avg_speed_mph,
      MIN(first_at) AS started_at,
      MAX(last_at) AS ended_at,
      EXTRACT(EPOCH FROM (MAX(last_at) - MIN(first_at))) / 60.0 AS duration_minutes
    FROM distances
  `, [id]);

  const stats = statsResult.rows[0];

  const ride = await query(
    `INSERT INTO rides (group_id, started_at, ended_at, stats)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      id,
      stats.started_at || new Date(),
      stats.ended_at || new Date(),
      JSON.stringify({
        total_distance_miles: parseFloat(stats.total_distance_miles) || 0,
        duration_minutes: parseFloat(stats.duration_minutes) || 0,
        top_speed_mph: parseFloat(stats.top_speed_mph) || 0,
        avg_speed_mph: parseFloat(stats.avg_speed_mph) || 0,
      }),
    ]
  );

  res.json({ ride: ride.rows[0] });
});

// --- Helpers ---

function formatGroup(row: any) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    leaderId: row.leader_id,
    sweepId: row.sweep_id,
    rallyPoint: row.rally_point
      ? { lat: parseFloat(row.rally_point_lat || '0'), lng: parseFloat(row.rally_point_lng || '0') }
      : null,
    createdAt: row.created_at,
  };
}

function formatMemberWithLocation(row: any) {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    joinedAt: row.joined_at,
    location: row.lat != null
      ? {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          heading: row.heading,
          speedMph: row.speed_mph,
          source: row.source,
          timestamp: row.recorded_at,
        }
      : null,
  };
}

async function getGroupMembers(groupId: string) {
  const result = await query(`
    SELECT r.id, r.name, r.avatar_url, gm.role, gm.joined_at
    FROM group_members gm
    JOIN riders r ON r.id = gm.rider_id
    WHERE gm.group_id = $1
  `, [groupId]);
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

export default router;
