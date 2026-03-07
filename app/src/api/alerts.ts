/**
 * alerts.ts — TG-03 (Supabase backend)
 *
 * Dead Man's Switch alert operations backed by Supabase.
 * Replaces the old Express/Redis implementation.
 *
 * - setDMS / snoozeDMS / disableDMS → write to `dead_man_switch` table
 * - fireDMSAlert → insert row into `alerts` table
 * - getAlerts   → read from `alerts` table for a group
 */

import { supabase } from '../lib/supabase';

export interface Alert {
  id: string;
  type: string;
  riderId: string;
  groupId: string;
  location: { lat: number; lng: number } | null;
  firedAt: string;
}

// ── Helper: get the current Supabase user ID ─────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Dead Man's Switch table operations ────────────────────────────────────

/**
 * Activate (or refresh) the dead man's switch for the current rider.
 * Upserts a row with expires_at = now + intervalMinutes.
 */
export async function setDMS(
  groupId: string,
  intervalMinutes: number,
): Promise<void> {
  const riderId = await getCurrentUserId();
  if (!riderId) return; // Guest — skip server-side DMS; client still monitors

  const expiresAt = new Date(
    Date.now() + intervalMinutes * 60 * 1_000,
  ).toISOString();

  const { error } = await supabase.from('dead_man_switch').upsert(
    {
      rider_id: riderId,
      group_id: groupId,
      expires_at: expiresAt,
      triggered: false,
    },
    { onConflict: 'rider_id' },
  );

  if (error) throw new Error(`setDMS failed: ${error.message}`);
}

/**
 * Snooze the dead man's switch by pushing expires_at forward by `minutes`.
 */
export async function snoozeDMS(minutes: number): Promise<void> {
  const riderId = await getCurrentUserId();
  if (!riderId) return;

  const { data: existing } = await supabase
    .from('dead_man_switch')
    .select('expires_at')
    .eq('rider_id', riderId)
    .single();

  if (!existing) return;

  const base = new Date(existing.expires_at as string);
  const newExpiry = new Date(
    base.getTime() + minutes * 60 * 1_000,
  ).toISOString();

  const { error } = await supabase
    .from('dead_man_switch')
    .update({ expires_at: newExpiry })
    .eq('rider_id', riderId);

  if (error) throw new Error(`snoozeDMS failed: ${error.message}`);
}

/** Remove the active dead man's switch row for the current rider. */
export async function disableDMS(): Promise<void> {
  const riderId = await getCurrentUserId();
  if (!riderId) return;

  const { error } = await supabase
    .from('dead_man_switch')
    .delete()
    .eq('rider_id', riderId);

  if (error) throw new Error(`disableDMS failed: ${error.message}`);
}

/**
 * Fire a DMS alert: insert a row into `alerts` with type 'dms_expired'.
 * Called when the 2-min countdown expires with no check-in response.
 */
export async function fireDMSAlert(params: {
  groupId?: string;
  lat?: number;
  lng?: number;
}): Promise<void> {
  const riderId = await getCurrentUserId();
  if (!riderId) return;

  const { error } = await supabase.from('alerts').insert({
    rider_id: riderId,
    group_id: params.groupId ?? null,
    type: 'dms_expired',
    lat: params.lat ?? null,
    lng: params.lng ?? null,
    message:
      params.lat !== undefined && params.lng !== undefined
        ? `⚠️ Dead Man's Switch expired. Last GPS: ${params.lat.toFixed(5)}, ${params.lng.toFixed(5)}`
        : "⚠️ Dead Man's Switch expired. Location unavailable.",
  });

  if (error) throw new Error(`fireDMSAlert failed: ${error.message}`);
}

/** Fetch active (unacknowledged) alerts for a group. */
export async function getAlerts(groupId: string): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('group_id', groupId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getAlerts failed: ${error.message}`);

  return (data ?? []).map(row => ({
    id: row.id as string,
    type: row.type as string,
    riderId: row.rider_id as string,
    groupId: row.group_id as string,
    location:
      row.lat !== null && row.lng !== null
        ? { lat: row.lat as number, lng: row.lng as number }
        : null,
    firedAt: row.created_at as string,
  }));
}
