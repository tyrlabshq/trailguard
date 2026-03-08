/**
 * useOfflineQueue — TG-03 + TG-Offline-3
 *
 * Monitors network connectivity and exposes two queue states:
 *
 *   isOffline / queueCount  — existing API (OfflineBanner still uses these)
 *   queueLength / isFlushing / flushNow — new action queue (SOS, DMS, etc.)
 *
 * Polling cadence:
 *  - While offline: re-reads queue size every 5 s so the count stays fresh.
 *  - While online: flushes the action queue once, then stays quiet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { LocationService } from '../services/LocationService';
import { OfflineQueue } from '../services/OfflineQueue';
import { supabase } from '../lib/supabase';

// ── Existing OfflineBanner contract (preserved) ────────────────────────────

export interface OfflineQueueState {
  /** True when the device has no internet connection. */
  isOffline: boolean;
  /** Number of location pings currently queued in AsyncStorage. */
  queueCount: number;
  /** Number of pending actions in the offline action queue. */
  queueLength: number;
  /** True while the action queue is being flushed. */
  isFlushing: boolean;
  /** Manually trigger an immediate flush of the action queue. */
  flushNow: () => Promise<void>;
}

export function useOfflineQueue(): OfflineQueueState {
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);       // location pings
  const [queueLength, setQueueLength] = useState(0);     // action queue
  const [isFlushing, setIsFlushing] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOfflineRef = useRef(false);

  // Read location queue size (existing behaviour for OfflineBanner)
  const refreshQueueCount = async (): Promise<void> => {
    const count = await LocationService.getQueueSize();
    setQueueCount(count);
  };

  // Read action queue length
  const refreshQueueLength = async (): Promise<void> => {
    const len = await OfflineQueue.getQueueLength();
    setQueueLength(len);
  };

  // Flush action queue when back online
  const flushActionQueue = useCallback(async (): Promise<void> => {
    const len = await OfflineQueue.getQueueLength();
    if (len === 0) return;
    setIsFlushing(true);
    try {
      await OfflineQueue.flush(supabase);
    } catch {
      // Non-fatal — will retry on next reconnect
    } finally {
      await refreshQueueLength();
      setIsFlushing(false);
    }
  }, []);

  const flushNow = useCallback(async (): Promise<void> => {
    await flushActionQueue();
  }, [flushActionQueue]);

  // Start/stop polling based on connectivity
  const startPolling = (): void => {
    if (pollTimerRef.current) return;
    void refreshQueueCount();
    void refreshQueueLength();
    pollTimerRef.current = setInterval(() => {
      void refreshQueueCount();
      void refreshQueueLength();
    }, 5_000);
  };

  const stopPolling = (): void => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setQueueCount(0);
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected ?? true);
      const wasOffline = isOfflineRef.current;
      isOfflineRef.current = offline;
      setIsOffline(offline);

      if (offline) {
        startPolling();
      } else {
        stopPolling();
        // Just came back online — flush the action queue
        if (wasOffline) {
          void flushActionQueue();
        }
      }
    });

    // Fetch initial state immediately
    NetInfo.fetch().then((state: NetInfoState) => {
      const offline = !(state.isConnected ?? true);
      isOfflineRef.current = offline;
      setIsOffline(offline);
      if (offline) {
        startPolling();
      } else {
        void refreshQueueLength();
      }
    });

    return () => {
      unsubscribe();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushActionQueue]);

  return { isOffline, queueCount, queueLength, isFlushing, flushNow };
}
