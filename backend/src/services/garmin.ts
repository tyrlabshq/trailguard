/**
 * Garmin inReach MapShare Integration (PL-10)
 *
 * HOW IT WORKS:
 * Garmin inReach devices broadcast location over satellite (Iridium network).
 * Device owners enable "MapShare" on their Garmin Explore account, which creates
 * a public KML feed at: https://share.garmin.com/Feed/Share/{MapShareIdentifier}
 *
 * This service polls that feed for each registered pro rider and injects satellite
 * fixes into the normal location pipeline (source = 'satellite').
 *
 * REQUIRED KEYS (see docs/garmin-inreach.md):
 *   - No Garmin API key needed for MapShare polling (public feed)
 *   - Users provide their MapShare identifier + optional password
 *   - Enterprise Garmin Explore API requires separate credentials (future)
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { query } from '../db';
import { broadcastToGroup, getClientByRider } from '../ws';
import WebSocket from 'ws';

const MAPSHARE_BASE = 'https://share.garmin.com/Feed/Share';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GarminFix {
  lat: number;
  lng: number;
  altitudeM: number;
  speedKmh: number;
  heading: number;
  eventType: string;
  deviceTime: Date;
  imei: string;
  raw: Record<string, unknown>;
}

// ─── Feed Parser ──────────────────────────────────────────────────────────────

/** Parse Garmin MapShare KML response into structured fixes. */
async function parseMapShareFeed(xml: string): Promise<GarminFix[]> {
  const parsed = await parseStringPromise(xml, { explicitArray: false });
  const fixes: GarminFix[] = [];

  const placemarks = parsed?.kml?.Document?.Folder?.Placemark;
  if (!placemarks) return fixes;

  const list = Array.isArray(placemarks) ? placemarks : [placemarks];

  for (const pm of list) {
    try {
      const coords: string = pm?.Point?.coordinates || '';
      const [lngStr, latStr] = coords.trim().split(',');
      if (!lngStr || !latStr) continue;

      const extData: Record<string, string> = {};
      const dataItems = pm?.ExtendedData?.Data;
      if (dataItems) {
        const items = Array.isArray(dataItems) ? dataItems : [dataItems];
        for (const item of items) {
          const name = item?.$.name as string;
          const value = item?.value ?? '';
          if (name) extData[name] = String(value);
        }
      }

      const deviceTimeStr = extData['Time UTC'] || extData['Time'];
      const deviceTime = deviceTimeStr ? new Date(deviceTimeStr) : new Date();

      fixes.push({
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        altitudeM: parseFloat(extData['Altitude'] || '0'),
        speedKmh: parseFloat(extData['Velocity'] || '0'),
        heading: parseFloat(extData['Course'] || '0'),
        eventType: extData['Event'] || 'Tracking',
        imei: extData['IMEI'] || '',
        deviceTime,
        raw: extData,
      });
    } catch {
      // Skip malformed placemarks
    }
  }

  return fixes;
}

// ─── Poll a single rider's feed ───────────────────────────────────────────────

async function pollRiderFeed(config: {
  riderId: string;
  mapshareId: string;
  mapsharePassword: string | null;
  imei: string | null;
  lastPolledAt: Date | null;
}): Promise<void> {
  const { riderId, mapshareId, mapsharePassword, imei, lastPolledAt } = config;

  // Build URL with date range (last poll → now, or last hour if first poll)
  const d2 = new Date();
  const d1 = lastPolledAt
    ? new Date(lastPolledAt.getTime() - 60_000) // 1-minute overlap to avoid gaps
    : new Date(d2.getTime() - 3600_000);        // First poll: last hour

  const url = new URL(`${MAPSHARE_BASE}/${encodeURIComponent(mapshareId)}`);
  url.searchParams.set('d1', d1.toISOString());
  url.searchParams.set('d2', d2.toISOString());
  if (imei) url.searchParams.set('imei', imei);
  if (mapsharePassword) url.searchParams.set('extId', mapsharePassword);
  url.searchParams.set('version', '2');

  let xml: string;
  try {
    const response = await axios.get(url.toString(), {
      timeout: 15_000,
      headers: { 'Accept': 'application/vnd.google-earth.kml+xml, application/xml, */*' },
    });
    xml = response.data;
  } catch (err: unknown) {
    const axErr = err as { response?: { status: number } };
    if (axErr?.response?.status === 401) {
      console.warn(`Garmin MapShare auth failed for rider ${riderId} — check mapshare_password`);
    } else {
      console.error(`Garmin poll failed for rider ${riderId}:`, err instanceof Error ? err.message : err);
    }
    // Update last_polled_at even on error (avoid hammering on repeated failures)
    await query('UPDATE garmin_configs SET last_polled_at = now() WHERE rider_id = $1', [riderId]);
    return;
  }

  const fixes = await parseMapShareFeed(xml);

  if (fixes.length === 0) {
    await query('UPDATE garmin_configs SET last_polled_at = now() WHERE rider_id = $1', [riderId]);
    return;
  }

  // Deduplicate: only insert fixes newer than what we have
  for (const fix of fixes) {
    // Check duplicate
    const dupe = await query(
      `SELECT 1 FROM garmin_pings WHERE rider_id = $1 AND garmin_at = $2`,
      [riderId, fix.deviceTime],
    );
    if (dupe.rows.length > 0) continue;

    // Store the satellite ping
    await query(
      `INSERT INTO garmin_pings
         (rider_id, imei, location, altitude_m, speed_kmh, heading, event_type, raw_data, garmin_at)
       VALUES
         ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10)`,
      [
        riderId,
        fix.imei || null,
        fix.lng,
        fix.lat,
        fix.altitudeM,
        fix.speedKmh,
        fix.heading,
        JSON.stringify(fix.raw),
        fix.deviceTime,
      ],
    );

    // Also write into rider_locations (source = 'satellite') so the existing
    // group location pipeline and sweep-gap logic picks it up automatically
    const groupResult = await query(
      `SELECT group_id FROM group_members
       JOIN groups USING (group_id)
       WHERE rider_id = $1
       ORDER BY joined_at DESC LIMIT 1`,
      [riderId],
    );
    if (groupResult.rows.length > 0) {
      const groupId = groupResult.rows[0].group_id;
      await query(
        `INSERT INTO rider_locations
           (rider_id, group_id, location, heading, speed_mph, altitude_ft, source, recorded_at)
         VALUES
           ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, 'satellite', $8)`,
        [
          riderId,
          groupId,
          fix.lng,
          fix.lat,
          fix.heading,
          fix.speedKmh * 0.621371,                // km/h → mph
          fix.altitudeM * 3.28084,                // meters → feet
          fix.deviceTime,
        ],
      );

      // Broadcast satellite ping to group WebSocket
      broadcastToGroup(groupId, {
        type: 'location_update',
        riderId,
        location: { lat: fix.lat, lng: fix.lng },
        heading: fix.heading,
        speedMph: Math.round(fix.speedKmh * 0.621371 * 10) / 10,
        source: 'satellite',
        timestamp: fix.deviceTime.getTime(),
      }, riderId);
    }
  }

  // Update last polled + last location timestamps
  const newest = fixes.reduce((a, b) => a.deviceTime > b.deviceTime ? a : b);
  await query(
    `UPDATE garmin_configs
     SET last_polled_at = now(), last_location_at = $1
     WHERE rider_id = $2`,
    [newest.deviceTime, riderId],
  );
}

// ─── Poller Watchdog ──────────────────────────────────────────────────────────

/**
 * Called by the server watchdog every 60 seconds.
 * Finds all enabled garmin_configs due for a poll and fires them.
 */
export async function pollDueGarminFeeds(): Promise<void> {
  const result = await query(
    `SELECT
       gc.rider_id,
       gc.mapshare_id,
       gc.mapshare_password,
       gc.imei,
       gc.last_polled_at,
       gc.poll_interval_seconds
     FROM garmin_configs gc
     JOIN riders r ON r.id = gc.rider_id
     WHERE gc.enabled = true
       AND r.tier = 'pro'
       AND (
         gc.last_polled_at IS NULL
         OR gc.last_polled_at < now() - (gc.poll_interval_seconds || ' seconds')::interval
       )`,
  );

  if (result.rows.length === 0) return;

  // Poll all due riders concurrently (bounded — there shouldn't be thousands)
  await Promise.allSettled(
    result.rows.map(row =>
      pollRiderFeed({
        riderId: row.rider_id,
        mapshareId: row.mapshare_id,
        mapsharePassword: row.mapshare_password,
        imei: row.imei,
        lastPolledAt: row.last_polled_at ? new Date(row.last_polled_at) : null,
      }),
    ),
  );
}

// ─── Re-export for route use ──────────────────────────────────────────────────
export { GarminFix };
