import { getAuthHeader } from './authHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8420';

export type CMODuration = 15 | 30 | 45 | 60 | 90;

export interface CMOStatusResponse {
  active: false;
}

export interface CMOActiveResponse {
  active: true;
  etaAt: string;
  durationMinutes: CMODuration;
  note: string | null;
  minutesRemaining: number;
}

export type CMOResponse = CMOStatusResponse | CMOActiveResponse;

/** Start a count-me-out timer. */
export async function startCountMeOut(
  groupId: string,
  durationMinutes: CMODuration,
  note?: string,
): Promise<{ etaAt: string; durationMinutes: number }> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/alerts/count-me-out/start`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, durationMinutes, note: note?.trim() || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Failed to start count-me-out: ${res.status}`);
  }
  return res.json();
}

/** Cancel the rider's count-me-out timer ("I'm back"). */
export async function cancelCountMeOut(): Promise<void> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/alerts/count-me-out/cancel`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Failed to cancel count-me-out: ${res.status}`);
  }
}

/** Fetch the rider's current count-me-out status from the server. */
export async function getCountMeOutStatus(): Promise<CMOResponse> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}/alerts/count-me-out/status`, { headers: auth });
  if (!res.ok) throw new Error(`Failed to fetch count-me-out status: ${res.status}`);
  return res.json();
}
