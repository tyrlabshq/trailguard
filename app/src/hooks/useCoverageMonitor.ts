/**
 * useCoverageMonitor — TG-Offline-4
 *
 * Monitors signal strength and connection quality using NetInfo.
 * Returns a rich coverage state so the UI can warn proactively when the
 * group is approaching poor coverage.
 *
 * Signal classification:
 *   good  — WiFi, or cellular with effective type 4g/3g
 *   weak  — cellular with effective type 2g/unknown, or slow RTT detected
 *   none  — no connection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoCellularGeneration } from '@react-native-community/netinfo';

export interface CoverageState {
  isOnline: boolean;
  signalStrength: 'good' | 'weak' | 'none';
  lastOnlineAt: Date | null;
  offlineDurationSeconds: number;
  /** True when signal is 'weak' or 'none' — drives the coverage banner. */
  showCoverageWarning: boolean;
}

const OFFLINE_TICK_INTERVAL = 5_000; // Update offlineDurationSeconds every 5s

export function useCoverageMonitor(): CoverageState {
  const [signalStrength, setSignalStrength] = useState<'good' | 'weak' | 'none'>('good');
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [offlineDurationSeconds, setOfflineDurationSeconds] = useState(0);
  const offlineTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const classifySignal = useCallback((state: NetInfoState): 'good' | 'weak' | 'none' => {
    if (!state.isConnected) return 'none';
    if (state.type === 'wifi') return 'good';
    if (state.type === 'cellular') {
      const gen = state.details?.cellularGeneration;
      // 4g/5g → good, 3g → acceptable (good), 2g/null → weak
      if (gen === NetInfoCellularGeneration['4g'] || gen === NetInfoCellularGeneration['5g'] || gen === NetInfoCellularGeneration['3g']) return 'good';
      return 'weak';
    }
    // Ethernet or other wired connections
    if (state.type === 'ethernet' || state.type === 'vpn') return 'good';
    // Unknown type but connected
    if (state.isInternetReachable === false) return 'weak';
    return state.isConnected ? 'good' : 'none';
  }, []);

  const startOfflineTick = useCallback(() => {
    if (offlineTickRef.current) return;
    const startedAt = Date.now();
    offlineTickRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setOfflineDurationSeconds(elapsed);
    }, OFFLINE_TICK_INTERVAL);
  }, []);

  const stopOfflineTick = useCallback(() => {
    if (offlineTickRef.current) {
      clearInterval(offlineTickRef.current);
      offlineTickRef.current = null;
    }
    setOfflineDurationSeconds(0);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected);
      const strength = classifySignal(state);

      setSignalStrength(strength);
      setIsOnline(online);

      if (online) {
        setLastOnlineAt(new Date());
        stopOfflineTick();
      } else {
        startOfflineTick();
      }
    });

    // Initial fetch
    NetInfo.fetch().then((state: NetInfoState) => {
      const online = !!(state.isConnected);
      const strength = classifySignal(state);
      setSignalStrength(strength);
      setIsOnline(online);
      if (online) {
        setLastOnlineAt(new Date());
      } else {
        startOfflineTick();
      }
    });

    return () => {
      unsubscribe();
      stopOfflineTick();
    };
  }, [classifySignal, startOfflineTick, stopOfflineTick]);

  return {
    isOnline,
    signalStrength,
    lastOnlineAt,
    offlineDurationSeconds,
    showCoverageWarning: signalStrength === 'weak' || signalStrength === 'none',
  };
}
