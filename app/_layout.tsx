import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useRouter, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, Text, TextInput } from 'react-native';
import 'react-native-reanimated';
import "../global.css";

import StoreProvider from '@/components/providers/StoreProvider';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen';
import { isBiometricSessionUnlocked, setBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { onSessionExpired } from '@/hooks/auth/session-events';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Lock the session and require biometric re-auth after this much background time
const BACKGROUND_LOCK_MS = 5 * 60 * 1000; // 5 minutes

function useBackgroundAuthLock() {
  const router = useRouter();
  const backgroundTimeRef = useRef<number | null>(null);

  // On mobile: lock after 5 min in background (web has no biometric, skip)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active') {
        const bg = backgroundTimeRef.current;
        if (bg !== null && Date.now() - bg >= BACKGROUND_LOCK_MS && isBiometricSessionUnlocked()) {
          setBiometricSessionUnlocked(false);
          router.replace('/(auth)/biometric');
        }
        backgroundTimeRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [router]);

  // On mobile: when any API returns 401, clear everything and go to login
  useEffect(() => {
    if (Platform.OS === 'web') return;
    return onSessionExpired(() => {
      router.replace('/(auth)/login');
    });
  }, [router]);
}

// Hide the native splash immediately — our JS loading screen takes over
SplashScreen.hideAsync().catch(() => {});

let globalFontApplied = false;
const TextWithDefaults = Text as typeof Text & { defaultProps?: { style?: unknown } };
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('../assets/fonts/Inter-Variable.ttf'),
  });
  const colorScheme = useColorScheme();
  useBackgroundAuthLock();

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {
      // Ignore if already hidden.
    });
  }, [fontsLoaded]);

  if (fontsLoaded && !globalFontApplied) {
    TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
    TextWithDefaults.defaultProps.style = [{ fontFamily: 'Inter' }, TextWithDefaults.defaultProps.style];

    TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps ?? {};
    TextInputWithDefaults.defaultProps.style = [
      { fontFamily: 'Inter' },
      TextInputWithDefaults.defaultProps.style,
    ];

    globalFontApplied = true;
  }

  if (!fontsLoaded) {
    return <AppLoadingScreen />;
  }

  return (
    <StoreProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </StoreProvider>
  );
}