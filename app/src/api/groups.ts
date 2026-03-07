import { getAuthHeader } from './authHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8420';

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

// POST /groups — backend route (was incorrectly /groups/create)
export async function createGroup(name: string): Promise<GroupCreateResponse> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/groups`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create group: ${res.status}`);
  const data = await res.json();
  // Backend returns { group: { id, code, name, ... }, code }
  return {
    groupId: data.group?.id ?? data.groupId,
    code: data.code ?? data.group?.code,
    role: 'leader',
  };
}

// POST /groups/join — join by code
export async function joinGroup(code: string): Promise<GroupJoinResponse> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/groups/join`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Failed to join group: ${res.status}`);
  const data = await res.json();
  // Backend returns { group: {...}, members: [...] }
  const members: GroupMember[] = (data.members ?? []).map((m: any) => ({
    riderId: m.id ?? m.riderId,
    name: m.name,
    role: m.role,
    online: false,
  }));
  return {
    groupId: data.group?.id ?? data.groupId,
    name: data.group?.name ?? data.name ?? '',
    members,
  };
}

export async function fetchMembers(groupId: string): Promise<GroupMember[]> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/groups/${groupId}/members`, { headers: auth });
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
  return res.json();
}

export async function leaveGroup(groupId: string): Promise<void> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/groups/${groupId}/leave`, {
    method: 'DELETE',
    headers: auth,
  });
  if (!res.ok) throw new Error(`Failed to leave group: ${res.status}`);
}

export async function disbandGroup(groupId: string): Promise<void> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/groups/${groupId}`, {
    method: 'DELETE',
    headers: auth,
  });
  if (!res.ok) throw new Error(`Failed to disband group: ${res.status}`);
}

export async function assignMemberRole(
  groupId: string,
  riderId: string,
  role: 'member' | 'sweep',
): Promise<void> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/groups/${groupId}/members/${riderId}/role`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(`Failed to assign role: ${res.status}`);
}
