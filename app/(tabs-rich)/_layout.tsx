import { Redirect, Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RichTabLayout() {
  const colorScheme = useColorScheme();

  if (!isBiometricSessionUnlocked()) {
    return <Redirect href="/(auth)/biometric" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Launchpad',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="information/index"
        options={{
          title: 'Information',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="info.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
