/**
 * TrailSnapping Service — TG-11
 *
 * Fetches trail polylines from the OSM Overpass API and snaps raw GPS
 * coordinates to the nearest trail segment within a configurable threshold.
 *
 * Flow:
 *   1. loadTrailsAroundLocation(lat, lng) — fetches & caches OSM trails
 *   2. snapToTrail(lat, lng) — projects coordinate onto nearest segment
 *   3. getTrailsGeoJSON() — returns cached trails as GeoJSON for map rendering
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Radius in degrees (~5 km) used as bounding box for Overpass queries. */
const FETCH_RADIUS_DEG = 0.045;

/** Only snap if the nearest point is within this many metres. */
export const DEFAULT_SNAP_THRESHOLD_M = 50;

/** Re-fetch if cached data is older than this (ms). */
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const CACHE_KEY = '@trailguard/trail_cache_v1';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Difficulty categories for display and routing preference. */
export type TrailDifficulty = 'easy' | 'moderate' | 'hard' | 'unknown';

export interface TrailSegment {
  id: string;
  name: string;
  difficulty: TrailDifficulty;
  /** OSM highway / piste / route tag value. */
  trailType: string;
  /** Whether this is a paved/motorised road that should be avoided in routing. */
  isRoad: boolean;
  /** [lng, lat] pairs in WGS-84. */
  coordinates: [number, number][];
  /** Raw OSM tags for advanced filtering. */
  tags: Record<string, string>;
}

export interface SnapResult {
  /** Snapped coordinate [lng, lat]. */
  snappedCoord: [number, number];
  /** Distance in metres from raw GPS to snapped point. */
  distanceMeters: number;
  trail: TrailSegment;
  /** Index of the segment (between coordinates[i] and coordinates[i+1]). */
  segmentIndex: number;
}

interface TrailCache {
  fetchedAt: number;
  centerLat: number;
  centerLng: number;
  segments: TrailSegment[];
}

// ─── Module state ──────────────────────────────────────────────────────────

let cachedSegments: TrailSegment[] = [];
let lastFetchCenter: [number, number] | null = null; // [lat, lng]
let lastFetchAt = 0;
let fetchInFlight = false;

// ─── OSM difficulty mapping ─────────────────────────────────────────────────

function mapDifficulty(tags: Record<string, string>): TrailDifficulty {
  // Snow / ski piste
  const pisteDiff = tags['piste:difficulty'];
  if (pisteDiff) {
    if (['novice', 'easy'].includes(pisteDiff)) return 'easy';
    if (['intermediate'].includes(pisteDiff)) return 'moderate';
    if (['advanced', 'expert', 'freeride', 'extreme'].includes(pisteDiff)) return 'hard';
  }

  // Hiking / SAC scale
  const sacScale = tags['sac_scale'];
  if (sacScale) {
    if (sacScale === 'hiking') return 'easy';
    if (['mountain_hiking', 'demanding_mountain_hiking'].includes(sacScale)) return 'moderate';
    if (['alpine_hiking', 'demanding_alpine_hiking', 'difficult_alpine_hiking'].includes(sacScale)) return 'hard';
  }

  // MTB scale
  const mtbScale = tags['mtb:scale'];
  if (mtbScale) {
    const level = parseInt(mtbScale, 10);
    if (!isNaN(level)) {
      if (level <= 1) return 'easy';
      if (level <= 2) return 'moderate';
      return 'hard';
    }
  }

  // Track surface quality
  const tracktype = tags['tracktype'];
  if (tracktype) {
    if (['grade1', 'grade2'].includes(tracktype)) return 'easy';
    if (tracktype === 'grade3') return 'moderate';
    if (['grade4', 'grade5'].includes(tracktype)) return 'hard';
  }

  // Fallback by highway type
  const highway = tags['highway'] ?? '';
  if (highway === 'footway' || highway === 'cycleway') return 'easy';
  if (highway === 'path') return 'moderate';
  if (highway === 'track') return 'moderate';

  return 'unknown';
}

function isRoadway(tags: Record<string, string>): boolean {
  const highway = tags['highway'] ?? '';
  const pavedClasses = [
    'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
    'unclassified', 'residential', 'service', 'living_street',
    'motorway_link', 'trunk_link', 'primary_link', 'secondary_link',
  ];
  if (pavedClasses.includes(highway)) return true;
  const surface = tags['surface'] ?? '';
  if (['asphalt', 'concrete', 'paved'].includes(surface)) return true;
  return false;
}

// ─── Overpass fetch ─────────────────────────────────────────────────────────

function buildOverpassQuery(south: number, west: number, north: number, east: number): string {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:30];
(
  way["highway"~"^(path|track|footway|cycleway|bridleway)$"](${bbox});
  way["piste:type"](${bbox});
  way["route"~"^(hiking|mtb|bicycle|ski)$"](${bbox});
);
out body;
>;
out skt qt;`;
}

function parseOverpassResponse(data: OverpassResponse): TrailSegment[] {
  // Build node id → coordinate map
  const nodeMap = new Map<number, [number, number]>(); // id → [lng, lat]
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

// ─── Geometry helpers ───────────────────────────────────────────────────────

/** Haversine distance in metres between two WGS-84 points. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

/**
 * Projects point P onto line segment AB.
 * Returns the closest point on the segment and the parametric t (0–1).
 * Works in raw lng/lat space (close enough for short segments).
 */
function projectPointOnSegment(
  pLng: number, pLat: number,
  aLng: number, aLat: number,
  bLng: number, bLat: number,
): { lng: number; lat: number; t: number } {
  const ax = bLng - aLng;
  const ay = bLat - aLat;
  const lenSq = ax * ax + ay * ay;

  if (lenSq === 0) return { lng: aLng, lat: aLat, t: 0 };

  const t = Math.max(0, Math.min(1, ((pLng - aLng) * ax + (pLat - aLat) * ay) / lenSq));
  return {
    lng: aLng + t * ax,
    lat: aLat + t * ay,
    t,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Load (or refresh) trail data around the given coordinate.
 * Results are cached for CACHE_TTL_MS and stored in AsyncStorage.
 */
export async function loadTrailsAroundLocation(lat: number, lng: number): Promise<void> {
  // Use cached data if still fresh and within the existing bbox
  const now = Date.now();
  if (lastFetchCenter && now - lastFetchAt < CACHE_TTL_MS) {
    const [cLat, cLng] = lastFetchCenter;
    if (haversineM(lat, lng, cLat, cLng) < 2_000) {
      return; // Within 2 km of last fetch center and cache is fresh
    }
  }

  if (fetchInFlight) return;
  fetchInFlight = true;

  try {
    const south = lat - FETCH_RADIUS_DEG;
    const north = lat + FETCH_RADIUS_DEG;
    const west = lng - FETCH_RADIUS_DEG;
    const east = lng + FETCH_RADIUS_DEG;

    const query = buildOverpassQuery(south, west, north, east);
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

    const data = (await res.json()) as OverpassResponse;
    const segments = parseOverpassResponse(data);

    cachedSegments = segments;
    lastFetchCenter = [lat, lng];
    lastFetchAt = now;

    const cache: TrailCache = { fetchedAt: now, centerLat: lat, centerLng: lng, segments };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    // On failure, try loading from AsyncStorage
    if (cachedSegments.length === 0) {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cache = JSON.parse(raw) as TrailCache;
          cachedSegments = cache.segments;
          lastFetchCenter = [cache.centerLat, cache.centerLng];
          lastFetchAt = cache.fetchedAt;
        }
      } catch {
        /* ignore */
      }
    }
    console.warn('[TrailSnapping] Overpass fetch failed:', err);
  } finally {
    fetchInFlight = false;
  }
}

/**
 * Snap a raw GPS coordinate to the nearest trail segment.
 * Returns null if no trail is within the threshold.
 *
 * @param lat - Raw GPS latitude
 * @param lng - Raw GPS longitude
 * @param thresholdM - Maximum snap distance in metres (default 50 m)
 */
export function snapToTrail(
  lat: number,
  lng: number,
  thresholdM: number = DEFAULT_SNAP_THRESHOLD_M,
): SnapResult | null {
  if (cachedSegments.length === 0) return null;

  let bestDist = Infinity;
  let bestResult: SnapResult | null = null;

  for (const trail of cachedSegments) {
    // Skip roads when looking for trail snaps
    if (trail.isRoad) continue;

    const coords = trail.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const [aLng, aLat] = coords[i];
      const [bLng, bLat] = coords[i + 1];

      const proj = projectPointOnSegment(lng, lat, aLng, aLat, bLng, bLat);
      const dist = haversineM(lat, lng, proj.lat, proj.lng);

      if (dist < bestDist) {
        bestDist = dist;
        bestResult = {
          snappedCoord: [proj.lng, proj.lat],
          distanceMeters: dist,
          trail,
          segmentIndex: i,
        };
      }
    }
  }

  if (!bestResult || bestDist > thresholdM) return null;
  return bestResult;
}

/**
 * Returns all cached trail segments as a GeoJSON FeatureCollection.
 * Each feature carries difficulty and name properties for map styling.
 */
export function getTrailsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cachedSegments
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

/**
 * Returns the current number of cached trail segments (for debugging/UI).
 */
export function getCachedSegmentCount(): number {
  return cachedSegments.length;
}
