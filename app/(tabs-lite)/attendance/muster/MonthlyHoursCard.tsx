/**
 * MonthlyHoursCard
 *
 * Blue banner card that shows total working hours for the current month.
 * Sits between the screen header and the white sheet on attendance screens.
 *
 * Usage
 * ─────
 *   import { MonthlyHoursCard } from '@/components/ui/MonthlyHoursCard';
 *
 *   <MonthlyHoursCard totalMinutes={totalMonthMinutes} />
 *
 * Props
 * ─────
 *  totalMinutes   number   total working minutes this month (converted to Xh XXm)
 *  outerBg        string   background of the strip that wraps the card; default '#0B1424'
 *  label          string   small label below the title; default 'Total this month'
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

// ─── Props ────────────────────────────────────────────────────────────────────

export type MonthlyHoursCardProps = {
  totalMinutes: number;
  outerBg?: string;
  label?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MonthlyHoursCard({
  totalMinutes,
  outerBg = '#0B1424',
  label   = 'Total this month',
}: MonthlyHoursCardProps) {
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const display = `${hours}h ${String(minutes).padStart(2, '0')}m`;

  return (
    /* outerBg is a runtime prop — only backgroundColor stays inline */
    <View className="pb-4 px-4" style={{ backgroundColor: outerBg }}>
      <View className="bg-[#1d4ed8] rounded-[18px] h-[130px] overflow-hidden flex-row">

        {/* ── Decorative circle blur — top-right ── */}
        <View
          pointerEvents="none"
          className="absolute w-[200px] h-[200px] rounded-full opacity-40 bg-[rgba(59,130,246,0.35)] -top-[80px] -right-[60px]"
        />

        {/* ── Illustration — right side ── */}
        <View
          pointerEvents="none"
          className="absolute right-0 top-0 bottom-0 w-[110px] items-center justify-center"
        >
          {/* Outer ring */}
          <View className="absolute w-24 h-24 rounded-full bg-[rgba(96,165,250,0.2)]" />
          {/* Inner ring */}
          <View className="absolute w-[68px] h-[68px] rounded-full bg-[rgba(59,130,246,0.35)]" />
          {/* Centre icon */}
          <View className="w-[52px] h-[52px] rounded-full bg-white/[0.12] items-center justify-center">
            <Ionicons name="time-outline" size={30} color="rgba(191,219,254,0.9)" />
          </View>
          {/* Top-right mini badge */}
          <View className="absolute top-3.5 right-2.5 w-[26px] h-[26px] rounded-full bg-[rgba(59,130,246,0.35)] items-center justify-center">
            <Ionicons name="analytics-outline" size={12} color="#bfdbfe" />
          </View>
          {/* Bottom-left mini badge */}
          <View className="absolute bottom-[18px] left-1.5 w-[22px] h-[22px] rounded-full bg-[rgba(59,130,246,0.35)] items-center justify-center">
            <Ionicons name="checkmark-done-outline" size={10} color="#bfdbfe" />
          </View>
        </View>

        {/* ── Text content — left side ── */}
        <View className="flex-1 py-4 pl-4 pr-1 justify-center">
          <View className="flex-row items-center justify-between pr-3">
            <View className="flex-1">
              <Text className="text-[13px] text-white font-bold leading-[18px] mb-1">
                {'Monthly\nWorking Hours'}
              </Text>
              <Text className="text-[10px] text-white/55 font-medium">
                {label}
              </Text>
            </View>
            <Text className="text-[26px] font-extrabold text-white tracking-[-0.5px]">
              {display}
            </Text>
          </View>
        </View>

      </View>
    </View>
  );
}
