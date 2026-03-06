import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@powderlink/location_queue';
const MAX_QUEUE_SIZE = 500;

interface QueuedUpdate {
  groupId: string;
  riderId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedMph: number;
  altitude: number | null;
  timestamp: number;
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

async function enqueue(update: QueuedUpdate): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedUpdate[] = raw ? JSON.parse(raw) : [];
  queue.push(update);
  // Cap at max size — drop oldest
  const trimmed = queue.length > MAX_QUEUE_SIZE
    ? queue.slice(queue.length - MAX_QUEUE_SIZE)
    : queue;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
}

async function flushQueue(apiUrl: string): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue: QueuedUpdate[] = JSON.parse(raw);
  if (queue.length === 0) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  try {
    const res = await fetch(`${apiUrl}/locations/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: queue }),
    });
    if (res.ok) {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // Will retry on next flush cycle
  }
}

async function sendLocationUpdate(
  groupId: string,
  riderId: string,
  location: Location,
  _interval: number,
  apiUrl: string,
): Promise<void> {
  const speedMph = (location.coords.speed ?? 0) * 2.237;
  const update: QueuedUpdate = {
    groupId,
    riderId,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    heading: location.coords.heading,
    speedMph,
    altitude: location.coords.altitude
      ? location.coords.altitude * 3.281
      : null,
    timestamp: location.timestamp
      ? new Date(location.timestamp).getTime()
      : Date.now(),
  };

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    await enqueue(update);
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      await enqueue(update);
    }
  } catch {
    await enqueue(update);
  }
}

export const LocationService = {
  configure: (groupId: string, riderId: string, apiUrl: string) => {
    BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10,
      stopTimeout: 1,
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,
      stopOnTerminate: false,
      startOnBoot: true,
      heartbeatInterval: 30,
      notification: {
        title: 'PowderLink Active',
        text: 'Sharing location with your group',
      },
    });

    BackgroundGeolocation.onLocation((location) => {
      const speedMph = (location.coords.speed ?? 0) * 2.237;
      // Adaptive interval: fast moving = 5s, slow = 15s, stopped = 30s
      const interval =
        speedMph > 20 ? 5000 : speedMph > 5 ? 15000 : 30000;
      sendLocationUpdate(groupId, riderId, location, interval, apiUrl);
    });

    // Periodic queue flush
    flushTimer = setInterval(() => flushQueue(apiUrl), 15000);

    BackgroundGeolocation.start();
  },

  stop: () => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    BackgroundGeolocation.stop();
  },
};
