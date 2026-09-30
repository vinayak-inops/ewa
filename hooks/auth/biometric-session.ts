import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_SESSION_EXPIRES_KEY = 'ewa_biometric_session_expires_at';

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
 * Call once after a successful login.
 * Stores a marker so the app shows biometric unlock on next cold start
 * instead of the credentials screen. Session validity is determined by
 * the backend — a 401 from any API clears this marker automatically.
 */
export async function startBiometricSession() {
  await setItem(BIOMETRIC_SESSION_EXPIRES_KEY, 'active');
}

/**
 * Wipes the session marker.
 * Called on logout or when the backend returns 401/403.
 */
export async function clearBiometricSession() {
  biometricSessionUnlocked = false;
  await deleteItem(BIOMETRIC_SESSION_EXPIRES_KEY);
}

/**
 * Returns true if the user has a saved session on this device.
 * The backend is the source of truth for whether that session is still valid.
 */
export async function isBiometricSessionActive(): Promise<boolean> {
  const raw = await getItem(BIOMETRIC_SESSION_EXPIRES_KEY);
  return raw === 'active';
}

/** In-memory only — true once the user passes biometrics in the current app session.
 *  On web there is no biometric hardware, so an active session is treated as unlocked. */
export function isBiometricSessionUnlocked() {
  if (Platform.OS === 'web') return true;
  return biometricSessionUnlocked;
}

export function setBiometricSessionUnlocked(unlocked: boolean) {
  biometricSessionUnlocked = unlocked;
}
