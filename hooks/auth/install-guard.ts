import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { clearBiometricSession } from './biometric-session';
import { clearAuthTokens } from './token-store';
import { getBffUserProfile } from './bff-session';

const INSTALL_SENTINEL_KEY   = 'ewa_app_installed';
const APP_VERSION_KEY        = 'ewa_app_version';
const BIOMETRIC_STATE_KEY    = 'ewa_biometric_state';
const LOGGED_IN_USER_KEY     = 'ewa_logged_in_user';
const PERMISSIONS_GRANTED_KEY = 'ewa_permissions_granted';

function getCurrentVersion(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    String((Constants.expoConfig as any)?.android?.versionCode ?? '');
  return build ? `${version}+${build}` : version;
}

async function getBiometricSignature(): Promise<string> {
  const [enrolled, types] = await Promise.all([
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  return JSON.stringify({ enrolled, types: [...types].sort() });
}

async function wipeSession() {
  await Promise.all([clearBiometricSession(), clearAuthTokens()]);
  await Promise.all([
    AsyncStorage.removeItem(BIOMETRIC_STATE_KEY),
    AsyncStorage.removeItem(LOGGED_IN_USER_KEY),
  ]);
}

/** Returns true if the user has already granted permissions on this device. */
export async function hasGrantedPermissions(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PERMISSIONS_GRANTED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

/** Call once the user grants permissions so the screen is never shown again. */
export async function markPermissionsGranted(): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSIONS_GRANTED_KEY, '1');
  } catch {
    // non-fatal
  }
}

/**
 * Call immediately after every successful login.
 * Records the current biometric enrollment state and logged-in username
 * so future startups can detect changes.
 */
export async function recordPostLoginState(username: string): Promise<void> {
  try {
    const biometricSig = await getBiometricSignature();
    await AsyncStorage.setItem(BIOMETRIC_STATE_KEY, biometricSig);
    if (username) await AsyncStorage.setItem(LOGGED_IN_USER_KEY, username);
  } catch {
    // non-fatal — snapshot failure should not break login
  }
}

/**
 * Call once at app startup, before any auth checks.
 *
 * Wipes all stored credentials when any of these are true:
 *   #1 Fresh install or reinstall — sentinel key missing
 *   #1 App version OR build number changed
 *   #2 Biometric enrollment on the device changed since last login
 *   #5 A different user (different username) is now logged in on this device
 */
export async function enforceCleanInstall(): Promise<void> {
  try {
    const [sentinel, storedVersion, storedBiometricState, storedUser] = await Promise.all([
      AsyncStorage.getItem(INSTALL_SENTINEL_KEY),
      AsyncStorage.getItem(APP_VERSION_KEY),
      AsyncStorage.getItem(BIOMETRIC_STATE_KEY),
      AsyncStorage.getItem(LOGGED_IN_USER_KEY),
    ]);

    const currentVersion = getCurrentVersion();
    const isFirstInstall = sentinel === null;
    const isUpdate       = !isFirstInstall && storedVersion !== currentVersion;

    // #1 fresh install or app update
    if (isFirstInstall || isUpdate) {
      await Promise.all([clearBiometricSession(), clearAuthTokens()]);
      await AsyncStorage.setItem(INSTALL_SENTINEL_KEY, '1');
      await AsyncStorage.setItem(APP_VERSION_KEY, currentVersion);
      return;
    }

    // #2 biometric enrollment changed
    if (storedBiometricState !== null) {
      const currentBiometricState = await getBiometricSignature();
      if (storedBiometricState !== currentBiometricState) {
        await wipeSession();
        return;
      }
    }

    // #5 different user logged in on this device
    if (storedUser !== null) {
      const profile = await getBffUserProfile();
      if (profile && profile.username !== storedUser) {
        await wipeSession();
        return;
      }
    }
  } catch {
    // Fail open — never block app startup due to a guard error
  }
}
