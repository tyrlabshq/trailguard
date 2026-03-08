/**
 * useMeshtastic.ts
 *
 * React hook for Meshtastic LoRa mesh radio integration.
 * Handles BLE scanning, connection, and real-time mesh packet reception.
 *
 * Usage:
 *   const { isConnected, meshNodes, scanAndConnect, broadcastPosition } = useMeshtastic();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  meshtasticService,
  type MeshNode,
  type MeshMessage,
  type BleDevice,
} from '../services/MeshtasticService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_DEVICE = 'meshtastic_last_device_id';
const NODE_STALE_MS = 60_000; // drop nodes not heard in 60s

export interface UseMeshtasticResult {
  isConnected: boolean;
  connectedDevice: string | null;
  meshNodes: MeshNode[];
  lastMeshMessage: MeshMessage | null;
  isScanning: boolean;
  scanError: string | null;
  nearbyDevices: BleDevice[];
  scanAndConnect: () => Promise<void>;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  broadcastPosition: (lat: number, lng: number, altitude?: number) => void;
  sendMessage: (text: string) => void;
}

export function useMeshtastic(): UseMeshtasticResult {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [meshNodes, setMeshNodes] = useState<MeshNode[]>([]);
  const [lastMeshMessage, setLastMeshMessage] = useState<MeshMessage | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [nearbyDevices, setNearbyDevices] = useState<BleDevice[]>([]);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to incoming mesh packets
  useEffect(() => {
    unsubscribeRef.current = meshtasticService.onPacket((msg) => {
      setLastMeshMessage(msg);
      // Refresh node list whenever a packet arrives
      setMeshNodes(meshtasticService.getNodes());
    });

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, []);

  // Stale node cleanup
  useEffect(() => {
    staleTimerRef.current = setInterval(() => {
      const cutoff = Date.now() - NODE_STALE_MS;
      setMeshNodes((prev) =>
        prev.filter((node) => node.lastHeard.getTime() >= cutoff),
      );
    }, 15_000);

    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
    };
  }, []);

  // Try to auto-reconnect to last known device on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_DEVICE)
      .then(async (lastId) => {
        if (lastId && !meshtasticService.isConnected()) {
          try {
            await meshtasticService.connect(lastId);
            setConnectedDevice(lastId);
            setIsConnected(true);
          } catch {
            // Auto-reconnect failed — user will reconnect manually
          }
        }
      })
      .catch(() => {});
  }, []);

  const connectToDevice = useCallback(async (deviceId: string) => {
    setScanError(null);
    try {
      await meshtasticService.connect(deviceId);
      setConnectedDevice(deviceId);
      setIsConnected(true);
      await AsyncStorage.setItem(STORAGE_KEY_DEVICE, deviceId).catch(() => {});
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : 'Connection failed');
      throw e;
    }
  }, []);

  const scanAndConnect = useCallback(async () => {
    setScanError(null);
    setIsScanning(true);
    setNearbyDevices([]);

    try {
      const devices = await meshtasticService.scanForDevices(6000);
      setNearbyDevices(devices);

      if (devices.length === 0) {
        setScanError('No Meshtastic devices found nearby. Is the device powered on and BLE enabled?');
        return;
      }

      // Auto-connect to the first (strongest signal) device if only one found
      if (devices.length === 1) {
        await connectToDevice(devices[0].id);
      }
      // If multiple found, caller should show selection UI (nearbyDevices will be populated)
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [connectToDevice]);

  const disconnect = useCallback(() => {
    meshtasticService.disconnect().catch(() => {});
    setIsConnected(false);
    setConnectedDevice(null);
    setMeshNodes([]);
    AsyncStorage.removeItem(STORAGE_KEY_DEVICE).catch(() => {});
  }, []);

  const broadcastPosition = useCallback(
    (lat: number, lng: number, altitude: number = 0) => {
      meshtasticService.broadcastPosition(lat, lng, altitude).catch(() => {
        // Non-fatal — mesh may be temporarily unavailable
      });
    },
    [],
  );

  const sendMessage = useCallback((text: string) => {
    meshtasticService.sendMessage(text).catch(() => {});
  }, []);

  return {
    isConnected,
    connectedDevice,
    meshNodes,
    lastMeshMessage,
    isScanning,
    scanError,
    nearbyDevices,
    scanAndConnect,
    connectToDevice,
    disconnect,
    broadcastPosition,
    sendMessage,
  };
}
