import { redis } from '../redis';
import { query } from '../db';
import { broadcastToGroup } from '../ws';

interface DMSConfig {
  groupId: string;
  intervalMinutes: number;
  lastSeenAt: string; // ISO timestamp
  status: 'active' | 'snoozed' | 'off';
}

const DMS_KEY_PREFIX = 'dms:';

export async function setDMS(riderId: string, groupId: string, intervalMinutes: number): Promise<void> {
  const config: DMSConfig = {
    groupId,
    intervalMinutes,
    lastSeenAt: new Date().toISOString(),
    status: 'active',
  };
  await redis.set(`${DMS_KEY_PREFIX}${riderId}`, JSON.stringify(config));
}

export async function snoozeDMS(riderId: string, minutes: number): Promise<void> {
  const raw = await redis.get(`${DMS_KEY_PREFIX}${riderId}`);
  if (!raw) return;
  const config: DMSConfig = JSON.parse(raw);
  config.status = 'snoozed';
  // Push lastSeenAt forward by snooze minutes
  config.lastSeenAt = new Date(Date.now() + minutes * 60_000).toISOString();
  await redis.set(`${DMS_KEY_PREFIX}${riderId}`, JSON.stringify(config));
}

export async function disableDMS(riderId: string): Promise<void> {
  await redis.del(`${DMS_KEY_PREFIX}${riderId}`);
}

export async function getDMS(riderId: string): Promise<DMSConfig | null> {
  const raw = await redis.get(`${DMS_KEY_PREFIX}${riderId}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function fireAlert(
  riderId: string,
  groupId: string,
  type: string,
  location: { lat: number; lng: number } | null
): Promise<void> {
  const locSql = location
    ? `ST_SetSRID(ST_MakePoint($4, $5), 4326)`
    : 'NULL';
  const params: unknown[] = [type, riderId, groupId];
  if (location) {
    params.push(location.lng, location.lat);
  }

  const result = await query(
    `INSERT INTO alerts (type, rider_id, group_id, location)
     VALUES ($1, $2, $3, ${locSql})
     RETURNING id, type, rider_id, group_id, fired_at`,
    params
  );

  const alert = result.rows[0];

  broadcastToGroup(groupId, {
    type: 'alert',
    alert: {
      id: alert.id,
      type: alert.type,
      riderId: alert.rider_id,
      groupId: alert.group_id,
      location,
      firedAt: alert.fired_at,
    },
  });
}

export async function checkDMS(): Promise<void> {
  // Scan all DMS keys
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${DMS_KEY_PREFIX}*`, 'COUNT', 100);
    cursor = nextCursor;

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;

      const config: DMSConfig = JSON.parse(raw);
      if (config.status === 'off') continue;

      const riderId = key.replace(DMS_KEY_PREFIX, '');
      const deadlineMs = config.intervalMinutes * 60_000 + 60_000; // interval + 1 min grace

      // Check latest location from DB
      const locResult = await query(
        `SELECT ST_Y(location) AS lat, ST_X(location) AS lng, recorded_at
         FROM rider_locations
         WHERE rider_id = $1
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [riderId]
      );

      let lastActivity: Date;
      let lastLocation: { lat: number; lng: number } | null = null;

      if (locResult.rows.length > 0) {
        lastActivity = new Date(locResult.rows[0].recorded_at);
        lastLocation = {
          lat: parseFloat(locResult.rows[0].lat),
          lng: parseFloat(locResult.rows[0].lng),
        };
      } else {
        lastActivity = new Date(config.lastSeenAt);
      }

      const elapsed = Date.now() - lastActivity.getTime();
      if (elapsed > deadlineMs) {
        // Fire DMS alert
        await fireAlert(riderId, config.groupId, 'dead_mans_switch', lastLocation);
        // Set status to off so it doesn't fire repeatedly
        config.status = 'off';
        await redis.set(key, JSON.stringify(config));
      } else if (config.status === 'snoozed') {
        // If snooze period has passed, reactivate
        const snoozeEnd = new Date(config.lastSeenAt).getTime();
        if (Date.now() >= snoozeEnd) {
          config.status = 'active';
          config.lastSeenAt = new Date().toISOString();
          await redis.set(key, JSON.stringify(config));
        }
      }
    }
  } while (cursor !== '0');
}
