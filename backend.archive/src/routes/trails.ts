import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

export type ConditionType = 'groomed' | 'powder' | 'icy' | 'closed' | 'tracked_out' | 'wet_snow';

interface ConditionRow {
  id: string;
  lat: number;
  lng: number;
  condition: ConditionType;
  notes: string | null;
  reported_by: string | null;
  reported_at: string;
  distance_m?: number;
}

// GET /trails/conditions?lat=46.3&lng=-84.9&radius=25000
// Returns condition reports within `radius` metres (default 25 km)
router.get('/conditions', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(parseInt(req.query.radius as string, 10) || 25000, 100000);

  try {
    let rows: ConditionRow[];
    if (!isNaN(lat) && !isNaN(lng)) {
      const result = await query(
        `SELECT
           id,
           condition,
           notes,
           reported_by,
           reported_at,
           ST_Y(location::geometry) AS lat,
           ST_X(location::geometry) AS lng,
           ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_m
         FROM trail_conditions
         WHERE ST_DWithin(
           location,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           $3
         )
         ORDER BY reported_at DESC
         LIMIT 200`,
        [lat, lng, radius],
      );
      rows = result.rows;
    } else {
      // No location filter — return recent 100
      const result = await query(
        `SELECT
           id,
           condition,
           notes,
           reported_by,
           reported_at,
           ST_Y(location::geometry) AS lat,
           ST_X(location::geometry) AS lng
         FROM trail_conditions
         ORDER BY reported_at DESC
         LIMIT 100`,
      );
      rows = result.rows;
    }

    res.json(rows);
  } catch (err) {
    console.error('[trails/conditions GET]', err);
    res.status(500).json({ error: 'Failed to fetch conditions' });
  }
});

// POST /trails/conditions
// Body: { lat, lng, condition, notes? }
router.post('/conditions', async (req: Request, res: Response) => {
  const { lat, lng, condition, notes } = req.body as {
    lat: unknown;
    lng: unknown;
    condition: unknown;
    notes?: unknown;
  };

  const VALID_CONDITIONS: ConditionType[] = ['groomed', 'powder', 'icy', 'closed', 'tracked_out', 'wet_snow'];

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }
  if (!VALID_CONDITIONS.includes(condition as ConditionType)) {
    return res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` });
  }

  try {
    const result = await query(
      `INSERT INTO trail_conditions (condition, notes, location)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)
       RETURNING
         id,
         condition,
         notes,
         reported_at,
         ST_Y(location::geometry) AS lat,
         ST_X(location::geometry) AS lng`,
      [condition, notes ?? null, lat, lng],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[trails/conditions POST]', err);
    res.status(500).json({ error: 'Failed to save condition report' });
  }
});

// DELETE /trails/conditions/:id  (soft-delete via close marker or hard delete)
router.delete('/conditions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM trail_conditions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[trails/conditions DELETE]', err);
    res.status(500).json({ error: 'Failed to delete condition' });
  }
});

export default router;
