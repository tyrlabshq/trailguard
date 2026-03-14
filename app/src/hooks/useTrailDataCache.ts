/**
 * useTrailDataCache — React hook for offline trail data management.
 *
 * Provides:
 *   - downloadArea(): trigger download of trail data for current location
 *   - isDownloading / downloadProgress: download state
 *   - cachedArea: metadata for the cached area covering current location (null if none)
 *   - offlineTrails / offlineConditions: cached data loaded when offline
 *   - isServingCached: true when showing cached data (offline fallback active)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  downloadTrailArea,
  isLocationCached,
  loadNearestCachedArea,
  segmentsToGeoJSON,
  type CachedAreaMeta,
  DEFAULT_DOWNLOAD_RADIUS_M,
} from '../services/TrailDataCache';
import type { TrailConditionReport } from '../api/trailConditions';
import type { ConnectivityTier } from './useConnectivity';

export interface TrailDataCacheState {
  /** Whether a download is currently in progress. */
  isDownloading: boolean;
  /** Download progress 0–1. */
  downloadProgress: number;
  /** Metadata for the cached area covering the current location, or null. */
  cachedArea: CachedAreaMeta | null;
  /** True when displaying cached data as an offline fallback. */
  isServingCached: boolean;
  /** Cached trail GeoJSON (available when serving cached data). */
  offlineTrailsGeoJSON: GeoJSON.FeatureCollection | null;
  /** Cached condition reports (available when serving cached data). */
  offlineConditions: TrailConditionReport[] | null;
  /** Download trail data for the given location. */
  downloadArea: (lat: number, lng: number, label?: string) => Promise<void>;
  /** Error message from last download attempt, or null. */
  downloadError: string | null;
}

export function useTrailDataCache(
  userLat: number | null,
  userLng: number | null,
  connectivityTier: ConnectivityTier,
): TrailDataCacheState {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [cachedArea, setCachedArea] = useState<CachedAreaMeta | null>(null);
  const [isServingCached, setIsServingCached] = useState(false);
  const [offlineTrailsGeoJSON, setOfflineTrailsGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [offlineConditions, setOfflineConditions] = useState<TrailConditionReport[] | null>(null);

  // Check if current location is within a cached area
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    isLocationCached(userLat, userLng).then(setCachedArea).catch(() => {});
  }, [userLat, userLng]);

  // When offline and we have a cached area, load the cached data
  useEffect(() => {
    if (connectivityTier === 'online') {
      setIsServingCached(false);
      setOfflineTrailsGeoJSON(null);
      setOfflineConditions(null);
      return;
    }

    if (userLat == null || userLng == null) return;

    loadNearestCachedArea(userLat, userLng).then((data) => {
      if (data) {
        setIsServingCached(true);
        setOfflineTrailsGeoJSON(segmentsToGeoJSON(data.segments));
        setOfflineConditions(data.conditions);
      }
    }).catch(() => {});
  }, [connectivityTier, userLat, userLng]);

  const downloadArea = useCallback(async (lat: number, lng: number, label?: string) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      const meta = await downloadTrailArea(
        lat,
        lng,
        label ?? 'My Area',
        DEFAULT_DOWNLOAD_RADIUS_M,
        setDownloadProgress,
      );
      setCachedArea(meta);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setDownloadError(msg);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return {
    isDownloading,
    downloadProgress,
    cachedArea,
    isServingCached,
    offlineTrailsGeoJSON,
    offlineConditions,
    downloadArea,
    downloadError,
  };
}
