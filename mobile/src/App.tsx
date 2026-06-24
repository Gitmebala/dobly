import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from './store/app';
import { getCurrentUser, fetchWorkspaceSnapshot } from './api/supabase';
import { applyThemePreference, COLORS, type ThemePreference } from './theme';

const THEME_STORAGE_KEY = 'theme_preference';

export default function App() {
  const { isLoading, setLoading, setThemePreference } = useAppStore();
  const [Navigator, setNavigator] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    async function bootstrap() {
      const storedTheme = (await SecureStore.getItemAsync(THEME_STORAGE_KEY)) as ThemePreference | null;
      const preference = storedTheme || 'system';
      applyThemePreference(preference);
      setThemePreference(preference);

      const navigatorModule = require('./navigation/AppNavigator');
      setNavigator(() => navigatorModule.default);
    }

    bootstrap().catch((error) => {
      console.error('Error bootstrapping app:', error);
    });
  }, [setThemePreference]);

  useEffect(() => {
    async function checkAuthAndLoadData() {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          await fetchWorkspaceSnapshot();
        }
      } catch (error) {
        console.error('Error checking auth or loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (Navigator) {
      checkAuthAndLoadData();
    }
  }, [Navigator, setLoading]);

  if (!Navigator || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Navigator />;
}
