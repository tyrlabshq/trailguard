/**
 * GarminService.ts — TrailGuard
 *
 * Polls Garmin MapShare for a rider's inReach GPS location via satellite.
 * No cell signal required on the device end — Garmin uses their own satellite network.
 *
 * API: https://share.garmin.com/Feed/Share/{mapshareId}?d1=YYYY-MM-DDTHH:MM:SSZ&d2=YYYY-MM-DDTHH:MM:SSZ
 * Returns KML/XML with the device's latest position events.
 */

export interface GarminLocation {
  mapshareId: string;
  lat: number;
  lng: number;
  altitude_m: number;
  speed_mph: number;
  timestamp: string;
  deviceName: string;
  batteryLevel?: number;
  inEmergency: boolean;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const BASE_URL = 'https://share.garmin.com/Feed/Share';
const KMH_TO_MPH = 0.621371;

export class GarminService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Start polling a MapShare ID every 30 seconds.
   * Calls onUpdate whenever a new location is fetched.
   */
  async startPolling(
    mapshareId: string,
    onUpdate: (loc: GarminLocation) => void,
  ): Promise<void> {
    this.stopPolling();

    // Fetch immediately, then on interval
    const fetch = async () => {
      try {
        const loc = await this.fetchLocation(mapshareId);
        if (loc) onUpdate(loc);
      } catch {
        // Non-fatal — satellite comms can be spotty
      }
    };

    await fetch();
    this.intervalId = setInterval(fetch, POLL_INTERVAL_MS);
  }

  stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Fetch latest location once. Returns null if the device has no recent data.
   */
  async fetchLocation(mapshareId: string): Promise<GarminLocation | null> {
    // Clean up the ID in case the user pasted the full URL
    const cleanId = extractMapshareId(mapshareId);

    // Request the last 24 hours of data to ensure we get the latest point
    const now = new Date();
    const d2 = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');

    const url = `${BASE_URL}/${encodeURIComponent(cleanId)}?d1=${d1}&d2=${d2}`;

    const response = await fetch(url, {
      headers: { Accept: 'application/xml, text/xml, */*' },
    });

    if (!response.ok) {
      if (response.status === 404) return null; // Unknown MapShare ID
      throw new Error(`MapShare API error: ${response.status}`);
    }

    const xml = await response.text();
    return this.parseMapShareKML(xml, cleanId);
  }

  /**
   * Parse Garmin MapShare KML/XML response.
   * Note: Garmin uses lng,lat,alt order (not lat,lng!) in <coordinates>.
   */
  private parseMapShareKML(xml: string, mapshareId: string): GarminLocation | null {
    // Extract all Placemarks — take the most recent one (last in document)
    const placemarkMatches = xml.match(/<Placemark[\s\S]*?<\/Placemark>/g);
    if (!placemarkMatches || placemarkMatches.length === 0) return null;

    // Parse all placemarks and return the most recent
    const locations: GarminLocation[] = [];
    for (const placemark of placemarkMatches) {
      const loc = parsePlacemark(placemark, mapshareId);
      if (loc) locations.push(loc);
    }

    if (locations.length === 0) return null;

    // Sort by timestamp descending, return the latest
    locations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return locations[0];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract just the MapShare identifier from a URL or raw ID.
 * Handles inputs like:
 *   - "JohnSmith"
 *   - "https://share.garmin.com/JohnSmith"
 *   - "share.garmin.com/Feed/Share/JohnSmith"
 */
function extractMapshareId(input: string): string {
  const trimmed = input.trim();
  // URL format — extract last path segment
  const urlMatch = trimmed.match(/(?:share\.garmin\.com\/(?:Feed\/Share\/)?)?([^/?#]+)\s*$/i);
  return urlMatch ? urlMatch[1] : trimmed;
}

function parsePlacemark(placemark: string, mapshareId: string): GarminLocation | null {
  // Extract coordinates — lng,lat,alt (Garmin uses lng first!)
  const coordMatch = placemark.match(/<coordinates>\s*([-\d.]+),([-\d.]+),([-\d.]+)\s*<\/coordinates>/);
  if (!coordMatch) return null;

  const lng = parseFloat(coordMatch[1]);
  const lat = parseFloat(coordMatch[2]);
  const altitude_m = parseFloat(coordMatch[3]);

  if (isNaN(lat) || isNaN(lng)) return null;

  // Extract timestamp
  const timeMatch = placemark.match(/<when>(.*?)<\/when>/);
  const timestamp = timeMatch ? timeMatch[1].trim() : new Date().toISOString();

  // Extract extended data fields
  const velocity = extractDataField(placemark, 'Velocity');
  const deviceName = extractDataField(placemark, 'Device') ?? 'inReach';
  const eventType = extractDataField(placemark, 'Event') ?? '';
  const batteryStr = extractDataField(placemark, 'Battery');
  const batteryPctStr = extractDataField(placemark, 'BatteryPercentage');

  // Speed: Garmin reports km/h, convert to mph
  const speedKmh = velocity ? parseFloat(velocity) : 0;
  const speed_mph = isNaN(speedKmh) ? 0 : speedKmh * KMH_TO_MPH;

  // Battery
  let batteryLevel: number | undefined;
  if (batteryPctStr) {
    const pct = parseFloat(batteryPctStr);
    if (!isNaN(pct)) batteryLevel = Math.round(pct);
  } else if (batteryStr) {
    const pct = parseFloat(batteryStr);
    if (!isNaN(pct)) batteryLevel = Math.round(pct);
  }

  // Emergency detection — SOS events
  const inEmergency = /sos|emergency/i.test(eventType);

  return {
    mapshareId,
    lat,
    lng,
    altitude_m,
    speed_mph,
    timestamp,
    deviceName,
    batteryLevel,
    inEmergency,
  };
}

/**
 * Extract a value from a Garmin ExtendedData field.
 * Matches: <Data name="FieldName"><value>...</value></Data>
 */
function extractDataField(xml: string, fieldName: string): string | null {
  const regex = new RegExp(
    `<Data\\s+name=["']${fieldName}["'][^>]*>\\s*<value>([^<]*)<\\/value>`,
    'i',
  );
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Singleton export for convenience
export const garminService = new GarminService();
