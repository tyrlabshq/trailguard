import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

// Tab indicator — a thin colored bar under the label
function TabIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: color, marginBottom: 2 }} />
  );
}
import { supabase } from '../lib/supabase';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';
import GroupCreateScreen from '../screens/GroupCreateScreen';
import GroupJoinScreen from '../screens/GroupJoinScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EmergencyInfoScreen from '../screens/EmergencyInfoScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import GroupHomeScreen from '../screens/GroupHomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import GroupDashboardScreen from '../screens/GroupDashboardScreen';
import GroupRadarScreen from '../screens/GroupRadarScreen';
import PreRideScreen from '../screens/PreRideScreen';
import RideSummaryScreen from '../screens/RideSummaryScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';
import RideReplayScreen from '../screens/RideReplayScreen';
import CompassNavScreen from '../screens/CompassNavScreen';
import GarminSetupScreen from '../screens/GarminSetupScreen';
import MeshtasticSetupScreen from '../screens/MeshtasticSetupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { GroupProvider } from '../context/GroupContext';
import { colors } from '../theme/colors';
import type { Ride } from '../api/rides';
import type { RecordedRide } from '../services/RideRecordingService';

const Tab = createBottomTabNavigator();

// ─── Map Stack ────────────────────────────────────────────────────────────────
export type MapStackParamList = {
  MapHome: undefined;
  GroupCreate: undefined;
  GroupJoin: undefined;
};

const MapStack = createStackNavigator<MapStackParamList>();

function MapNavigator() {
  return (
    <MapStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <MapStack.Screen name="MapHome" component={MapScreen} />
      <MapStack.Screen
        name="GroupCreate"
        component={GroupCreateScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <MapStack.Screen
        name="GroupJoin"
        component={GroupJoinScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: colors.background },
        }}
      />
    </MapStack.Navigator>
  );
}

// ─── Group Stack ──────────────────────────────────────────────────────────────
export type GroupStackParamList = {
  GroupHome: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupDashboard: undefined;
  GroupRadar: undefined;
  PreRide: undefined;
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
      <GroupStack.Screen name="PreRide" component={PreRideScreen} options={{ headerShown: false }} />
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
  GarminSetup: undefined;
  MeshtasticSetup: undefined;
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
      <ProfileStack.Screen name="GarminSetup" component={GarminSetupScreen} options={{ title: 'Garmin inReach' }} />
      <ProfileStack.Screen name="MeshtasticSetup" component={MeshtasticSetupScreen} options={{ title: 'Meshtastic Radio' }} />
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
    // Check for an active Supabase session (replaces legacy AsyncStorage token check)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });

    // Keep auth state in sync if the session is refreshed or signed out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
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
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingTop: 4,
              height: 60,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginBottom: 4,
            },
          }}
        >
          <Tab.Screen
            name="Map"
            component={MapNavigator}
            options={{ tabBarLabel: 'Map', tabBarIcon: ({ color }) => <TabIcon color={color} /> }}
          />
          <Tab.Screen
            name="Group"
            component={GroupNavigator}
            options={{ tabBarLabel: 'Group', tabBarIcon: ({ color }) => <TabIcon color={color} /> }}
          />
          <Tab.Screen
            name="Safety"
            component={SafetyScreen}
            options={{ tabBarLabel: 'Safety', tabBarIcon: ({ color }) => <TabIcon color={color} /> }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileNavigator}
            options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <TabIcon color={color} /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GroupProvider>
  );
}
