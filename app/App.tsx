import React, { useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { setupSOSNotificationChannel } from './src/services/SOSNotificationService';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

export default function App() {
  // Register the Android SOS notification channel once at startup.
  // notifee is idempotent on channel creation; this is a no-op on iOS.
  useEffect(() => {
    setupSOSNotificationChannel().catch((err) => {
      console.warn('[App] setupSOSNotificationChannel failed:', err);
    });
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
