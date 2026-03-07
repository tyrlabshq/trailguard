/**
 * useOfflineQueue — TG-03
 *
 * Monitors network connectivity and the size of the offline location queue.
 * Used by OfflineBanner to display "Offline — X pings queued" when there is
 * no cellular/wifi connection.
 *
 * Polling cadence:
 *  - While offline: re-reads queue size every 5 s so the count stays fresh.
 *  - While online:  no polling needed (banner is hidden).
 */

import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { LocationService } from '../services/LocationService';

export interface OfflineQueueState {
  /** True when the device has no internet connection. */
  isOffline: boolean;
  /** Number of location pings currently queued in AsyncStorage. */
  queueCount: number;
}

export function useOfflineQueue(): OfflineQueueState {
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read the current queue size from AsyncStorage
  const refreshQueueCount = async (): Promise<void> => {
    const count = await LocationService.getQueueSize();
    setQueueCount(count);
  };

  // Start/stop polling based on connectivity
  const startPolling = (): void => {
    if (pollTimerRef.current) return;
    void refreshQueueCount(); // immediate read
    pollTimerRef.current = setInterval(() => {
      void refreshQueueCount();
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
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected ?? true);
      setIsOffline(offline);

      if (offline) {
        startPolling();
      } else {
        stopPolling();
      }
    });

    // Fetch initial state immediately
    NetInfo.fetch().then((state: NetInfoState) => {
      const offline = !(state.isConnected ?? true);
      setIsOffline(offline);
      if (offline) {
        startPolling();
      }
    });

    return () => {
      unsubscribe();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOffline, queueCount };
}
