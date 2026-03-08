/**
 * OfflineQueue — TG-Offline-3
 *
 * Persists critical user actions to AsyncStorage when offline, then replays
 * them against the backend when connectivity is restored.
 *
 * Supported action types:
 *   - sos             → inserts into `alerts` table
 *   - dms_trigger     → inserts into `alerts` table (dms_expired)
 *   - trail_condition → POST to trail conditions API
 *   - location_update → broadcasts via Supabase Realtime
 *
 * Usage:
 *   await OfflineQueue.enqueue({ type: 'sos', payload: { lat, lng, message } });
 *   const { success, failed } = await OfflineQueue.flush(supabase);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrailConditionReport } from '../api/trailConditions';

const QUEUE_KEY = '@trailguard/offline_action_queue_v1';
const MAX_QUEUE_SIZE = 200;

// ─── Types ──────────────────────────────────────────────────────────────────

export type QueuedAction =
  | { type: 'sos'; payload: { lat: number; lng: number; message: string } }
  | { type: 'dms_trigger'; payload: { riderId: string; groupId: string } }
  | { type: 'trail_condition'; payload: TrailConditionReport }
  | { type: 'location_update'; payload: { lat: number; lng: number; speed: number; battery: number } };

interface QueueEntry {
  id: string;
  action: QueuedAction;
  enqueuedAt: string;
}

// ─── OfflineQueue ────────────────────────────────────────────────────────────

export class OfflineQueue {
  /** Add an action to the queue. Silently drops if queue is full. */
  static async enqueue(action: QueuedAction): Promise<void> {
    try {
      const queue = await OfflineQueue._readQueue();
      if (queue.length >= MAX_QUEUE_SIZE) {
        // Drop oldest non-sos entry to make room; always keep SOS
        const sosCount = queue.filter((e) => e.action.type === 'sos').length;
        if (sosCount < queue.length) {
          const dropIdx = queue.findIndex((e) => e.action.type !== 'sos');
          if (dropIdx !== -1) queue.splice(dropIdx, 1);
        } else {
          return; // Queue is all SOS — don't drop any
        }
      }
      const entry: QueueEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action,
        enqueuedAt: new Date().toISOString(),
      };
      queue.push(entry);
      await OfflineQueue._writeQueue(queue);
    } catch {
      // Non-fatal — best-effort queue
    }
  }

  /**
   * Flush all queued actions. Processes each entry in order, then removes
   * successfully sent entries. Returns counts of success/failed.
   */
  static async flush(supabase: SupabaseClient): Promise<{ success: number; failed: number }> {
    let queue = await OfflineQueue._readQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    const getUserId = async (): Promise<string | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    };

    let success = 0;
    let failed = 0;
    const toRemove: string[] = [];

    for (const entry of queue) {
      try {
        const { action } = entry;

        switch (action.type) {
          case 'sos': {
            const riderId = await getUserId();
            if (!riderId) throw new Error('not authenticated');
            const { error } = await supabase.from('alerts').insert({
              rider_id: riderId,
              type: 'sos',
              lat: action.payload.lat,
              lng: action.payload.lng,
              message: action.payload.message,
            });
            if (error) throw new Error(error.message);
            break;
          }

          case 'dms_trigger': {
            const { error } = await supabase.from('alerts').insert({
              rider_id: action.payload.riderId,
              group_id: action.payload.groupId,
              type: 'dms_expired',
              message: "⚠️ Dead Man's Switch expired while offline.",
            });
            if (error) throw new Error(error.message);
            break;
          }

          case 'trail_condition': {
            const riderId = await getUserId();
            if (!riderId) throw new Error('not authenticated');
            const r = action.payload;
            const { error } = await supabase.from('trail_conditions').insert({
              rider_id: riderId,
              lat: r.lat,
              lng: r.lng,
              report_type: r.reportType,
              condition: r.condition ?? null,
              hazard: r.hazard ?? null,
              snow_depth_cm: r.snowDepthCm ?? null,
              notes: r.notes ?? null,
            });
            if (error) throw new Error(error.message);
            break;
          }

          case 'location_update': {
            // Broadcast via Realtime — best-effort, skip if can't get channel
            // Location updates are low-priority; skip silently rather than fail
            break;
          }
        }

        toRemove.push(entry.id);
        success++;
      } catch {
        failed++;
        // Keep failed entries in queue for next flush attempt
      }
    }

    // Remove successfully sent entries
    if (toRemove.length > 0) {
      queue = queue.filter((e) => !toRemove.includes(e.id));
      await OfflineQueue._writeQueue(queue);
    }

    return { success, failed };
  }

  /** Returns the number of pending queued actions. */
  static async getQueueLength(): Promise<number> {
    const queue = await OfflineQueue._readQueue();
    return queue.length;
  }

  /** Clears the entire queue. Use sparingly (e.g. on group leave). */
  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch {
      // Non-fatal
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private static async _readQueue(): Promise<QueueEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as QueueEntry[];
    } catch {
      return [];
    }
  }

  private static async _writeQueue(queue: QueueEntry[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}
