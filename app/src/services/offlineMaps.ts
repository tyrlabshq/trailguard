/**
 * Offline Maps Service
 * Manages Mapbox offline region downloads using @rnmapbox/maps
 */

import MapboxGL from '@rnmapbox/maps';
import NetInfo from '@react-native-community/netinfo';

// Import OfflinePack type from the module
import type OfflinePack from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflinePack';

export type { OfflinePack };

export interface OfflineRegion {
  name: string;
  bounds: [[number, number], [number, number]]; // [sw, ne]
  minZoom: number;
  maxZoom: number;
  styleURL: string;
}

// Preset regions (snowmobile destinations)
export const PRESET_REGIONS: Array<{ label: string; region: OfflineRegion }> = [
  {
    label: 'UP Michigan — Keweenaw',
    region: {
      name: 'up-michigan-keweenaw',
      bounds: [[-89.0, 46.5], [-87.5, 47.5]],
      minZoom: 8,
      maxZoom: 15,
      styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    },
  },
  {
    label: 'UP Michigan — Marquette',
    region: {
      name: 'up-michigan-marquette',
      bounds: [[-88.0, 46.0], [-87.0, 46.8]],
      minZoom: 8,
      maxZoom: 15,
      styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    },
  },
  {
    label: 'Yellowstone NP',
    region: {
      name: 'yellowstone',
      bounds: [[-111.2, 44.1], [-109.8, 45.1]],
      minZoom: 8,
      maxZoom: 14,
      styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    },
  },
  {
    label: 'West Yellowstone',
    region: {
      name: 'west-yellowstone',
      bounds: [[-111.3, 44.5], [-110.8, 44.9]],
      minZoom: 8,
      maxZoom: 15,
      styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    },
  },
  {
    label: 'Traverse City, MI',
    region: {
      name: 'traverse-city',
      bounds: [[-85.9, 44.5], [-85.3, 45.0]],
      minZoom: 8,
      maxZoom: 15,
      styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    },
  },
  {
    label: 'Gaylord, MI',
    region: {
      name: 'gaylord',
      bounds: [[-84.9, 44.8], [-84.4, 45.2]],
      minZoom: 8,
      maxZoom: 15,
      styleURL: 'mapbox://styles/mapbox/outdoors-v12',
    },
  },
];

// Rough size estimate: tile count × ~15KB per tile
export function estimateSizeMB(bounds: [[number, number], [number, number]], minZoom: number, maxZoom: number): number {
  const [sw, ne] = bounds;
  let totalTiles = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const tilesX = Math.ceil((ne[0] - sw[0]) / (360 / Math.pow(2, z)));
    const tilesY = Math.ceil((ne[1] - sw[1]) / (180 / Math.pow(2, z - 1)));
    totalTiles += Math.max(1, tilesX) * Math.max(1, tilesY);
  }
  return Math.round((totalTiles * 15_000) / 1_048_576 * 10) / 10;
}

/**
 * Start downloading an offline region.
 * onProgress called with 0-100 percentage.
 */
export async function downloadRegion(
  region: OfflineRegion,
  onProgress: (pct: number) => void,
): Promise<void> {
  const offlineMgr = MapboxGL.offlineManager;

  // Delete old pack with same name if exists
  const existing = await offlineMgr.getPack(region.name).catch(() => undefined);
  if (existing) {
    await offlineMgr.deletePack(region.name).catch(() => {});
  }

  return new Promise((resolve, reject) => {
    offlineMgr.createPack(
      {
        name: region.name,
        styleURL: region.styleURL,
        bounds: region.bounds,
        minZoom: region.minZoom,
        maxZoom: region.maxZoom,
      },
      (_pack, status) => {
        if (!status) return;
        onProgress(status.percentage ?? 0);
        // State 2 = Complete in Mapbox SDK
        if (status.state === (MapboxGL.OfflinePackDownloadState.Complete as number)) {
          resolve();
        }
      },
      (_pack, err) => {
        reject(new Error(err?.message ?? 'Download failed'));
      },
    );
  });
}

export async function listDownloadedRegions(): Promise<OfflinePack[]> {
  try {
    return (await MapboxGL.offlineManager.getPacks()) ?? [];
  } catch {
    return [];
  }
}

export async function deleteRegion(name: string): Promise<void> {
  await MapboxGL.offlineManager.deletePack(name);
}

/** Returns true if device is on WiFi */
export async function isOnWifi(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === 'wifi' && (state.isConnected ?? false);
}

/**
 * Auto-download 50km-radius region around a coordinate when on WiFi.
 * 1° lat ≈ 111km.
 */
export async function autoDownloadAroundLocation(
  lat: number,
  lng: number,
  label = 'auto-current-location',
): Promise<void> {
  const wifi = await isOnWifi();
  if (!wifi) return;

  const deltaLat = 50 / 111;
  const deltaLng = 50 / (111 * Math.cos((lat * Math.PI) / 180));

  const region: OfflineRegion = {
    name: label,
    bounds: [
      [lng - deltaLng, lat - deltaLat],
      [lng + deltaLng, lat + deltaLat],
    ],
    minZoom: 8,
    maxZoom: 14,
    styleURL: 'mapbox://styles/mapbox/outdoors-v12',
  };

  await downloadRegion(region, () => {});
}
