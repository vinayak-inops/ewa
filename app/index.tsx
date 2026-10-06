import { getPostLoginRoute } from '@/constants/app-variant';
import { isBiometricSessionActive, isBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { enforceCleanInstall, hasGrantedPermissions } from '@/hooks/auth/install-guard';
import { getBffUserProfile, clearBffUserProfile } from '@/hooks/auth/bff-session';
import { clearAuthTokens } from '@/hooks/auth/token-store';
import { initializeRoleFromBffProfile } from '@/store/slices/roleSlice';
import { AppDispatch } from '@/store';
import WelcomeScreen from './(auth)/welcome';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

export default function Index() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const run = async () => {
      await enforceCleanInstall();

      const [biometricActive, bffProfile] = await Promise.all([
        isBiometricSessionActive(),
        getBffUserProfile(),
      ]);

      // No valid session → stay on this welcome screen
      if (!biometricActive || !bffProfile) {
        await Promise.all([clearAuthTokens(), clearBffUserProfile()]);
        return;
      }

      // Session valid but biometric not yet unlocked this app session
      if (!isBiometricSessionUnlocked()) {
        router.replace('/(auth)/biometric');
        return;
      }

      // Show permissions screen only on first ever login
      const permissionsGranted = await hasGrantedPermissions();
      if (!permissionsGranted) {
        router.replace('/(auth)/permissions');
        return;
      }

      // Initialize role state from locally-cached BFF profile (no API call).
      // fetchRolePermissions is skipped on the resume path — the BFF session
      // cookie is in-memory and gone after a cold start, so calling it would
      // 401, wipe the session, and redirect to login.
      await dispatch(initializeRoleFromBffProfile(bffProfile)).catch(() => {});

      router.replace(getPostLoginRoute());
    };
    void run();
  }, [router, dispatch]);

  return <WelcomeScreen onSignIn={() => router.push('/(auth)/login')} />;
}
