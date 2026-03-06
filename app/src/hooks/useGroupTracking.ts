import { useState, useEffect, useRef, useCallback } from 'react';
import type { RiderLocation, SignalSource, LatLng } from '../../../shared/types';

interface GroupTrackingState {
  riders: RiderLocation[];
  connected: boolean;
  signalSource: SignalSource;
  sendLocation: (location: RiderLocation) => void;
  setRallyPoint: (point: LatLng) => void;
}

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export function useGroupTracking(
  wsUrl: string,
  groupId: string | null,
  riderId: string | null,
): GroupTrackingState {
  const [riders, setRiders] = useState<RiderLocation[]>([]);
  const [connected, setConnected] = useState(false);
  const [signalSource, setSignalSource] = useState<SignalSource>('offline');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(BASE_RECONNECT_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (!groupId || !riderId || unmounted.current) return;

    const url = `${wsUrl}?groupId=${groupId}&riderId=${riderId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) { ws.close(); return; }
      setConnected(true);
      setSignalSource('cellular');
      reconnectDelay.current = BASE_RECONNECT_MS;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'location_update':
            setRiders((prev) => {
              const idx = prev.findIndex((r) => r.riderId === msg.data.riderId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = msg.data;
                return next;
              }
              return [...prev, msg.data];
            });
            break;
          case 'rider_joined':
            setRiders((prev) => {
              if (prev.some((r) => r.riderId === msg.data.riderId)) return prev;
              return [...prev, msg.data];
            });
            break;
          case 'rider_left':
            setRiders((prev) =>
              prev.filter((r) => r.riderId !== msg.data.riderId),
            );
            break;
          case 'alert_fired':
            // Alerts handled by SafetyScreen — just update rider state
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (unmounted.current) return;
      setConnected(false);
      setSignalSource('offline');
      // Exponential backoff reconnect
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_MS);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [wsUrl, groupId, riderId]);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendLocation = useCallback((location: RiderLocation) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'location_update', data: location }));
    }
  }, []);

  const setRallyPoint = useCallback((point: LatLng) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'set_rally_point', data: point }));
    }
  }, []);

  return { riders, connected, signalSource, sendLocation, setRallyPoint };
}
