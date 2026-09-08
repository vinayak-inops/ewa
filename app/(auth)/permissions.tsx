/**
 * Permissions screen — shown once after login.
 *
 * Lets the user toggle which permissions to grant before entering the app.
 * Tapping "Allow selected" requests each toggled-on permission in sequence,
 * then navigates to the main app.  "Not now" skips straight to the main app.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type PermItem = {
  key:         'camera' | 'location' | 'notifications' | 'contacts';
  icon:        React.ComponentProps<typeof Ionicons>['name'];
  iconBg:      string;
  iconColor:   string;
  title:       string;
  description: string;
};

// ─── Permission definitions ───────────────────────────────────────────────────

const PERMISSIONS: PermItem[] = [
  {
    key:         'camera',
    icon:        'camera-outline',
    iconBg:      '#e0f2fe',
    iconColor:   '#0369a1',
    title:       'Camera',
    description: 'Scan and upload photos',
  },
  {
    key:         'location',
    icon:        'location-outline',
    iconBg:      '#d1fae5',
    iconColor:   '#059669',
    title:       'Location',
    description: 'Show results near you',
  },
  {
    key:         'notifications',
    icon:        'notifications-outline',
    iconBg:      '#fef3c7',
    iconColor:   '#d97706',
    title:       'Notifications',
    description: 'Reminders and updates',
  },
  {
    key:         'contacts',
    icon:        'people-outline',
    iconBg:      '#ffe4e6',
    iconColor:   '#e11d48',
    title:       'Contacts',
    description: 'Find friends on the app',
  },
];

// ─── Permission request helpers ───────────────────────────────────────────────

async function requestCamera() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  }
  // iOS camera permission is triggered by the WebView automatically;
  // no expo-camera package needed here — we just record the user intent.
}

async function requestLocation() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title:          'Location Permission',
        message:        'The app needs location access to record your attendance accurately.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
  }
  // iOS — will prompt on first use automatically
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
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS
    ).catch(() => {});
  }
  // iOS contacts require expo-contacts — skip silently if unavailable
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PermissionsScreen() {
  const router = useRouter();

  // Camera and Location on by default; others off
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    camera:        true,
    location:      true,
    notifications: false,
    contacts:      false,
  });
  const [loading, setLoading] = useState(false);

  const toggle = (key: string) =>
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));

  const proceed = async () => {
    setLoading(true);
    try {
      if (enabled.camera)        await requestCamera();
      if (enabled.location)      await requestLocation();
      if (enabled.notifications) await requestNotifications();
      if (enabled.contacts)      await requestContacts();
    } catch {
      // Non-fatal — always navigate forward
    } finally {
      setLoading(false);
      router.replace('/');
    }
  };

  const skip = () => router.replace('/');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}>

        {/* Shield icon */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 20,
            backgroundColor: '#eff6ff',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
          }}>
            <Ionicons name="shield-checkmark-outline" size={36} color="#2563eb" />
          </View>
        </View>

        {/* Heading */}
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
          Allow access
        </Text>
        <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
          Turn on what you're comfortable sharing.{'\n'}Nothing happens without your say.
        </Text>

        {/* Permission rows */}
        <View style={{ gap: 2, marginBottom: 32 }}>
          {PERMISSIONS.map((item, index) => (
            <View key={item.key}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, gap: 14,
              }}>
                {/* Icon */}
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: item.iconBg,
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}>
                    {item.description}
                  </Text>
                </View>

                {/* Toggle */}
                <Switch
                  value={enabled[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#fff"
                  ios_backgroundColor="#e2e8f0"
                />
              </View>

              {/* Divider (not after last item) */}
              {index < PERMISSIONS.length - 1 && (
                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 58 }} />
              )}
            </View>
          ))}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Allow selected */}
        <Pressable
          onPress={proceed}
          disabled={loading}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#1d4ed8' : '#0f172a',
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: 'center',
            marginBottom: 14,
            opacity: loading ? 0.7 : 1,
          })}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {loading ? 'Applying…' : 'Allow selected'}
          </Text>
        </Pressable>

        {/* Not now */}
        <Pressable onPress={skip} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600' }}>Not now</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}
