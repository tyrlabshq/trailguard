import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EmergencyInfoScreen from '../screens/EmergencyInfoScreen';
import GroupHomeScreen from '../screens/GroupHomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import GroupDashboardScreen from '../screens/GroupDashboardScreen';
import { GroupProvider } from '../context/GroupContext';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// ─── Group Stack ──────────────────────────────────────────────────────────────
export type GroupStackParamList = {
  GroupHome: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupDashboard: undefined;
};

const GroupStack = createStackNavigator<GroupStackParamList>();

function GroupNavigator() {
  return (
    <GroupStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupStack.Screen name="GroupHome" component={GroupHomeScreen} />
      <GroupStack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <GroupStack.Screen name="JoinGroup" component={JoinGroupScreen} />
      <GroupStack.Screen name="GroupDashboard" component={GroupDashboardScreen} />
    </GroupStack.Navigator>
  );
}

// ─── Profile Stack ────────────────────────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EmergencyInfo: undefined;
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
    </ProfileStack.Navigator>
  );
}

// ─── Root Tab Navigator ───────────────────────────────────────────────────────
export default function AppNavigator() {
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
