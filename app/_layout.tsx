import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if already handled.
});

let globalFontApplied = false;
const TextWithDefaults = Text as typeof Text & { defaultProps?: { style?: unknown } };
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('../assets/fonts/Inter-Variable.ttf'),
  });
  const colorScheme = useColorScheme();

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
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs-lite)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs-rich)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
