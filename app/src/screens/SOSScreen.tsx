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
import { colors } from '../theme/colors';
import { fireSOS, getMyEmergencyInfo, EmergencyContact } from '../api/emergency';

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
      '🚨 Fire SOS?',
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

      // Get location (simplified — real impl uses LocationService)
      let lat = 0;
      let lng = 0;
      try {
        // Attempt to get last known location from storage
        const lastLoc = await AsyncStorage.getItem('lastLocation');
        if (lastLoc) {
          const loc = JSON.parse(lastLoc);
          lat = loc.lat;
          lng = loc.lng;
        }
      } catch {}

      // Fire SOS to server
      await fireSOS({ groupId: groupId || undefined, lat, lng });

      setFired(true);

      // SMS each emergency contact
      if (contacts.length > 0) {
        const mapsLink = lat && lng
          ? `https://maps.google.com/?q=${lat},${lng}`
          : 'Location unavailable';
        const smsBody = `🚨 SOS! I need help. My last known location: ${mapsLink} — Sent via PowderLink`;
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
          '🚨 SOS Sent',
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
          <Text style={styles.firedIcon}>✅</Text>
          <Text style={styles.firedTitle}>SOS Sent</Text>
          <Text style={styles.firedSubtitle}>
            Your group and emergency contacts have been alerted.
          </Text>
          <TouchableOpacity style={styles.call911Btn} onPress={() => Linking.openURL('tel:911')}>
            <Text style={styles.call911Text}>📞 Call 911</Text>
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
              <>
                <Text style={styles.sosBtnIcon}>🆘</Text>
                <Text style={styles.sosBtnText}>SOS</Text>
              </>
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
            ⚠️ No emergency contacts set.{'\n'}Add them in Profile → Emergency Info.
          </Text>
        </View>
      )}

      {/* Always-visible 911 button */}
      <TouchableOpacity style={styles.call911Direct} onPress={() => Linking.openURL('tel:911')}>
        <Text style={styles.call911DirectText}>📞 Call 911 Directly</Text>
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
  sosWrapper: { alignItems: 'center', marginBottom: 40 },
  sosBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#cc0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff0000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  sosBtnIcon: { fontSize: 48 },
  sosBtnText: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
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
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 'auto',
    marginBottom: 20,
  },
  call911DirectText: { color: colors.danger, fontSize: 16, fontWeight: '700' },

  // Fired state
  firedContainer: { alignItems: 'center', padding: 20 },
  firedIcon: { fontSize: 64, marginBottom: 16 },
  firedTitle: { color: '#00ff88', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  firedSubtitle: { color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  call911Btn: { backgroundColor: '#cc0000', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 16 },
  call911Text: { color: '#fff', fontSize: 18, fontWeight: '700' },
  resetBtn: { padding: 12 },
  resetText: { color: colors.textDim, fontSize: 14 },
});
