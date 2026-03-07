import React from 'react';
import { StatusBar } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import AppNavigator from './src/navigation/AppNavigator';

MapboxGL.setAccessToken('pk.eyJ1IjoidHlyOSIsImEiOiJjbW1mdzRwbG8wY24xMnFuZHYwN2poaXdwIn0.7He6Sr04fkb6EjN9Xq35yw');

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </>
  );
}
