/**
 * Points of Interest Service
 * Fetches fuel stops, parking, and warming huts from OSM Overpass API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_PREFIX = 'poi_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type POIType = 'fuel' | 'parking' | 'warming_hut';

export interface POI {
  id: string;
  type: POIType;
  lat: number;
  lng: number;
  name: string;
  icon: string;
}

const POI_ICONS: Record<POIType, string> = {
  fuel: '⛽',
  parking: '🅿️',
  warming_hut: '🛖',
};

const POI_COLORS: Record<POIType, string> = {
  fuel: '#ffdd00',
  parking: '#44aaff',
  warming_hut: '#ff8844',
};

export { POI_COLORS, POI_ICONS };

function buildQuery(bbox: [number, number, number, number]): string {
  const [s, w, n, e] = bbox;
  return `
[out:json][timeout:25];
(
  node["amenity"="fuel"](${s},${w},${n},${e});
  node["amenity"="parking"](${s},${w},${n},${e});
  node["tourism"="wilderness_hut"](${s},${w},${n},${e});
  node["amenity"="shelter"](${s},${w},${n},${e});
  node["leisure"="sports_centre"]["sport"="snowmobile"](${s},${w},${n},${e});
);
out body;
`;
}

function osmTypeMap(tags: Record<string, string>): POIType {
  if (tags.amenity === 'fuel') return 'fuel';
  if (tags.amenity === 'parking') return 'parking';
  return 'warming_hut';
}

export async function fetchPOIs(
  bounds: [[number, number], [number, number]], // [sw, ne]
): Promise<POI[]> {
  const [sw, ne] = bounds;
  const bbox: [number, number, number, number] = [sw[1], sw[0], ne[1], ne[0]];
  const cacheKey = `${CACHE_PREFIX}${bbox.join('_')}`;

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data, fetchedAt } = JSON.parse(cached);
      if (Date.now() - fetchedAt < CACHE_TTL_MS) return data;
    }
  } catch {}

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(buildQuery(bbox))}`,
    });
    const json = await res.json();
    const pois: POI[] = (json.elements ?? [])
      .filter((el: any) => el.type === 'node' && el.lat != null)
      .map((el: any): POI => {
        const poiType = osmTypeMap(el.tags ?? {});
        return {
          id: String(el.id),
          type: poiType,
          lat: el.lat,
          lng: el.lon,
          name: el.tags?.name ?? el.tags?.amenity ?? poiType,
          icon: POI_ICONS[poiType],
        };
      });

    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: pois, fetchedAt: Date.now() }));
    return pois;
  } catch {
    // Network unavailable — try stale cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached).data;
    } catch {}
    return [];
  }
}
