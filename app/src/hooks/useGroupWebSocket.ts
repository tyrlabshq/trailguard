import { useState, useEffect, useRef, useCallback } from 'react';

export interface MemberLocation {
  userId: string;
  lat: number;
  lng: number;
  speed: number;     // mph
  battery: number;   // percent 0–100
  timestamp: string; // ISO string
}

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

const WS_URL =
  (process.env as Record<string, string | undefined>).EXPO_PUBLIC_WS_URL ??
  'ws://localhost:3001';

interface UseGroupWebSocketResult {
  members: Map<string, MemberLocation>;
  connected: boolean;
}

export function useGroupWebSocket(): UseGroupWebSocketResult {
  const [members, setMembers] = useState<Map<string, MemberLocation>>(
    new Map(),
  );
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(BASE_RECONNECT_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted.current) {
          ws.close();
          return;
        }
        setConnected(true);
        reconnectDelay.current = BASE_RECONNECT_MS;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ws.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            userId: string;
            lat: number;
            lng: number;
            speed: number;
            battery: number;
            timestamp: string;
          };
          if (msg.type === 'location_update') {
            const loc: MemberLocation = {
              userId: msg.userId,
              lat: msg.lat,
              lng: msg.lng,
              speed: msg.speed,
              battery: msg.battery,
              timestamp: msg.timestamp,
            };
            setMembers((prev) => {
              const next = new Map(prev);
              next.set(loc.userId, loc);
              return next;
            });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (unmounted.current) return;
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose fires after onerror — no need to setConnected here
        ws.close();
      };
    } catch {
      setConnected(false);
      scheduleReconnect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    const delay = reconnectDelay.current;
    reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_MS);
    reconnectTimer.current = setTimeout(connect, delay);
  }, [connect]);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { members, connected };
}
