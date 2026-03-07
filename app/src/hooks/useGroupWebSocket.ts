/**
 * useGroupWebSocket — Supabase Realtime Broadcast replacement for the
 * legacy Express WebSocket transport.
 *
 * All external contracts (return types, event shapes) are preserved exactly
 * so every consumer screen continues working without changes.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  loadMemberLocations,
  saveMemberLocations,
} from '../services/MemberLocationCache';

// ─── Public Types (unchanged) ─────────────────────────────────────────────────

export interface MemberLocation {
  userId: string;
  lat: number;
  lng: number;
  speed: number;     // mph
  heading?: number;  // degrees CW from N (used for dead reckoning)
  battery: number;   // percent 0–100
  timestamp: string; // ISO string
}

export interface CMOState {
  riderId: string;
  etaAt: string;
  durationMinutes: number;
  note: string | null;
}

export interface SweepGap {
  lastRiderId: string;
  distanceMiles: number;
  alert: boolean;
}

export interface GroupMessage {
  messageId: string;
  riderId: string;
  riderName: string;
  text: string;
  preset: string | null;
  timestamp: number;
}

export interface UseGroupWebSocketOptions {
  groupId?: string;
  riderId?: string;
  riderName?: string;
}

interface UseGroupWebSocketResult {
  members: Map<string, MemberLocation>;
  connected: boolean;
  cmoStates: Map<string, CMOState>;
  sweepGap: SweepGap | null;
  cmoWarning: boolean;
  dismissCmoWarning: () => void;
  sweepLeaderAlert: string | null;
  dismissSweepLeaderAlert: () => void;
  messages: GroupMessage[];
  sendGroupMessage: (text: string, preset?: string | null) => void;
}

// ─── Queued outbound messages (sent when channel reconnects) ──────────────────

interface PendingMessage {
  type: 'group_message';
  text: string;
  preset: string | null;
  riderName: string;
}

const MAX_MESSAGES = 50;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGroupWebSocket(options?: UseGroupWebSocketOptions): UseGroupWebSocketResult {
  const [members, setMembers] = useState<Map<string, MemberLocation>>(new Map());
  const [connected, setConnected] = useState(false);
  const [cmoStates, setCmoStates] = useState<Map<string, CMOState>>(new Map());
  const [sweepGap, setSweepGap] = useState<SweepGap | null>(null);
  const [cmoWarning, setCmoWarning] = useState(false);
  const [sweepLeaderAlert, setSweepLeaderAlert] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueue = useRef<PendingMessage[]>([]);
  const unmounted = useRef(false);
  // Keep latest options accessible in callbacks without re-subscribing
  const optionsRef = useRef<UseGroupWebSocketOptions | undefined>(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const dismissCmoWarning = useCallback(() => setCmoWarning(false), []);
  const dismissSweepLeaderAlert = useCallback(() => setSweepLeaderAlert(null), []);

  // ── Broadcast helpers ──────────────────────────────────────────────────────

  const broadcastMessage = useCallback((text: string, preset: string | null = null) => {
    const opts = optionsRef.current;
    const payload: PendingMessage = {
      type: 'group_message',
      text: text.trim().slice(0, 200),
      preset,
      riderName: opts?.riderName ?? 'Rider',
    };
    const ch = channelRef.current;
    if (ch && connected) {
      ch.send({
        type: 'broadcast',
        event: 'group_message',
        payload: {
          ...payload,
          riderId: opts?.riderId ?? '',
          messageId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
        },
      });
    } else {
      pendingQueue.current.push(payload);
    }
  }, [connected]);

  const sendGroupMessage = broadcastMessage;

  // ── Message dispatcher ─────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBroadcast = useCallback((event: string, payload: Record<string, any>) => {
    switch (event) {
      case 'location': {
        const loc: MemberLocation = {
          userId: payload.userId ?? payload.riderId ?? '',
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed ?? 0,
          heading: payload.heading ?? undefined,
          battery: payload.battery ?? 100,
          timestamp: payload.timestamp ?? new Date().toISOString(),
        };
        setMembers((prev) => {
          const next = new Map(prev);
          next.set(loc.userId, loc);
          if (cacheTimer.current) clearTimeout(cacheTimer.current);
          cacheTimer.current = setTimeout(
            () => void saveMemberLocations(next),
            2_000,
          );
          return next;
        });
        break;
      }

      case 'count_me_out_started': {
        const state: CMOState = {
          riderId: payload.riderId,
          etaAt: payload.etaAt,
          durationMinutes: payload.durationMinutes,
          note: payload.note ?? null,
        };
        setCmoStates((prev) => {
          const next = new Map(prev);
          next.set(payload.riderId, state);
          return next;
        });
        break;
      }

      case 'count_me_out_cancelled': {
        setCmoStates((prev) => {
          const next = new Map(prev);
          next.delete(payload.riderId);
          return next;
        });
        break;
      }

      case 'count_me_out_warning': {
        setCmoWarning(true);
        break;
      }

      case 'sweep_gap_update': {
        setSweepGap({
          lastRiderId: payload.lastRiderId,
          distanceMiles: payload.distanceMiles,
          alert: payload.alert,
        });
        break;
      }

      case 'sweep_gap_leader_alert': {
        setSweepLeaderAlert(
          payload.message ?? `Sweep is ${payload.distanceMiles?.toFixed(1)}mi behind`,
        );
        break;
      }

      case 'group_message': {
        const gm: GroupMessage = {
          messageId: payload.messageId ?? `${Date.now()}-${Math.random()}`,
          riderId: payload.riderId ?? '',
          riderName: payload.riderName ?? 'Rider',
          text: payload.text ?? '',
          preset: payload.preset ?? null,
          timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.messageId === gm.messageId)) return prev;
          const next = [...prev, gm];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
        break;
      }

      default:
        break;
    }
  }, []);

  // ── Channel lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    unmounted.current = false;
    const opts = optionsRef.current;

    // No groupId — don't subscribe to anything yet
    if (!opts?.groupId) return;

    const channelName = `group:${opts.groupId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Subscribe to every broadcast event we care about
    const events = [
      'location',
      'count_me_out_started',
      'count_me_out_cancelled',
      'count_me_out_warning',
      'sweep_gap_update',
      'sweep_gap_leader_alert',
      'group_message',
    ] as const;

    for (const event of events) {
      channel.on('broadcast', { event }, ({ payload }) => {
        if (!unmounted.current) handleBroadcast(event, payload ?? {});
      });
    }

    channel.subscribe((status) => {
      if (unmounted.current) return;
      const isConnected = status === 'SUBSCRIBED';
      setConnected(isConnected);

      if (isConnected && pendingQueue.current.length > 0) {
        // Flush queued messages now that we have a live channel
        const queue = pendingQueue.current.splice(0);
        const riderId = optionsRef.current?.riderId ?? '';
        for (const pending of queue) {
          channel.send({
            type: 'broadcast',
            event: 'group_message',
            payload: {
              ...pending,
              riderId,
              messageId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              timestamp: Date.now(),
            },
          });
        }
      }
    });

    channelRef.current = channel;

    return () => {
      unmounted.current = true;
      if (cacheTimer.current) clearTimeout(cacheTimer.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [options?.groupId, handleBroadcast]); // re-subscribe only when groupId changes

  // ── Broadcast own location (called externally via the channel ref) ─────────
  // Exposed as a stable utility consumers can call directly if needed.
  // Primary location broadcasting is handled by useGroupTracking/LocationService.

  // ── Pre-populate map from cache while offline ──────────────────────────────
  useEffect(() => {
    loadMemberLocations()
      .then((cached) => {
        if (cached.size > 0 && !unmounted.current) {
          setMembers((prev) => (prev.size > 0 ? prev : cached));
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    members,
    connected,
    cmoStates,
    sweepGap,
    cmoWarning,
    dismissCmoWarning,
    sweepLeaderAlert,
    dismissSweepLeaderAlert,
    messages,
    sendGroupMessage,
  };
}
