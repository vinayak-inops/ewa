import { useRolePermissions } from '@/hooks/api/useRolePermissions';
import type { RootState } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { HapticTab } from '@/components/haptic-tab';
import { isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';

function useTabVisibility() {
  const { loading } = useRolePermissions();
  const permissions = useSelector((s: RootState) => s.role.permissions);

  return useMemo(() => {
    if (loading) return { ewa: true, applications: true, attendance: true };
    if (!permissions || permissions.length === 0) return { ewa: false, applications: false, attendance: false };

    const roleData = permissions[0] as Record<string, unknown>;

    const hasActiveScreen = (service: unknown): boolean => {
      if (!service || typeof service !== 'object') return false;
      if (Array.isArray(service)) {
        return service.some((s) => s.isActive !== false && s.enabled !== false);
      }
      return Object.values(service as Record<string, unknown>).some((screen) => {
        if (!screen || typeof screen !== 'object') return false;
        const s = screen as Record<string, unknown>;
        return s.isActive !== false && s.enabled !== false;
      });
    };

    return {
      ewa: hasActiveScreen(roleData.ewa),
      applications: hasActiveScreen(roleData.applicationApplier) || hasActiveScreen(roleData.applicationApprover),
      attendance: hasActiveScreen(roleData.attendance) || hasActiveScreen(roleData.muster),
    };
  }, [permissions, loading]);
}

function LiteCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = useTabVisibility();

  const mainLaunchpadIndex = state.routes.findIndex((r) => r.name === 'main-launchpad');
  const attendanceIndex    = state.routes.findIndex((r) => r.name === 'attendance/index');
  const applicationsIndex  = state.routes.findIndex((r) => r.name === 'applications/index');
  const ewaIndex           = state.routes.findIndex((r) => r.name === 'ewa/index');
  const profileIndex       = state.routes.findIndex((r) => r.name === 'profile/index');

  const launchpadFocused   = state.index === mainLaunchpadIndex;
  const attendanceFocused  = state.index === attendanceIndex;
  const applicationsFocused = state.index === applicationsIndex;
  const ewaFocused         = state.index === ewaIndex;
  const profileFocused     = state.index === profileIndex;

  return (
    <View style={[styles.tabShell, { bottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.tabBar}>

        {/* Home — always visible */}
        <Pressable
          style={styles.tab}
          onPress={() => navigation.navigate(state.routes[mainLaunchpadIndex].name)}
          hitSlop={8}>
          <View style={[styles.iconWrap, launchpadFocused && styles.iconWrapActive]}>
            <Ionicons
              name={launchpadFocused ? 'grid' : 'grid-outline'}
              size={22}
              color={launchpadFocused ? '#5b21b6' : '#9ca3af'}
            />
          </View>
          <Text style={[styles.label, launchpadFocused && styles.labelActive]}>Home</Text>
        </Pressable>

        {/* Attendance — permission-gated */}
        {visible.attendance ? (
          <Pressable
            style={styles.tab}
            onPress={() => navigation.navigate(state.routes[attendanceIndex].name)}
            hitSlop={8}>
            <View style={[styles.iconWrap, attendanceFocused && styles.iconWrapActive]}>
              <Ionicons
                name={attendanceFocused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={attendanceFocused ? '#5b21b6' : '#9ca3af'}
              />
            </View>
            <Text style={[styles.label, attendanceFocused && styles.labelActive]}>Attendance</Text>
          </Pressable>
        ) : (
          <View style={styles.tab}>
            <View style={styles.iconWrap}>
              <Ionicons name="calendar-outline" size={22} color="#d1d5db" />
            </View>
            <Text style={styles.labelMuted}>Attendance</Text>
          </View>
        )}

        {/* Apply — permission-gated */}
        {visible.applications ? (
          <Pressable
            style={styles.tab}
            onPress={() => navigation.navigate(state.routes[applicationsIndex].name)}
            hitSlop={8}>
            <View style={[styles.iconWrap, applicationsFocused && styles.iconWrapActive]}>
              <Ionicons
                name={applicationsFocused ? 'document-text' : 'document-text-outline'}
                size={22}
                color={applicationsFocused ? '#5b21b6' : '#9ca3af'}
              />
            </View>
            <Text style={[styles.label, applicationsFocused && styles.labelActive]}>Apply</Text>
          </Pressable>
        ) : (
          <View style={styles.tab}>
            <View style={styles.iconWrap}>
              <Ionicons name="document-text-outline" size={22} color="#d1d5db" />
            </View>
            <Text style={styles.labelMuted}>Apply</Text>
          </View>
        )}

        {/* EWA — permission-gated */}
        {visible.ewa ? (
          <Pressable
            style={styles.tab}
            onPress={() => navigation.navigate(state.routes[ewaIndex].name)}
            hitSlop={8}>
            <View style={[styles.iconWrap, ewaFocused && styles.iconWrapActive]}>
              <Ionicons
                name={ewaFocused ? 'wallet' : 'wallet-outline'}
                size={22}
                color={ewaFocused ? '#5b21b6' : '#9ca3af'}
              />
            </View>
            <Text style={[styles.label, ewaFocused && styles.labelActive]}>EWA</Text>
          </Pressable>
        ) : (
          <View style={styles.tab}>
            <View style={styles.iconWrap}>
              <Ionicons name="wallet-outline" size={22} color="#d1d5db" />
            </View>
            <Text style={styles.labelMuted}>EWA</Text>
          </View>
        )}

        {/* Profile — always visible */}
        <Pressable
          style={styles.tab}
          onPress={() => navigation.navigate(state.routes[profileIndex].name)}
          hitSlop={8}>
          <View style={[styles.iconWrap, profileFocused && styles.iconWrapActive]}>
            <Ionicons
              name={profileFocused ? 'person' : 'person-outline'}
              size={22}
              color={profileFocused ? '#5b21b6' : '#9ca3af'}
            />
          </View>
          <Text style={[styles.label, profileFocused && styles.labelActive]}>Profile</Text>
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
      <Tabs.Screen name="main-launchpad" options={{ title: 'Launchpad', tabBarShowLabel: false }} />
      <Tabs.Screen name="index" options={{ href: null, title: 'EWA' }} />
      <Tabs.Screen name="all-transactions/index" options={{ title: 'Transactions', tabBarShowLabel: false }} />
      <Tabs.Screen name="information/index" options={{ href: null }} />
      <Tabs.Screen name="attendance/index" options={{ title: 'Attendance', tabBarShowLabel: false }} />
      <Tabs.Screen name="attendance/muster/index" options={{ href: null }} />
      <Tabs.Screen name="reports/index" options={{ href: null }} />
      <Tabs.Screen name="claim-rules/index" options={{ href: null }} />
      <Tabs.Screen name="bank-details/index" options={{ href: null }} />
      <Tabs.Screen name="ewa/index" options={{ title: 'EWA', tabBarShowLabel: false }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Profile', tabBarShowLabel: false }} />
      <Tabs.Screen name="profile/logout" options={{ href: null }} />
      <Tabs.Screen name="applications/index" options={{ title: 'Applications', tabBarShowLabel: false }} />
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
    left: 12,
    right: 12,
  },
  tabBar: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8eaf0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 10,
    elevation: 16,
    shadowColor: '#1e1b4b',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#ede9fe',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#5b21b6',
  },
  labelMuted: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d1d5db',
    letterSpacing: 0.2,
  },
});
