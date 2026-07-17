import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearBiometricSession } from './biometric-session';
import { clearAuthTokens } from './token-store';

const INSTALL_SENTINEL_KEY = 'ewa_app_installed';

/**
 * Call once at app startup (before any auth checks).
 *
 * On iOS, expo-secure-store (Keychain) data survives an uninstall.
 * AsyncStorage data does NOT — it is wiped with the app.
 * So if the sentinel is missing but Keychain tokens still exist,
 * the user uninstalled and reinstalled → force a clean logout.
 *
 * On Android this is a no-op: the OS clears all app data on uninstall anyway.
 */
export async function enforceCleanInstall() {
  try {
    const sentinel = await AsyncStorage.getItem(INSTALL_SENTINEL_KEY);
    if (sentinel === null) {
      // Fresh install (or reinstall after uninstall) — wipe any leftover Keychain data
      await Promise.all([clearBiometricSession(), clearAuthTokens()]);
      await AsyncStorage.setItem(INSTALL_SENTINEL_KEY, '1');
    }
  } catch {
    // If AsyncStorage itself fails, fail open (don't block app startup)
  }
}
