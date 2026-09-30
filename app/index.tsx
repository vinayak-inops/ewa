import { getPostLoginRoute } from '@/constants/app-variant';
import { isBiometricSessionActive, isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { enforceCleanInstall } from '@/hooks/auth/install-guard';
import { areRequiredPermissionsGranted } from '@/hooks/auth/permission-guard';
import { getBffUserProfile, clearBffUserProfile } from '@/hooks/auth/bff-session';
import { clearAuthTokens } from '@/hooks/auth/token-store';
import { initializeRoleFromBffProfile, fetchRolePermissions } from '@/store/slices/roleSlice';
import { AppDispatch } from '@/store';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const run = async () => {
      await enforceCleanInstall();

      const [biometricActive, bffProfile] = await Promise.all([
        isBiometricSessionActive(),
        getBffUserProfile(),
      ]);

      // No valid session → force login
      if (!biometricActive || !bffProfile) {
        await Promise.all([clearAuthTokens(), clearBffUserProfile()]);
        setTarget('/(auth)/login');
        return;
      }

      // 31-day session valid but not yet unlocked this app session → biometric screen
      if (!isBiometricSessionUnlocked()) {
        setTarget('/(auth)/biometric');
        return;
      }

      // Check required OS permissions (camera + location) — no dialog shown here.
      // If not yet granted, send user to the permissions screen first.
      const permissionsOk = await areRequiredPermissionsGranted();
      if (!permissionsOk) {
        setTarget('/(auth)/permissions');
        return;
      }

      // Initialize role state from BFF profile
      // entitlementCode comes from bffProfile.roles (e.g. "ECT-CHT-HRIS-EMP")
      // tenantCode comes from bffProfile.tenantCode (e.g. "InOps_BMS")
      const roleResult = await dispatch(initializeRoleFromBffProfile(bffProfile));
      const payload = (roleResult as any).payload;
      const roleType = payload?.roleType as string | null;
      const org = payload?.org as string | null;

      if (roleType) {
        await dispatch(fetchRolePermissions({ roleType, org }));
      }

      setTarget(getPostLoginRoute());
    };
    void run();
  }, [dispatch]);

  if (!target) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>Setting up your account…</Text>
      </View>
    );
  }

  return <Redirect href={target as any} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 16,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});
