import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOCK_NOTIFICATIONS } from './_components/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  Attendance: '#15803d',
  Salary:     '#15803d',
  Docs:       '#6d28d9',
};
const CATEGORY_BG: Record<string, string> = {
  Attendance: '#dcfce7',
  Salary:     '#dcfce7',
  Docs:       '#ede9fe',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item   = MOCK_NOTIFICATIONS.find((n) => n.id === id);

  const [starred, setStarred] = useState(item?.starred ?? false);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Notification not found.</Text>
      </View>
    );
  }

  const { detail, category, subtitle } = item;
  const tagColor = CATEGORY_COLOR[category] ?? '#64748b';
  const tagBg    = CATEGORY_BG[category]    ?? '#f1f5f9';

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1424" />

      {/* ── Single-line header ── */}
      <View
        style={{
          backgroundColor:   '#0B1424',
          paddingTop:        insets.top + 14,
          paddingBottom:     14,
          paddingHorizontal: 16,
          flexDirection:     'row',
          alignItems:        'center',
          gap:               12,
        }}
      >
        <Pressable
          onPress={() => router.replace('/(tabs-lite)/settings' as any)}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.1 }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: '#fff' }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >

        {/* ── Title block ──────────────────────────────────
            16px left/right, 20px top
            title → chip: 4px
            chip → divider: 12px                           */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', lineHeight: 24 }}>
            {subtitle}
          </Text>

          <View
            style={{
              marginTop:         4,
              alignSelf:         'flex-start',
              backgroundColor:   tagBg,
              borderRadius:      20,
              paddingHorizontal: 8,
              paddingVertical:   2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: tagColor }}>
              {category}
            </Text>
          </View>

          <View style={{ height: 0.5, backgroundColor: '#E5E7EB', marginTop: 12 }} />
        </View>

        {/* ── Sender row ───────────────────────────────────
            14px top/bottom, 16px left/right
            icon tile 36×36 rounded 8px
            icon → text: 10px
            name → "to": 2px
            "to" → chevron: 4px                           */}
        <View
          style={{
            flexDirection:     'row',
            alignItems:        'flex-start',
            paddingHorizontal: 16,
            paddingVertical:   14,
            gap:               10,
          }}
        >
          <View
            style={{
              width:           36,
              height:          36,
              borderRadius:    8,
              backgroundColor: detail.senderIconBg,
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}
          >
            <Ionicons name={detail.senderIcon as any} size={17} color={detail.senderIconColor} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' }}>
                {detail.sender}
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginRight: 10 }}>
                {detail.timestamp}
              </Text>
              <Pressable onPress={() => setStarred((s) => !s)} hitSlop={10}>
                <Ionicons
                  name={starred ? 'star' : 'star-outline'}
                  size={15}
                  color={starred ? '#f59e0b' : '#D1D5DB'}
                />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>to {detail.recipient}</Text>
              <Ionicons name="chevron-down" size={11} color="#9CA3AF" />
            </View>
          </View>
        </View>

        <View style={{ height: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 16 }} />

        {/* ── Body + info card + helper ──────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 22 }}>
            {detail.message}
          </Text>

          {/* Info card — 12px below paragraph */}
          <View
            style={{
              marginTop:         12,
              backgroundColor:   '#F9FAFB',
              borderRadius:      10,
              borderWidth:       0.5,
              borderColor:       '#E5E7EB',
              paddingHorizontal: 14,
              paddingVertical:   4,
            }}
          >
            {detail.rows.map((row, i) => (
              <React.Fragment key={row.label}>
                <View
                  style={{
                    flexDirection:   'row',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '400' }}>
                    {row.label}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: row.valueColor ?? '#111827' }}>
                    {row.value}
                  </Text>
                </View>
                {i < detail.rows.length - 1 && (
                  <View style={{ height: 0.5, backgroundColor: '#E5E7EB' }} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Helper text */}
          {detail.footer && (
            <Text style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 20, marginTop: 12 }}>
              {detail.footer}
            </Text>
          )}
        </View>

        {/* ── Action buttons ────────────────────────────── */}
        <View
          style={{
            flexDirection:     'row',
            gap:               10,
            paddingHorizontal: 16,
            paddingTop:        16,
            paddingBottom:     8,
          }}
        >
          <Pressable
            style={({ pressed }) => ({
              flex:            1,
              flexDirection:   'row',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             6,
              paddingVertical: 12,
              borderRadius:    50,
              borderWidth:     0.5,
              borderColor:     '#D1D5DB',
              backgroundColor: pressed ? '#F9FAFB' : '#fff',
            })}
          >
            <Ionicons name="arrow-undo-outline" size={16} color="#374151" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Reply</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => ({
              flex:            1,
              flexDirection:   'row',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             6,
              paddingVertical: 12,
              borderRadius:    50,
              borderWidth:     0.5,
              borderColor:     '#D1D5DB',
              backgroundColor: pressed ? '#F9FAFB' : '#fff',
            })}
          >
            <Ionicons name="arrow-redo-outline" size={16} color="#374151" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Forward</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
