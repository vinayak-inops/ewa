import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_SESSION_EXPIRES_KEY = 'ewa_biometric_session_expires_at';
const BIOMETRIC_SESSION_DURATION_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

// In-memory flag: true only for the current app session after a successful biometric scan.
// Resets to false on every cold start — forces a fresh scan each launch within the 31-day window.
let biometricSessionUnlocked = false;

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/**
 * Call once after a successful Keycloak login.
 * Records a 31-day expiry in SecureStore so the app knows to show the
 * biometric screen (instead of Keycloak) on every cold start within that window.
 */
export async function startBiometricSession() {
  const expiresAt = String(Date.now() + BIOMETRIC_SESSION_DURATION_MS);
  await setItem(BIOMETRIC_SESSION_EXPIRES_KEY, expiresAt);
}

/**
 * Wipes the persisted 31-day session marker.
 * Call on logout or when the user explicitly chooses Keycloak re-login.
 */
export async function clearBiometricSession() {
  biometricSessionUnlocked = false;
  await deleteItem(BIOMETRIC_SESSION_EXPIRES_KEY);
}

/**
 * Returns true if a Keycloak login happened within the last 31 days.
 * Async because it reads from SecureStore.
 */
export async function isBiometricSessionActive(): Promise<boolean> {
  const raw = await getItem(BIOMETRIC_SESSION_EXPIRES_KEY);
  if (!raw) return false;
  const expiresAt = Number(raw);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

/** In-memory only — true once the user passes biometrics in the current app session. */
export function isBiometricSessionUnlocked() {
  return biometricSessionUnlocked;
}

export function setBiometricSessionUnlocked(unlocked: boolean) {
  biometricSessionUnlocked = unlocked;
}
