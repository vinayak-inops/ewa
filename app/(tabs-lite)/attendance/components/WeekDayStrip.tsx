/**
 * WeekDayStrip — horizontal scrollable 31-day date strip
 *
 * Shows the last 31 days as a scrollable row of day bubbles.
 * Each bubble is colour-coded by attendance status.
 * Auto-scrolls to today on focus.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { buildAttendanceDetail, type AttendanceRow } from './PunchRecords';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_SHORT  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MON_SHORT  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_STEP  = 42;
const DAYS_TOTAL = 31;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function toLocalDateKey(date: Date) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getAttendanceDateKey(record: AttendanceRow): string {
  // Try direct ISO date fields first
  for (const key of ['date', 'Date', 'attendanceDate', 'attendanceOn', 'shiftDate', 'createdAt', 'createdOn']) {
    const v = record[key];
    if (typeof v === 'string' && v.trim()) {
      const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
  }
  // Fall back to year/month/day numeric fields
  const year  = Number(record.year  ?? record.Year);
  const month = Number(record.month ?? record.Month);
  const day   = Number(record.day   ?? record.Day   ?? record.dateNo ?? record.dayNo ?? record.date ?? record.Date);
  if (year && month && day) {
    const d = new Date(year, month - 1, day);
    if (!Number.isNaN(d.getTime())) return toLocalDateKey(d);
  }
  return '';
}

function getAttendanceRowForDay(date: Date, rows: AttendanceRow[]) {
  const key = toLocalDateKey(date);
  return rows.find((r) => getAttendanceDateKey(r) === key) ?? null;
}

function getStripDayColor(detail: ReturnType<typeof buildAttendanceDetail> | null, hasData: boolean): { bg: string; text: string } | null {
  if (!hasData || !detail) return null;
  const leave = (detail.leaveCode || '').trim().toUpperCase();
  const id    = (detail.attendanceID || '').trim().toUpperCase();
  if (leave && leave !== '00' && leave !== '0' && leave !== '-') return { bg: '#f59e0b', text: '#fff' };
  if (id === 'PP') return { bg: '#2563eb', text: '#fff' };
  if (id === 'AA') return { bg: '#fca5a5', text: '#7f1d1d' };
  if (id === 'HH') return { bg: '#fde68a', text: '#78350f' };
  if (id === 'WW') return { bg: '#cbd5e1', text: '#334155' };
  return { bg: '#a78bfa', text: '#fff' };
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  today:          Date;
  selectedDate:   Date | null;
  attendanceRows: AttendanceRow[];
  onSelectDate:   (d: Date) => void;
  onOpenCalendar: () => void;
  loading?:       boolean;
};

export function WeekDayStrip({ today, selectedDate, attendanceRows, onSelectDate, onOpenCalendar, loading }: Props) {
  const listRef = useRef<FlatList<Date>>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    `${MON_SHORT[today.getMonth()]} ${today.getFullYear()}`
  );

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = DAYS_TOTAL - 1; i >= 0; i--) {
      arr.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    }
    return arr;
  }, [today]);

  useEffect(() => {
    setVisibleMonth(`${MON_SHORT[today.getMonth()]} ${today.getFullYear()}`);
  }, [today]);

  // Scroll to today on every focus
  useFocusEffect(
    useCallback(() => {
      setVisibleMonth(`${MON_SHORT[today.getMonth()]} ${today.getFullYear()}`);
      const t = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: DAYS_TOTAL - 1, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }, [today])
  );

  const handleScroll = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.min(Math.floor(offsetX / ITEM_STEP) + 3, days.length - 1);
    const d = days[Math.max(0, idx)];
    if (d) setVisibleMonth(`${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`);
  }, [days]);

  const renderDay = useCallback(({ item: date }: { item: Date }) => {
    const sel        = selectedDate ? isSameCalendarDay(date, selectedDate) : false;
    const tod        = isSameCalendarDay(date, today);
    const dayRow     = getAttendanceRowForDay(date, attendanceRows);
    const dayDetail  = dayRow ? buildAttendanceDetail(dayRow) : null;
    const stripColor = !sel && !tod ? getStripDayColor(dayDetail, Boolean(dayRow)) : null;

    return (
      <Pressable onPress={() => onSelectDate(date)} className="items-center w-10 mr-[2px] gap-[1px]">
        <Text className={`text-[10px] font-semibold mb-[2px] ${tod ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
          {DAY_SHORT[date.getDay()]}
        </Text>
        <View
          className={`w-8 h-8 rounded-full items-center justify-center ${sel ? 'bg-blue-600' : tod && !sel ? 'border-2 border-blue-600 bg-blue-50' : ''}`}
          style={[!sel && !tod ? { backgroundColor: stripColor ? stripColor.bg : '#f1f5f9' } : undefined]}
        >
          {sel
            ? <Ionicons name="checkmark" size={13} color="#fff" />
            : (
              <Text
                className={`text-xs font-semibold ${tod && !sel ? 'text-blue-600 font-bold' : 'text-slate-900'}`}
                style={stripColor ? { color: stripColor.text } : undefined}
              >
                {date.getDate()}
              </Text>
            )
          }
        </View>
      </Pressable>
    );
  }, [selectedDate, attendanceRows, today, onSelectDate]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_STEP, offset: ITEM_STEP * index, index,
  }), []);

  return (
    <View className="gap-2">
      <View
        className="bg-white rounded-2xl p-3"
        style={{ shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}
      >
        {/* Month label + calendar opener */}
        <Pressable onPress={onOpenCalendar} className="flex-row items-center justify-between mb-[6px]">
          <Text className="text-[11px] font-bold text-slate-500">{visibleMonth}</Text>
          <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
        </Pressable>

        {loading ? (
          <View className="h-[60px] items-center justify-center">
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={days}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderDay}
            horizontal
            showsHorizontalScrollIndicator={false}
            getItemLayout={getItemLayout}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={DAYS_TOTAL}
            maxToRenderPerBatch={30}
            windowSize={10}
            initialScrollIndex={DAYS_TOTAL - 1}
            onScrollToIndexFailed={() => {
              setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
            }}
          />
        )}
      </View>
    </View>
  );
}
