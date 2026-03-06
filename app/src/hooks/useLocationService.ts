/**
 * useLocationService — PL-05
 *
 * Starts/stops LocationService whenever the active group changes.
 * Returns the current signal source for display in the UI.
 */

import { useEffect, useState, useRef } from 'react';
import { LocationService } from '../services/LocationService';
import { useGroup } from '../context/GroupContext';
import type { SignalSource } from '../../../shared/types';

const ENV = process.env as Record<string, string | undefined>;

const WS_URL = ENV.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3001';
const API_URL = ENV.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Returns the rider's current signal source.
 * Call at the top level of a screen or in AppNavigator so tracking
 * persists across tab switches.
 */
export function useLocationService(): { signalSource: SignalSource } {
  const { group } = useGroup();
  const [signalSource, setSignalSource] = useState<SignalSource>('offline');

  // Track whether the service is currently running to avoid double-starts
  const running = useRef(false);

  useEffect(() => {
    if (!group) {
      // No active group — stop tracking if it was running
      if (running.current) {
        running.current = false;
        void LocationService.stop();
      }
      setSignalSource('offline');
      return;
    }

    // Group became available — start (or restart) the service
    running.current = true;
    void LocationService.start({
      groupId: group.groupId,
      riderId: group.code, // reuse the group code as a rider identifier until auth is wired
      wsUrl: WS_URL,
      apiUrl: API_URL,
      onSignalSourceChange: (src) => setSignalSource(src),
    });

    return () => {
      // Clean up when the component that holds this hook unmounts
      if (running.current) {
        running.current = false;
        void LocationService.stop();
      }
    };
  }, [group?.groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { signalSource };
}
