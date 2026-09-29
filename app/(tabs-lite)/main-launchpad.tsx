import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GateStatusCard } from './components/GateStatusCard';
import { LaunchpadHeader } from './components/LaunchpadHeader';
import { OffersSection } from './components/OffersSection';
import { TodaySection } from './components/TodaySection';

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function MainLaunchpadScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const gateStatus   = 'CLEARED\nTO WORK';
  const gateSubtitle = 'You can come to work tomorrow';
  const shiftInfo    = 'B Shift · 14:00–22:00 · Gate 3 · Plant 2 — Hosur';
  const medDaysLeft  = 9;
  const medMessage   = `Medical fitness expires in ${medDaysLeft} days`;
  const medSub       = "Book the camp on 29 Aug or you'll be stopped at the gate from 3 Sep.";

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* ── HEADER (sticky) ── */}
      <LaunchpadHeader />

      {/* ── GATE STATUS CARD (sticky below header) ── */}
      <GateStatusCard
        status={gateStatus}
        subtitle={gateSubtitle}
        shiftInfo={shiftInfo}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── SHOW GATE PASS BUTTON ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs-lite)/ewa' as any)}
          className="bg-amber-400 rounded-[14px] py-4 items-center justify-center mx-4 mb-5"
        >
          <Text className="text-[#1c1917] text-[15px] font-bold tracking-[0.3px]">
            Show gate pass
          </Text>
        </TouchableOpacity>

        {/* ── MEDICAL FITNESS ALERT ── */}
        <View className="bg-white rounded-[14px] p-4 flex-row items-center justify-between mx-4 mb-5">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 rounded-full bg-amber-400 mr-[7px]" />
              <Text className="text-[#0f172a] text-[13px] font-bold">{medMessage}</Text>
            </View>
            <Text className="text-slate-500 text-[11.5px] font-normal leading-4">{medSub}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-slate-100 rounded-lg px-3.5 py-2"
          >
            <Text className="text-[#0f172a] text-xs font-bold">Act</Text>
          </TouchableOpacity>
        </View>

        {/* ── TODAY SECTION ── */}
        <TodaySection />

        {/* ── SHORTCUTS ── */}
        <View className="mt-6 mx-4 mb-2">

          <Text className="text-slate-400 text-[11px] font-bold tracking-[1.6px] mb-3">
            SHORTCUTS
          </Text>

          {/* Face punch — full width */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs-lite)/attendance/face-punch' as any)}
            activeOpacity={0.8}
            className="flex-row items-center bg-white rounded-xl px-4 py-4 mb-2.5"
          >
            <View className="mr-3">
              <Ionicons name="scan-outline" size={22} color="#374151" />
            </View>
            <Text className="text-[#0f172a] text-[15px] font-medium flex-1">Face punch</Text>
          </TouchableOpacity>

          {/* Row 1 */}
          <View className="flex-row gap-2.5 mb-2.5">
            <TouchableOpacity
              onPress={() => router.push('/(tabs-lite)/ewa' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-white rounded-xl p-4"
            >
              <View className="flex-row items-center mb-2.5">
                <Ionicons name="cash-outline" size={22} color="#374151" />
                <View className="ml-2 bg-[#1e3a5f] border border-[#2d5a8e] rounded-[20px] px-[7px] py-0.5">
                  <Text className="text-[#bfdbfe] text-[9px] font-bold tracking-[0.4px]">Earn Wage</Text>
                </View>
              </View>
              <Text className="text-[#0f172a] text-[13px] font-medium">Salary++</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs-lite)/reports' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-white rounded-xl p-4"
            >
              <View className="mb-2.5">
                <Ionicons name="shield-checkmark-outline" size={22} color="#374151" />
              </View>
              <Text className="text-[#0f172a] text-[13px] font-medium">My documents</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              onPress={() => {}}
              activeOpacity={0.8}
              className="flex-1 bg-white rounded-xl p-4"
            >
              <View className="mb-2.5">
                <Ionicons name="document-text-outline" size={22} color="#374151" />
              </View>
              <Text className="text-[#0f172a] text-[13px] font-medium">Application</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs-lite)/attendance' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-white rounded-xl p-4"
            >
              <View className="mb-2.5">
                <Ionicons name="time-outline" size={22} color="#374151" />
              </View>
              <Text className="text-[#0f172a] text-[13px] font-medium">Attendance</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── OFFERS FOR YOU ── */}
        <OffersSection
          onEwaPress={() => router.push('/(tabs-lite)/ewa' as any)}
          onPfPress={() => {}}
        />

      </ScrollView>
    </View>
  );
}
