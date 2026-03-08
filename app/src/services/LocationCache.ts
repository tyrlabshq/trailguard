/**
 * LocationCache — TG-Offline-1
 *
 * Persists last-known member locations with display metadata so the map
 * can show stale/offline members instead of removing them.
 *
 * Complements MemberLocationCache (which stores raw MemberLocation objects).
 * This service adds displayName, per-user keying, and staleness helpers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@trailguard/loc_cache_v1_';
const ALL_KEYS_KEY = '@trailguard/loc_cache_keys_v1';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CachedLocation {
  userId: string;
  displayName: string;
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  timestamp: string; // ISO
  isStale: boolean;  // true if >5 min old
}

// ─── LocationCache ──────────────────────────────────────────────────────────

export class LocationCache {
  /** Persist a member's location. Staleness is computed on read. */
  static async saveLocation(loc: Omit<CachedLocation, 'isStale'>): Promise<void> {
    try {
      const key = CACHE_PREFIX + loc.userId;
      const payload: CachedLocation = { ...loc, isStale: false }; // isStale recomputed on read
      await AsyncStorage.setItem(key, JSON.stringify(payload));

      // Track the key in the all-keys set
      const keysRaw = await AsyncStorage.getItem(ALL_KEYS_KEY);
      const keys: string[] = keysRaw ? (JSON.parse(keysRaw) as string[]) : [];
      if (!keys.includes(loc.userId)) {
        keys.push(loc.userId);
        await AsyncStorage.setItem(ALL_KEYS_KEY, JSON.stringify(keys));
      }
    } catch {
      // Non-fatal — best-effort cache
    }
  }

  /** Retrieve a single member's cached location, with freshly computed isStale. */
  static async getLocation(userId: string): Promise<CachedLocation | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + userId);
      if (!raw) return null;
      const loc = JSON.parse(raw) as CachedLocation;
      loc.isStale = LocationCache._isStale(loc.timestamp);
      return loc;
    } catch {
      return null;
    }
  }

  /** Retrieve all cached member locations, with freshly computed isStale fields. */
  static async getAllLocations(): Promise<CachedLocation[]> {
    try {
      const keysRaw = await AsyncStorage.getItem(ALL_KEYS_KEY);
      if (!keysRaw) return [];
      const userIds = JSON.parse(keysRaw) as string[];

      const results: CachedLocation[] = [];
      for (const userId of userIds) {
        const loc = await LocationCache.getLocation(userId);
        if (loc) results.push(loc);
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Clear all cached locations for a group's members.
   * Pass an array of userIds that belong to the group.
   */
  static async clearGroup(userIds: string[]): Promise<void> {
    try {
      const keys = userIds.map((id) => CACHE_PREFIX + id);
      await AsyncStorage.multiRemove(keys);

      // Remove from all-keys index
      const keysRaw = await AsyncStorage.getItem(ALL_KEYS_KEY);
      if (!keysRaw) return;
      const existing = JSON.parse(keysRaw) as string[];
      const filtered = existing.filter((id) => !userIds.includes(id));
      await AsyncStorage.setItem(ALL_KEYS_KEY, JSON.stringify(filtered));
    } catch {
      // Non-fatal
    }
  }

  /**
   * Returns a human-readable relative age string.
   * Examples: "just now", "3 min ago", "1 hr ago"
   */
  static getRelativeAge(timestamp: string): string {
    const ms = Date.now() - new Date(timestamp).getTime();
    if (isNaN(ms) || ms < 0) return 'just now';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 15) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hr ago' : `${hours} hrs ago`;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private static _isStale(timestamp: string): boolean {
    const ms = Date.now() - new Date(timestamp).getTime();
    return isNaN(ms) ? true : ms > STALE_THRESHOLD_MS;
  }
}
