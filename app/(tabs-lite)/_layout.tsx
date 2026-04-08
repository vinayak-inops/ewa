import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';

function LiteCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const launchpadIndex = state.routes.findIndex((route) => route.name === 'index');
  const profileIndex = state.routes.findIndex((route) => route.name === 'profile/index');

  const launchpadFocused = state.index === launchpadIndex;
  const profileFocused = state.index === profileIndex;

  return (
    <View style={styles.tabShell}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.iconButton, launchpadFocused && styles.iconButtonActiveSoft]}
          onPress={() => navigation.navigate(state.routes[launchpadIndex].name)}
          hitSlop={8}>
          <Ionicons name="happy-outline" size={24} color={launchpadFocused ? '#5b21b6' : '#9ca3af'} />
        </Pressable>

        <View style={styles.iconButtonMuted}>
          <Ionicons name="bar-chart" size={22} color="#c4c4c8" />
        </View>

        <View style={styles.iconButtonMuted}>
          <Ionicons name="wallet" size={22} color="#c4c4c8" />
        </View>

        <View style={styles.iconButtonMuted}>
          <Ionicons name="link" size={22} color="#c4c4c8" />
        </View>

        <Pressable
          style={[styles.avatarButton, profileFocused && styles.avatarButtonActive]}
          onPress={() => navigation.navigate(state.routes[profileIndex].name)}
          hitSlop={8}>
          <Ionicons name="person" size={26} color="#e9d5ff" />
        </Pressable>
      </View>
    </View>
  );
}

export default function LiteTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
      }}
      tabBar={(props) => <LiteCustomTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Launchpad',
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen name="information/index" options={{ href: null }} />
      <Tabs.Screen name="claim-rules/index" options={{ href: null }} />
      <Tabs.Screen name="bank-details/index" options={{ href: null }} />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarShowLabel: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  tabBar: {
    height: 58,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    elevation: 7,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActiveSoft: {
    backgroundColor: '#f5f3ff',
  },
  iconButtonMuted: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4d4d8',
  },
  avatarButtonActive: {
    backgroundColor: '#5b21b6',
  },
});
