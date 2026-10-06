import { getPostLoginRoute } from '@/constants/app-variant';
import { clearBiometricSession, setBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { getBffUserProfile } from '@/hooks/auth/bff-session';
import { AppDispatch } from '@/store';
import { initializeRoleFromBffProfile } from '@/store/slices/roleSlice';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

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

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face recognition';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris scan';
  return 'biometric';
}

export default function BiometricScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
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
      const profile = await getBffUserProfile();
      if (!profile) {
        // Clear session so next cold start goes to welcome, not biometric loop
        await fallbackToLogin();
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) { await fallbackToLogin(); return; }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) { await fallbackToLogin(); return; }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricLabel(getBiometricLabel(supportedTypes));

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock EWA',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });

      // User cancelled — not a failure, just let them try again
      if (!result.success && (result as any).error === 'user_cancel') {
        return;
      }

      if (!result.success) {
        const fails = await incrementFailCount();
        if (fails >= MAX_BIOMETRIC_FAILS) {
          await resetFailCount();
          await fallbackToLogin();
        } else {
          setErrorMessage(`Authentication failed. ${MAX_BIOMETRIC_FAILS - fails} attempt(s) remaining.`);
        }
        return;
      }

      // Unlock the session first — role fetch failure must not kick the user out
      setBiometricSessionUnlocked(true);
      resetFailCount().catch(() => {}); // non-blocking, failure is non-fatal

      // Restore role info into Redux from the locally-cached BFF profile.
      // fetchRolePermissions is intentionally skipped here — the BFF session
      // cookie is in-memory and gone after a cold start, so any authedFetch
      // would 401, clear the session, and kick the user back to login.
      try {
        await dispatch(initializeRoleFromBffProfile(profile));
      } catch {
        // Non-fatal — role info loads lazily in the app if needed
      }

      router.replace(getPostLoginRoute());
    } catch {
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View className="flex-1 justify-center px-6 bg-white">
        {/* Icon */}
        <View className="w-[86px] h-[86px] rounded-[24px] bg-blue-100 items-center justify-center self-center mb-6">
          <Ionicons name="finger-print-outline" size={42} color="#1d4ed8" />
        </View>

        {/* Heading */}
        <Text className="text-[26px] leading-[34px] font-extrabold text-[#0a1c63] text-center">
          Unlock with {biometricLabel}
        </Text>
        <Text className="self-center max-w-[310px] mt-2.5 text-[15px] leading-[23px] text-slate-600 text-center">
          Use your device authentication to open your saved EWA session.
        </Text>

        {/* Actions */}
        <View className="mt-[34px] gap-4">
          {(isChecking || isAuthenticating) && (
            <View className="min-h-[24px] flex-row items-center justify-center gap-2.5">
              <ActivityIndicator color="#1d4ed8" />
              <Text className="text-sm font-bold text-slate-700">Waiting for authentication...</Text>
            </View>
          )}

          {!!errorMessage && (
            <Text className="text-[13px] leading-[19px] text-red-700 text-center">{errorMessage}</Text>
          )}

          <Pressable
            className="min-h-[44px] items-center justify-center"
            onPress={fallbackToLogin}
            disabled={isAuthenticating}
          >
            <Text className="text-sm font-extrabold text-blue-700 text-center">Sign in again</Text>
          </Pressable>

          <Pressable
            className={`min-h-[56px] rounded-[14px] items-center justify-center flex-row gap-2.5 bg-blue-700 border border-blue-800 active:opacity-[0.92] ${isAuthenticating ? 'opacity-[0.82]' : 'opacity-100'}`}
            onPress={authenticate}
            disabled={isAuthenticating}
          >
            <Ionicons name="finger-print-outline" size={20} color="#ffffff" />
            <Text className="text-[17px] font-extrabold text-white text-center">Unlock</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
