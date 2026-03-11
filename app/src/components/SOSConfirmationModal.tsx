/**
 * SOSConfirmationModal
 *
 * Full-screen overlay that handles the complete SOS emergency flow:
 *
 * Phase 1 — CONFIRM
 *   Full-screen danger-red overlay, "SOS" header, "Sending in 5..." countdown
 *   that ticks 1/sec.  Large CANCEL button aborts.  On countdown reaching 0:
 *   → trigger createSOSAlert, transition to Phase 2.
 *
 * Phase 2 — ACTIVE
 *   Persistent red banner (full-screen) confirming alert was sent.
 *   "CANCEL SOS" button sets status='cancelled' in Supabase.
 *
 * Solo-ride variant (Phase 1 only, no group_id):
 *   Shows an emergency contact input and a "SEND" button instead of
 *   auto-countdown.  SMS call is stubbed with a console.log for now.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { colors } from '../theme/colors';
import { createSOSAlert, cancelSOSAlert, type SOSAlert } from '../api/sos';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SOSConfirmationModalProps {
  /** Whether the modal is open. */
  visible: boolean;
  /** Current user's auth UUID from Supabase. */
  userId: string | null;
  /** Active group id — null when no group / solo ride. */
  groupId: string | null;
  /** Active ride id — null when not in a tracked ride. */
  rideId?: string | null;
  /** Current GPS coords.  null if location not yet available. */
  coords: { lat: number; lng: number } | null;
  /** Called when the user cancels BEFORE the alert fires. */
  onCancel: () => void;
  /** Called when the SOS alert has been successfully sent. */
  onSOSSent?: (alert: SOSAlert) => void;
  /** Called when an active SOS alert has been cancelled. */
  onSOSCancelled?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COUNTDOWN_SECONDS = 5;

// ─── Component ──────────────────────────────────────────────────────────────

export default function SOSConfirmationModal({
  visible,
  userId,
  groupId,
  rideId = null,
  coords,
  onCancel,
  onSOSSent,
  onSOSCancelled,
}: SOSConfirmationModalProps) {
  // 'confirm'  — countdown phase (group) or contact-entry phase (solo)
  // 'sending'  — awaiting Supabase insert
  // 'active'   — alert live, showing "SOS Active" banner
  type Phase = 'confirm' | 'sending' | 'active';

  const [phase, setPhase] = useState<Phase>('confirm');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Solo-ride: emergency contact phone input
  const [contactNumber, setContactNumber] = useState('');
  const isSolo = !groupId;

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset state when the modal opens ────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setPhase('confirm');
      setCountdown(COUNTDOWN_SECONDS);
      setActiveAlert(null);
      setCancelling(false);
      setSendError(null);
      setContactNumber('');
    } else {
      // Clear timer if closed externally
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [visible]);

  // ── Countdown ticker (group ride only) ──────────────────────────────────
  useEffect(() => {
    if (!visible || phase !== 'confirm' || isSolo) return;

    // Pulse vibration to get attention
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 200, 100, 200]);
    }

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          void fireSOSAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, isSolo]);

  // ── Fire the SOS alert ───────────────────────────────────────────────────
  const fireSOSAlert = useCallback(async () => {
    setPhase('sending');
    setSendError(null);

    if (!userId) {
      setSendError('Not authenticated. Cannot send SOS.');
      setPhase('confirm');
      return;
    }

    // Fall back to 0,0 if GPS not ready — operator should still be notified
    const lat = coords?.lat ?? 0;
    const lng = coords?.lng ?? 0;

    try {
      const alert = await createSOSAlert({
        ride_id: rideId,
        group_id: groupId,
        user_id: userId,
        lat,
        lng,
      });

      setActiveAlert(alert);
      setPhase('active');

      // Long vibration burst to confirm send
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 500, 100, 500, 100, 500]);
      }

      onSOSSent?.(alert);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSendError(`Failed to send SOS: ${msg}`);
      setPhase('confirm');

      // Restart countdown so user can retry or cancel
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [userId, coords, rideId, groupId, onSOSSent]);

  // ── Solo ride: manual send ───────────────────────────────────────────────
  const handleSoloSend = useCallback(async () => {
    // Validate phone number
    if (!contactNumber || contactNumber.trim() === '') {
      Alert.alert('No Phone Number', 'Please enter an emergency contact number before sending SOS.');
      return;
    }

    // Check SMS is available on this device
    const canOpen = await Linking.canOpenURL('sms:');
    if (!canOpen) {
      Alert.alert('SMS Unavailable', 'SMS is not available on this device.');
      return;
    }

    // Open SMS app pre-filled with location
    const lat = coords?.lat ?? 0;
    const lng = coords?.lng ?? 0;
    const msgBody = encodeURIComponent(
      `SOS — TrailGuard emergency alert. Location: ${lat},${lng}. Please call for help.`,
    );
    const smsUrl = `sms:${contactNumber.trim()}?body=${msgBody}`;
    await Linking.openURL(smsUrl);

    void fireSOSAlert();
  }, [contactNumber, coords, fireSOSAlert]);

  // ── User cancels BEFORE alert fires ─────────────────────────────────────
  const handlePreFireCancel = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setPhase('confirm');
    setCountdown(COUNTDOWN_SECONDS);
    onCancel();
  }, [onCancel]);

  // ── Cancel an ACTIVE SOS ─────────────────────────────────────────────────
  const handleCancelActive = useCallback(async () => {
    if (!activeAlert) return;
    setCancelling(true);
    try {
      await cancelSOSAlert(activeAlert.id);
    } catch (err) {
      console.warn('[SOS] Cancel failed:', err);
      // Still close the modal — local state cleared even if server update failed
    } finally {
      setCancelling(false);
      setActiveAlert(null);
      setPhase('confirm');
      onSOSCancelled?.();
      onCancel();
    }
  }, [activeAlert, onSOSCancelled, onCancel]);

  if (!visible) return null;

  // ── Phase: ACTIVE ────────────────────────────────────────────────────────
  if (phase === 'active') {
    return (
      <Modal visible animationType="fade" transparent statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.activeContainer}>
            <Text style={styles.activeHeader}>🚨 SOS ACTIVE</Text>
            <Text style={styles.activeSubtitle}>
              Emergency alert sent to your group.{'\n'}Help is on the way.
            </Text>

            {activeAlert && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>
                  📍 {activeAlert.lat.toFixed(5)}, {activeAlert.lng.toFixed(5)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelActiveBtn}
              onPress={() => void handleCancelActive()}
              activeOpacity={0.85}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text style={styles.cancelActiveBtnText}>CANCEL SOS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Phase: SENDING ───────────────────────────────────────────────────────
  if (phase === 'sending') {
    return (
      <Modal visible animationType="fade" transparent statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.confirmContainer}>
            <Text style={styles.sosHeader}>SOS</Text>
            <ActivityIndicator color="#fff" size="large" style={{ marginTop: 24 }} />
            <Text style={styles.sendingText}>Sending alert…</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Phase: CONFIRM ───────────────────────────────────────────────────────
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.confirmContainer}>
          <Text style={styles.sosHeader}>SOS</Text>

          {isSolo ? (
            // ── Solo ride variant ───────────────────────────────────────
            <>
              <Text style={styles.confirmSubtitle}>
                No group active. Enter an emergency contact number and tap SEND SOS.
              </Text>

              <TextInput
                style={styles.contactInput}
                placeholder="Emergency contact number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={contactNumber}
                onChangeText={setContactNumber}
                autoFocus
              />

              {sendError && <Text style={styles.errorText}>{sendError}</Text>}

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => void handleSoloSend()}
                activeOpacity={0.85}
              >
                <Text style={styles.sendBtnText}>SEND SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handlePreFireCancel}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          ) : (
            // ── Group ride variant (countdown) ──────────────────────────
            <>
              <Text style={styles.countdownLabel}>
                Sending alert in {countdown}…
              </Text>

              <Text style={styles.countdownNumber}>{countdown}</Text>

              {sendError && <Text style={styles.errorText}>{sendError}</Text>}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handlePreFireCancel}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(180, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 48,
  },
  sosHeader: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  countdownNumber: {
    color: '#FFFFFF',
    fontSize: 100,
    fontWeight: '900',
    marginTop: 8,
    lineHeight: 120,
    textAlign: 'center',
  },
  confirmSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  contactInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    color: '#fff',
    fontSize: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 24,
    textAlign: 'center',
  },
  sendBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  sendBtnText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cancelBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sendingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    marginTop: 16,
  },
  errorText: {
    color: '#FFD700',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },

  // Active state
  activeContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 48,
  },
  activeHeader: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  activeSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 28,
  },
  locationBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 20,
  },
  locationBadgeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  },
  cancelActiveBtn: {
    width: '100%',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: 48,
    minHeight: 64,
    justifyContent: 'center',
  },
  cancelActiveBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
