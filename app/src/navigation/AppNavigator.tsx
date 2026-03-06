import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/MapScreen';
import GroupScreen from '../screens/GroupScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.textDim,
            borderTopWidth: 0.5,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
        }}
      >
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Group" component={GroupScreen} />
        <Tab.Screen name="Safety" component={SafetyScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
