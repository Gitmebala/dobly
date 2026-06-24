import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { COLORS } from '../theme';
import { useAppStore } from '../store/app';

import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import WorkflowsScreen from '../screens/dashboard/WorkflowsScreen';
import FeedScreen from '../screens/dashboard/FeedScreen';
import WorkflowDetailScreen from '../screens/dashboard/WorkflowDetailScreen';
import GenerateScreen from '../screens/dashboard/GenerateScreen';
import ApprovalsScreen from '../screens/dashboard/ApprovalsScreen';
import ConnectionsScreen from '../screens/dashboard/ConnectionsScreen';
import HealthScreen from '../screens/dashboard/HealthScreen';
import SettingsScreen from '../screens/dashboard/SettingsScreen';
import CoworkerDetailScreen from '../screens/dashboard/CoworkerDetailScreen';
import CoworkerHealthScreen from '../screens/dashboard/CoworkerHealthScreen';
import SimulateScreen from '../screens/dashboard/SimulateScreen';
import ShadowScreen from '../screens/dashboard/ShadowScreen';
import QuickBuildScreen from '../screens/dashboard/QuickBuildScreen';

export type RootStackParamList = {
  Login: undefined;
  Briefing: undefined;
  Feed: undefined;
  ActivityFeed: undefined;
  Build: undefined;
  Approvals: undefined;
  More: undefined;
  WorkflowDetail: { id: string };
  CoworkerDetail: { coworkerId: string };
  CoworkerHealth: { coworkerId: string };
  Simulate: { coworkerId?: string } | undefined;
  Shadow: { coworkerId?: string } | undefined;
  Health: undefined;
  Connections: undefined;
  QuickBuild: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const user = useAppStore((state) => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator
        id="root-stack"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Briefing" component={DashboardScreen} />
            <Stack.Screen name="Feed" component={WorkflowsScreen} />
            <Stack.Screen name="ActivityFeed" component={FeedScreen} />
            <Stack.Screen name="Build" component={GenerateScreen} />
            <Stack.Screen name="Approvals" component={ApprovalsScreen} />
            <Stack.Screen name="More" component={SettingsScreen} />
            <Stack.Screen name="WorkflowDetail" component={WorkflowDetailScreen} />
            <Stack.Screen name="CoworkerDetail" component={CoworkerDetailScreen} />
            <Stack.Screen name="CoworkerHealth" component={CoworkerHealthScreen} />
            <Stack.Screen name="Simulate" component={SimulateScreen} />
            <Stack.Screen name="Shadow" component={ShadowScreen} />
            <Stack.Screen name="Health" component={HealthScreen} />
            <Stack.Screen name="Connections" component={ConnectionsScreen} />
            <Stack.Screen name="QuickBuild" component={QuickBuildScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
