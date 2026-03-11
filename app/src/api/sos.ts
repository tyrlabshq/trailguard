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
  }

  return data as SOSAlert;
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
