/**
 * PreRideCache — TG-Offline-2
 *
 * Caches all critical group data before leaving cell range.
 * Called from PreRideScreen; loaded by MapScreen when offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { LocationCache } from './LocationCache';
import type { CachedLocation } from './LocationCache';
import { fetchNearbyConditions } from '../api/trailConditions';
import type { TrailConditionReport } from '../api/trailConditions';
import { fetchPOIs } from './poi';
import { getAvalancheGeoJSON } from './avalanche';
import { autoDownloadAroundLocation } from './offlineMaps';

const GROUP_DATA_PREFIX = '@trailguard/preride_group_v1_';
const CONDITIONS_PREFIX = '@trailguard/preride_conditions_v1_';

interface CachedGroupData {
  members: CachedLocation[];
  trailConditions: TrailConditionReport[];
  cachedAt: string;
}

// ─── PreRideCache ───────────────────────────────────────────────────────────

export class PreRideCache {
  /**
   * Cache all group data for offline use.
   * Downloads: member locations, trail conditions, avalanche data, POIs,
   * and triggers an offline map tile download for the surrounding area.
   *
   * @returns Summary of what was cached.
   */
  static async cacheGroupData(
    groupId: string,
    centerLat: number,
    centerLng: number,
  ): Promise<{
    membersCount: number;
    trailConditionsCount: number;
    mapRegionKm2: number;
  }> {
    // ── 1. Member locations from cache ──────────────────────────────────
    const members = await LocationCache.getAllLocations();

    // ── 2. Trail conditions ─────────────────────────────────────────────
    let trailConditions: TrailConditionReport[] = [];
    try {
      trailConditions = await fetchNearbyConditions(centerLat, centerLng, 30000);
    } catch {
      // Use whatever was previously cached
    }

    // ── 3. Avalanche data ───────────────────────────────────────────────
    try {
      await getAvalancheGeoJSON(); // Internally caches to AsyncStorage
    } catch {
      // Non-fatal
    }

    // ── 4. POI data ─────────────────────────────────────────────────────
    try {
      const delta = 0.5;
      await fetchPOIs([
        [centerLng - delta, centerLat - delta],
        [centerLng + delta, centerLat + delta],
      ]);
    } catch {
      // Non-fatal
    }

    // ── 5. Offline map tiles ─────────────────────────────────────────────
    // 50km radius around current location
    const MAP_RADIUS_KM = 50;
    try {
      await autoDownloadAroundLocation(centerLat, centerLng, `preride-${groupId}`);
    } catch {
      // Non-fatal — may already be downloaded or no WiFi
    }

    // ── 6. Persist group snapshot ────────────────────────────────────────
    const snapshot: CachedGroupData = {
      members,
      trailConditions,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(GROUP_DATA_PREFIX + groupId, JSON.stringify(snapshot));
    await AsyncStorage.setItem(CONDITIONS_PREFIX + groupId, JSON.stringify(trailConditions));

    const mapRegionKm2 = Math.PI * MAP_RADIUS_KM * MAP_RADIUS_KM;
    return {
      membersCount: members.length,
      trailConditionsCount: trailConditions.length,
      mapRegionKm2: Math.round(mapRegionKm2),
    };
  }

  /**
   * Load cached group data when offline.
   * Returns null if no cached data exists for this group.
   */
  static async loadGroupData(groupId: string): Promise<{
    members: CachedLocation[];
    trailConditions: TrailConditionReport[];
  } | null> {
    try {
      const raw = await AsyncStorage.getItem(GROUP_DATA_PREFIX + groupId);
      if (!raw) return null;
      const data = JSON.parse(raw) as CachedGroupData;
      return {
        members: data.members,
        trailConditions: data.trailConditions,
      };
    } catch {
      return null;
    }
  }

  /** When the pre-ride cache was last populated, or null if never. */
  static async getCacheAge(groupId: string): Promise<Date | null> {
    try {
      const raw = await AsyncStorage.getItem(GROUP_DATA_PREFIX + groupId);
      if (!raw) return null;
      const data = JSON.parse(raw) as CachedGroupData;
      return new Date(data.cachedAt);
    } catch {
      return null;
    }
  }
}
