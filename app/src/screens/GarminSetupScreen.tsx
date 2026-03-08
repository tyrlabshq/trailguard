/**
 * GarminSetupScreen.tsx
 *
 * Lets the rider enter their Garmin MapShare ID so TrailGuard can pull
 * their inReach satellite GPS location and display it on the group map.
 *
 * What it does:
 * - Text input for the MapShare ID (e.g. "JohnSmith")
 * - Saves to AsyncStorage → picked up by useGarminTracking
 * - Shows current status and last known location
 * - Link to Garmin MapShare setup docs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { garminService, type GarminLocation } from '../services/GarminService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const STORAGE_KEY = 'garmin_mapshare_id';
const GARMIN_HELP_URL = 'https://explore.garmin.com/en-US/inreach/#mapshare';

export default function GarminSetupScreen() {
  const [inputId, setInputId] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<GarminLocation | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Load saved ID on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setSavedId(stored);
          setInputId(stored);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = inputId.trim();
    if (!trimmed) {
      Alert.alert('Missing ID', 'Please enter your Garmin MapShare identifier.');
      return;
    }

    setSaving(true);
    setTestError(null);

    try {
      // Test fetch before saving
      setTesting(true);
      const loc = await garminService.fetchLocation(trimmed);
      setTesting(false);

      if (!loc) {
        setTestError('No recent location data found. Check that MapShare is enabled on your inReach.');
        setSaving(false);
        return;
      }

      setLastLocation(loc);
      await AsyncStorage.setItem(STORAGE_KEY, trimmed);
      setSavedId(trimmed);
      Alert.alert(
        'inReach Connected',
        `Found your ${loc.deviceName} at ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}. Your satellite location will update every 30 seconds.`,
      );
    } catch (e: unknown) {
      setTesting(false);
      setTestError(e instanceof Error ? e.message : 'Failed to reach Garmin MapShare');
    } finally {
      setSaving(false);
    }
  }, [inputId]);

  const handleClear = useCallback(async () => {
    Alert.alert(
      'Remove inReach',
      'Remove your Garmin MapShare configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
            setSavedId(null);
            setInputId('');
            setLastLocation(null);
          },
        },
      ],
    );
  }, []);

  const handleTestFetch = useCallback(async () => {
    if (!savedId) return;
    setTesting(true);
    setTestError(null);
    try {
      const loc = await garminService.fetchLocation(savedId);
      if (loc) {
        setLastLocation(loc);
      } else {
        setTestError('No recent data. Is the device tracking?');
      }
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setTesting(false);
    }
  }, [savedId]);

  const statusText = (): string => {
    if (!savedId) return 'Not configured';
    if (!lastLocation) return `Configured: ${savedId}`;
    const minutesAgo = Math.round(
      (Date.now() - new Date(lastLocation.timestamp).getTime()) / 60000,
    );
    const timeStr = minutesAgo < 2 ? 'just now' : `${minutesAgo}m ago`;
    return `Last seen ${timeStr} — ${lastLocation.lat.toFixed(4)}, ${lastLocation.lng.toFixed(4)}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerIcon}>🛰</Text>
          <View>
            <Text style={styles.header}>Garmin inReach</Text>
            <Text style={styles.headerSub}>Satellite GPS — works without cell signal</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            Your Garmin inReach transmits GPS via satellite. TrailGuard polls your
            MapShare feed every 30 seconds to show your group where you are — even
            in areas with zero cell coverage.
          </Text>
          <Text style={styles.infoText}>
            Required: Enable MapShare in the Garmin Explore app and note your unique MapShare ID.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(GARMIN_HELP_URL)}>
            <Text style={styles.helpLink}>How to enable MapShare →</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={[styles.statusCard, savedId ? styles.statusCardActive : styles.statusCardInactive]}>
          <View style={[styles.statusDot, { backgroundColor: savedId ? colors.success : colors.textMuted }]} />
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>{savedId ? 'CONNECTED' : 'NOT CONFIGURED'}</Text>
            <Text style={styles.statusText}>{statusText()}</Text>
            {lastLocation?.inEmergency && (
              <Text style={styles.emergencyBadge}>⚠️ SOS / EMERGENCY</Text>
            )}
          </View>
          {savedId && (
            <TouchableOpacity onPress={handleTestFetch} disabled={testing} style={styles.refreshBtn}>
              {testing
                ? <ActivityIndicator color={colors.accent} size="small" />
                : <Text style={styles.refreshBtnText}>↻</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Last known location details */}
        {lastLocation && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Last Known Position</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Device</Text>
              <Text style={styles.detailValue}>{lastLocation.deviceName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Latitude</Text>
              <Text style={styles.detailValue}>{lastLocation.lat.toFixed(6)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Longitude</Text>
              <Text style={styles.detailValue}>{lastLocation.lng.toFixed(6)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Altitude</Text>
              <Text style={styles.detailValue}>{Math.round(lastLocation.altitude_m)}m</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Speed</Text>
              <Text style={styles.detailValue}>{lastLocation.speed_mph.toFixed(1)} mph</Text>
            </View>
            {lastLocation.batteryLevel !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Battery</Text>
                <Text style={styles.detailValue}>{lastLocation.batteryLevel}%</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timestamp</Text>
              <Text style={styles.detailValue}>
                {new Date(lastLocation.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Input */}
        <Text style={styles.sectionLabel}>YOUR MAPSHARE ID</Text>
        <Text style={styles.inputHint}>
          Found in Garmin Explore app → Account → MapShare. Example: "JohnSmith"
        </Text>
        <TextInput
          style={styles.input}
          value={inputId}
          onChangeText={setInputId}
          placeholder="e.g. JohnSmith"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {testError && <Text style={styles.errorText}>{testError}</Text>}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || testing) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || testing}
        >
          {saving || testing
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.saveBtnText}>
                {testing ? 'Testing connection…' : 'Save & Connect'}
              </Text>}
        </TouchableOpacity>

        {/* Clear button */}
        {savedId && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>Remove inReach</Text>
          </TouchableOpacity>
        )}

        {/* Hardware info */}
        <View style={styles.hardwareCard}>
          <Text style={styles.hardwareTitle}>Compatible Hardware</Text>
          <Text style={styles.hardwareText}>
            • Garmin inReach Mini 2 (~$350){'\n'}
            • Garmin inReach Messenger (~$300){'\n'}
            • Garmin GPSMAP 86/67 with inReach{'\n'}
            • Any device with Garmin MapShare enabled
          </Text>
          <Text style={styles.hardwareNote}>
            No subscription? The inReach requires an active Garmin satellite plan to transmit.
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

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusCardActive: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success + '44',
  },
  statusCardInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusContent: { flex: 1 },
  statusLabel: {
    color: colors.textDim,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  statusText: {
    color: colors.text,
    fontSize: typography.sm,
  },
  emergencyBadge: {
    color: colors.danger,
    fontSize: typography.sm,
    fontWeight: typography.bold,
    marginTop: 4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: typography.bold,
  },

  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: {
    color: colors.textDim,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  detailLabel: { color: colors.textDim, fontSize: typography.sm },
  detailValue: { color: colors.text, fontSize: typography.sm, fontWeight: typography.semibold },

  sectionLabel: {
    color: colors.textDim,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: typography.xs,
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: typography.md,
    padding: 14,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sm,
    marginBottom: 8,
    marginLeft: 2,
  },

  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: colors.textInverse,
    fontSize: typography.md,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },

  clearBtn: {
    borderWidth: 1.5,
    borderColor: colors.danger + '66',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  clearBtnText: {
    color: colors.danger,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },

  hardwareCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
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
