export interface Rider {
  id: string;
  name: string;
  avatarUrl?: string;
  emergencyContact: EmergencyContact;
  medicalInfo: MedicalInfo;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface MedicalInfo {
  bloodType?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
}

export interface RiderLocation {
  riderId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedMph?: number;
  altitudeFt?: number;
  timestamp: number;
  source: 'cellular' | 'satellite' | 'ble_mesh';
  accuracy?: number;
}

export interface Group {
  id: string;
  code: string; // 6-char join code
  name: string;
  leaderId: string;
  sweepId?: string;
  members: Rider[];
  rallyPoint?: LatLng;
  createdAt: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrailCondition {
  id: string;
  trailId: string;
  condition: 'groomed' | 'rough' | 'icy' | 'drifted' | 'closed' | 'unknown';
  reportedBy: string;
  reportedAt: number;
  notes?: string;
  lat: number;
  lng: number;
}

export interface Alert {
  id: string;
  type: 'dead_mans_switch' | 'crash_detected' | 'sos' | 'rally_point' | 'count_me_out_expired';
  riderId: string;
  groupId: string;
  location: LatLng;
  timestamp: number;
  acknowledged: boolean;
}

export type SignalSource = 'cellular' | 'satellite' | 'offline';

/** Count-me-out timer state — broadcast to the group when a rider takes a detour */
export interface CountMeOutState {
  riderId: string;
  durationMinutes: number;
  note?: string;
  etaAt: string;   // ISO timestamp
  active: boolean;
}

/** Sweep gap state — broadcast to sweep rider (and group) after each location update */
export interface SweepGapState {
  lastRiderId: string;   // the nearest rider ahead of the sweep
  distanceMiles: number;
  alert: boolean;        // true if gap >= SWEEP_ALERT_MILES
}

/** WebSocket message union — extend as new types are added */
export type WsMessage =
  | { type: 'location_update'; riderId: string; location: LatLng; heading?: number; speedMph?: number; source: SignalSource; timestamp: number }
  | { type: 'rider_joined'; riderId: string }
  | { type: 'rider_left'; riderId: string }
  | { type: 'alert'; alert: Omit<Alert, 'acknowledged'> }
  | { type: 'count_me_out_started'; riderId: string; durationMinutes: number; note: string | null; etaAt: string }
  | { type: 'count_me_out_cancelled'; riderId: string }
  | { type: 'count_me_out_warning'; riderId: string; minutesRemaining: number; etaAt: string }
  | { type: 'sweep_gap_update'; lastRiderId: string; distanceMiles: number; alert: boolean }
  | { type: 'sweep_gap_leader_alert'; sweepId: string; distanceMiles: number; message: string };
