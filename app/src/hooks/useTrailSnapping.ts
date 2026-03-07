/**
 * useTrailSnapping — TG-11
 *
 * React hook that ties the TrailSnapping service to the map's user location.
 *
 * Usage:
 *   const { snappedCoord, activeTrail, snapEnabled, setSnapEnabled } = useTrailSnapping(userCoords);
 *
 * When `snapEnabled` is true and `userCoords` is set, the hook:
 *   1. Triggers trail data refresh around the user position
 *   2. Returns the snapped coordinate (or raw coord if no trail nearby)
 *   3. Returns the active TrailSegment metadata for display
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadTrailsAroundLocation,
  snapToTrail,
  DEFAULT_SNAP_THRESHOLD_M,
  type TrailSegment,
} from '../services/TrailSnapping';

// Re-fetch trail data when the user moves at least this far (metres).
const REFETCH_DISTANCE_M = 2_000;

interface UseTrailSnappingResult {
  /** Snapped coordinate [lng, lat], or raw userCoords if snap is off / no trail nearby. */
  snappedCoord: [number, number] | null;
  /** The trail the user is currently snapped to (null if off-trail). */
  activeTrail: TrailSegment | null;
  /** Distance in metres from raw GPS to snapped point (null if off-trail). */
  snapDistanceM: number | null;
  /** Whether snap-to-trail is currently enabled. */
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  /** True while trail data is being fetched from Overpass. */
  isLoading: boolean;
}

export function useTrailSnapping(
  userCoords: [number, number] | null, // [lng, lat]
): UseTrailSnappingResult {
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snappedCoord, setSnappedCoord] = useState<[number, number] | null>(null);
  const [activeTrail, setActiveTrail] = useState<TrailSegment | null>(null);
  const [snapDistanceM, setSnapDistanceM] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track last fetch position to avoid redundant Overpass calls
  const lastFetchCoord = useRef<[number, number] | null>(null); // [lng, lat]

  // Haversine for hook-internal use
  const haversine = useCallback((a: [number, number], b: [number, number]): number => {
    const R = 6_371_000;
    const [lng1, lat1] = a;
    const [lng2, lat2] = b;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }, []);

  useEffect(() => {
    if (!userCoords) {
      setSnappedCoord(null);
      setActiveTrail(null);
      setSnapDistanceM(null);
      return;
    }

    const [lng, lat] = userCoords;

    // Decide whether to refetch trail data
    const shouldFetch =
      !lastFetchCoord.current ||
      haversine(userCoords, lastFetchCoord.current) > REFETCH_DISTANCE_M;

    if (shouldFetch) {
      lastFetchCoord.current = userCoords;
      setIsLoading(true);
      loadTrailsAroundLocation(lat, lng).finally(() => setIsLoading(false));
    }

    if (!snapEnabled) {
      // Pass-through mode — return raw coords
      setSnappedCoord(userCoords);
      setActiveTrail(null);
      setSnapDistanceM(null);
      return;
    }

    // Attempt to snap
    const result = snapToTrail(lat, lng, DEFAULT_SNAP_THRESHOLD_M);
    if (result) {
      setSnappedCoord(result.snappedCoord);
      setActiveTrail(result.trail);
      setSnapDistanceM(result.distanceMeters);
    } else {
      // Off-trail — show raw GPS
      setSnappedCoord(userCoords);
      setActiveTrail(null);
      setSnapDistanceM(null);
    }
  }, [userCoords, snapEnabled, haversine]);

  return {
    snappedCoord,
    activeTrail,
    snapDistanceM,
    snapEnabled,
    setSnapEnabled,
    isLoading,
  };
}
