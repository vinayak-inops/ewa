/**
 * ScreenHeader — global reusable header component
 *
 * Absolute-positioned dark header that works on any screen.
 *
 * Layout (single row):
 *   [Back btn]  [Title + subtitle  — flex:1]  [rightContent | 🔔 ⚙]
 *
 * Usage
 * ─────
 *   import { ScreenHeader, HEADER_SPACER_HEIGHT } from '@/components/ui/ScreenHeader';
 *
 *   // Inside your screen:
 *   const insets = useSafeAreaInsets();
 *
 *   <View style={{ flex: 1, backgroundColor: '#0a1c63' }}>
 *     <ScreenHeader
 *       title="My Screen"
 *       onBack={() => router.back()}
 *       onNotification={() => {}}
 *       onSettings={() => {}}
 *     />
 *     <View style={{ height: HEADER_SPACER_HEIGHT(insets.top) }} />
 *     {/* rest of screen content *\/}
 *   </View>
 *
 * Props
 * ─────
 *  title           string           required — main heading
 *  subtitle        string           optional — line below title;
 *                                   defaults to today's date (en-IN locale)
 *  backgroundColor string           optional — default '#0a1c63'
 *  onBack          () => void       required — back button handler
 *  onNotification  () => void       optional — omit to hide 🔔 button
 *  onSettings      () => void       optional — omit to hide ⚙ button
 *  rightContent    React.ReactNode  optional — replaces icon buttons entirely
 *                                   (e.g. a pill, badge, custom action)
 *
 * HEADER_SPACER_HEIGHT(insetsTop)
 *   Returns the pixel height the parent View must reserve so content
 *   starts below the floating header.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Spacer helper ────────────────────────────────────────────────────────────

/** Pixel height the parent must reserve so content starts below the header. */
export function HEADER_SPACER_HEIGHT(insetsTop: number): number {
  return insetsTop + 70;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  onBack: () => void;
  onNotification?: () => void;
  onSettings?: () => void;
  /** Replaces the default icon-button row entirely when provided. */
  rightContent?: React.ReactNode;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScreenHeader({
  title,
  subtitle,
  backgroundColor = '#0B1424',
  onBack,
  onNotification,
  onSettings,
  rightContent,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const dateLabel =
    subtitle ??
    new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
    });

  return (
    <View
      className="absolute top-0 left-0 right-0 z-20 px-4 pb-4"
      style={{
        backgroundColor,
        paddingTop: insets.top + 10,
      }}
    >
      <View className="flex-row items-center">

        {/* ── Back button ── */}
        <Pressable
          onPress={onBack}
          hitSlop={10}
          className="w-[34px] h-[34px] items-center justify-center mr-2.5"
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </Pressable>

        {/* ── Title + subtitle ── */}
        <View className="flex-1">
          <Text
            className="text-white"
            style={{ fontSize: 17, fontWeight: '700', letterSpacing: 0.1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="text-white/55"
            style={{ fontSize: 12, fontWeight: '400', marginTop: 3, letterSpacing: 0.2 }}
            numberOfLines={1}
          >
            {dateLabel}
          </Text>
        </View>

        {/* ── Right side ── */}
        {rightContent ? (
          <View className="flex-row items-center gap-2">
            {rightContent}
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            {onNotification !== undefined && (
              <Pressable
                hitSlop={8}
                onPress={onNotification}
                className="w-[34px] h-[34px] items-center justify-center"
              >
                <Ionicons name="notifications-outline" size={18} color="#fff" />
              </Pressable>
            )}
            {onSettings !== undefined && (
              <Pressable
                hitSlop={8}
                onPress={onSettings}
                className="w-[34px] h-[34px] items-center justify-center"
              >
                <Ionicons name="settings-outline" size={18} color="#fff" />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
