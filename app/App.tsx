import React, { useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { setupSOSNotificationChannel } from './src/services/SOSNotificationService';
import { initDeviceTokenService } from './src/services/DeviceTokenService';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

export default function App() {
  // One-time startup: notification channel + APNs device token registration
  useEffect(() => {
    // Register the Android SOS notification channel (no-op on iOS)
    setupSOSNotificationChannel().catch((err) => {
      console.warn('[App] setupSOSNotificationChannel failed:', err);
    });

    // Register for APNs remote push and upsert device token to Supabase.
    // Enables sos-push edge function to deliver push when app is killed (Task #803).
    // No-op on Android until FCM is integrated.
    initDeviceTokenService();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        <AppNavigator />
        {/* Offline banner sits above everything, dismissed automatically when back online */}
        <OfflineBanner />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
