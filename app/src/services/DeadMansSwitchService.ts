/**
 * DeadMansSwitchService — TG-03
 *
 * Production dead man's switch for TrailGuard.
 *
 * Responsibilities:
 *  - Configurable check-in intervals: 15 / 30 / 60 min (persisted in AsyncStorage)
 *  - Background movement monitoring via react-native-background-geolocation
 *  - Haptic (vibration) + audio-cue alert when check-in is due
 *  - Auto-escalation to emergency contacts + server alert after 2-min no-response
 *  - Crash detection via react-native-sensors accelerometer (5G threshold)
 *  - triggerImmediately() for external crash detection wiring
 */

import { Vibration, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundGeolocation, {
  Location,
  Subscription,
} from 'react-native-background-geolocation';
import { fireDMSAlert } from '../api/alerts';
import { getMyEmergencyInfo } from '../api/emergency';

// ─── Constants ────────────────────────────────────────────────────────────

const STORAGE_KEY_INTERVAL = '@trailguard/dms_interval';

/**
 * Key shared with LocationService and SOSScreen for last-known GPS fix.
 * Written on every location event so escalation always has fresh coords.
 */
const STORAGE_KEY_LAST_LOCATION = 'lastLocation';

/** Minimum displacement (metres) counted as movement. */
const MOVEMENT_THRESHOLD_METERS = 15;

/** How often the stationary check runs. */
const CHECK_INTERVAL_MS = 30_000;

/**
 * How long (ms) the user has to respond to the alert before escalation fires.
 * This is exported so DeadMansSwitchModal can use the same value for its countdown.
 */
export const ESCALATION_TIMEOUT_MS = 2 * 60 * 1_000; // 2 minutes

/**
 * G-force magnitude threshold for crash detection.
 * 5G ≈ 49.05 m/s². Suitable for hard trail falls while ignoring bumps.
 */
const CRASH_THRESHOLD_MS2 = 49.0;

// ─── Types ────────────────────────────────────────────────────────────────

export const DMS_INTERVALS = [15, 30, 60] as const;
export type DMSInterval = (typeof DMS_INTERVALS)[number];

interface StoredLocation {
  lat: number;
  lng: number;
}

// react-native-sensors observable contract (avoids importing rxjs directly)
interface AccelerometerReading {
  x: number;
  y: number;
  z: number;
  timestamp: string;
}

interface AccelerometerObservable {
  subscribe(
    next: (data: AccelerometerReading) => void,
    error?: (err: unknown) => void,
  ): { unsubscribe: () => void };
}

interface SensorsModule {
  accelerometer: AccelerometerObservable;
  setUpdateIntervalForType: (sensorType: string, intervalMs: number) => void;
  SensorTypes: Record<string, string>;
}

// ─── Module-level state ───────────────────────────────────────────────────

let running = false;
let currentInterval: DMSInterval = 15;
let lastMovedAt: Date = new Date();
let lastMovedPosition: StoredLocation | null = null;
let alertFired = false;

let checkTimer: ReturnType<typeof setInterval> | null = null;
let locationSub: Subscription | null = null;
let crashSub: { unsubscribe: () => void } | null = null;

let onAlertCallback: (() => void) | null = null;

// ─── Private helpers ──────────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function persistLocation(lat: number, lng: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_LAST_LOCATION,
      JSON.stringify({ lat, lng }),
    );
  } catch {
    // Non-fatal — GPS will still be in the location subscription state
  }
}

function dispatchAlert(): void {
  if (alertFired) return;
  alertFired = true;

  // Strong haptic pattern: 3 sharp pulses + long final buzz
  Vibration.vibrate([0, 500, 150, 500, 150, 500, 200, 1_000]);

  onAlertCallback?.();
}

// ─── Public service object ────────────────────────────────────────────────

export const DeadMansSwitchService = {
  // ── Persistence ────────────────────────────────────────────────────────

  async saveInterval(interval: DMSInterval): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_INTERVAL, String(interval));
    currentInterval = interval;
  },

  async loadInterval(): Promise<DMSInterval> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_INTERVAL);
      if (raw !== null) {
        const parsed = Number(raw);
        if ((DMS_INTERVALS as readonly number[]).includes(parsed)) {
          const validated = parsed as DMSInterval;
          currentInterval = validated;
          return validated;
        }
      }
    } catch {
      // Fall through to default
    }
    return 15;
  },

  // ── State accessors ────────────────────────────────────────────────────

  isRunning: (): boolean => running,

  getLastMovedAt: (): Date | null => (running ? lastMovedAt : null),

  async getLastLocation(): Promise<StoredLocation | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_LAST_LOCATION);
      if (raw !== null) return JSON.parse(raw) as StoredLocation;
    } catch {
      // Fall through
    }
    return null;
  },

  // ── Core lifecycle ──────────────────────────────────────────────────────

  /**
   * Start DMS monitoring.
   *
   * @param interval - Minutes of inactivity before the alert fires.
   * @param onAlert  - Called when the check-in modal should be shown.
   */
  start(interval: DMSInterval, onAlert: () => void): void {
    // Always stop cleanly before re-starting (handles interval change / re-enable)
    DeadMansSwitchService.stop();

    running = true;
    currentInterval = interval;
    alertFired = false;
    lastMovedAt = new Date();
    lastMovedPosition = null;
    onAlertCallback = onAlert;

    // ── Subscribe to background location events ──────────────────────────
    try {
      locationSub = BackgroundGeolocation.onLocation((location: Location) => {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;

        // Always persist the latest fix for escalation messages
        void persistLocation(lat, lng);

        if (lastMovedPosition === null) {
          // First fix after start — initialise the baseline position
          lastMovedPosition = { lat, lng };
          return;
        }

        const dist = haversineMeters(
          lastMovedPosition.lat,
          lastMovedPosition.lng,
          lat,
          lng,
        );

        if (dist > MOVEMENT_THRESHOLD_METERS) {
          // Rider is moving — reset the DMS timer
          lastMovedAt = new Date();
          lastMovedPosition = { lat, lng };
          alertFired = false;
        }
      });
    } catch {
      // BackgroundGeolocation may not be started yet — the periodic check
      // will still fire; GPS coordinates from the last persist will be used.
    }

    // ── Stationary check timer ────────────────────────────────────────────
    checkTimer = setInterval(() => {
      if (!running || alertFired) return;
      const elapsedMs = Date.now() - lastMovedAt.getTime();
      if (elapsedMs >= currentInterval * 60_000) {
        dispatchAlert();
      }
    }, CHECK_INTERVAL_MS);
  },

  /** Stop DMS monitoring. Clears all timers and location subscriptions. */
  stop(): void {
    running = false;
    alertFired = false;
    onAlertCallback = null;

    if (checkTimer !== null) {
      clearInterval(checkTimer);
      checkTimer = null;
    }

    if (locationSub !== null) {
      try {
        locationSub.remove();
      } catch {
        // Non-fatal
      }
      locationSub = null;
    }
  },

  // ── User actions ────────────────────────────────────────────────────────

  /** User confirmed they're OK — restart the DMS interval from now. */
  checkIn(): void {
    if (!running) return;
    lastMovedAt = new Date();
    alertFired = false;
  },

  /**
   * Snooze the DMS by `minutes`.
   * The next alert will fire `minutes` from now (not from the original interval).
   * This backdates lastMovedAt so the check timer sees the correct remaining time.
   */
  snooze(minutes: number): void {
    if (!running) return;
    const snoozeMs = minutes * 60_000;
    // We want the next alert in `snoozeMs`, so set lastMovedAt such that
    // (now - lastMovedAt) = (currentInterval * 60s - snoozeMs)
    const backfillMs = Math.max(0, currentInterval * 60_000 - snoozeMs);
    lastMovedAt = new Date(Date.now() - backfillMs);
    alertFired = false;
  },

  /**
   * Trigger the DMS alert immediately.
   * Called by crash detection or any external safety event.
   * Safe to call even if DMS is currently showing the alert modal
   * (alertFired guard is cleared first).
   */
  triggerImmediately(): void {
    if (!running) return;
    alertFired = false; // Reset guard so dispatchAlert() will fire
    dispatchAlert();
  },

  // ── Escalation ──────────────────────────────────────────────────────────

  /**
   * Escalate to emergency contacts after the 2-minute modal countdown expires
   * with no response.
   *
   * Two-pronged approach:
   *  1. Server-side push alert via fireDMSAlert (works in background)
   *  2. Client-side SMS via Linking (foreground only — best effort)
   *
   * @param groupId - Current group ID, or null if not in a group.
   */
  async escalate(groupId: string | null): Promise<void> {
    const location = await DeadMansSwitchService.getLastLocation();
    const lat = location?.lat;
    const lng = location?.lng;

    // 1. Server-side alert: push notifications + group alert
    try {
      await fireDMSAlert({ groupId: groupId ?? undefined, lat, lng });
    } catch (err) {
      console.warn('[DMS] Server escalation failed — contacts will receive SMS only:', err);
    }

    // 2. Client-side SMS to each emergency contact with coordinates
    try {
      const info = await getMyEmergencyInfo();
      const mapsLink =
        lat !== undefined && lng !== undefined
          ? `https://maps.google.com/?q=${lat},${lng}`
          : 'Location unavailable';
      const smsBody =
        `⚠️ DEAD MAN'S SWITCH — No response from hiker. ` +
        `Last known location: ${mapsLink} — Sent automatically via TrailGuard`;

      for (const contact of info.emergencyContacts) {
        if (!contact.phone) continue;
        const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(smsBody)}`;
        try {
          const canOpen = await Linking.canOpenURL(smsUrl);
          if (canOpen) {
            await Linking.openURL(smsUrl);
          }
        } catch {
          // Non-fatal: server-side push already sent
        }
      }
    } catch (err) {
      console.warn('[DMS] SMS escalation failed:', err);
    }
  },

  // ── Crash detection ─────────────────────────────────────────────────────

  /**
   * Start accelerometer-based crash detection using react-native-sensors.
   * Monitors for G-force spikes ≥ 5G (49 m/s²), indicating a hard fall or crash.
   *
   * Call this alongside start() when DMS is active.
   * Degrades gracefully if sensors are unavailable or permissions are denied.
   *
   * For custom crash detection integrations (e.g. CoreMotion on iOS, hardware
   * crash detectors), call triggerImmediately() directly instead.
   */
  startCrashDetection(): void {
    if (crashSub !== null) return; // Already running

    try {
      const sensors = require('react-native-sensors') as SensorsModule;
      sensors.setUpdateIntervalForType(sensors.SensorTypes.accelerometer, 100);

      crashSub = sensors.accelerometer.subscribe(
        ({ x, y, z }: AccelerometerReading) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          if (magnitude > CRASH_THRESHOLD_MS2) {
            console.warn(
              `[DMS] Crash detected — magnitude: ${magnitude.toFixed(1)} m/s²`,
            );
            DeadMansSwitchService.triggerImmediately();
          }
        },
        () => {
          // Sensor error or unavailable — stop silently
          crashSub = null;
        },
      );
    } catch {
      // react-native-sensors not configured or permissions denied — DMS still works
      // via the stationary timer; crash detection is additive.
    }
  },

  /** Stop accelerometer crash detection. */
  stopCrashDetection(): void {
    if (crashSub !== null) {
      try {
        crashSub.unsubscribe();
      } catch {
        // Non-fatal
      }
      crashSub = null;
    }
  },
};
