import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';

function LiteCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const mainLaunchpadIndex = state.routes.findIndex((route) => route.name === 'main-launchpad');
  const transactionsIndex = state.routes.findIndex((route) => route.name === 'all-transactions/index');
  const profileIndex = state.routes.findIndex((route) => route.name === 'profile/index');

  const launchpadFocused = state.index === mainLaunchpadIndex;
  const transactionsFocused = state.index === transactionsIndex;
  const profileFocused = state.index === profileIndex;

  return (
    <View style={styles.tabShell}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.iconButton, launchpadFocused && styles.iconButtonActiveSoft]}
          onPress={() => navigation.navigate(state.routes[mainLaunchpadIndex].name)}
          hitSlop={8}>
          <Ionicons name="happy-outline" size={24} color={launchpadFocused ? '#5b21b6' : '#9ca3af'} />
        </Pressable>

        <Pressable
          style={[styles.iconButton, transactionsFocused && styles.iconButtonActiveSoft]}
          onPress={() => navigation.navigate(state.routes[transactionsIndex].name)}
          hitSlop={8}>
          <Ionicons name="wallet-outline" size={22} color={transactionsFocused ? '#5b21b6' : '#9ca3af'} />
        </Pressable>

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
          <Ionicons name="person" size={22} color={profileFocused ? '#ffffff' : '#64748b'} />
        </Pressable>
      </View>
    </View>
  );
}

export default function LiteTabLayout() {
  if (!isBiometricSessionUnlocked()) {
    return <Redirect href="/(auth)/biometric" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
      }}
      tabBar={(props) => <LiteCustomTabBar {...props} />}>
      <Tabs.Screen
        name="main-launchpad"
        options={{
          title: 'Launchpad',
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: 'EWA',
        }}
      />
      <Tabs.Screen
        name="all-transactions/index"
        options={{
          title: 'Transactions',
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen name="information/index" options={{ href: null }} />
      <Tabs.Screen name="attendance/index" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="claim-rules/index" options={{ href: null }} />
      <Tabs.Screen name="bank-details/index" options={{ href: null }} />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen name="profile/logout" options={{ href: null }} />
      <Tabs.Screen name="applications/leave-application/index" options={{ href: null }} />
      <Tabs.Screen name="applications/shift-change/index" options={{ href: null }} />
      <Tabs.Screen name="applications/punch-application/index" options={{ href: null }} />
      <Tabs.Screen name="applications/wfh-application/index" options={{ href: null }} />
      <Tabs.Screen name="applications/ot-application/index" options={{ href: null }} />
      <Tabs.Screen name="applications/out-duty-application/index" options={{ href: null }} />
      <Tabs.Screen name="applications/compoff-application/index" options={{ href: null }} />
      <Tabs.Screen name="applications/encashment-application/index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  tabBar: {
    height: 62,
    borderRadius: 20,
    backgroundColor: '#ffffffee',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    elevation: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActiveSoft: {
    backgroundColor: '#ede9fe',
  },
  iconButtonMuted: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  avatarButtonActive: {
    backgroundColor: '#5b21b6',
  },
});
