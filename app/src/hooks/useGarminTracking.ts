/**
 * useGarminTracking.ts
 *
 * React hook that manages real-time polling of a rider's Garmin inReach
 * satellite GPS via the MapShare API.
 *
 * Usage:
 *   const { garminLocation, isPolling, mapshareId, lastUpdated, error } = useGarminTracking();
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { garminService, type GarminLocation } from '../services/GarminService';

const STORAGE_KEY = 'garmin_mapshare_id';

export interface UseGarminTrackingResult {
  /** Latest inReach location, or null if not yet received. */
  garminLocation: GarminLocation | null;
  /** True while actively polling the MapShare API. */
  isPolling: boolean;
  /** The configured MapShare ID, or null if not set. */
  mapshareId: string | null;
  /** Timestamp of the last successful location update. */
  lastUpdated: Date | null;
  /** Error message if the last fetch failed. */
  error: string | null;
  /** Manually refresh the location. */
  refresh: () => Promise<void>;
}

export function useGarminTracking(): UseGarminTrackingResult {
  const [garminLocation, setGarminLocation] = useState<GarminLocation | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [mapshareId, setMapshareId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef(false);

  // Load saved MapShare ID on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setMapshareId(stored);
      })
      .catch(() => {});
  }, []);

  // Start/stop polling when mapshareId changes
  useEffect(() => {
    if (!mapshareId) {
      garminService.stopPolling();
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setError(null);
    pollingRef.current = true;

    garminService.startPolling(mapshareId, (loc) => {
      if (!pollingRef.current) return;
      setGarminLocation(loc);
      setLastUpdated(new Date());
      setError(null);
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Failed to reach Garmin MapShare';
      setError(msg);
      setIsPolling(false);
    });

    return () => {
      pollingRef.current = false;
      garminService.stopPolling();
      setIsPolling(false);
    };
  }, [mapshareId]);

  const refresh = useCallback(async () => {
    if (!mapshareId) return;
    try {
      setError(null);
      const loc = await garminService.fetchLocation(mapshareId);
      if (loc) {
        setGarminLocation(loc);
        setLastUpdated(new Date());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    }
  }, [mapshareId]);

  return {
    garminLocation,
    isPolling,
    mapshareId,
    lastUpdated,
    error,
    refresh,
  };
}
