/**
 * SOSAlertOverlay
 *
 * Full-screen red overlay shown to group members when a fellow rider fires SOS.
 * This is the *receiver* view — distinct from SOSConfirmationModal (the *sender* view).
 *
 * Features:
 *  - Full-screen danger-red modal (non-dismissible by back button)
 *  - Shows rider name (falls back to "A group member") and exact GPS coords
 *  - CALL button — opens phone dialer via Linking (if phone number is known)
 *  - DISMISS button — clears the overlay
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import type { SOSAlert } from '../api/sos';
import { formatSOSCoords } from '../services/SOSNotificationService';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SOSAlertOverlayProps {
  /** Whether the overlay is currently visible. */
  visible: boolean;
  /** The SOS alert that triggered this overlay. */
  alert: SOSAlert | null;
  /**
   * Display name of the rider who sent the SOS.
   * Falls back to "A group member" when unknown.
   */
  riderName?: string | null;
  /**
   * Phone number for the CALL button (optional).
   * When absent the CALL button is hidden.
   */
  riderPhone?: string | null;
  /** Called when the user taps DISMISS. */
  onDismiss: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SOSAlertOverlay({
  visible,
  alert,
  riderName,
  riderPhone,
  onDismiss,
}: SOSAlertOverlayProps) {
  const displayName = riderName ?? 'A group member';
  const coordsText = alert ? formatSOSCoords(alert) : '';

  const handleCall = useCallback(() => {
    if (!riderPhone) return;
    const url = `tel:${riderPhone.replace(/\D/g, '')}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
      })
      .catch(() => {});
  }, [riderPhone]);

  if (!visible || !alert) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      // Prevent accidental dismissal via hardware back button on Android
      onRequestClose={() => { /* intentionally blocked — user must tap DISMISS */ }}
    >
      <View style={styles.container}>
        {/* Pulsing SOS header */}
        <View style={styles.header}>
          <Text style={styles.sosEmoji}>🚨</Text>
          <Text style={styles.sosTitle}>SOS ALERT</Text>
        </View>

        {/* Who sent it */}
        <Text style={styles.riderLabel}>
          {displayName} needs help!
        </Text>

        {/* Coordinates badge */}
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsLabel}>LAST KNOWN POSITION</Text>
          <Text style={styles.coordsText}>{coordsText}</Text>
          {alert.timestamp && (
            <Text style={styles.timestampText}>
              {new Date(alert.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {riderPhone ? (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={handleCall}
              activeOpacity={0.85}
            >
              <Text style={styles.callBtnText}>📞  CALL RIDER</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.dismissBtnText}>DISMISS</Text>
          </TouchableOpacity>
        </View>

        {/* Footer hint */}
        <Text style={styles.hint}>
          Alert will persist until you dismiss it.{'\n'}
          Contact emergency services if needed: 911
        </Text>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(180, 0, 0, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sosEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  sosTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  riderLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 32,
  },
  coordsBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  coordsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  coordsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.select({
      ios: 'Courier New',
      android: 'monospace',
      default: 'monospace',
    }),
    textAlign: 'center',
  },
  timestampText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 6,
    fontFamily: Platform.select({
      ios: 'Courier New',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  actions: {
    width: '100%',
    marginTop: 40,
    gap: 14,
  },
  callBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  callBtnText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  dismissBtn: {
    width: '100%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
  },
});
