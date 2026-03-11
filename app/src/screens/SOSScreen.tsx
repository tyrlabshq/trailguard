import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Vibration,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundGeolocation from 'react-native-background-geolocation';
import { colors } from '../theme/colors';
import { fireSOS, getMyEmergencyInfo, EmergencyContact } from '../api/emergency';

// ─── SOS Location helpers ─────────────────────────────────────────────────

/** How stale (ms) a cached location is before we warn the user. */
const LOCATION_STALE_MS = 5 * 60 * 1000; // 5 minutes

/** Timeout (seconds) for a live GPS fix at SOS time. */
const GPS_FIX_TIMEOUT_SECS = 8;

interface SOSLocation {
  lat: number;
  lng: number;
  /** True if we fell back to a cached/stale position (no live fix available). */
  stale: boolean;
  /** True if we have no coordinates at all — SOS will still fire, location unknown. */
  unavailable: boolean;
}

/**
 * Attempt to get the best available location for the SOS payload:
 *   1. Live GPS fix via BackgroundGeolocation (8s timeout)
 *   2. Cached last-known location from AsyncStorage ('lastLocation' key)
 *   3. Fallback: unavailable flag set — SOS fires without coordinates
 */
async function getSOSLocation(): Promise<SOSLocation> {
  // ── 1. Live GPS fix ──────────────────────────────────────────────────
  try {
    const loc = await BackgroundGeolocation.getCurrentPosition({
      samples: 1,
      persist: false,
      timeout: GPS_FIX_TIMEOUT_SECS,
      // Accept a recent background fix so we don't block if GPS is warm
      maximumAge: 30_000,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      stale: false,
      unavailable: false,
    };
  } catch {
    // GPS unavailable or timed out — try cached location
  }

  // ── 2. Cached last-known fix ─────────────────────────────────────────
  try {
    const raw = await AsyncStorage.getItem('lastLocation');
    if (raw) {
      const cached = JSON.parse(raw) as { lat: number; lng: number; ts?: number };
      if (
        typeof cached.lat === 'number' &&
        typeof cached.lng === 'number' &&
        cached.lat !== 0 &&
        cached.lng !== 0
      ) {
        const ageMs = cached.ts ? Date.now() - cached.ts : Infinity;
        return {
          lat: cached.lat,
          lng: cached.lng,
          stale: ageMs > LOCATION_STALE_MS,
          unavailable: false,
        };
      }
    }
  } catch {
    // Fall through to unavailable
  }

  // ── 3. No location available ─────────────────────────────────────────
  return { lat: 0, lng: 0, stale: true, unavailable: true };
}

export default function SOSScreen() {
  const [firing, setFiring] = useState(false);
  const [fired, setFired] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for the SOS button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    // Load emergency contacts for display
    getMyEmergencyInfo()
      .then(info => setContacts(info.emergencyContacts))
      .catch(() => {});
  }, []);

  const handleSOS = async () => {
    Alert.alert(
      'FIRE SOS?',
      'This will:\n• Alert your riding group\n• Text all emergency contacts\n• Record your location\n\nOnly use in a real emergency.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'FIRE SOS',
          style: 'destructive',
          onPress: executeSOS,
        },
      ]
    );
  };

  const executeSOS = async () => {
    setFiring(true);
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    try {
      const groupId = await AsyncStorage.getItem('currentGroupId');

      // Get best available location — live fix first, cached fallback second
      const location = await getSOSLocation();
      const { lat, lng } = location;

      // Warn (non-blocking) if location quality is degraded
      if (location.unavailable) {
        // Don't block the SOS — just note the issue. Fire first, warn after.
        console.warn('[SOS] No GPS fix available — firing SOS with unknown location.');
      } else if (location.stale) {
        console.warn('[SOS] Using stale cached location — GPS fix was unavailable.');
      }

      // Fire SOS to server
      await fireSOS({ groupId: groupId || undefined, lat, lng });

      setFired(true);

      // SMS each emergency contact
      if (contacts.length > 0) {
        let mapsLink: string;
        if (location.unavailable) {
          mapsLink = 'Location unavailable (no GPS signal)';
        } else if (location.stale) {
          mapsLink = `STALE location: https://maps.google.com/?q=${lat},${lng}`;
        } else {
          mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        }
        const smsBody = `SOS! I need help. My last known location: ${mapsLink} — Sent via TrailGuard`;
        for (const contact of contacts) {
          const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(smsBody)}`;
          try {
            await Linking.openURL(smsUrl);
          } catch {}
        }
      }

      // Offer 911 call
      setTimeout(() => {
        Alert.alert(
          'SOS SENT',
          'Your group has been alerted and emergency contacts have been notified.\n\nDo you want to call 911?',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Call 911',
              style: 'destructive',
              onPress: () => Linking.openURL('tel:911'),
            },
          ]
        );
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Failed to send SOS. Please call 911 directly.');
    } finally {
      setFiring(false);
    }
  };

  if (fired) {
    return (
      <View style={styles.container}>
        <View style={styles.firedContainer}>
          <Text style={styles.firedTitle}>SOS SENT</Text>
          <Text style={styles.firedSubtitle}>
            Your group and emergency contacts have been alerted.
          </Text>
          <TouchableOpacity style={styles.call911Btn} onPress={() => Linking.openURL('tel:911')}>
            <Text style={styles.call911Text}>CALL 911</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={() => setFired(false)}>
            <Text style={styles.resetText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safety</Text>
      <Text style={styles.subtitle}>
        Use the SOS button only in a real emergency.{'\n'}It will alert your group and text your emergency contacts.
      </Text>

      {/* Big SOS Button */}
      <View style={styles.sosWrapper}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.sosBtn}
            onPress={handleSOS}
            disabled={firing}
            activeOpacity={0.85}
          >
            {firing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.sosBtnText}>SOS</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.sosHint}>Hold to confirm when tapped</Text>
      </View>

      {/* Emergency Contacts Preview */}
      {contacts.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.contactsTitle}>Will notify:</Text>
          {contacts.map((c, i) => (
            <View key={i} style={styles.contactRow}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactRel}>{c.relationship}</Text>
            </View>
          ))}
        </View>
      )}

      {contacts.length === 0 && (
        <View style={styles.noContactsWarning}>
          <Text style={styles.noContactsText}>
            ! No emergency contacts set.{'\n'}Add them in Profile → Emergency Info.
          </Text>
        </View>
      )}

      {/* Always-visible 911 button */}
      <TouchableOpacity style={styles.call911Direct} onPress={() => Linking.openURL('tel:911')}>
        <Text style={styles.call911DirectText}>CALL 911 DIRECTLY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 40 },

  // SOS Button
  sosWrapper: { alignItems: 'center', marginBottom: 40, width: '100%' },
  sosBtn: {
    width: '100%',
    paddingVertical: 40,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  sosBtnText: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  sosHint: { color: colors.textDim, fontSize: 12, marginTop: 16 },

  // Contacts
  contactsSection: { width: '100%', marginBottom: 24 },
  contactsTitle: { color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  contactName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  contactRel: { color: colors.textDim, fontSize: 13 },

  // No contacts warning
  noContactsWarning: {
    backgroundColor: '#2a1a00',
    borderWidth: 1,
    borderColor: '#ff8800',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  noContactsText: { color: '#ff8800', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // 911 button
  call911Direct: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 'auto',
    marginBottom: 20,
  },
  call911DirectText: { color: colors.danger, fontSize: 15, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  // Fired state
  firedContainer: { alignItems: 'center', padding: 20 },
  firedTitle: { color: colors.success, fontSize: 28, fontWeight: '900', marginBottom: 8, letterSpacing: 2 },
  firedSubtitle: { color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  call911Btn: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 16 },
  call911Text: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  resetBtn: { padding: 12 },
  resetText: { color: colors.textDim, fontSize: 14 },
});
