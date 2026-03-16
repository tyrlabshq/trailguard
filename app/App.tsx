import React, { useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { setupSOSNotificationChannel } from './src/services/SOSNotificationService';
import { initDeviceTokenService } from './src/services/DeviceTokenService';
import SubscriptionService from './src/services/SubscriptionService';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import PaywallScreen from './src/screens/PaywallScreen';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

// RevenueCat API key — set REVENUECAT_API_KEY in your .env or EAS secrets.
// Get your key at: https://app.revenuecat.com/
// See: ios/TrailGuard/Info.plist for the key reference.
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY ?? 'YOUR_REVENUECAT_IOS_API_KEY';

// Initialize RevenueCat as early as possible (before first render)
SubscriptionService.configure(REVENUECAT_API_KEY);

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
      <SubscriptionProvider>
        <StatusBar barStyle="light-content" />
        <View style={styles.root}>
          <AppNavigator />
          {/* Offline banner sits above everything, dismissed automatically when back online */}
          <OfflineBanner />
          {/* Global paywall modal — triggered via useSubscription().triggerPaywall() */}
          <PaywallScreen />
        </View>
      </SubscriptionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
