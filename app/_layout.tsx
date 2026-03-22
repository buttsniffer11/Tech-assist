import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import React from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthContext, useAuthState } from '@/hooks/useAuth';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const authState = useAuthState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authState.loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!authState.user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (authState.user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [authState.user, authState.loading, segments]);

  return (
    <AuthContext.Provider value={authState}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="new-job" options={{ headerShown: false }} />
          <Stack.Screen name="job/[id]" options={{ title: 'Job Detail' }} />
        </Stack>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}
