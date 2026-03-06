import { redis } from '../redis';
import { broadcastToGroup, getClientByRider } from '../ws';
import { fireAlert } from './dms';
import WebSocket from 'ws';

export interface CMOTimer {
  groupId: string;
  durationMinutes: number;
  note?: string;
  startedAt: string; // ISO
  etaAt: string;     // ISO
  warningSent: boolean;
}

export const CMO_KEY_PREFIX = 'cmo:';

/** Start a count-me-out timer for a rider. Broadcasts to the group. */
export async function startCMO(
  riderId: string,
  groupId: string,
  durationMinutes: number,
  note?: string,
): Promise<CMOTimer> {
  const now = new Date();
  const eta = new Date(now.getTime() + durationMinutes * 60_000);

  const timer: CMOTimer = {
    groupId,
    durationMinutes,
    note,
    startedAt: now.toISOString(),
    etaAt: eta.toISOString(),
    warningSent: false,
  };

  // TTL = duration + 15 min buffer so Redis cleans up stale timers
  const ttlSeconds = (durationMinutes + 15) * 60;
  await redis.set(`${CMO_KEY_PREFIX}${riderId}`, JSON.stringify(timer), 'EX', ttlSeconds);

  // Broadcast to everyone in the group so their maps update immediately
  broadcastToGroup(groupId, {
    type: 'count_me_out_started',
    riderId,
    durationMinutes,
    note: note ?? null,
    etaAt: eta.toISOString(),
  });

  return timer;
}

/** Cancel a count-me-out timer ("I'm back"). Broadcasts to the group. */
export async function cancelCMO(riderId: string): Promise<boolean> {
  const raw = await redis.get(`${CMO_KEY_PREFIX}${riderId}`);
  if (!raw) return false;

  const timer: CMOTimer = JSON.parse(raw);
  await redis.del(`${CMO_KEY_PREFIX}${riderId}`);

  broadcastToGroup(timer.groupId, {
    type: 'count_me_out_cancelled',
    riderId,
  });

  return true;
}

/** Retrieve the current CMO timer for a rider, or null if none exists. */
export async function getCMO(riderId: string): Promise<CMOTimer | null> {
  const raw = await redis.get(`${CMO_KEY_PREFIX}${riderId}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Cron watchdog — call every 30 seconds alongside checkDMS().
 * - Sends a 2-minute personal warning to the rider themselves.
 * - Fires a group alert (count_me_out_expired) if ETA has passed.
 */
export async function checkCountMeOut(): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      `${CMO_KEY_PREFIX}*`,
      'COUNT',
      100,
    );
    cursor = nextCursor;

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;

      const timer: CMOTimer = JSON.parse(raw);
      const riderId = key.replace(CMO_KEY_PREFIX, '');
      const now = Date.now();
      const etaMs = new Date(timer.etaAt).getTime();
      const msToEta = etaMs - now;

      if (msToEta <= 0) {
        // ETA expired — fire group alert and remove timer
        await fireAlert(riderId, timer.groupId, 'count_me_out_expired', null);
        await redis.del(key);
      } else if (msToEta <= 2 * 60_000 && !timer.warningSent) {
        // 2-minute warning — send only to the rider who is counting out
        const client = getClientByRider(riderId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(
            JSON.stringify({
              type: 'count_me_out_warning',
              riderId,
              minutesRemaining: Math.ceil(msToEta / 60_000),
              etaAt: timer.etaAt,
            }),
          );
        }

        // Mark warning as sent so we don't spam
        timer.warningSent = true;
        const remainingSeconds = Math.max(Math.ceil(msToEta / 1000), 60);
        await redis.set(key, JSON.stringify(timer), 'EX', remainingSeconds + 60);
      }
    }
  } while (cursor !== '0');
}
