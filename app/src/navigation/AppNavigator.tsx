import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupHomeScreen from '../screens/GroupHomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import GroupDashboardScreen from '../screens/GroupDashboardScreen';
import { GroupProvider } from '../context/GroupContext';
import { useLocationService } from '../hooks/useLocationService';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

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

/**
 * Starts background location tracking whenever the user is in an active group.
 * Rendered inside GroupProvider so it can access group context.
 */
function LocationServiceManager() {
  useLocationService();
  return null;
}

export default function AppNavigator() {
  return (
    <GroupProvider>
      {/* LocationServiceManager must live inside GroupProvider */}
      <LocationServiceManager />
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
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </GroupProvider>
  );
}
