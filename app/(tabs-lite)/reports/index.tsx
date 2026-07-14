import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportsEditor from './_components/reports-editor';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#0a1c63]">
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* ── Header ── */}
      <View className="px-4 pb-[18px] bg-[#0a1c63]" style={{ paddingTop: insets.top + 14 }}>
        <View className="flex-row justify-between items-center mb-[14px]">
          <View className="flex-row items-center gap-[10px]">
            <Pressable
              className="w-8 h-8 rounded-full bg-white/15 items-center justify-center"
              hitSlop={8}
              onPress={() => router.push('/(tabs-lite)/main-launchpad' as any)}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Text className="text-white text-xl font-bold">Reports</Text>
          </View>
          <View className="flex-row gap-[14px]">
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>
      </View>

      {/* ── Banner ── */}
      <View className="bg-[#0a1c63] px-4 pb-4">
        <View className="rounded-2xl overflow-hidden bg-[#1a3a8f] flex-row items-center px-[18px] py-[18px]">
          {/* Glow blobs — rgba + negative offsets stay inline */}
          <View style={{
            position: 'absolute', width: 130, height: 130, borderRadius: 65,
            backgroundColor: 'rgba(59,130,246,0.25)', right: 30, top: -40,
          }} />
          <View style={{
            position: 'absolute', width: 80, height: 80, borderRadius: 40,
            backgroundColor: 'rgba(96,165,250,0.15)', right: -10, bottom: -20,
          }} />

          <View className="flex-1">
            <Text className="text-base font-extrabold text-white" style={{ letterSpacing: -0.3 }}>
              Generate Reports, Fast.
            </Text>
            <Text className="text-[11px] text-white/60 mt-1 leading-4">
              Export attendance & HR data as Excel or PDF
            </Text>
          </View>

          <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center ml-3">
            <Ionicons name="document-text-outline" size={32} color="rgba(255,255,255,0.85)" />
          </View>
        </View>
      </View>

      {/* ── White sheet ── */}
      <View className="flex-1">
        <View className="flex-1 bg-[#f8fafc] rounded-tl-3xl rounded-tr-3xl">

          {/* Generate Report button */}
          <Pressable onPress={() => router.push('/(tabs-lite)/reports/create' as any)}>
            {({ pressed }) => (
              <View
                className="flex-row items-center gap-3 bg-[#1d4ed8] mx-[14px] mt-[14px] mb-1 rounded-2xl px-[14px] py-3"
                style={[
                  { shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View className="w-9 h-9 rounded-full bg-white items-center justify-center">
                  <Ionicons name="add" size={20} color="#1d4ed8" />
                </View>
                <View className="flex-1 gap-[2px]">
                  <Text className="text-[14px] font-extrabold text-white">Generate Report</Text>
                  <Text className="text-[11px] text-white/65 font-medium">Create a new Excel or PDF report</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
              </View>
            )}
          </Pressable>

          <ReportsEditor open={false} setOpen={() => {}} hideHeader />
        </View>
      </View>
    </View>
  );
}
