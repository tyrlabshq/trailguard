const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ConditionType = 'groomed' | 'powder' | 'icy' | 'closed' | 'tracked_out' | 'wet_snow';

export interface TrailConditionReport {
  id: string;
  lat: number;
  lng: number;
  condition: ConditionType;
  notes: string | null;
  reported_by: string | null;
  reported_at: string;
  distance_m?: number;
}

export const CONDITION_LABELS: Record<ConditionType, string> = {
  groomed: 'Groomed',
  powder: 'Fresh Powder',
  icy: 'Icy',
  closed: 'Closed',
  tracked_out: 'Tracked Out',
  wet_snow: 'Wet Snow',
};

export const CONDITION_COLORS: Record<ConditionType, string> = {
  groomed: '#00ff88',
  powder: '#00aaff',
  icy: '#ff4466',
  closed: '#ff2200',
  tracked_out: '#ffaa00',
  wet_snow: '#aa88ff',
};

export const CONDITION_ICONS: Record<ConditionType, string> = {
  groomed: '✅',
  powder: '❄️',
  icy: '🧊',
  closed: '🚫',
  tracked_out: '🏂',
  wet_snow: '💧',
};

export async function fetchNearbyConditions(
  lat: number,
  lng: number,
  radiusM = 25000,
): Promise<TrailConditionReport[]> {
  const url = `${API_URL}/trails/conditions?lat=${lat}&lng=${lng}&radius=${radiusM}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch conditions: ${res.status}`);
  return res.json();
}

export async function reportCondition(
  lat: number,
  lng: number,
  condition: ConditionType,
  notes?: string,
): Promise<TrailConditionReport> {
  const res = await fetch(`${API_URL}/trails/conditions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, condition, notes }),
  });
  if (!res.ok) throw new Error(`Failed to submit condition: ${res.status}`);
  return res.json();
}
