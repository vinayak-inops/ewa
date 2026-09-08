/**
 * Permissions screen — shown once after login.
 *
 * Camera and Location are REQUIRED — the user cannot proceed without granting
 * both.  Notifications and Contacts are optional.
 *
 * If the OS denies Camera or Location, an inline error is shown and navigation
 * is blocked.  The required toggles are locked ON and cannot be turned off.
 *
 * Styling: 100 % NativeWind className — zero inline `style` props.
 *   SafeAreaView from react-native-safe-area-context handles the status-bar
 *   inset automatically, so no runtime paddingTop calculation is needed.
 *   Ionicons `color` is a component prop, not a CSS style.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ───────────────────────────────────────────────────────────────────

type PermKey = 'camera' | 'location' | 'notifications' | 'contacts';

type PermItem = {
  key:         PermKey;
  icon:        React.ComponentProps<typeof Ionicons>['name'];
  iconBgClass: string;   // NativeWind bg class for the icon circle
  iconColor:   string;   // hex passed as Ionicons color prop (not a style)
  title:       string;
  description: string;
  required:    boolean;
};

// ─── Permission definitions ───────────────────────────────────────────────────

const PERMISSIONS: PermItem[] = [
  {
    key:         'camera',
    icon:        'camera-outline',
    iconBgClass: 'bg-sky-100',
    iconColor:   '#0369a1',
    title:       'Camera',
    description: 'Required for face attendance verification',
    required:    true,
  },
  {
    key:         'location',
    icon:        'location-outline',
    iconBgClass: 'bg-emerald-100',
    iconColor:   '#059669',
    title:       'Location',
    description: 'Required to record punch location accurately',
    required:    true,
  },
  {
    key:         'notifications',
    icon:        'notifications-outline',
    iconBgClass: 'bg-amber-100',
    iconColor:   '#d97706',
    title:       'Notifications',
    description: 'Reminders and updates',
    required:    false,
  },
  {
    key:         'contacts',
    icon:        'people-outline',
    iconBgClass: 'bg-rose-100',
    iconColor:   '#e11d48',
    title:       'Contacts',
    description: 'Find colleagues on the app',
    required:    false,
  },
];

// ─── Permission request helpers ───────────────────────────────────────────────

/** Returns true if camera was granted, false if denied. */
async function requestCamera(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title:          'Camera Permission Required',
        message:        'Face Attendance needs camera access to verify your identity.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Camera } = require('expo-camera');
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch {
    return true; // expo-camera not installed; WebView will prompt on first use
  }
}

/** Returns true if location was granted, false if denied. */
async function requestLocationPerm(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function requestNotifications() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    await Notifications.requestPermissionsAsync();
  } catch {
    // expo-notifications not installed — ignore
  }
}

async function requestContacts() {
  if (Platform.OS === 'android') {
    const perm = (PermissionsAndroid.PERMISSIONS as Record<string, string>)['READ_CONTACTS'];
    if (perm) await PermissionsAndroid.request(perm as any).catch(() => {});
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PermissionsScreen() {
  const router = useRouter();

  const [enabled, setEnabled] = useState<Record<PermKey, boolean>>({
    camera:        true,
    location:      true,
    notifications: false,
    contacts:      false,
  });

  const [loading,    setLoading]    = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const toggle = (key: PermKey, required: boolean) => {
    if (required) return;
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openSettings = () => Linking.openSettings().catch(() => {});

  const proceed = async () => {
    if (loading) return;
    setLoading(true);
    setBlockError(null);

    try {
      const cameraGranted = await requestCamera();
      if (!cameraGranted) {
        setBlockError('Camera permission is required for face attendance.\nPlease grant it to continue.');
        return;
      }

      const locationGranted = await requestLocationPerm();
      if (!locationGranted) {
        setBlockError('Location permission is required to record your punch.\nPlease grant it to continue.');
        return;
      }

      if (enabled.notifications) await requestNotifications();
      if (enabled.contacts)      await requestContacts();

      // All required permissions granted — let index.tsx re-evaluate and enter app
      router.replace('/');
    } catch {
      setBlockError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="flex-1 px-6 pt-8 pb-6">

        {/* ── Shield icon ── */}
        <View className="items-center mb-7">
          <View className="w-[72px] h-[72px] rounded-[20px] bg-blue-50 items-center justify-center shadow shadow-blue-600/20 elevation-4">
            <Ionicons name="shield-checkmark-outline" size={36} color="#2563eb" />
          </View>
        </View>

        {/* ── Heading ── */}
        <Text className="text-[26px] font-extrabold text-slate-900 text-center mb-2">
          Allow access
        </Text>
        <Text className="text-sm text-slate-500 text-center leading-5 mb-8">
          Camera and Location are needed to use the app.{'\n'}Other permissions are optional.
        </Text>

        {/* ── Permission rows ── */}
        <View className="gap-[2px] mb-6">
          {PERMISSIONS.map((item, index) => (
            <View key={item.key}>
              <View className="flex-row items-center py-[14px] gap-[14px]">

                {/* Icon circle — bg from per-item NativeWind class */}
                <View className={`w-11 h-11 rounded-xl items-center justify-center shrink-0 ${item.iconBgClass}`}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>

                {/* Labels */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-[2px]">
                    <Text className="text-[15px] font-bold text-slate-900">
                      {item.title}
                    </Text>
                    {item.required && (
                      <View className="px-[6px] py-[2px] rounded-full bg-blue-50">
                        <Text className="text-[10px] font-bold text-blue-600">Required</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-slate-400 font-medium">
                    {item.description}
                  </Text>
                </View>

                {/* Toggle — locked for required items */}
                <Switch
                  value={enabled[item.key]}
                  onValueChange={() => toggle(item.key, item.required)}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#fff"
                  ios_backgroundColor="#e2e8f0"
                  disabled={item.required}
                />
              </View>

              {/* Divider */}
              {index < PERMISSIONS.length - 1 && (
                <View className="h-px bg-slate-100 ml-[58px]" />
              )}
            </View>
          ))}
        </View>

        {/* ── Inline error card (shown when a required permission is denied) ── */}
        {blockError && (
          <View className="rounded-2xl p-4 mb-5 bg-orange-50 border border-orange-200">
            <View className="flex-row items-start gap-3 mb-3">
              <View className="mt-[1px]">
                <Ionicons name="warning-outline" size={20} color="#c2410c" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-orange-900 mb-1">
                  Permission Required
                </Text>
                <Text className="text-xs text-orange-700 leading-[18px]">
                  {blockError}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openSettings}
              className="flex-row items-center justify-center gap-2 rounded-xl py-[10px] bg-orange-900"
            >
              <Ionicons name="settings-outline" size={15} color="#fff" />
              <Text className="text-white text-[13px] font-bold">Open Settings</Text>
            </Pressable>
          </View>
        )}

        {/* Spacer */}
        <View className="flex-1" />

        {/* ── Allow & Continue button ── */}
        <Pressable
          onPress={proceed}
          disabled={loading}
          className={`rounded-2xl py-[17px] items-center bg-slate-900 ${loading ? 'opacity-70' : 'opacity-100'}`}
        >
          <Text className="text-white text-base font-bold">
            {loading ? 'Requesting permissions…' : 'Allow & Continue'}
          </Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}
