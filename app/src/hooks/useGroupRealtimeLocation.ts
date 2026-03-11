/**
 * useGroupRealtimeLocation — Live group location sharing via Supabase Realtime
 *
 * Broadcasts this rider's lat/lng/heading every 5 seconds on:
 *   channel: group-location:{group_id}
 *   event:   location
 *   payload: { userId, displayName, lat, lng, heading, timestamp }
 *
 * Receives other members' locations and exposes them as a Map keyed by userId.
 *
 * Only active when:
 *   - rideActive is true
 *   - App is in the foreground (AppState === 'active')
 *
 * Automatically unsubscribes when:
 *   - rideActive becomes false (END RIDE)
 *   - App moves to background
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface RealtimeMemberLocation {
  userId: string;
  /** Human-readable display name (full name or fallback to userId). */
  displayName: string;
  lat: number;
  lng: number;
  /** Degrees clockwise from north, undefined if not available. */
  heading?: number;
  /** ISO timestamp of when the location was recorded. */
  timestamp: string;
}

// ─── Internal payload shape ───────────────────────────────────────────────────

interface LocationPayload {
  userId: string;
  displayName: string;
  lat: number;
  lng: number;
  heading?: number;
  timestamp: string;
}

// ─── Hook interface ───────────────────────────────────────────────────────────

export interface UseGroupRealtimeLocationOptions {
  /** The active group ID — null when not in a group. */
  groupId: string | null;
  /** True when a ride is in progress (between START RIDE and END RIDE). */
  rideActive: boolean;
  /** Authenticated user ID from Supabase auth. */
  userId: string | null;
  /** User's display name shown on other riders' maps. */
  displayName: string | null;
}

export interface UseGroupRealtimeLocationResult {
  /**
   * Map of userId → location for all OTHER group members.
   * Cleared on unsubscribe (ride end / background).
   */
  realtimeMembers: Map<string, RealtimeMemberLocation>;
  /**
   * Call this whenever you receive a user location update.
   * The hook accumulates the latest coords and broadcasts every 5 seconds.
   */
  broadcastLocation: (lat: number, lng: number, heading?: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BROADCAST_INTERVAL_MS = 5_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGroupRealtimeLocation({
  groupId,
  rideActive,
  userId,
  displayName,
}: UseGroupRealtimeLocationOptions): UseGroupRealtimeLocationResult {
  const [realtimeMembers, setRealtimeMembers] = useState<Map<string, RealtimeMemberLocation>>(
    new Map(),
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number; heading?: number } | null>(null);
  const subscribedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Keep displayName accessible inside interval callback without re-creating it
  const displayNameRef = useRef<string | null>(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);
  const userIdRef = useRef<string | null>(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // ── Location accumulator ──────────────────────────────────────────────────

  /**
   * Called by MapScreen on every GPS fix. Stores the latest coords so the
   * 5-second interval always broadcasts the most recent position.
   */
  const broadcastLocation = useCallback((lat: number, lng: number, heading?: number) => {
    lastLocationRef.current = { lat, lng, heading };
  }, []);

  // ── Send a single broadcast frame ─────────────────────────────────────────

  const sendBroadcast = useCallback(() => {
    const channel = channelRef.current;
    const loc = lastLocationRef.current;
    const uid = userIdRef.current;
    if (!channel || !loc || !uid) return;

    const payload: LocationPayload = {
      userId: uid,
      displayName: displayNameRef.current ?? uid,
      lat: loc.lat,
      lng: loc.lng,
      heading: loc.heading,
      timestamp: new Date().toISOString(),
    };

    channel
      .send({
        type: 'broadcast',
        event: 'location',
        payload,
      })
      .catch(() => {
        // Best-effort — Realtime will reconnect automatically
      });
  }, []);

  // ── Channel subscribe / unsubscribe ───────────────────────────────────────

  const subscribe = useCallback(() => {
    if (!groupId || !rideActive || subscribedRef.current) return;

    const channelName = `group-location:${groupId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Receive other riders' location pings
    channel.on('broadcast', { event: 'location' }, ({ payload }) => {
      if (!payload?.userId) return;

      const loc: RealtimeMemberLocation = {
        userId: payload.userId as string,
        displayName: (payload.displayName as string | undefined) ?? (payload.userId as string),
        lat: payload.lat as number,
        lng: payload.lng as number,
        heading: payload.heading as number | undefined,
        timestamp: (payload.timestamp as string | undefined) ?? new Date().toISOString(),
      };

      setRealtimeMembers((prev) => {
        const next = new Map(prev);
        next.set(loc.userId, loc);
        return next;
      });
    });

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;

      // Start the 5-second broadcast interval
      if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
      broadcastTimerRef.current = setInterval(sendBroadcast, BROADCAST_INTERVAL_MS);

      // Immediate first ping so others see us right away
      sendBroadcast();
    });

    channelRef.current = channel;
    subscribedRef.current = true;
  }, [groupId, rideActive, sendBroadcast]);

  const unsubscribe = useCallback(() => {
    if (!subscribedRef.current) return;

    // Stop broadcast timer
    if (broadcastTimerRef.current) {
      clearInterval(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }

    // Remove Realtime channel
    const channel = channelRef.current;
    if (channel) {
      supabase.removeChannel(channel).catch(() => {});
      channelRef.current = null;
    }

    subscribedRef.current = false;
    // Clear stale member positions so the map is clean on re-join
    setRealtimeMembers(new Map());
  }, []);

  // ── React to ride active / groupId changes ────────────────────────────────

  useEffect(() => {
    if (rideActive && appStateRef.current === 'active') {
      subscribe();
    } else {
      unsubscribe();
    }

    return () => {
      unsubscribe();
    };
  // Re-run when ride starts/ends or the group changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideActive, groupId]);

  // ── AppState listener — pause while backgrounded ──────────────────────────

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appStateRef.current = nextState;

      if (nextState !== 'active') {
        // App moved to background — unsubscribe to save battery & quota
        unsubscribe();
      } else if (rideActive && groupId) {
        // App returned to foreground during an active ride — re-subscribe
        subscribe();
      }
    });

    return () => subscription.remove();
  // Stable callbacks; rideActive/groupId guarded inside subscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideActive, groupId, subscribe, unsubscribe]);

  return { realtimeMembers, broadcastLocation };
}
