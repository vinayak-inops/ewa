import { getPostLoginRoute } from '@/constants/app-variant';
import { isBiometricSessionActive, isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { enforceCleanInstall } from '@/hooks/auth/install-guard';
import { clearAuthTokens, getAccessToken } from '@/hooks/auth/token-store';
import { initializeRoleFromToken, fetchRolePermissions } from '@/store/slices/roleSlice';
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

      const [biometricActive, token] = await Promise.all([
        isBiometricSessionActive(),
        getAccessToken(),
      ]);

      // No valid 31-day session → force Keycloak login
      if (!biometricActive) {
        if (token) await clearAuthTokens();
        setTarget('/(auth)/login');
        return;
      }

      // 31-day session valid but not yet unlocked this app session → biometric screen
      if (!isBiometricSessionUnlocked()) {
        setTarget('/(auth)/biometric');
        return;
      }

      // Already unlocked this session — need a live token for role init
      if (!token) {
        setTarget('/(auth)/biometric');
        return;
      }

      const roleResult = await dispatch(initializeRoleFromToken(token));
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
