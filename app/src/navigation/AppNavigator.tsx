import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EmergencyInfoScreen from '../screens/EmergencyInfoScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import GroupHomeScreen from '../screens/GroupHomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import GroupDashboardScreen from '../screens/GroupDashboardScreen';
import GroupRadarScreen from '../screens/GroupRadarScreen';
import RideSummaryScreen from '../screens/RideSummaryScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';
import RideReplayScreen from '../screens/RideReplayScreen';
import CompassNavScreen from '../screens/CompassNavScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { GroupProvider } from '../context/GroupContext';
import { colors } from '../theme/colors';
import type { Ride } from '../api/rides';
import type { RecordedRide } from '../services/RideRecordingService';

const Tab = createBottomTabNavigator();

// ─── Group Stack ──────────────────────────────────────────────────────────────
export type GroupStackParamList = {
  GroupHome: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupDashboard: undefined;
  GroupRadar: undefined;
  RideSummary: { ride: Ride };
};

const GroupStack = createStackNavigator<GroupStackParamList>();

function GroupNavigator() {
  return (
    <GroupStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <GroupStack.Screen name="GroupHome" component={GroupHomeScreen} options={{ headerShown: false }} />
      <GroupStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
      <GroupStack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Join Group' }} />
      <GroupStack.Screen name="GroupDashboard" component={GroupDashboardScreen} options={{ headerShown: false }} />
      <GroupStack.Screen name="GroupRadar" component={GroupRadarScreen} options={{ title: 'Group Radar' }} />
      <GroupStack.Screen name="RideSummary" component={RideSummaryScreen} options={{ title: 'Ride Summary', headerShown: false }} />
    </GroupStack.Navigator>
  );
}

// ─── Profile Stack ────────────────────────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EmergencyInfo: undefined;
  RideHistory: undefined;
  OfflineMaps: undefined;
  CompassNav: undefined;
  RideSummaryFromHistory: { ride: Ride };
  RideReplay: { rideId: string; ride?: RecordedRide };
};

const ProfileStack = createStackNavigator<ProfileStackParamList>();

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EmergencyInfo" component={EmergencyInfoScreen} options={{ title: 'Emergency Info' }} />
      <ProfileStack.Screen name="OfflineMaps" component={OfflineMapsScreen} options={{ title: 'Offline Maps' }} />
      <ProfileStack.Screen name="CompassNav" component={CompassNavScreen} options={{ title: 'Compass Navigation' }} />
      <ProfileStack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
      <ProfileStack.Screen
        name="RideSummaryFromHistory"
        component={RideSummaryScreen}
        options={{ title: 'Ride Details', headerShown: false }}
      />
      <ProfileStack.Screen
        name="RideReplay"
        component={RideReplayScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

// ─── Root Tab Navigator ───────────────────────────────────────────────────────
export default function AppNavigator() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('auth_token').then((token) => {
      setIsAuthenticated(!!token);
      setAuthChecked(true);
    });
  }, []);

  // Splash while checking storage
  if (!authChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Show onboarding if no token
  if (!isAuthenticated) {
    return <OnboardingScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <GroupProvider>
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
          <Tab.Screen name="Group" component={GroupNavigator} />
          <Tab.Screen name="Safety" component={SafetyScreen} />
          <Tab.Screen name="Profile" component={ProfileNavigator} />
        </Tab.Navigator>
      </NavigationContainer>
    </GroupProvider>
  );
}
