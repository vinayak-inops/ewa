import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOCK_NOTIFICATIONS } from './_components/types';

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

export default function NotificationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item   = MOCK_NOTIFICATIONS.find((n) => n.id === id);

  const [starred, setStarred] = useState(item?.starred ?? false);

  if (!item) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-sm text-gray-400">Notification not found.</Text>
      </View>
    );
  }

  const { detail, category, subtitle } = item;
  const tagColor = CATEGORY_COLOR[category] ?? '#64748b';
  const tagBg    = CATEGORY_BG[category]    ?? '#f1f5f9';

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0B1424" />

      {/* Header */}
      <View
        className="bg-[#0B1424] pb-[14px] px-4 flex-row items-center gap-3"
        style={{ paddingTop: insets.top + 14 }}
      >
        <Pressable
          onPress={() => router.replace('/(tabs-lite)/settings' as any)}
          hitSlop={12}
          className="active:opacity-55"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <Text className="flex-1 text-base font-bold text-white tracking-[0.1px]" numberOfLines={1}>
          {subtitle}
        </Text>

        <View className="flex-row items-center gap-4">
          <Pressable hitSlop={10} className="active:opacity-55">
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable hitSlop={10} className="active:opacity-55">
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Title block */}
        <View className="px-4 pt-5">
          <Text className="text-[17px] font-bold text-gray-900 leading-6">{subtitle}</Text>

          <View
            className="mt-1 self-start rounded-full px-2 py-0.5"
            style={{ backgroundColor: tagBg }}
          >
            <Text className="text-xs font-semibold" style={{ color: tagColor }}>
              {category}
            </Text>
          </View>

          <View className="h-[0.5px] bg-gray-200 mt-3" />
        </View>

        {/* Sender row */}
        <View className="flex-row items-start px-4 py-[14px] gap-2.5">
          <View
            className="w-9 h-9 rounded-lg items-center justify-center shrink-0"
            style={{ backgroundColor: detail.senderIconBg }}
          >
            <Ionicons name={detail.senderIcon as any} size={17} color={detail.senderIconColor} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="flex-1 text-sm font-bold text-gray-900">{detail.sender}</Text>
              <Text className="text-xs text-gray-400 mr-2.5">{detail.timestamp}</Text>
              <Pressable onPress={() => setStarred((s) => !s)} hitSlop={10}>
                <Ionicons
                  name={starred ? 'star' : 'star-outline'}
                  size={15}
                  color={starred ? '#f59e0b' : '#D1D5DB'}
                />
              </Pressable>
            </View>

            <View className="flex-row items-center mt-0.5 gap-1">
              <Text className="text-xs text-gray-500">to {detail.recipient}</Text>
              <Ionicons name="chevron-down" size={11} color="#9CA3AF" />
            </View>
          </View>
        </View>

        <View className="h-[0.5px] bg-gray-200 mx-4" />

        {/* Body */}
        <View className="px-4 pt-4">
          <Text className="text-sm font-bold text-gray-900 leading-[22px]">{detail.message}</Text>

          {/* Info card */}
          <View className="mt-3 bg-gray-50 rounded-[10px] border-[0.5px] border-gray-200 px-[14px] py-1">
            {detail.rows.map((row, i) => (
              <React.Fragment key={row.label}>
                <View className="flex-row items-center justify-between py-2.5">
                  <Text className="text-sm text-gray-500 font-normal">{row.label}</Text>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: row.valueColor ?? '#111827' }}
                  >
                    {row.value}
                  </Text>
                </View>
                {i < detail.rows.length - 1 && (
                  <View className="h-[0.5px] bg-gray-200" />
                )}
              </React.Fragment>
            ))}
          </View>

          {detail.footer && (
            <Text className="text-[13px] text-gray-400 leading-5 mt-3">{detail.footer}</Text>
          )}
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2.5 px-4 pt-4 pb-2">
          <Pressable className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-full border-[0.5px] border-gray-300 bg-white active:bg-gray-50">
            <Ionicons name="arrow-undo-outline" size={16} color="#374151" />
            <Text className="text-sm font-semibold text-gray-700">Reply</Text>
          </Pressable>

          <Pressable className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-full border-[0.5px] border-gray-300 bg-white active:bg-gray-50">
            <Ionicons name="arrow-redo-outline" size={16} color="#374151" />
            <Text className="text-sm font-semibold text-gray-700">Forward</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
