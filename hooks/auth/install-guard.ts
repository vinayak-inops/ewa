import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { clearBiometricSession, isBiometricSessionUnlocked } from './biometric-session';
import { clearAuthTokens, getAccessToken } from './token-store';

const INSTALL_SENTINEL_KEY = 'ewa_app_installed';
const APP_VERSION_KEY      = 'ewa_app_version';
const BIOMETRIC_STATE_KEY  = 'ewa_biometric_state';
const LOGGED_IN_USER_KEY   = 'ewa_logged_in_user';

// --- Keycloak userinfo endpoint for server-side token validation ---
const RAW_KC = process.env.EXPO_PUBLIC_KEYCLOAK_AUTH_URL ?? process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? '';
const KC_ISSUER = RAW_KC.includes('/protocol/openid-connect')
  ? RAW_KC.split('/protocol/openid-connect')[0]
  : RAW_KC;
const USERINFO_URL = KC_ISSUER ? `${KC_ISSUER}/protocol/openid-connect/userinfo` : '';

// ---- helpers ----

/** #1 — includes build number so same version string with new binary still triggers a wipe. */
function getCurrentVersion(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    String((Constants.expoConfig as any)?.android?.versionCode ?? '');
  return build ? `${version}+${build}` : version;
}

/** #2 — snapshot of what biometric methods are enrolled on the device. */
async function getBiometricSignature(): Promise<string> {
  const [enrolled, types] = await Promise.all([
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  return JSON.stringify({ enrolled, types: [...types].sort() });
}

/** #5 — pull the `sub` claim out of a JWT without verifying the signature. */
function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const rem = b64.length % 4;
    if (rem) b64 += '='.repeat(4 - rem);
    const json = JSON.parse(atob(b64));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

/**
 * #4/#7 — call Keycloak userinfo; a 401 means the token is revoked or account disabled.
 * Only called on true cold starts (session not yet unlocked in memory).
 */
async function isTokenValidOnServer(token: string): Promise<boolean> {
  if (!USERINFO_URL) return true; // can't validate without config — assume valid
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(tid);
    return res.ok;
  } catch {
    return true; // offline or timeout — don't lock out the user
  }
}

async function wipeSession() {
  await Promise.all([clearBiometricSession(), clearAuthTokens()]);
  await Promise.all([
    AsyncStorage.removeItem(BIOMETRIC_STATE_KEY),
    AsyncStorage.removeItem(LOGGED_IN_USER_KEY),
  ]);
}

// ---- public API ----

/**
 * Call immediately after every successful Keycloak login.
 * Records the current biometric enrollment state and logged-in user sub
 * so future startups can detect changes.
 */
export async function recordPostLoginState(accessToken: string): Promise<void> {
  try {
    const [biometricSig, userSub] = await Promise.all([
      getBiometricSignature(),
      Promise.resolve(decodeJwtSub(accessToken)),
    ]);
    await AsyncStorage.setItem(BIOMETRIC_STATE_KEY, biometricSig);
    if (userSub) await AsyncStorage.setItem(LOGGED_IN_USER_KEY, userSub);
  } catch {
    // non-fatal — snapshot failure should not break login
  }
}

/**
 * Call once at app startup, before any auth checks.
 *
 * Wipes all stored credentials when any of these are true:
 *   #1 Fresh install or reinstall — sentinel key missing
 *       (iOS Keychain survives uninstall; AsyncStorage does not)
 *   #1 App version OR build number changed
 *   #2 Biometric enrollment on the device changed since last login
 *   #5 A different user (different JWT `sub`) is now logged in on this device
 *   #4/#7 Server reports the stored token is revoked or the account is disabled
 *       (only checked on true cold starts — skipped right after a fresh Keycloak login
 *        to avoid wiping a just-issued token before the app even opens)
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

    // --- #1 fresh install or app update ---
    if (isFirstInstall || isUpdate) {
      await Promise.all([clearBiometricSession(), clearAuthTokens()]);
      await AsyncStorage.setItem(INSTALL_SENTINEL_KEY, '1');
      await AsyncStorage.setItem(APP_VERSION_KEY, currentVersion);
      return;
    }

    // --- #2 biometric enrollment changed ---
    if (storedBiometricState !== null) {
      const currentBiometricState = await getBiometricSignature();
      if (storedBiometricState !== currentBiometricState) {
        await wipeSession();
        return;
      }
    }

    // --- #5 different user / #4/#7 server-side revocation ---
    const token = await getAccessToken();
    if (token) {
      const currentSub = decodeJwtSub(token);
      if (storedUser !== null && currentSub !== null && storedUser !== currentSub) {
        await wipeSession();
        return;
      }

      // #4/#7: Only validate server-side on a true cold start.
      // If the session is already unlocked in memory it means we just completed
      // a Keycloak login and navigated here — skip to avoid wiping a fresh token.
      if (!isBiometricSessionUnlocked()) {
        const valid = await isTokenValidOnServer(token);
        if (!valid) {
          await wipeSession();
        }
      }
    }
  } catch {
    // Fail open — never block app startup due to a guard error
  }
}
