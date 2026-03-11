import { supabase } from '../lib/supabase';

const FUNCTIONS_URL = 'https://ekrdvptkeagygkhujnvl.supabase.co/functions/v1';

export interface GroupCreateResponse {
  groupId: string;
  code: string;
  role: 'leader';
}

export interface GroupJoinResponse {
  groupId: string;
  name: string;
  members: GroupMember[];
}

export interface GroupMember {
  riderId: string;
  name: string;
  role: 'leader' | 'member' | 'sweep';
  online: boolean;
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return session.access_token;
}

async function callFunction(path: string, body: unknown): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${FUNCTIONS_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res;
}

// Create a new group — calls /groups/create Edge Function
export async function createGroup(name: string): Promise<GroupCreateResponse> {
  const res = await callFunction('/groups/create', { name });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Failed to create group: ${res.status}`);
  }
  return res.json();
}

// Join an existing group by invite code — calls /groups/join Edge Function
export async function joinGroup(code: string): Promise<GroupJoinResponse> {
  const res = await callFunction('/groups/join', { code });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Failed to join group: ${res.status}`);
  }
  const data = await res.json();

  // Normalise member shape — edge function returns { rider_id, role }
  const members: GroupMember[] = (data.members ?? []).map((m: { rider_id?: string; riderId?: string; role: string }) => ({
    riderId: m.rider_id ?? m.riderId ?? '',
    name: '', // display name fetched separately via Realtime presence
    role: (m.role ?? 'member') as 'leader' | 'member' | 'sweep',
    online: false,
  }));

  return {
    groupId: data.groupId,
    name: data.name ?? '',
    members,
  };
}

// Fetch current members for a group directly from DB
export async function fetchMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('rider_id, role')
    .eq('group_id', groupId);

  if (error) throw new Error(`Failed to fetch members: ${error.message}`);

  return (data ?? []).map((m) => ({
    riderId: m.rider_id,
    name: '',
    role: (m.role ?? 'member') as 'leader' | 'member' | 'sweep',
    online: false,
  }));
}

// Leave a group — delete own membership row
export async function leaveGroup(groupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('rider_id', user.id);

  if (error) throw new Error(`Failed to leave group: ${error.message}`);
}

// Disband a group — only the leader should call this
export async function disbandGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw new Error(`Failed to disband group: ${error.message}`);
}

// ─── Member profile (for SOS notification name/phone lookup) ─────────────────

export interface GroupMemberProfile {
  riderId: string;
  displayName: string | null;
  /** Rider's own phone number (from riders.phone), or null if not set. */
  phone: string | null;
}

/**
 * Fetch display name and phone for every member of a group.
 * Requires the "group members can read co-member riders" RLS policy
 * (migration 20260311000000_riders_phone.sql).
 */
export async function fetchMemberProfiles(groupId: string): Promise<GroupMemberProfile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      rider_id,
      riders ( display_name, phone )
    `)
    .eq('group_id', groupId);

  if (error) throw new Error(`fetchMemberProfiles failed: ${error.message}`);

  return (data ?? []).map((row) => {
    // Supabase may return the foreign-key join as an object or single-element
    // array depending on the cardinality hint it infers. Normalise to object.
    const rawRider = row.riders;
    const rider = (Array.isArray(rawRider) ? rawRider[0] : rawRider) as
      | { display_name: string | null; phone: string | null }
      | null
      | undefined;
    return {
      riderId: row.rider_id as string,
      displayName: rider?.display_name ?? null,
      phone: rider?.phone ?? null,
    };
  });
}

// Assign a role to a group member (leader only)
export async function assignMemberRole(
  groupId: string,
  riderId: string,
  role: 'member' | 'sweep',
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('rider_id', riderId);

  if (error) throw new Error(`Failed to assign role: ${error.message}`);
}
