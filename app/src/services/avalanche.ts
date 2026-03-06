/**
 * Avalanche Forecast Service
 * Pulls zone data from avalanche.org AAIC API, caches for offline use.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'avalanche_geojson_cache';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

// avalanche.org public GeoJSON endpoint for all US forecast zones
const AAIC_URL = 'https://api.avalanche.org/v2/public/avalanche-center/forecast/zone/all';

export type DangerLevel = 'Low' | 'Moderate' | 'Considerable' | 'High' | 'Extreme' | 'Unknown';

export const DANGER_COLORS: Record<DangerLevel, string> = {
  Low: '#00cc44',
  Moderate: '#ffdd00',
  Considerable: '#ff8800',
  High: '#ff2200',
  Extreme: '#1a1a1a',
  Unknown: '#444466',
};

export const DANGER_FILL_OPACITY = 0.35;

export interface AvalancheGeoJSON {
  type: 'FeatureCollection';
  features: AvalancheFeature[];
  fetchedAt: number;
}

export interface AvalancheFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: {
    name: string;
    danger: DangerLevel;
    color: string;
    fillOpacity: number;
    link?: string;
  };
}

function parseDanger(raw: string | number | null | undefined): DangerLevel {
  if (raw === null || raw === undefined) return 'Unknown';
  const n = typeof raw === 'number' ? raw : parseInt(raw as string, 10);
  if (n === 1) return 'Low';
  if (n === 2) return 'Moderate';
  if (n === 3) return 'Considerable';
  if (n === 4) return 'High';
  if (n === 5) return 'Extreme';
  const s = (raw as string).toString();
  if (s in DANGER_COLORS) return s as DangerLevel;
  return 'Unknown';
}

/** Fetch from network and update cache */
async function fetchFresh(): Promise<AvalancheGeoJSON> {
  const res = await fetch(AAIC_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`avalanche.org returned ${res.status}`);
  const raw = await res.json();

  // The API returns an array of forecast zone objects
  const zones: any[] = Array.isArray(raw) ? raw : (raw.data ?? raw.features ?? []);

  const features: AvalancheFeature[] = zones
    .filter((z: any) => z.area?.geometry)
    .map((z: any) => {
      const maxDanger = parseDanger(
        z.forecast?.danger?.[0]?.lower ??
        z.danger_rating?.level ??
        z.danger_level ??
        null,
      );
      return {
        type: 'Feature',
        geometry: z.area.geometry,
        properties: {
          name: z.area?.name ?? 'Unknown Zone',
          danger: maxDanger,
          color: DANGER_COLORS[maxDanger],
          fillOpacity: DANGER_FILL_OPACITY,
          link: z.url,
        },
      };
    });

  const geojson: AvalancheGeoJSON = {
    type: 'FeatureCollection',
    features,
    fetchedAt: Date.now(),
  };

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(geojson));
  return geojson;
}

/** Load from cache */
async function loadCache(): Promise<AvalancheGeoJSON | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AvalancheGeoJSON;
  } catch {
    return null;
  }
}

/**
 * Get avalanche zone GeoJSON — fresh if online, cached if offline.
 * Returns null only if no cache and network unavailable.
 */
export async function getAvalancheGeoJSON(): Promise<AvalancheGeoJSON | null> {
  // Try fresh data first
  try {
    return await fetchFresh();
  } catch {
    // Network unavailable — fall back to cache
    const cached = await loadCache();
    if (cached) return cached;
    return null;
  }
}

export function cacheAge(geojson: AvalancheGeoJSON): string {
  const ageMs = Date.now() - geojson.fetchedAt;
  const ageMin = Math.floor(ageMs / 60_000);
  if (ageMin < 60) return `${ageMin}m ago`;
  return `${Math.floor(ageMin / 60)}h ago`;
}
