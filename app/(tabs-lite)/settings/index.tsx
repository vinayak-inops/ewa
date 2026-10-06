import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEADER_SPACER_HEIGHT, ScreenHeader } from '@/components/ui/ScreenHeader';

// ─── Row types ────────────────────────────────────────────────────────────────

type ToggleRow = {
  type:      'toggle';
  icon:      React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  label:     string;
  value:     boolean;
  onChange:  (v: boolean) => void;
};

type NavRow = {
  type:      'nav';
  icon:      React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  label:     string;
  value?:    string;
  onPress:   () => void;
};

type SettingsRow = ToggleRow | NavRow;

// ─── Row component ────────────────────────────────────────────────────────────

function Row({ row, isLast }: { row: SettingsRow; isLast: boolean }) {
  const inner = (
    <View className={`flex-row items-center gap-3 py-3 px-4 bg-white ${isLast ? '' : 'border-b border-[#eceef2]'}`}>
      <Ionicons name={row.icon} size={18} color={row.iconColor} />

      <Text className="flex-1 text-[14px] font-medium text-[#1a1a1a]">
        {row.label}
      </Text>

      {row.type === 'toggle' ? (
        <Switch
          value={row.value}
          onValueChange={row.onChange}
          trackColor={{ false: '#e4e6ea', true: '#3ba55d' }}
          thumbColor="#fff"
          ios_backgroundColor="#e4e6ea"
          style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
        />
      ) : (
        <View className="flex-row items-center gap-1">
          {row.value ? (
            <Text className="text-[13px] text-[#9aa0aa]">{row.value}</Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color="#b5b9c2" />
        </View>
      )}
    </View>
  );

  return row.type === 'nav' ? (
    <Pressable onPress={row.onPress} className="active:opacity-70">
      {inner}
    </Pressable>
  ) : (
    <>{inner}</>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pushNotifs, setPushNotifs] = useState(true);
  const [darkMode,   setDarkMode]   = useState(false);

  const rows: SettingsRow[] = [
    {
      type:      'toggle',
      icon:      'notifications-outline',
      iconColor: '#e0435a',
      label:     'Push notifications',
      value:     pushNotifs,
      onChange:  setPushNotifs,
    },
    {
      type:      'toggle',
      icon:      'moon-outline',
      iconColor: '#8b6fd6',
      label:     'Dark mode',
      value:     darkMode,
      onChange:  setDarkMode,
    },
    {
      type:      'nav',
      icon:      'language-outline',
      iconColor: '#c8873a',
      label:     'Language',
      value:     'English',
      onPress:   () => {},
    },
    {
      type:      'nav',
      icon:      'lock-closed-outline',
      iconColor: '#12203a',
      label:     'Change password',
      onPress:   () => {},
    },
    {
      type:      'nav',
      icon:      'shield-outline',
      iconColor: '#c8873a',
      label:     'Privacy policy',
      onPress:   () => {},
    },
    {
      type:      'nav',
      icon:      'help-circle-outline',
      iconColor: '#c8873a',
      label:     'Help and support',
      onPress:   () => {},
    },
  ];

  const preferenceRows = rows.slice(0, 3);
  const accountRows    = rows.slice(3);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#12203a" />

      <ScreenHeader
        title="Settings"
        onBack={() => router.canGoBack() ? router.back() : undefined}
        rightContent={
          <View className="flex-row items-center gap-4">
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/(tabs-lite)/settings/notifications' as any)}
              className="active:opacity-55"
            >
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </Pressable>
            <Pressable hitSlop={10} className="active:opacity-55">
              <Ionicons name="help-circle-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        }
      />

      <View style={{ height: HEADER_SPACER_HEIGHT(insets.top) }} />

      <ScrollView showsVerticalScrollIndicator={false} className="bg-white">
        <View className="bg-white">

          {/* ── Profile row ── */}
          <Pressable
            onPress={() => router.push('/(tabs-lite)/profile' as any)}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-[#eceef2] active:bg-[#e4e7ed]"
          >
            <View className="w-11 h-11 rounded-full bg-[#12203a] items-center justify-center">
              <Text className="text-sm font-medium text-white">SD</Text>
            </View>

            <View className="flex-1">
              <Text className="text-[14px] font-medium text-[#1a1a1a]">Sathish Sinha D</Text>
              <Text className="text-[12px] text-[#8a8f98] mt-0.5">EMP025 · DEPT07</Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#b5b9c2" />
          </Pressable>

          {/* ── Preferences ── */}
          <Text className="text-[12px] font-medium text-[#9aa0aa] px-4 pt-3.5 pb-1.5">
            Preferences
          </Text>

          {preferenceRows.map((row, i) => (
            <Row key={row.label} row={row} isLast={i === preferenceRows.length - 1} />
          ))}

          {/* ── Account ── */}
          <Text className="text-[12px] font-medium text-[#9aa0aa] px-4 pt-3.5 pb-1.5">
            Account
          </Text>

          {accountRows.map((row, i) => (
            <Row key={row.label} row={row} isLast={i === accountRows.length - 1} />
          ))}

          {/* ── Footer ── */}
          <View className="p-4">
            <Pressable
              onPress={() => router.push('/(tabs-lite)/profile/logout' as any)}
              className="flex-row items-center justify-center gap-1.5 py-[11px] rounded-full border border-[#f0d3d8] bg-white active:bg-[#fde8eb]"
            >
              <Ionicons name="log-out-outline" size={16} color="#e0435a" />
              <Text className="text-[14px] font-medium text-[#e0435a]">Log out</Text>
            </Pressable>

            <Text className="text-[11px] text-[#b5b9c2] text-center mt-2.5">
              Version 2.4.1
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
