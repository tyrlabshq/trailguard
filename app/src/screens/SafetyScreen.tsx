import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SOSScreen from './SOSScreen';
import { colors } from '../theme/colors';

export type SafetyStackParamList = {
  SOSMain: undefined;
};

const Stack = createStackNavigator<SafetyStackParamList>();

/**
 * Safety tab — SOS screen is the primary view.
 * Stack wrapper allows future screens (e.g., Dead Man's Switch settings).
 */
export default function SafetyScreen() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="SOSMain" component={SOSScreen} />
    </Stack.Navigator>
  );
}
