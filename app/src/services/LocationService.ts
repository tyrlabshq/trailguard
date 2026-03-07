/**
 * LocationService — PL-05
 *
 * Continuous background location tracking with:
 *   - react-native-background-geolocation (distanceFilter 10m, heartbeat 30s)
 *   - Adaptive update rate (5s fast / 15s slow / 30s stopped)
 *   - Battery saver mode (60s when battery < 20%)
 *   - WebSocket broadcast on every location update
 *   - Offline location queue in AsyncStorage (max 500 entries)
 *   - Satellite handoff detection (NetInfo + Garmin inReach BLE bridge)
 */

import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { SignalSource } from '../../../shared/types';

// ─── Constants ────────────────────────────────────────────────────────────

export const QUEUE_KEY = '@powderlink/location_queue';
const MAX_QUEUE_SIZE = 1000;

// ─── Offline sync constants ──────────────────────────────────────────────────
/** Number of queued pings to POST per REST batch. */
const BATCH_SIZE = 20;
/** Max retry attempts per batch before giving up. */
const MAX_RETRIES = 3;

/** Battery % below which we drop to the battery-saver interval. */
const BATTERY_SAVER_THRESHOLD = 0.2;

// Speed thresholds in mph
const FAST_MPH = 20;
const MOVING_MPH = 5;

// Heartbeat intervals in seconds (fed to BackgroundGeolocation.setConfig)
const HEARTBEAT_FAST = 5;
const HEARTBEAT_SLOW = 15;
const HEARTBEAT_STOPPED = 30;
const HEARTBEAT_BATTERY_SAVER = 60;

// ─── Types ────────────────────────────────────────────────────────────────

export interface QueuedLocation {
  groupId: string;
  riderId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedMph: number;
  altitude: number | null;
  batteryLevel: number;
  signalSource: SignalSource;
  timestamp: number;
}

export interface LocationServiceConfig {
  groupId: string;
  riderId: string;
  /** WebSocket server URL, e.g. ws://api.powderlink.app */
  wsUrl: string;
  /** REST API base URL for offline batch flush, e.g. https://api.powderlink.app */
  apiUrl: string;
  /** Called whenever the signal source changes. */
  onSignalSourceChange?: (source: SignalSource) => void;
}

// ─── Module-level state ───────────────────────────────────────────────────

let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let netInfoUnsubscribe: (() => void) | null = null;

let currentConfig: LocationServiceConfig | null = null;
let currentSignalSource: SignalSource = 'offline';
let satelliteBridgeActive = false;
let lastBatteryLevel = 1.0; // 0.0–1.0

// ─── Signal source ────────────────────────────────────────────────────────

function setSignalSource(source: SignalSource): void {
  if (currentSignalSource === source) return;
  currentSignalSource = source;
  currentConfig?.onSignalSourceChange?.(source);
}

// ─── WebSocket management ─────────────────────────────────────────────────

function openWebSocket(config: LocationServiceConfig): void {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  try {
    const url = `${config.wsUrl}?groupId=${config.groupId}&riderId=${config.riderId}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      setSignalSource('cellular');
      // Drain any queued locations now that we have connectivity
      void flushQueueViaWebSocket();
    };

    ws.onclose = () => {
      ws = null;
      if (!satelliteBridgeActive) {
        setSignalSource('offline');
      }
      scheduleWsReconnect(config);
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    scheduleWsReconnect(config);
  }
}

function scheduleWsReconnect(config: LocationServiceConfig): void {
  if (wsReconnectTimer) return; // Already scheduled
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    openWebSocket(config);
  }, 5_000);
}

function closeWebSocket(): void {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null; // Prevent reconnect on intentional close
    ws.close();
    ws = null;
  }
}

// ─── Satellite bridge (Garmin inReach BLE) ───────────────────────────────

/**
 * Call this from the BLE manager (e.g. react-native-ble-plx) when the
 * Garmin inReach satellite bridge connects or disconnects.
 *
 *  BleManager.onDeviceDisconnected(INREACH_SERVICE_UUID, (err, device) =>
 *    LocationService.notifySatelliteBridge(false)
 *  );
 */
function notifySatelliteBridge(connected: boolean): void {
  satelliteBridgeActive = connected;

  if (connected) {
    // Close the cellular WS — we're routing via satellite now
    closeWebSocket();
    setSignalSource('satellite');
  } else {
    // Back on whatever network is available
    void NetInfo.fetch().then((state: NetInfoState) => {
      if (state.isConnected && currentConfig) {
        openWebSocket(currentConfig);
      } else {
        setSignalSource('offline');
      }
    });
  }
}

// ─── Adaptive rate ────────────────────────────────────────────────────────

/** Returns the heartbeat interval in seconds for the given speed + battery. */
function adaptiveHeartbeat(speedMph: number, batteryLevel: number): number {
  if (batteryLevel < BATTERY_SAVER_THRESHOLD) return HEARTBEAT_BATTERY_SAVER;
  if (speedMph > FAST_MPH) return HEARTBEAT_FAST;
  if (speedMph > MOVING_MPH) return HEARTBEAT_SLOW;
  return HEARTBEAT_STOPPED;
}

/**
 * Push new heartbeat + locationUpdateInterval to BackgroundGeolocation
 * so the OS poll cadence actually changes at runtime.
 */
function applyAdaptiveRate(speedMph: number, batteryLevel: number): void {
  const secs = adaptiveHeartbeat(speedMph, batteryLevel);
  BackgroundGeolocation.setConfig({
    heartbeatInterval: secs,
    // Android-only: controls the minimum time between GPS fixes
    locationUpdateInterval: secs * 1_000,
    fastestLocationUpdateInterval: Math.round((secs * 1_000) / 2),
  }).catch(() => {
    /* non-fatal — config applied on next location event */
  });
}

// ─── Offline queue ────────────────────────────────────────────────────────

async function enqueue(update: QueuedLocation): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedLocation[] = raw ? (JSON.parse(raw) as QueuedLocation[]) : [];
  queue.push(update);
  // Drop oldest entries when over capacity
  const trimmed =
    queue.length > MAX_QUEUE_SIZE
      ? queue.slice(queue.length - MAX_QUEUE_SIZE)
      : queue;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
}

async function flushQueueViaWebSocket(): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue: QueuedLocation[] = JSON.parse(raw) as QueuedLocation[];
  if (queue.length === 0) return;
  try {
    ws.send(JSON.stringify({ type: 'location_batch', data: queue }));
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    /* Will retry on next flush tick */
  }
}

/**
 * Flush the offline queue to the REST API in batches of BATCH_SIZE.
 * Each batch is attempted up to MAX_RETRIES times with exponential backoff
 * (1s → 2s → 4s). Successfully sent entries are removed from storage
 * immediately, so a mid-flush crash won't cause duplicate sends on the
 * next attempt (idempotency is guaranteed by the backend deduplicating on
 * riderId + timestamp).
 */
async function flushQueueViaRest(apiUrl: string): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;

  const fullQueue: QueuedLocation[] = JSON.parse(raw) as QueuedLocation[];
  if (fullQueue.length === 0) return;

  let sentCount = 0;

  while (sentCount < fullQueue.length) {
    const batch = fullQueue.slice(sentCount, sentCount + BATCH_SIZE);
    let success = false;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Exponential backoff: 0ms, 1000ms, 2000ms, 4000ms …
      if (attempt > 0) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 1_000 * Math.pow(2, attempt - 1)),
        );
      }

      try {
        const res = await fetch(`${apiUrl}/locations/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations: batch }),
        });
        if (res.ok) {
          success = true;
          break;
        }
      } catch {
        /* retry */
      }
    }

    if (success) {
      sentCount += batch.length;
      // Persist the remaining (unsent) portion of the queue
      const remaining = fullQueue.slice(sentCount);
      if (remaining.length === 0) {
        await AsyncStorage.removeItem(QUEUE_KEY);
      } else {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      }
    } else {
      // Batch failed after all retries — leave the rest in queue, try next flush
      break;
    }
  }
}

// ─── Location broadcast ───────────────────────────────────────────────────

async function broadcastLocation(
  location: Location,
  config: LocationServiceConfig,
): Promise<void> {
  const speedMph = (location.coords.speed ?? 0) * 2.237;
  const batteryLevel = location.battery?.level ?? lastBatteryLevel;
  lastBatteryLevel = batteryLevel;

  // Adjust polling cadence for current speed + battery
  applyAdaptiveRate(speedMph, batteryLevel);

  const update: QueuedLocation = {
    groupId: config.groupId,
    riderId: config.riderId,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    heading: location.coords.heading ?? null,
    speedMph,
    altitude:
      location.coords.altitude != null
        ? location.coords.altitude * 3.281 // metres → feet
        : null,
    batteryLevel,
    signalSource: currentSignalSource,
    timestamp: location.timestamp
      ? new Date(location.timestamp).getTime()
      : Date.now(),
  };

  // ── Route selection ──────────────────────────────────────────────────
  // 1. Satellite bridge active → queue for inReach drain
  if (satelliteBridgeActive) {
    setSignalSource('satellite');
    await enqueue(update);
    return;
  }

  // 2. WebSocket open → broadcast directly
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'location_update', data: update }));
      return;
    } catch {
      /* Fall through to queue */
    }
  }

  // 3. No connectivity → queue for later
  setSignalSource('offline');
  await enqueue(update);
}

// ─── Network monitoring ───────────────────────────────────────────────────

function startNetworkMonitor(config: LocationServiceConfig): void {
  netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected ?? false;

    if (online && !satelliteBridgeActive) {
      // Re-open WebSocket (idempotent if already open)
      openWebSocket(config);
    } else if (!online && !satelliteBridgeActive) {
      setSignalSource('offline');
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────

export const LocationService = {
  /**
   * Configure and start background location tracking.
   * Safe to call again after stop() — re-initialises everything.
   */
  start: async (config: LocationServiceConfig): Promise<void> => {
    currentConfig = config;

    // ── BackgroundGeolocation ──────────────────────────────────────────
    await BackgroundGeolocation.ready({
      // Accuracy + distance
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10, // trigger on every 10m of movement

      // iOS permission: must be "Always" for background operation
      locationAuthorizationRequest: 'Always',

      // Stationary heartbeat (overridden at runtime via applyAdaptiveRate)
      heartbeatInterval: HEARTBEAT_STOPPED,

      // Keep tracking after app killed / on device reboot
      stopOnTerminate: false,
      startOnBoot: true,
      stopTimeout: 1,

      // Prevent iOS from suspending location updates
      preventSuspend: true,

      // Logging
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,

      // Android foreground service notification (required for background)
      notification: {
        title: 'PowderLink Active',
        text: 'Sharing location with your group',
        sticky: true,
      },
    });

    // ── Event listeners ───────────────────────────────────────────────
    BackgroundGeolocation.onLocation((location) => {
      void broadcastLocation(location, config);
    });

    // Heartbeat fires while stationary — get a fresh fix and broadcast
    BackgroundGeolocation.onHeartbeat(() => {
      BackgroundGeolocation.getCurrentPosition({
        samples: 1,
        persist: false,
        timeout: 10,
      })
        .then((loc) => broadcastLocation(loc, config))
        .catch(() => {
          /* non-fatal */
        });
    });

    // ── WebSocket + network monitor ───────────────────────────────────
    openWebSocket(config);
    startNetworkMonitor(config);

    // Periodic safety-net flush (every 15 s)
    flushTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        void flushQueueViaWebSocket();
      } else {
        void flushQueueViaRest(config.apiUrl);
      }
    }, 15_000);

    await BackgroundGeolocation.start();
  },

  /** Stop tracking and tear down all listeners / timers. */
  stop: async (): Promise<void> => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    if (netInfoUnsubscribe) {
      netInfoUnsubscribe();
      netInfoUnsubscribe = null;
    }
    closeWebSocket();
    BackgroundGeolocation.removeListeners();
    await BackgroundGeolocation.stop();
    currentConfig = null;
    currentSignalSource = 'offline';
    satelliteBridgeActive = false;
  },

  /** Current signal source ('cellular' | 'satellite' | 'offline'). */
  getSignalSource: (): SignalSource => currentSignalSource,

  /**
   * Notify the service when a Garmin inReach BLE bridge connects/disconnects.
   * Wire into your BLE manager:
   *
   *   bleManager.onDeviceDisconnected(INREACH_UUID, () =>
   *     LocationService.notifySatelliteBridge(false)
   *   );
   */
  notifySatelliteBridge,

  /**
   * Manually flush the offline queue (e.g. after satellite upload completes).
   */
  flushOfflineQueue: (): Promise<void> =>
    currentConfig
      ? flushQueueViaRest(currentConfig.apiUrl)
      : Promise.resolve(),

  /**
   * Return the number of location pings currently sitting in the offline queue.
   * Safe to call from any component/hook without starting the service.
   */
  getQueueSize: async (): Promise<number> => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return 0;
      const queue: QueuedLocation[] = JSON.parse(raw) as QueuedLocation[];
      return queue.length;
    } catch {
      return 0;
    }
  },
};
