/**
 * MeshtasticService.ts — TrailGuard
 *
 * BLE integration for Meshtastic LoRa mesh radio devices.
 * Handles device discovery, connection, and packet send/receive.
 *
 * Meshtastic BLE UUIDs:
 *   Service:    6ba4e922-27ef-4b89-a32e-a84a877ece5f
 *   TORADIO:    f75c76d2-129e-4dad-a1dd-7866124401e7  (write — send to mesh)
 *   FROMRADIO:  8ba2bcc2-ee02-4a55-a531-c525c5e454d5  (notify — receive from mesh)
 *
 * Packets are Meshtastic protobufs. This implementation uses a hand-rolled
 * minimal protobuf encoder/decoder (no external library) for MVP.
 *
 * Position encoding:
 *   lat/lng stored as int32 × 1e-7 (fixed-point, Meshtastic convention)
 */

import BleManager, {
  type Peripheral,
  type BleManagerDidUpdateValueForCharacteristicEvent,
} from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// ─── Meshtastic BLE Constants ─────────────────────────────────────────────────

export const MESH_SERVICE_UUID = '6ba4e922-27ef-4b89-a32e-a84a877ece5f';
export const TORADIO_UUID = 'f75c76d2-129e-4dad-a1dd-7866124401e7';
export const FROMRADIO_UUID = '8ba2bcc2-ee02-4a55-a531-c525c5e454d5';
export const FROMNUM_UUID = '8ba2bcc2-ee02-4a55-a531-c525c5e454d6';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeshNode {
  nodeId: number;
  longName: string;
  shortName: string;
  lat?: number;
  lng?: number;
  altitude?: number;
  lastHeard: Date;
  batteryLevel?: number;
  snr?: number;
}

export interface MeshMessage {
  from: number;
  to: number;
  text?: string;
  position?: { lat: number; lng: number; altitude?: number };
  timestamp: Date;
}

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
}

type PacketHandler = (message: MeshMessage) => void;

// ─── Minimal Protobuf Encoder/Decoder ────────────────────────────────────────
// Meshtastic uses protobuf. We implement just enough for MVP position packets.
// Full spec: https://buf.build/meshtastic/protobufs

/** Encode a varint (variable-length integer) — signed values use zigzag encoding */
function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let v = value >>> 0; // treat as unsigned for encoding
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v & 0x7f);
  return bytes;
}

/** Zigzag encode signed int32 to unsigned for protobuf sint32 */
function zigzagEncode(n: number): number {
  return ((n << 1) ^ (n >> 31)) >>> 0;
}

/** Zigzag decode protobuf sint32 back to signed */
function zigzagDecode(n: number): number {
  return (n >>> 1) ^ -(n & 1);
}

/** Encode a protobuf field tag */
function fieldTag(fieldNumber: number, wireType: number): number[] {
  return encodeVarint((fieldNumber << 3) | wireType);
}

/** Decode varint from byte array starting at offset; returns [value, newOffset] */
function decodeVarint(bytes: number[], offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let byte: number;
  do {
    if (offset >= bytes.length) break;
    byte = bytes[offset++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte & 0x80);
  return [result >>> 0, offset];
}

/**
 * Encode a minimal Meshtastic Position protobuf.
 * Position proto fields:
 *   1: latitude_i  (sint32 = lat * 1e7) — wire type 0 (varint)
 *   2: longitude_i (sint32 = lng * 1e7) — wire type 0 (varint)
 *   3: altitude    (int32, meters)      — wire type 0 (varint)
 */
function encodePosition(lat: number, lng: number, altitudeM: number = 0): number[] {
  const latI = Math.round(lat * 1e7);
  const lngI = Math.round(lng * 1e7);
  const altI = Math.round(altitudeM);

  return [
    ...fieldTag(1, 0), ...encodeVarint(zigzagEncode(latI)),
    ...fieldTag(2, 0), ...encodeVarint(zigzagEncode(lngI)),
    ...fieldTag(3, 0), ...encodeVarint(altI >= 0 ? altI : 0),
  ];
}

/**
 * Wrap a payload in a minimal ToRadio packet.
 * ToRadio proto:
 *   packet (field 1, wire type 2/length-delimited): MeshPacket
 *
 * MeshPacket fields we need:
 *   1: to (uint32) — broadcast = 0xFFFFFFFF
 *   3: channel (uint32) — 0 = default
 *   8: decoded (Data sub-message, wire type 2)
 *
 * Data fields:
 *   1: portnum (uint32) — 3 = POSITION_APP
 *   2: payload (bytes) — encoded Position proto
 */
function buildPositionPacket(lat: number, lng: number, altitude: number = 0): number[] {
  const positionBytes = encodePosition(lat, lng, altitude);

  // Data message: portnum=3 (POSITION_APP), payload=positionBytes
  const dataPayload = [
    ...fieldTag(1, 0), ...encodeVarint(3),           // portnum = POSITION_APP
    ...fieldTag(2, 2), ...encodeVarint(positionBytes.length), ...positionBytes,
  ];

  // MeshPacket: to=0xFFFFFFFF (broadcast), channel=0, decoded=dataPayload
  const BROADCAST = 0xffffffff;
  const meshPacket = [
    ...fieldTag(1, 0), ...encodeVarint(BROADCAST),   // to = broadcast
    ...fieldTag(3, 0), ...encodeVarint(0),            // channel = 0
    ...fieldTag(8, 2), ...encodeVarint(dataPayload.length), ...dataPayload,
  ];

  // ToRadio: packet=meshPacket
  const toRadio = [
    ...fieldTag(1, 2), ...encodeVarint(meshPacket.length), ...meshPacket,
  ];

  return toRadio;
}

/**
 * Build a text message packet.
 * Data portnum=1 = TEXT_MESSAGE_APP
 */
function buildTextPacket(text: string, channelIndex: number = 0): number[] {
  const textBytes = Array.from(new TextEncoder().encode(text));

  const dataPayload = [
    ...fieldTag(1, 0), ...encodeVarint(1),             // portnum = TEXT_MESSAGE_APP
    ...fieldTag(2, 2), ...encodeVarint(textBytes.length), ...textBytes,
  ];

  const BROADCAST = 0xffffffff;
  const meshPacket = [
    ...fieldTag(1, 0), ...encodeVarint(BROADCAST),
    ...fieldTag(3, 0), ...encodeVarint(channelIndex),
    ...fieldTag(8, 2), ...encodeVarint(dataPayload.length), ...dataPayload,
  ];

  const toRadio = [
    ...fieldTag(1, 2), ...encodeVarint(meshPacket.length), ...meshPacket,
  ];

  return toRadio;
}

/**
 * Attempt to decode a FromRadio packet from raw bytes.
 * Returns a MeshMessage if position or text content is found, null otherwise.
 * This is a best-effort parser — unknown fields are safely skipped.
 */
function decodeFromRadio(bytes: number[]): MeshMessage | null {
  let offset = 0;
  let fromNodeId = 0;
  let toNodeId = 0;
  let posLat: number | undefined;
  let posLng: number | undefined;
  let posAlt: number | undefined;
  let textContent: string | undefined;

  // We attempt to find a MeshPacket at field 1 of FromRadio
  while (offset < bytes.length) {
    if (offset >= bytes.length) break;
    const [tag, o1] = decodeVarint(bytes, offset);
    offset = o1;
    const fieldNum = tag >>> 3;
    const wireType = tag & 0x7;

    if (wireType === 0) {
      // varint
      const [_val, o2] = decodeVarint(bytes, offset);
      offset = o2;
    } else if (wireType === 2) {
      // length-delimited
      const [len, o2] = decodeVarint(bytes, offset);
      offset = o2;
      const subBytes = bytes.slice(offset, offset + len);
      offset += len;

      if (fieldNum === 1) {
        // MeshPacket — parse it
        const result = parseMeshPacket(subBytes);
        if (result) {
          fromNodeId = result.from;
          toNodeId = result.to;
          posLat = result.lat;
          posLng = result.lng;
          posAlt = result.alt;
          textContent = result.text;
        }
      }
    } else {
      // Unknown wire type — bail out to avoid infinite loop
      break;
    }
  }

  if (!fromNodeId && !posLat && !textContent) return null;

  const msg: MeshMessage = {
    from: fromNodeId,
    to: toNodeId,
    timestamp: new Date(),
  };

  if (posLat !== undefined && posLng !== undefined) {
    msg.position = { lat: posLat, lng: posLng, altitude: posAlt };
  }
  if (textContent) {
    msg.text = textContent;
  }

  return msg;
}

interface ParsedPacket {
  from: number;
  to: number;
  lat?: number;
  lng?: number;
  alt?: number;
  text?: string;
}

function parseMeshPacket(bytes: number[]): ParsedPacket | null {
  let offset = 0;
  const packet: ParsedPacket = { from: 0, to: 0 };

  while (offset < bytes.length) {
    const [tag, o1] = decodeVarint(bytes, offset);
    offset = o1;
    const fieldNum = tag >>> 3;
    const wireType = tag & 0x7;

    if (wireType === 0) {
      const [val, o2] = decodeVarint(bytes, offset);
      offset = o2;
      if (fieldNum === 1) packet.to = val;
      else if (fieldNum === 2) packet.from = val;
    } else if (wireType === 2) {
      const [len, o2] = decodeVarint(bytes, offset);
      offset = o2;
      const subBytes = bytes.slice(offset, offset + len);
      offset += len;

      // field 8 = decoded (Data message), field 6 = encrypted
      if (fieldNum === 8) {
        parseDataPayload(subBytes, packet);
      }
    } else {
      break;
    }
  }

  return packet.from || packet.to ? packet : null;
}

function parseDataPayload(bytes: number[], packet: ParsedPacket): void {
  let offset = 0;
  let portnum = 0;
  let payloadBytes: number[] = [];

  while (offset < bytes.length) {
    const [tag, o1] = decodeVarint(bytes, offset);
    offset = o1;
    const fieldNum = tag >>> 3;
    const wireType = tag & 0x7;

    if (wireType === 0) {
      const [val, o2] = decodeVarint(bytes, offset);
      offset = o2;
      if (fieldNum === 1) portnum = val;
    } else if (wireType === 2) {
      const [len, o2] = decodeVarint(bytes, offset);
      offset = o2;
      const subBytes = bytes.slice(offset, offset + len);
      offset += len;
      if (fieldNum === 2) payloadBytes = subBytes;
    } else {
      break;
    }
  }

  if (portnum === 3 && payloadBytes.length > 0) {
    // POSITION_APP — parse Position proto
    parsePositionProto(payloadBytes, packet);
  } else if (portnum === 1 && payloadBytes.length > 0) {
    // TEXT_MESSAGE_APP
    packet.text = new TextDecoder().decode(new Uint8Array(payloadBytes));
  }
}

function parsePositionProto(bytes: number[], packet: ParsedPacket): void {
  let offset = 0;
  while (offset < bytes.length) {
    const [tag, o1] = decodeVarint(bytes, offset);
    offset = o1;
    const fieldNum = tag >>> 3;
    const wireType = tag & 0x7;

    if (wireType === 0) {
      const [val, o2] = decodeVarint(bytes, offset);
      offset = o2;
      if (fieldNum === 1) packet.lat = zigzagDecode(val) * 1e-7;
      else if (fieldNum === 2) packet.lng = zigzagDecode(val) * 1e-7;
      else if (fieldNum === 3) packet.alt = val;
    } else if (wireType === 2) {
      const [len, o2] = decodeVarint(bytes, offset);
      offset = o2 + len;
    } else {
      break;
    }
  }
}

// ─── Service Class ────────────────────────────────────────────────────────────

export class MeshtasticService {
  private connectedDeviceId: string | null = null;
  private nodes: Map<number, MeshNode> = new Map();
  private packetHandlers: PacketHandler[] = [];
  private bleEmitter: NativeEventEmitter | null = null;
  private notificationSubscription: ReturnType<NativeEventEmitter['addListener']> | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await BleManager.start({ showAlert: false });
    this.initialized = true;

    const bleManagerModule = NativeModules.BleManager;
    if (bleManagerModule) {
      this.bleEmitter = new NativeEventEmitter(bleManagerModule);
    }
  }

  /** Scan for nearby Meshtastic devices. Filters by service UUID when possible. */
  async scanForDevices(timeoutMs: number = 5000): Promise<BleDevice[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const discovered: Map<string, BleDevice> = new Map();

      const stopListener = this.bleEmitter?.addListener(
        'BleManagerStopScan',
        () => {
          stopListener?.remove();
          discoverListener?.remove();
          resolve(Array.from(discovered.values()));
        },
      );

      const discoverListener = this.bleEmitter?.addListener(
        'BleManagerDiscoverPeripheral',
        (peripheral: Peripheral) => {
          // Accept any device named with "Meshtastic" or matching our service UUID
          const isMeshtastic =
            peripheral.name?.toLowerCase().includes('meshtastic') ||
            peripheral.advertising.serviceUUIDs?.some(
              (uuid) => uuid.toLowerCase() === MESH_SERVICE_UUID.toLowerCase(),
            );

          if (isMeshtastic) {
            discovered.set(peripheral.id, {
              id: peripheral.id,
              name: peripheral.name ?? `Meshtastic ${peripheral.id.slice(-4)}`,
              rssi: peripheral.rssi,
            });
          }
        },
      );

      BleManager.scan({
        serviceUUIDs: [MESH_SERVICE_UUID],
        seconds: Math.ceil(timeoutMs / 1000),
        allowDuplicates: false,
      }).catch((err: unknown) => {
        stopListener?.remove();
        discoverListener?.remove();
        reject(err instanceof Error ? err : new Error('Scan failed'));
      });
    });
  }

  /** Connect to a Meshtastic device and subscribe to incoming packets. */
  async connect(deviceId: string): Promise<void> {
    await this.initialize();
    await BleManager.connect(deviceId);
    await BleManager.retrieveServices(deviceId);

    this.connectedDeviceId = deviceId;

    // Subscribe to FROMRADIO notifications
    await BleManager.startNotification(deviceId, MESH_SERVICE_UUID, FROMRADIO_UUID);

    // Remove old subscription if any
    this.notificationSubscription?.remove();
    this.notificationSubscription = this.bleEmitter?.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      (event: BleManagerDidUpdateValueForCharacteristicEvent) => {
        if (
          event.peripheral !== deviceId ||
          event.characteristic.toLowerCase() !== FROMRADIO_UUID.toLowerCase()
        ) return;

        const bytes: number[] = event.value;
        const message = decodeFromRadio(bytes);
        if (!message) return;

        // Update our node table if it's a position packet
        if (message.position && message.from) {
          const existing = this.nodes.get(message.from);
          this.nodes.set(message.from, {
            nodeId: message.from,
            longName: existing?.longName ?? `Node ${message.from.toString(16)}`,
            shortName: existing?.shortName ?? `N${message.from.toString(16).slice(-2)}`,
            lat: message.position.lat,
            lng: message.position.lng,
            altitude: message.position.altitude,
            lastHeard: new Date(),
            batteryLevel: existing?.batteryLevel,
            snr: existing?.snr,
          });
        }

        // Dispatch to all handlers
        for (const handler of this.packetHandlers) {
          try { handler(message); } catch { /* non-fatal */ }
        }
      },
    ) ?? null;
  }

  async disconnect(): Promise<void> {
    if (!this.connectedDeviceId) return;
    this.notificationSubscription?.remove();
    this.notificationSubscription = null;

    try {
      await BleManager.stopNotification(
        this.connectedDeviceId,
        MESH_SERVICE_UUID,
        FROMRADIO_UUID,
      );
      await BleManager.disconnect(this.connectedDeviceId);
    } catch {
      // Best effort
    } finally {
      this.connectedDeviceId = null;
    }
  }

  /** Broadcast a GPS position packet to the mesh. */
  async broadcastPosition(lat: number, lng: number, altitude: number = 0): Promise<void> {
    if (!this.connectedDeviceId) throw new Error('Not connected to Meshtastic device');

    const packet = buildPositionPacket(lat, lng, altitude);
    await BleManager.write(
      this.connectedDeviceId,
      MESH_SERVICE_UUID,
      TORADIO_UUID,
      packet,
      packet.length,
    );
  }

  /** Send a text message to the mesh channel. */
  async sendMessage(text: string, channelIndex: number = 0): Promise<void> {
    if (!this.connectedDeviceId) throw new Error('Not connected to Meshtastic device');

    const packet = buildTextPacket(text, channelIndex);
    await BleManager.write(
      this.connectedDeviceId,
      MESH_SERVICE_UUID,
      TORADIO_UUID,
      packet,
      packet.length,
    );
  }

  /**
   * Subscribe to incoming mesh packets.
   * Returns an unsubscribe function.
   */
  onPacket(handler: PacketHandler): () => void {
    this.packetHandlers.push(handler);
    return () => {
      const idx = this.packetHandlers.indexOf(handler);
      if (idx >= 0) this.packetHandlers.splice(idx, 1);
    };
  }

  getNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }
}

// Singleton
export const meshtasticService = new MeshtasticService();
