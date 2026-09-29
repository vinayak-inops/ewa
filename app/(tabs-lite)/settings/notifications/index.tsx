import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEADER_SPACER_HEIGHT, ScreenHeader } from '@/components/ui/ScreenHeader';

import { NotificationCard } from './_components/NotificationCard';
import { TabBar } from './_components/TabBar';
import { MOCK_NOTIFICATIONS, type Category, type Notification } from './_components/types';


export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Category>('All');
  const [notifs,    setNotifs]    = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const filtered = activeTab === 'All'
    ? notifs
    : notifs.filter((n) => n.category === activeTab);

  const toggleStar = (id: string) =>
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, starred: !n.starred } : n));

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0B1424" />

      {/* ── Header ── */}
      <ScreenHeader
        title="Notifications"
        onBack={() => router.back()}
        onNotification={() => router.push('/(tabs-lite)/settings/notifications' as any)}
        onSettings={() => router.push('/(tabs-lite)/settings' as any)}
      />

      {/* Spacer below absolute header */}
      <View style={{ height: HEADER_SPACER_HEIGHT(insets.top) }} />

      {/* ── Tabs ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Notification list ── */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-white">
        {filtered.length === 0 ? (
          <View className="items-center py-20 gap-3">
            <Ionicons name="notifications-off-outline" size={40} color="#D1D5DB" />
            <Text className="text-[#9CA3AF] text-[14px] font-medium">No notifications</Text>
          </View>
        ) : (
          filtered.map((item, index) => (
            <NotificationCard
              key={item.id}
              item={item}
              onStar={toggleStar}
              onPress={(n) => router.push(`/(tabs-lite)/settings/notifications/${n.id}` as any)}
              isLast={index === filtered.length - 1}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
