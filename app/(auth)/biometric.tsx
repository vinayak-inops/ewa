import { getPostLoginRoute } from '@/constants/app-variant';
import { clearBiometricSession, setBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { getBffUserProfile } from '@/hooks/auth/bff-session';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

const BIOMETRIC_FAIL_KEY = 'ewa_biometric_fail_count';
const MAX_BIOMETRIC_FAILS = 3;

async function incrementFailCount(): Promise<number> {
  const stored = await AsyncStorage.getItem(BIOMETRIC_FAIL_KEY);
  const next = (stored ? parseInt(stored, 10) : 0) + 1;
  await AsyncStorage.setItem(BIOMETRIC_FAIL_KEY, String(next));
  return next;
}

async function resetFailCount() {
  await AsyncStorage.removeItem(BIOMETRIC_FAIL_KEY);
}

const APP_FONT_FAMILY = 'Inter';

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face recognition';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris scan';
  return 'biometric';
}

export default function BiometricScreen() {
  const router = useRouter();
  const isAuthenticatingRef = useRef(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricLabel, setBiometricLabel] = useState('fingerprint');

  const fallbackToLogin = useCallback(async () => {
    await clearBiometricSession();
    router.replace('/(auth)/login');
  }, [router]);

  const authenticate = useCallback(async () => {
    if (isAuthenticatingRef.current) return;

    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setErrorMessage('');

    try {
      // Verify the BFF session is still alive
      const profile = await getBffUserProfile();
      if (!profile) {
        router.replace('/(auth)/login');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        await fallbackToLogin();
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        await fallbackToLogin();
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricLabel(getBiometricLabel(supportedTypes));

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock EWA',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        const fails = await incrementFailCount();
        if (fails >= MAX_BIOMETRIC_FAILS) {
          await resetFailCount();
          await fallbackToLogin();
        } else {
          setErrorMessage(
            `Authentication failed. ${MAX_BIOMETRIC_FAILS - fails} attempt(s) remaining.`
          );
        }
        return;
      }

      await resetFailCount();
      setBiometricSessionUnlocked(true);
      router.replace(getPostLoginRoute());
    } catch (error) {
      if (__DEV__) {
      }
      await fallbackToLogin();
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
      setIsChecking(false);
    }
  }, [fallbackToLogin, router]);

  useEffect(() => {
    void authenticate();
  }, [authenticate]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.screen}>
        <View style={styles.iconWrap}>
          <Ionicons name="finger-print-outline" size={42} color="#1d4ed8" />
        </View>

        <Text style={styles.title}>Unlock with {biometricLabel}</Text>
        <Text style={styles.subtitle}>Use your device authentication to open your saved EWA session.</Text>

        <View style={styles.actionArea}>
          {(isChecking || isAuthenticating) && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#1d4ed8" />
              <Text style={styles.loadingText}>Waiting for authentication...</Text>
            </View>
          )}

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <Pressable style={styles.secondaryButton} onPress={fallbackToLogin} disabled={isAuthenticating}>
            <Text style={styles.secondaryButtonText}>Sign in again</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              isAuthenticating && styles.primaryButtonDisabled,
            ]}
            onPress={authenticate}
            disabled={isAuthenticating}>
            <Ionicons name="finger-print-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Unlock</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  iconWrap: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0a1c63',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: APP_FONT_FAMILY,
    alignSelf: 'center',
    maxWidth: 310,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: '#475569',
    textAlign: 'center',
  },
  actionArea: {
    marginTop: 34,
    gap: 16,
  },
  loadingRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  errorText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 19,
    color: '#c53030',
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#1d4ed8',
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.82,
  },
  primaryButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
    textAlign: 'center',
  },
});
