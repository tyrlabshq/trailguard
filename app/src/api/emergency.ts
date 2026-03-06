import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:8420';

async function getRiderId(): Promise<string | null> {
  return AsyncStorage.getItem('riderId');
}

async function authHeaders(): Promise<Record<string, string>> {
  const riderId = await getRiderId();
  return riderId ? { 'x-rider-id': riderId } : {};
}

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

export async function getMyEmergencyInfo(): Promise<EmergencyInfo> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/emergency/me/profile`, { headers });
  if (!res.ok) throw new Error('Failed to fetch emergency info');
  return res.json();
}

export async function saveMyEmergencyInfo(info: EmergencyInfo): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/emergency/me/profile`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  });
  if (!res.ok) throw new Error('Failed to save emergency info');
}

export async function fireSOS(params: {
  groupId?: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/emergency/sos`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to fire SOS');
}
