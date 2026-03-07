/**
 * emergency.ts — TG-05 (Supabase backend)
 *
 * Emergency profile + SOS operations backed by Supabase.
 * Replaces the old Express/Redis implementation.
 *
 * Tables used:
 *   - emergency_contacts (rider_id, name, phone, email)
 *   - alerts (rider_id, group_id, type, lat, lng, message)
 */

import { supabase } from '../lib/supabase';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface EmergencyInfo {
  bloodType: string | null;
  allergies: string[];
  medications: string[];
  conditions: string | null;
  emergencyContacts: EmergencyContact[];
}

// ── Helper: current user ID ───────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Emergency info ─────────────────────────────────────────────────────────

/**
 * Fetch the current rider's emergency contacts.
 * Medical profile fields (blood type, allergies, etc.) are stored in
 * user_metadata until a dedicated profile table is added.
 */
export async function getMyEmergencyInfo(): Promise<EmergencyInfo> {
  const riderId = await getCurrentUserId();
  if (!riderId) {
    return {
      bloodType: null,
      allergies: [],
      medications: [],
      conditions: null,
      emergencyContacts: [],
    };
  }

  const { data: contacts, error } = await supabase
    .from('emergency_contacts')
    .select('name, phone, email')
    .eq('rider_id', riderId);

  if (error) throw new Error(`getMyEmergencyInfo failed: ${error.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  return {
    bloodType: (meta.bloodType as string | null) ?? null,
    allergies: (meta.allergies as string[]) ?? [],
    medications: (meta.medications as string[]) ?? [],
    conditions: (meta.conditions as string | null) ?? null,
    emergencyContacts: (contacts ?? []).map(c => ({
      name: c.name as string,
      phone: (c.phone ?? '') as string,
      relationship: 'Emergency Contact',
    })),
  };
}

/** Persist (replace) the rider's emergency contacts + medical metadata. */
export async function saveMyEmergencyInfo(info: EmergencyInfo): Promise<void> {
  const riderId = await getCurrentUserId();
  if (!riderId) throw new Error('Not authenticated');

  // Upsert medical metadata into auth user_metadata
  await supabase.auth.updateUser({
    data: {
      bloodType: info.bloodType,
      allergies: info.allergies,
      medications: info.medications,
      conditions: info.conditions,
    },
  });

  // Replace emergency contacts: delete old, insert new
  await supabase
    .from('emergency_contacts')
    .delete()
    .eq('rider_id', riderId);

  if (info.emergencyContacts.length > 0) {
    const { error } = await supabase.from('emergency_contacts').insert(
      info.emergencyContacts.map(c => ({
        rider_id: riderId,
        name: c.name,
        phone: c.phone || null,
        email: null,
      })),
    );
    if (error) throw new Error(`saveMyEmergencyInfo contacts failed: ${error.message}`);
  }
}

/** Fire a manual SOS alert by inserting into the `alerts` table. */
export async function fireSOS(params: {
  groupId?: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const riderId = await getCurrentUserId();
  if (!riderId) throw new Error('Not authenticated');

  const { error } = await supabase.from('alerts').insert({
    rider_id: riderId,
    group_id: params.groupId ?? null,
    type: 'sos',
    lat: params.lat,
    lng: params.lng,
    message: `🆘 SOS triggered at ${params.lat.toFixed(5)}, ${params.lng.toFixed(5)}`,
  });

  if (error) throw new Error(`fireSOS failed: ${error.message}`);
}
