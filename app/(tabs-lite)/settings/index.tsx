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

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY   = '#12203a';
const PAGE   = '#ffffff';
const BORDER = '#eceef2';

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
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               12,
        paddingVertical:   12,
        paddingHorizontal: 16,
        backgroundColor:   PAGE,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: BORDER,
      }}
    >
      {/* Plain colored icon — no chip background */}
      <Ionicons name={row.icon} size={18} color={row.iconColor} />

      {/* Label */}
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1a1a1a' }}>
        {row.label}
      </Text>

      {/* Trailing */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {row.value ? (
            <Text style={{ fontSize: 13, color: '#9aa0aa' }}>{row.value}</Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color="#b5b9c2" />
        </View>
      )}
    </View>
  );

  return row.type === 'nav' ? (
    <Pressable onPress={row.onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
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
    // ── Preferences ──
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
    // ── Account ──
    {
      type:      'nav',
      icon:      'lock-closed-outline',
      iconColor: NAVY,
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
    <View style={{ flex: 1, backgroundColor: PAGE }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── Header ── */}
      <ScreenHeader
        title="Settings"
        onBack={() => router.canGoBack() ? router.back() : undefined}
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/(tabs-lite)/settings/notifications' as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
            >
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </Pressable>
            <Pressable hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
              <Ionicons name="help-circle-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        }
      />

      {/* Spacer */}
      <View style={{ height: HEADER_SPACER_HEIGHT(insets.top) }} />

      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: PAGE }}>

        {/* ━━━ Content block ━━━ */}
        <View style={{ backgroundColor: PAGE }}>

          {/* ── Profile row ── */}
          <Pressable
            style={({ pressed }) => ({
              flexDirection:     'row',
              alignItems:        'center',
              gap:               12,
              paddingHorizontal: 16,
              paddingVertical:   16,
              backgroundColor:   pressed ? '#e4e7ed' : PAGE,
              borderBottomWidth: 0.5,
              borderBottomColor: BORDER,
            })}
          >
            <View
              style={{
                width:           44,
                height:          44,
                borderRadius:    22,
                backgroundColor: NAVY,
                alignItems:      'center',
                justifyContent:  'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>SD</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#1a1a1a' }}>
                Sathish Sinha D
              </Text>
              <Text style={{ fontSize: 12, color: '#8a8f98', marginTop: 2 }}>
                EMP025 · DEPT07
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#b5b9c2" />
          </Pressable>

          {/* ── Preferences section label ── */}
          <Text
            style={{
              fontSize:          12,
              fontWeight:        '500',
              color:             '#9aa0aa',
              paddingHorizontal: 16,
              paddingTop:        14,
              paddingBottom:     6,
            }}
          >
            Preferences
          </Text>

          {preferenceRows.map((row, i) => (
            <Row key={row.label} row={row} isLast={i === preferenceRows.length - 1} />
          ))}

          {/* ── Account section label ── */}
          <Text
            style={{
              fontSize:          12,
              fontWeight:        '500',
              color:             '#9aa0aa',
              paddingHorizontal: 16,
              paddingTop:        14,
              paddingBottom:     6,
            }}
          >
            Account
          </Text>

          {accountRows.map((row, i) => (
            <Row key={row.label} row={row} isLast={i === accountRows.length - 1} />
          ))}

          {/* ── Footer inside white block ── */}
          <View style={{ padding: 16 }}>
            <Pressable
              onPress={() => router.push('/(tabs-lite)/profile/logout' as any)}
              style={({ pressed }) => ({
                flexDirection:   'row',
                alignItems:      'center',
                justifyContent:  'center',
                gap:             6,
                paddingVertical: 11,
                borderRadius:    999,
                borderWidth:     0.5,
                borderColor:     '#f0d3d8',
                backgroundColor: pressed ? '#fde8eb' : '#fff',
              })}
            >
              <Ionicons name="log-out-outline" size={16} color="#e0435a" />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#e0435a' }}>
                Log out
              </Text>
            </Pressable>

            <Text style={{ fontSize: 11, color: '#b5b9c2', textAlign: 'center', marginTop: 10 }}>
              Version 2.4.1
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
