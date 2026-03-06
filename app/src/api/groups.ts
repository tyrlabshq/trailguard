const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

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
  role: 'leader' | 'member';
  online: boolean;
}

export async function createGroup(name: string): Promise<GroupCreateResponse> {
  const res = await fetch(`${API_URL}/groups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create group: ${res.status}`);
  return res.json();
}

export async function joinGroup(code: string): Promise<GroupJoinResponse> {
  const res = await fetch(`${API_URL}/groups/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Failed to join group: ${res.status}`);
  return res.json();
}

export async function fetchMembers(groupId: string): Promise<GroupMember[]> {
  const res = await fetch(`${API_URL}/groups/${groupId}/members`);
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
  return res.json();
}

export async function leaveGroup(groupId: string): Promise<void> {
  const res = await fetch(`${API_URL}/groups/${groupId}/leave`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to leave group: ${res.status}`);
}

export async function disbandGroup(groupId: string): Promise<void> {
  const res = await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to disband group: ${res.status}`);
}
