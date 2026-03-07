import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';

MapboxGL.setAccessToken('pk.eyJ1IjoidHlyOSIsImEiOiJjbW1mdzRwbG8wY24xMnFuZHYwN2poaXdwIn0.7He6Sr04fkb6EjN9Xq35yw');

export default function App() {
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
