/**
 * MeshtasticSetupScreen.tsx
 *
 * Lets the rider pair their Meshtastic LoRa device via BLE.
 * Shows scan results, connection status, and connected node info.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { useMeshtastic } from '../hooks/useMeshtastic';
import type { BleDevice, MeshNode } from '../services/MeshtasticService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const MESHTASTIC_DOCS_URL = 'https://meshtastic.org/docs/getting-started/';

export default function MeshtasticSetupScreen() {
  const {
    isConnected,
    connectedDevice,
    meshNodes,
    isScanning,
    scanError,
    nearbyDevices,
    scanAndConnect,
    connectToDevice,
    disconnect,
  } = useMeshtastic();

  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = useCallback(async (device: BleDevice) => {
    setConnecting(device.id);
    try {
      await connectToDevice(device.id);
    } catch (e: unknown) {
      Alert.alert(
        'Connection Failed',
        e instanceof Error ? e.message : 'Could not connect to device',
      );
    } finally {
      setConnecting(null);
    }
  }, [connectToDevice]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect',
      'Disconnect from this Meshtastic device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: disconnect },
      ],
    );
  }, [disconnect]);

  const renderDevice = useCallback(({ item }: { item: BleDevice }) => {
    const isConnecting = connecting === item.id;
    const alreadyConnected = connectedDevice === item.id;

    return (
      <TouchableOpacity
        style={[styles.deviceRow, alreadyConnected && styles.deviceRowConnected]}
        onPress={() => !alreadyConnected && handleConnect(item)}
        disabled={isConnecting || alreadyConnected}
        activeOpacity={0.75}
      >
        <View style={styles.deviceIcon}>
          <Text style={styles.deviceIconText}>📡</Text>
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceMeta}>RSSI: {item.rssi} dBm · {item.id.slice(-8)}</Text>
        </View>
        {isConnecting
          ? <ActivityIndicator color={colors.accent} size="small" />
          : alreadyConnected
            ? <Text style={styles.connectedBadge}>CONNECTED</Text>
            : <Text style={styles.connectArrow}>›</Text>}
      </TouchableOpacity>
    );
  }, [connecting, connectedDevice, handleConnect]);

  const renderNode = useCallback(({ item }: { item: MeshNode }) => {
    const minutesAgo = Math.round((Date.now() - item.lastHeard.getTime()) / 60000);
    const timeStr = minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`;

    return (
      <View style={styles.nodeRow}>
        <View style={styles.nodeIcon}>
          <Text style={styles.nodeShortName}>{item.shortName}</Text>
        </View>
        <View style={styles.nodeInfo}>
          <Text style={styles.nodeLongName}>{item.longName || `Node ${item.nodeId.toString(16)}`}</Text>
          <Text style={styles.nodeMeta}>
            {item.lat !== undefined
              ? `${item.lat.toFixed(4)}, ${item.lng?.toFixed(4)} · `
              : ''}
            Heard {timeStr}
            {item.snr !== undefined ? ` · SNR ${item.snr.toFixed(1)}` : ''}
          </Text>
        </View>
        {item.batteryLevel !== undefined && (
          <Text style={[
            styles.nodeBattery,
            { color: item.batteryLevel > 50 ? colors.success : item.batteryLevel > 20 ? colors.warning : colors.danger },
          ]}>
            {item.batteryLevel}%
          </Text>
        )}
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerIcon}>📻</Text>
          <View>
            <Text style={styles.header}>Meshtastic Radio</Text>
            <Text style={styles.headerSub}>LoRa mesh — up to 15 miles per hop</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Off-grid mesh networking</Text>
          <Text style={styles.infoText}>
            Meshtastic devices form an encrypted LoRa mesh radio network — no internet,
            no cell towers. Each device extends the network up to 15 miles per hop.
            Clip one to your sled and TrailGuard will show your mesh contacts on the map.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(MESHTASTIC_DOCS_URL)}>
            <Text style={styles.helpLink}>Get started with Meshtastic →</Text>
          </TouchableOpacity>
        </View>

        {/* Connection status */}
        {isConnected && connectedDevice && (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.connectedTitle}>RADIO CONNECTED</Text>
            </View>
            <Text style={styles.connectedDeviceId}>{connectedDevice}</Text>
            <Text style={styles.connectedNodeCount}>
              {meshNodes.length} node{meshNodes.length !== 1 ? 's' : ''} in mesh
            </Text>
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Text style={styles.disconnectBtnText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan button */}
        {!isConnected && (
          <TouchableOpacity
            style={[styles.scanBtn, isScanning && styles.scanBtnDisabled]}
            onPress={scanAndConnect}
            disabled={isScanning}
          >
            {isScanning
              ? (
                <View style={styles.scanningRow}>
                  <ActivityIndicator color={colors.accent} size="small" />
                  <Text style={[styles.scanBtnText, { marginLeft: 10 }]}>Scanning for devices…</Text>
                </View>
              )
              : <Text style={styles.scanBtnText}>Scan for Meshtastic Devices</Text>}
          </TouchableOpacity>
        )}

        {scanError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{scanError}</Text>
          </View>
        )}

        {/* Nearby devices */}
        {nearbyDevices.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>NEARBY DEVICES</Text>
            <FlatList
              data={nearbyDevices}
              keyExtractor={(d) => d.id}
              renderItem={renderDevice}
              scrollEnabled={false}
              style={styles.deviceList}
            />
          </>
        )}

        {/* Mesh nodes */}
        {isConnected && (
          <>
            <Text style={styles.sectionLabel}>MESH NODES HEARD</Text>
            {meshNodes.length === 0
              ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No mesh nodes heard yet. Other Meshtastic devices nearby will appear here as packets arrive.
                  </Text>
                </View>
              )
              : (
                <FlatList
                  data={meshNodes}
                  keyExtractor={(n) => String(n.nodeId)}
                  renderItem={renderNode}
                  scrollEnabled={false}
                  style={styles.nodeList}
                />
              )}
          </>
        )}

        {/* Hardware info */}
        <View style={styles.hardwareCard}>
          <Text style={styles.hardwareTitle}>Recommended Hardware</Text>
          <Text style={styles.hardwareText}>
            • LILYGO T-Echo (~$50) — long range, E-ink display{'\n'}
            • RAK WisBlock Meshtastic Starter ($35-80) — modular{'\n'}
            • Heltec V3 (~$30) — compact, WiFi + LoRa{'\n'}
            • Any device flashed with Meshtastic firmware
          </Text>
          <Text style={styles.hardwareNote}>
            All devices need Meshtastic firmware. See meshtastic.org for flashing instructions.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    paddingTop: 4,
  },
  headerIcon: { fontSize: 36 },
  header: {
    color: colors.text,
    fontSize: typography.xxl,
    fontWeight: typography.bold,
  },
  headerSub: {
    color: colors.textDim,
    fontSize: typography.sm,
    marginTop: 2,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    color: colors.text,
    fontSize: typography.md,
    fontWeight: typography.semibold,
    marginBottom: 8,
  },
  infoText: {
    color: colors.textDim,
    fontSize: typography.sm,
    lineHeight: 20,
    marginBottom: 6,
  },
  helpLink: {
    color: colors.accent,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginTop: 4,
  },

  connectedCard: {
    backgroundColor: colors.success + '12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.success + '44',
    padding: 16,
    marginBottom: 16,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  connectedTitle: {
    color: colors.success,
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 1,
  },
  connectedDeviceId: {
    color: colors.text,
    fontSize: typography.sm,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  connectedNodeCount: {
    color: colors.textDim,
    fontSize: typography.sm,
    marginBottom: 14,
  },
  disconnectBtn: {
    borderWidth: 1.5,
    borderColor: colors.danger + '66',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disconnectBtnText: {
    color: colors.danger,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },

  scanBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanBtnDisabled: { opacity: 0.7 },
  scanBtnText: {
    color: colors.accent,
    fontSize: typography.md,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorCard: {
    backgroundColor: colors.danger + '12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger + '44',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sm,
    lineHeight: 18,
  },

  sectionLabel: {
    color: colors.textDim,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 2,
  },

  deviceList: { marginBottom: 16 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceRowConnected: {
    borderColor: colors.success + '66',
    backgroundColor: colors.success + '0A',
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconText: { fontSize: 20 },
  deviceInfo: { flex: 1 },
  deviceName: { color: colors.text, fontSize: typography.md, fontWeight: typography.semibold },
  deviceMeta: { color: colors.textDim, fontSize: typography.xs, marginTop: 2 },
  connectedBadge: {
    color: colors.success,
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  connectArrow: { color: colors.textDim, fontSize: typography.xl },

  nodeList: { marginBottom: 16 },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nodeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nodeShortName: {
    color: colors.accent,
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  nodeInfo: { flex: 1 },
  nodeLongName: { color: colors.text, fontSize: typography.sm, fontWeight: typography.semibold },
  nodeMeta: { color: colors.textDim, fontSize: typography.xs, marginTop: 2, lineHeight: 16 },
  nodeBattery: { fontSize: typography.sm, fontWeight: typography.semibold },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: typography.sm,
    lineHeight: 20,
    textAlign: 'center',
  },

  hardwareCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hardwareTitle: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: 8,
  },
  hardwareText: {
    color: colors.textDim,
    fontSize: typography.sm,
    lineHeight: 22,
    marginBottom: 8,
  },
  hardwareNote: {
    color: colors.textMuted,
    fontSize: typography.xs,
    lineHeight: 18,
  },
});
