/**
 * TrailDataCache — TG-Offline-3
 *
 * Persistent offline cache for trail GeoJSON geometry and condition reports.
 * Users can explicitly download trail data for an area before heading out.
 *
 * Storage strategy:
 *   - Trail GeoJSON segments stored in AsyncStorage (keyed by area ID)
 *   - Trail condition reports stored alongside
 *   - Metadata index tracks all cached areas with timestamps
 *
 * Unlike the ephemeral TrailSnapping cache (30-min TTL, small radius),
 * this cache persists until the user explicitly deletes it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrailConditionReport } from '../api/trailConditions';
import { fetchNearbyConditions } from '../api/trailConditions';
import type { TrailSegment } from './TrailSnapping';

// ─── Constants ──────────────────────────────────────────────────────────────

const INDEX_KEY = '@trailguard/trail_offline_index_v1';
const AREA_PREFIX = '@trailguard/trail_offline_area_v1_';

/** Default download radius in metres (15 km). */
export const DEFAULT_DOWNLOAD_RADIUS_M = 15_000;

/** Overpass API endpoint. */
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CachedAreaMeta {
  /** Unique ID for this cached area. */
  id: string;
  /** Human-readable label (e.g. "Keweenaw Trails"). */
  label: string;
  /** Center latitude. */
  lat: number;
  /** Center longitude. */
  lng: number;
  /** Download radius in metres. */
  radiusM: number;
  /** ISO timestamp when this area was cached. */
  cachedAt: string;
  /** Number of trail segments stored. */
  segmentCount: number;
  /** Number of condition reports stored. */
  conditionCount: number;
}

interface CachedAreaData {
  meta: CachedAreaMeta;
  segments: TrailSegment[];
  conditions: TrailConditionReport[];
}

// ─── Overpass helpers (mirrored from TrailSnapping, scoped to larger radius) ─

function buildOverpassQuery(south: number, west: number, north: number, east: number): string {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:60];
(
  way["highway"~"^(path|track|footway|cycleway|bridleway)$"](${bbox});
  way["piste:type"](${bbox});
  way["route"~"^(hiking|mtb|bicycle|ski)$"](${bbox});
);
out body;
>;
out skt qt;`;
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

type OverpassElement = OverpassNode | OverpassWay;

interface OverpassResponse {
  elements: OverpassElement[];
}

type TrailDifficulty = 'easy' | 'moderate' | 'hard' | 'unknown';

function mapDifficulty(tags: Record<string, string>): TrailDifficulty {
  const pisteDiff = tags['piste:difficulty'];
  if (pisteDiff) {
    if (['novice', 'easy'].includes(pisteDiff)) return 'easy';
    if (['intermediate'].includes(pisteDiff)) return 'moderate';
    if (['advanced', 'expert', 'freeride', 'extreme'].includes(pisteDiff)) return 'hard';
  }
  const sacScale = tags['sac_scale'];
  if (sacScale) {
    if (sacScale === 'hiking') return 'easy';
    if (['mountain_hiking', 'demanding_mountain_hiking'].includes(sacScale)) return 'moderate';
    return 'hard';
  }
  const mtbScale = tags['mtb:scale'];
  if (mtbScale) {
    const level = parseInt(mtbScale, 10);
    if (!isNaN(level)) {
      if (level <= 1) return 'easy';
      if (level <= 2) return 'moderate';
      return 'hard';
    }
  }
  const highway = tags['highway'] ?? '';
  if (highway === 'footway' || highway === 'cycleway') return 'easy';
  if (highway === 'path' || highway === 'track') return 'moderate';
  return 'unknown';
}

function isRoadway(tags: Record<string, string>): boolean {
  const highway = tags['highway'] ?? '';
  const pavedClasses = [
    'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
    'unclassified', 'residential', 'service', 'living_street',
  ];
  if (pavedClasses.includes(highway)) return true;
  const surface = tags['surface'] ?? '';
  return ['asphalt', 'concrete', 'paved'].includes(surface);
}

function parseOverpassResponse(data: OverpassResponse): TrailSegment[] {
  const nodeMap = new Map<number, [number, number]>();
  for (const el of data.elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, [el.lon, el.lat]);
    }
  }

  const segments: TrailSegment[] = [];
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.nodes || el.nodes.length < 2) continue;
    const tags = el.tags ?? {};
    const coords: [number, number][] = [];
    for (const nodeId of el.nodes) {
      const coord = nodeMap.get(nodeId);
      if (coord) coords.push(coord);
    }
    if (coords.length < 2) continue;
    segments.push({
      id: String(el.id),
      name: tags['name'] ?? tags['ref'] ?? tags['piste:name'] ?? 'Trail',
      difficulty: mapDifficulty(tags),
      trailType: tags['highway'] ?? tags['piste:type'] ?? tags['route'] ?? 'trail',
      isRoad: isRoadway(tags),
      coordinates: coords,
      tags,
    });
  }
  return segments;
}

// ─── Radius → degree conversion ─────────────────────────────────────────────

function metresToDegrees(meters: number, lat: number): { dLat: number; dLng: number } {
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLng };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a deterministic area ID from lat/lng/radius.
 */
function makeAreaId(lat: number, lng: number, radiusM: number): string {
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;
  return `area_${rLat}_${rLng}_${radiusM}`;
}

/**
 * Download trail GeoJSON and conditions for an area and cache locally.
 *
 * @param lat Center latitude
 * @param lng Center longitude
 * @param label Human-readable name for this area
 * @param radiusM Download radius in metres (default 15 km)
 * @param onProgress Optional progress callback (0–1)
 */
export async function downloadTrailArea(
  lat: number,
  lng: number,
  label: string,
  radiusM: number = DEFAULT_DOWNLOAD_RADIUS_M,
  onProgress?: (progress: number) => void,
): Promise<CachedAreaMeta> {
  const areaId = makeAreaId(lat, lng, radiusM);

  onProgress?.(0.05);

  // 1. Fetch trail segments from Overpass
  const { dLat, dLng } = metresToDegrees(radiusM, lat);
  const south = lat - dLat;
  const north = lat + dLat;
  const west = lng - dLng;
  const east = lng + dLng;

  const query = buildOverpassQuery(south, west, north, east);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass fetch failed: HTTP ${res.status}`);
  onProgress?.(0.5);

  const data = (await res.json()) as OverpassResponse;
  const segments = parseOverpassResponse(data);
  onProgress?.(0.65);

  // 2. Fetch trail conditions for the area
  let conditions: TrailConditionReport[] = [];
  try {
    conditions = await fetchNearbyConditions(lat, lng, radiusM);
  } catch {
    // Non-fatal — trail geometry is the critical part
  }
  onProgress?.(0.8);

  // 3. Build cache entry
  const meta: CachedAreaMeta = {
    id: areaId,
    label,
    lat,
    lng,
    radiusM,
    cachedAt: new Date().toISOString(),
    segmentCount: segments.length,
    conditionCount: conditions.length,
  };

  const areaData: CachedAreaData = { meta, segments, conditions };

  // 4. Write area data to AsyncStorage
  await AsyncStorage.setItem(AREA_PREFIX + areaId, JSON.stringify(areaData));

  // 5. Update index
  const index = await loadIndex();
  // Remove any existing entry for this area
  const filtered = index.filter((m) => m.id !== areaId);
  filtered.push(meta);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(filtered));

  onProgress?.(1.0);
  return meta;
}

/**
 * Load cached trail data for an area.
 * Returns null if no cached data exists.
 */
export async function loadCachedArea(areaId: string): Promise<CachedAreaData | null> {
  try {
    const raw = await AsyncStorage.getItem(AREA_PREFIX + areaId);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAreaData;
  } catch {
    return null;
  }
}

/**
 * Load cached trail data for the nearest cached area to the given coordinates.
 * Returns null if no cached area covers this location.
 */
export async function loadNearestCachedArea(
  lat: number,
  lng: number,
): Promise<CachedAreaData | null> {
  const index = await loadIndex();
  if (index.length === 0) return null;

  // Find the nearest area whose radius covers the given location
  let bestArea: CachedAreaMeta | null = null;
  let bestDist = Infinity;

  for (const area of index) {
    const dist = haversineM(lat, lng, area.lat, area.lng);
    if (dist <= area.radiusM && dist < bestDist) {
      bestDist = dist;
      bestArea = area;
    }
  }

  if (!bestArea) return null;
  return loadCachedArea(bestArea.id);
}

/**
 * List all cached areas (metadata only).
 */
export async function listCachedAreas(): Promise<CachedAreaMeta[]> {
  return loadIndex();
}

/**
 * Delete a cached area.
 */
export async function deleteCachedArea(areaId: string): Promise<void> {
  await AsyncStorage.removeItem(AREA_PREFIX + areaId);
  const index = await loadIndex();
  const filtered = index.filter((m) => m.id !== areaId);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(filtered));
}

/**
 * Check if a location is within any cached area.
 */
export async function isLocationCached(lat: number, lng: number): Promise<CachedAreaMeta | null> {
  const index = await loadIndex();
  for (const area of index) {
    const dist = haversineM(lat, lng, area.lat, area.lng);
    if (dist <= area.radiusM) return area;
  }
  return null;
}

/**
 * Refresh conditions for a cached area (re-downloads conditions only, not geometry).
 */
export async function refreshCachedConditions(areaId: string): Promise<void> {
  const areaData = await loadCachedArea(areaId);
  if (!areaData) return;

  try {
    const conditions = await fetchNearbyConditions(
      areaData.meta.lat,
      areaData.meta.lng,
      areaData.meta.radiusM,
    );
    areaData.conditions = conditions;
    areaData.meta.conditionCount = conditions.length;
    areaData.meta.cachedAt = new Date().toISOString();
    await AsyncStorage.setItem(AREA_PREFIX + areaId, JSON.stringify(areaData));

    // Update index
    const index = await loadIndex();
    const idx = index.findIndex((m) => m.id === areaId);
    if (idx >= 0) {
      index[idx] = areaData.meta;
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
    }
  } catch {
    // Non-fatal — keep existing conditions
  }
}

/**
 * Convert cached trail segments to GeoJSON FeatureCollection for map rendering.
 */
export function segmentsToGeoJSON(segments: TrailSegment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments
      .filter((s) => !s.isRoad)
      .map((segment) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: segment.coordinates,
        },
        properties: {
          id: segment.id,
          name: segment.name,
          difficulty: segment.difficulty,
          trailType: segment.trailType,
        },
      })),
  };
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function loadIndex(): Promise<CachedAreaMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CachedAreaMeta[];
  } catch {
    return [];
  }
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
