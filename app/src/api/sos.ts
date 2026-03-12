/**
 * sos.ts — SOS alert persistence and realtime broadcast via Supabase.
 *
 * Table: sos_alerts
 *   id          uuid PK default gen_random_uuid()
 *   ride_id     text
 *   group_id    text
 *   user_id     uuid references auth.users
 *   lat         float8
 *   lng         float8
 *   timestamp   timestamptz default now()
 *   status      text default 'active'  — 'active' | 'cancelled'
 *
 * Realtime channel: sos:{group_id}
 */

import { supabase } from '../lib/supabase';

export interface SOSAlert {
  id: string;
  ride_id: string | null;
  group_id: string | null;
  user_id: string;
  lat: number;
  lng: number;
  timestamp: string;
  status: 'active' | 'cancelled';
}

export interface CreateSOSParams {
  ride_id?: string | null;
  group_id?: string | null;
  user_id: string;
  lat: number;
  lng: number;
}

/**
 * Insert a new SOS alert with status='active' and broadcast to the group
 * Realtime channel `sos:{group_id}`.
 *
 * Returns the created alert row.
 */
export async function createSOSAlert(params: CreateSOSParams): Promise<SOSAlert> {
  const { data, error } = await supabase
    .from('sos_alerts')
    .insert({
      ride_id: params.ride_id ?? null,
      group_id: params.group_id ?? null,
      user_id: params.user_id,
      lat: params.lat,
      lng: params.lng,
      status: 'active',
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`SOS insert failed: ${error.message}`);
  }

  // Broadcast to group Realtime channel so other members see it immediately.
  // In Supabase v2 Realtime, channel.subscribe() does NOT return a Promise —
  // it accepts a callback. We must wait for SUBSCRIBED state before sending,
  // otherwise the broadcast fires before the channel is ready.
  if (params.group_id) {
    const channel = supabase.channel(`sos:${params.group_id}`);
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        if (status === 'CHANNEL_ERROR') reject(new Error('Subscribe failed'));
      });
    });
    await channel.send({
      type: 'broadcast',
      event: 'sos_alert',
      payload: data as SOSAlert,
    });
    // Don't wait for the channel to fully clean up
    void supabase.removeChannel(channel);

    // ── Remote push for killed-app recipients (Task #803) ─────────────────
    // The Realtime broadcast above only reaches members whose app is open.
    // Call the sos-push edge function to deliver APNs remote push to all
    // group members who have registered a device token, so they're alerted
    // even when their app is killed.
    //
    // Fire-and-forget — a push delivery failure must never block the SOS.
    void triggerSOSPush({
      alertId: (data as SOSAlert).id,
      groupId: params.group_id,
      userId: params.user_id,
      lat: params.lat,
      lng: params.lng,
    });
  }

  return data as SOSAlert;
}

// ─── Internal: remote push trigger ───────────────────────────────────────────

interface SOSPushParams {
  alertId: string;
  groupId: string;
  userId: string;
  lat: number;
  lng: number;
  riderName?: string | null;
}

/**
 * Fire-and-forget call to the `sos-push` edge function.
 * Sends APNs remote push to group members whose apps are killed.
 * Errors are logged but never thrown — push failure must never block SOS.
 */
async function triggerSOSPush(params: SOSPushParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('sos-push', {
      body: params,
    });
    if (error) {
      console.warn('[sos] sos-push edge function error:', error.message);
    }
  } catch (err) {
    console.warn('[sos] sos-push invocation failed:', err);
  }
}

/**
 * Cancel an active SOS alert by updating status to 'cancelled'.
 */
export async function cancelSOSAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('sos_alerts')
    .update({ status: 'cancelled' })
    .eq('id', alertId);

  if (error) {
    throw new Error(`SOS cancel failed: ${error.message}`);
  }
}

/**
 * Subscribe to incoming SOS alerts for a group channel.
 * Returns an unsubscribe function.
 */
export function subscribeToSOSAlerts(
  groupId: string,
  onAlert: (alert: SOSAlert) => void,
): () => void {
  const channel = supabase
    .channel(`sos:${groupId}`)
    .on('broadcast', { event: 'sos_alert' }, ({ payload }) => {
      onAlert(payload as SOSAlert);
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
