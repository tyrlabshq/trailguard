/**
 * MeshStatusBar.tsx
 *
 * Small inline status indicator for Meshtastic BLE radio connection.
 * Shows: connection status · node count · signal quality (SNR)
 *
 * Usage:
 *   <MeshStatusBar isConnected={...} nodeCount={...} bestSnr={...} />
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface MeshStatusBarProps {
  isConnected: boolean;
  nodeCount: number;
  /** Best SNR value from known nodes (higher = better signal) */
  bestSnr?: number;
  /** Callback when user taps the status bar (e.g. navigate to setup) */
  onPress?: () => void;
}

export function MeshStatusBar({
  isConnected,
  nodeCount,
  bestSnr,
  onPress,
}: MeshStatusBarProps) {
  const statusColor = isConnected ? colors.accent : colors.textMuted;
  const signalLabel = bestSnr !== undefined ? formatSnr(bestSnr) : null;

  return (
    <TouchableOpacity
      style={[styles.bar, isConnected ? styles.barConnected : styles.barDisconnected]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      {/* BLE indicator dot */}
      <View style={[styles.dot, { backgroundColor: statusColor }]} />

      {/* Status text */}
      <Text style={[styles.label, { color: statusColor }]}>
        {isConnected ? 'MESH' : 'NO MESH'}
      </Text>

      {/* Node count */}
      {isConnected && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{nodeCount}</Text>
        </View>
      )}

      {/* Signal quality */}
      {isConnected && signalLabel && (
        <Text style={[styles.snrLabel, { color: snrColor(bestSnr) }]}>
          {signalLabel}
        </Text>
      )}

      {/* LoRa icon */}
      <Text style={[styles.radioIcon, { opacity: isConnected ? 0.9 : 0.3 }]}>📻</Text>
    </TouchableOpacity>
  );
}

/** Format SNR for display. Meshtastic SNR is in dB, typically -20 to +10. */
function formatSnr(snr: number): string {
  return `${snr > 0 ? '+' : ''}${snr.toFixed(0)}dB`;
}

/** Color-code SNR: green = good, amber = ok, red = poor */
function snrColor(snr: number | undefined): string {
  if (snr === undefined) return colors.textDim;
  if (snr >= 0) return colors.success;
  if (snr >= -10) return colors.warning;
  return colors.danger;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  barConnected: {
    backgroundColor: colors.accent + '12',
    borderColor: colors.accent + '44',
  },
  barDisconnected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: colors.accent + '33',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.bold,
  },
  snrLabel: {
    fontSize: 10,
    fontWeight: typography.semibold,
  },
  radioIcon: {
    fontSize: 12,
    marginLeft: 2,
  },
});
