/**
 * WeekDayStrip — Monthly Muster Calendar Card
 *
 * Spec:
 *  • White card, 18 px radius, elevated shadow
 *  • Header  : < Month >  |  [N] present
 *  • Grid    : S M T W T F S — rounded-square cells (9 px radius), 6 px gap
 *  • Status  : Present · Overtime · Absent · Weekly off · Holiday
 *  • Today   : persistent white-gap + dark outer ring
 *  • Selected: 2 px dark outline, persists until another cell is tapped
 *  • Press   : scale 0.9 animation, 120 ms
 *  • Legend  : one wrapped row, dot + label
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';

import { buildAttendanceDetail, type AttendanceRow } from './PunchRecords';

// ─── Tokens ───────────────────────────────────────────────────────────────────

const CHEVRON_COLOR = '#9CA3AF';
const PRESENT_NUM_COLOR = '#1E40AF'; // for ActivityIndicator color prop

const STATUS = {
  present: { bgClass: 'bg-blue-100',   textClass: 'text-blue-800',   dotClass: 'bg-blue-500',   dot: '#3b82f6', label: 'Present'  },
  ot:      { bgClass: 'bg-orange-100', textClass: 'text-orange-700', dotClass: 'bg-orange-400', dot: '#f97316', label: 'Half Day' },
  absent:  { bgClass: 'bg-red-100',    textClass: 'text-red-700',    dotClass: 'bg-red-400',    dot: '#ef4444', label: 'Absent'   },
  off:     { bgClass: 'bg-gray-100',   textClass: 'text-gray-500',   dotClass: 'bg-gray-300',   dot: '#9ca3af', label: 'Week Off' },
  leave:   { bgClass: 'bg-violet-100', textClass: 'text-violet-700', dotClass: 'bg-violet-400', dot: '#8b5cf6', label: 'Leave'    },
  holiday: { bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', dotClass: 'bg-yellow-400', dot: '#eab308', label: 'Holiday'  },
  none:    { bgClass: 'bg-[#F8FAFC]',  textClass: 'text-slate-300',  dotClass: 'bg-[#E2E8F0]',  dot: '#E2E8F0', label: ''         },
} as const;

type StatusKey = keyof typeof STATUS;

const DAY_LABELS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES  = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isSame(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function getRowKey(row: AttendanceRow): string {
  for (const k of ['date','Date','attendanceDate','attendanceOn','shiftDate','createdAt']) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  const y  = Number(row.year  ?? row.Year);
  const mo = Number(row.month ?? row.Month);
  const d  = Number(row.day   ?? row.Day ?? row.dateNo ?? row.dayNo ?? row.date ?? row.Date);
  if (y && mo && d) {
    const dt = new Date(y, mo - 1, d);
    if (!isNaN(dt.getTime())) return toKey(dt);
  }
  return '';
}

function resolveStatus(row: AttendanceRow | null): StatusKey {
  if (!row) return 'none';
  const det   = buildAttendanceDetail(row);
  const id    = (det.attendanceID ?? '').trim().toUpperCase();
  const leave = (det.leaveCode    ?? '').trim().toUpperCase();
  const ot    = det.otHours       ?? 0;

  if (leave && leave !== '-' && leave !== '00' && leave !== '0') return 'leave';
  if (id === 'PP' && ot > 0) return 'ot';
  if (id === 'PP')           return 'present';
  if (id === 'AA')           return 'absent';
  if (id === 'WW')           return 'off';
  if (id === 'HH')           return 'holiday';
  return 'none';
}

type GridCell = { date: Date; inMonth: boolean };

function buildGrid(year: number, month: number): GridCell[][] {
  const firstDay    = new Date(year, month, 1).getDay();   // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const flat: GridCell[] = [];

  for (let i = 0; i < firstDay; i++)
    flat.push({ date: new Date(year, month, i - firstDay + 1), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    flat.push({ date: new Date(year, month, d), inMonth: true });
  const tail = flat.length % 7;
  if (tail > 0)
    for (let i = 1; i <= 7 - tail; i++)
      flat.push({ date: new Date(year, month + 1, i), inMonth: false });

  // Split into rows of 7
  const rows: GridCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));
  return rows;
}

// ─── DayCell (animated) ───────────────────────────────────────────────────────

type DayCellProps = {
  cell:       GridCell;
  status:     StatusKey;
  isToday:    boolean;
  isSelected: boolean;
  isFuture:   boolean;
  onPress:    (d: Date) => void;
};

function DayCell({ cell, status, isToday, isSelected, isFuture, onPress }: DayCellProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const col   = STATUS[status];

  const animIn  = useCallback(() => {
    Animated.timing(scale, { toValue: 0.9, duration: 120, useNativeDriver: true }).start();
  }, [scale]);
  const animOut = useCallback(() => {
    Animated.timing(scale, { toValue: 1,   duration: 120, useNativeDriver: true }).start();
  }, [scale]);

  // Ghost cell — out-of-month filler (transparent, no press)
  if (!cell.inMonth) {
    return <View className="flex-1" />;
  }

  return (
    <Pressable
      className="flex-1"
      onPressIn={animIn}
      onPressOut={animOut}
      onPress={() => !isFuture && onPress(cell.date)}
      disabled={isFuture}
    >
      {/* scale + opacity must stay inline — Animated runtime values */}
      <Animated.View
        style={{
          flex:        1,
          aspectRatio: 1,
          transform:   [{ scale }],
          opacity:     isFuture ? 0.28 : 1,
        }}
      >
        {/* Today: white-gap ring (2 px white padding) + dark border = double ring */}
        {isToday ? (
          <View className="flex-1 rounded-[13px] border-2 border-[#111827] p-0.5 bg-white">
            <View className={`flex-1 rounded-[9px] items-center justify-center ${col.bgClass}`}>
              <Text className={`text-[13px] font-bold ${col.textClass}`}>
                {cell.date.getDate()}
              </Text>
            </View>
          </View>
        ) : (
          <View
            className={`flex-1 rounded-[9px] items-center justify-center ${col.bgClass}${
              isSelected ? ' border-2 border-[#111827]' : ''
            }`}
          >
            <Text className={`text-[13px] ${isSelected ? 'font-bold' : 'font-semibold'} ${col.textClass}`}>
              {cell.date.getDate()}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function LegendItem({ statusKey }: { statusKey: StatusKey }) {
  const s = STATUS[statusKey];
  if (!s.label) return null;
  const isOff = statusKey === 'off';
  return (
    <View className="flex-row items-center gap-[5px]">
      {/* borderWidth: 1.5 has no NativeWind equivalent — keep inline for off dot only */}
      <View
        className={`w-[7px] h-[7px] rounded-full ${isOff ? '' : s.dotClass}`}
        style={isOff ? { borderWidth: 1.5, borderColor: s.dot } : undefined}
      />
      <Text className="text-[11.5px] text-gray-500 font-medium">{s.label}</Text>
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  today:           Date;
  selectedDate:    Date | null;
  attendanceRows:  AttendanceRow[];
  onSelectDate:    (d: Date) => void;
  onOpenCalendar:  () => void;   // kept for API compat
  onMonthChange?:  (firstOfMonth: Date) => void;  // called when ‹ › is tapped
  loading?:        boolean;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function WeekDayStrip({
  today, selectedDate, attendanceRows, onSelectDate, onMonthChange, loading,
}: Props) {

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const b = selectedDate ?? today;
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });

  // Helper: change month locally AND notify parent so it can re-fetch data
  const changeMonth = useCallback((newFirst: Date) => {
    setViewMonth(newFirst);
    onMonthChange?.(newFirst);
  }, [onMonthChange]);

  useEffect(() => {
    if (!selectedDate) return;
    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      const b = selectedDate ?? today;
      setViewMonth(new Date(b.getFullYear(), b.getMonth(), 1));
    }, [selectedDate, today])
  );

  const yr = viewMonth.getFullYear();
  const mo = viewMonth.getMonth();

  const { rows, rowMap, presentCount } = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    for (const r of attendanceRows) {
      const k = getRowKey(r);
      if (k) map.set(k, r);
    }
    let count = 0;
    for (const [, r] of map) {
      if (resolveStatus(r) === 'present' || resolveStatus(r) === 'ot') count++;
    }
    return { rows: buildGrid(yr, mo), rowMap: map, presentCount: count };
  }, [yr, mo, attendanceRows]);

  const canNext = new Date(yr, mo + 1, 1) <= today;

  return (
    <View
      className="bg-white rounded-[18px] border border-gray-200 overflow-hidden"
      style={{
        shadowColor:   '#CBD5E1',
        shadowOffset:  { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius:  4,
        elevation:     1,
      }}
    >
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">

        {/* ‹ Month › */}
        <View className="flex-row items-center gap-[2px]">
          <Pressable
            onPress={() => changeMonth(new Date(yr, mo - 1, 1))}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="chevron-back" size={18} color={CHEVRON_COLOR} />
          </Pressable>

          <Text className="text-[15.5px] font-semibold text-[#111827] px-1.5">
            {MONTH_NAMES[mo]} {yr}
          </Text>

          <Pressable
            onPress={() => { if (canNext) changeMonth(new Date(yr, mo + 1, 1)); }}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: canNext ? (pressed ? 0.5 : 1) : 0.25 })}
          >
            <Ionicons name="chevron-forward" size={18} color={CHEVRON_COLOR} />
          </Pressable>
        </View>

        {/* N present */}
        <View className="flex-row items-baseline gap-[3px]">
          <Text className="text-[15px] font-bold text-blue-800">{presentCount}</Text>
          <Text className="text-[13px] font-medium text-gray-400">present</Text>
        </View>
      </View>

      {loading ? (
        <View className="h-[220px] items-center justify-center">
          <ActivityIndicator size="small" color={PRESENT_NUM_COLOR} />
        </View>
      ) : (
        <View className="px-3 pb-3">

          {/* ── Weekday labels: S M T W T F S ── */}
          <View className="flex-row mb-1.5">
            {DAY_LABELS.map((lbl, i) => (
              <Text key={i} className="flex-1 text-center text-[10px] font-medium text-[#C1C6CC] py-0.5">
                {lbl}
              </Text>
            ))}
          </View>

          {/* ── Calendar grid ── */}
          <View className="gap-1.5">
            {rows.map((row, ri) => (
              <View key={ri} className="flex-row gap-1.5">
                {row.map((cell, ci) => {
                  const key      = cell.inMonth ? toKey(cell.date) : '';
                  const row_     = key ? (rowMap.get(key) ?? null) : null;
                  const status   = cell.inMonth ? resolveStatus(row_) : 'none';
                  const isToday  = cell.inMonth && isSame(cell.date, today);
                  const isSel    = cell.inMonth && selectedDate ? isSame(cell.date, selectedDate) : false;
                  const isFuture = cell.inMonth && cell.date > today;

                  return (
                    <DayCell
                      key={ci}
                      cell={cell}
                      status={status}
                      isToday={isToday}
                      isSelected={isSel}
                      isFuture={isFuture}
                      onPress={onSelectDate}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {/* ── Legend ── */}
          <View className="flex-row flex-wrap gap-3 mt-3.5 pt-3 border-t border-slate-100">
            {(['present', 'ot', 'absent', 'off', 'leave', 'holiday'] as StatusKey[]).map((k) => (
              <LegendItem key={k} statusKey={k} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
