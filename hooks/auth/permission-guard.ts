/**
 * permission-guard.ts
 *
 * Checks (without showing any OS dialog) whether the two required permissions —
 * Camera and Location — have already been granted by the user.
 *
 * Used in app/index.tsx to gate entry into the main app:
 *   granted  → proceed to main app
 *   not yet  → redirect to /(auth)/permissions
 *
 * Uses expo-location for location (cross-platform, no prompt).
 * Uses PermissionsAndroid.check() on Android for camera (no prompt).
 * On iOS uses expo-camera if installed, otherwise assumes granted
 * (the WebView prompts on first use).
 */

import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

export async function areRequiredPermissionsGranted(): Promise<boolean> {
  // Web — permissions are browser-gated per-use; never block at routing level
  if (Platform.OS === 'web') return true;

  // ── Location ──────────────────────────────────────────────────────────────
  // getForegroundPermissionsAsync() only reads the current status — no prompt.
  const { status: locStatus } = await Location.getForegroundPermissionsAsync();
  if (locStatus !== 'granted') return false;

  // ── Camera ────────────────────────────────────────────────────────────────
  if (Platform.OS === 'android') {
    // PermissionsAndroid.check() reads the current grant — no dialog shown.
    const cameraGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (!cameraGranted) return false;
  } else {
    // iOS — try expo-camera's status check (no prompt).
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Camera } = require('expo-camera');
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status !== 'granted') return false;
    } catch {
      // expo-camera not installed — WebView will prompt on first use.
      // Don't block navigation; the permissions screen already handled it.
    }
  }

  return true;
}
