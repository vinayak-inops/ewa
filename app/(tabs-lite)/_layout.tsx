import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { useScreenVisibility } from '@/hooks/auth/useScreenVisibility';

// ─── Tab item config ──────────────────────────────────────────────────────────

type TabItemProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function TabItem({ label, icon, iconActive, focused, disabled, onPress }: TabItemProps) {
  const color = disabled ? '#d1d5db' : focused ? '#111827' : '#9ca3af';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={styles.tab}
    >
      {/* Orange top indicator */}
      <View style={[styles.topBar, focused && styles.topBarActive]} />

      <Ionicons name={focused ? iconActive : icon} size={22} color={color} />

      <Text style={[styles.label, focused && styles.labelActive, disabled && styles.labelMuted]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function LiteCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = useScreenVisibility();

  const mainLaunchpadIndex  = state.routes.findIndex((r) => r.name === 'main-launchpad');
  const attendanceIndex     = state.routes.findIndex((r) => r.name === 'attendance');
  const applicationsIndex   = state.routes.findIndex((r) => r.name === 'applications');
  const ewaIndex            = state.routes.findIndex((r) => r.name === 'ewa/index');
  const profileIndex        = state.routes.findIndex((r) => r.name === 'profile/index');

  const nav = (name: string) => navigation.navigate(name);

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>

      <TabItem
        label="Home"
        icon="home-outline"
        iconActive="home"
        focused={state.index === mainLaunchpadIndex}
        onPress={() => nav(state.routes[mainLaunchpadIndex].name)}
      />

      <TabItem
        label="Attendance"
        icon="time-outline"
        iconActive="time"
        focused={state.index === attendanceIndex}
        disabled={!visible.attendance}
        onPress={() => nav(state.routes[attendanceIndex].name)}
      />

      <TabItem
        label="EWA"
        icon="cash-outline"
        iconActive="cash"
        focused={state.index === ewaIndex}
        disabled={!visible.ewa}
        onPress={() => nav(state.routes[ewaIndex].name)}
      />

      <TabItem
        label="Apply"
        icon="document-text-outline"
        iconActive="document-text"
        focused={state.index === applicationsIndex}
        disabled={!visible.applications}
        onPress={() => nav(state.routes[applicationsIndex].name)}
      />

      <TabItem
        label="Profile"
        icon="person-outline"
        iconActive="person"
        focused={state.index === profileIndex}
        onPress={() => nav(state.routes[profileIndex].name)}
      />

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
      <Tabs.Screen name="main-launchpad" options={{ title: 'Launchpad', tabBarShowLabel: false }} />
      <Tabs.Screen name="index" options={{ href: null, title: 'EWA' }} />
      <Tabs.Screen name="all-transactions/index" options={{ title: 'Transactions', tabBarShowLabel: false }} />
      <Tabs.Screen name="information/index" options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarShowLabel: false }} />
      <Tabs.Screen name="reports/index" options={{ href: null }} />
      <Tabs.Screen name="claim-rules/index" options={{ href: null }} />
      <Tabs.Screen name="bank-details/index" options={{ href: null }} />
      <Tabs.Screen name="ewa/index" options={{ title: 'EWA', tabBarShowLabel: false }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Profile', tabBarShowLabel: false }} />
      <Tabs.Screen name="profile/logout" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="applications" options={{ title: 'Applications', tabBarShowLabel: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    paddingTop: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  // Orange indicator line at very top of active tab
  topBar: {
    height: 3,
    width: 28,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  topBarActive: {
    backgroundColor: '#f59e0b',  // amber-400 — matches the orange in second image
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: '#111827',
  },
  labelMuted: {
    color: '#d1d5db',
  },
});
