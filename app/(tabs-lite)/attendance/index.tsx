import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const OVAL_W = Math.min(196, Math.round(SCREEN_W * 0.50));
const OVAL_H = Math.round(OVAL_W * 1.21);

const APP_FONT_FAMILY = 'Inter';
const ATTENDANCE_SEARCH_URL = process.env.EXPO_PUBLIC_ATTENDANCE_SEARCH_URL ?? 'muster/muster/search';
const DATA_CHECK_URL = process.env.EXPO_PUBLIC_DATA_CHECK_URL ?? 'muster/data_check/search';

type TodayPunch = {
  _id: string;
  employeeID: string;
  punchedTime: string;
  transactionTime: string;
  inOut: string;
  typeOfMovement: string;
  readerSerialNumber: string;
  processed: boolean;
  organizationCode: string;
  tenantCode: string;
};

type AttendanceDetail = {
  workOrderNumber: string;
  shiftsAllocated: string;
  shiftCode: string;
  extraManShift: string;
  attendanceID: string;
  hoursWorked: number;
  lateIn: number;
  earlyOut: number;
  extraHoursPostShift: number;
  extraHoursPreShift: number;
  extraHours: number;
  personalOut: number;
  officialOut: number;
  otHours: number;
  leaveCode: string;
  firstIn: string;
  lastOut: string;
  inPunchCount: number;
  outPunchCount: number;
};

type AttendanceRow = Record<string, unknown>;
type PunchRow = {
  id: string;
  employeeID: string;
  inOut: string;
  typeOfMovement: string;
  punchedTime: string;
  readerSerialNumber: string;
  processed: string;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Short weekday labels like the reference: Mo Tu We … */
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];


type BannerDef = {
  id: string;
  title: string;
  sub: string;
  bg: string;
  ringA: string;
  ringB: string;
  accent: string;
  primaryIcon: React.ComponentProps<typeof Ionicons>['name'];
  secondaryIcon: React.ComponentProps<typeof Ionicons>['name'];
  tertiaryIcon: React.ComponentProps<typeof Ionicons>['name'];
};

const BANNERS: BannerDef[] = [
  {
    id: 'b1',
    title: 'Track Your\nAttendance.',
    sub: 'View monthly logs and daily punch records',
    bg: '#1d4ed8',
    ringA: 'rgba(59,130,246,0.35)',
    ringB: 'rgba(96,165,250,0.2)',
    accent: '#bfdbfe',
    primaryIcon: 'calendar-outline',
    secondaryIcon: 'checkmark-done-outline',
    tertiaryIcon: 'time-outline',
  },
  {
    id: 'b2',
    title: 'Mark Face\nAttendance.',
    sub: 'Scan your face to mark in/out instantly',
    bg: '#0369a1',
    ringA: 'rgba(14,165,233,0.35)',
    ringB: 'rgba(56,189,248,0.2)',
    accent: '#bae6fd',
    primaryIcon: 'scan-circle-outline',
    secondaryIcon: 'person-outline',
    tertiaryIcon: 'shield-checkmark-outline',
  },
  {
    id: 'b3',
    title: 'Review Punch\nRecords.',
    sub: 'Check in/out times and movement history',
    bg: '#1e3a8a',
    ringA: 'rgba(37,99,235,0.4)',
    ringB: 'rgba(59,130,246,0.2)',
    accent: '#93c5fd',
    primaryIcon: 'finger-print-outline',
    secondaryIcon: 'create-outline',
    tertiaryIcon: 'list-outline',
  },
  {
    id: 'b4',
    title: 'Monitor\nWork Hours.',
    sub: 'Late in, early out, OT and extra hours at a glance',
    bg: '#4338ca',
    ringA: 'rgba(99,102,241,0.4)',
    ringB: 'rgba(129,140,248,0.2)',
    accent: '#c7d2fe',
    primaryIcon: 'hourglass-outline',
    secondaryIcon: 'stats-chart-outline',
    tertiaryIcon: 'trending-up-outline',
  },
];

function BannerIllustration({ b }: { b: BannerDef }) {
  return (
    <View pointerEvents="none" style={bannerStyles.illustrationWrap}>
      <View style={[bannerStyles.ringOuter, { backgroundColor: b.ringB }]} />
      <View style={[bannerStyles.ringInner, { backgroundColor: b.ringA }]} />
      <View style={bannerStyles.ringCenter}>
        <Ionicons name={b.primaryIcon} size={36} color={b.accent} />
      </View>
      <View style={[bannerStyles.floatIconA, { backgroundColor: b.ringA }]}>
        <Ionicons name={b.secondaryIcon} size={14} color={b.accent} />
      </View>
      <View style={[bannerStyles.floatIconB, { backgroundColor: b.ringA }]}>
        <Ionicons name={b.tertiaryIcon} size={12} color={b.accent} />
      </View>
    </View>
  );
}

function BannerCarousel() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={272}
      snapToAlignment="start"
      contentContainerStyle={bannerStyles.bannerScroll}
    >
      {BANNERS.map((b) => (
        <View key={b.id} style={[bannerStyles.bannerCard, { backgroundColor: b.bg }]}>
          <View pointerEvents="none" style={[bannerStyles.bannerShine, { backgroundColor: b.ringA }]} />
          <BannerIllustration b={b} />
          <View style={bannerStyles.bannerContent}>
            <Text style={bannerStyles.bannerTitle}>{b.title}</Text>
            <Text style={bannerStyles.bannerSub}>{b.sub}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const bannerStyles = StyleSheet.create({
  bannerScroll: { gap: 12, paddingHorizontal: 16 },
  bannerCard: { width: 260, height: 160, borderRadius: 18, overflow: 'hidden', flexDirection: 'row' },
  bannerShine: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -80, right: -60, opacity: 0.4,
  },
  illustrationWrap: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 110,
    alignItems: 'center', justifyContent: 'center',
  },
  ringOuter: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
  ringInner: { position: 'absolute', width: 68, height: 68, borderRadius: 34 },
  ringCenter: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  floatIconA: {
    position: 'absolute', top: 14, right: 10,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  floatIconB: {
    position: 'absolute', bottom: 18, left: 6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerContent: { flex: 1, paddingVertical: 16, paddingLeft: 16, paddingRight: 4, justifyContent: 'flex-end' },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 22, letterSpacing: -0.3, marginBottom: 4 },
  bannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500', lineHeight: 14, marginBottom: 10 },
  bannerLearnRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bannerLearn: { fontSize: 11, fontWeight: '700' },
});

const COLORS = {
  bg: '#eef2ff',
  sheet: '#eef2ff',
  ink: '#0f172a',
  muted: '#64748b',
  primary: '#2563eb',
  primaryStrong: '#1d4ed8',
  primaryDark: '#1e3a8a',
  accent: '#3b82f6',
  heroBg: '#dbeafe',
  heroBgLight: '#eff6ff',
  white: '#ffffff',
  border: '#e2e8f0',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isFutureCalendarDay(date: Date, today: Date) {
  return date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type GridDay = {
  date: Date;
  isCurrentMonth: boolean;
  label: number;
};

function buildMonthGrid(anchor: Date): GridDay[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const startOffset = getFirstDayOffset(year, month);
  const daysThisMonth = getDaysInMonth(year, month);
  const cells: GridDay[] = [];

  const lastDayPrev = new Date(year, month, 0).getDate();
  for (let i = 0; i < startOffset; i++) {
    const dayNum = lastDayPrev - startOffset + i + 1;
    cells.push({ date: new Date(year, month - 1, dayNum), isCurrentMonth: false, label: dayNum });
  }

  for (let d = 1; d <= daysThisMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true, label: d });
  }

  const remainder = cells.length % 7;
  const pad = remainder === 0 ? 0 : 7 - remainder;
  for (let i = 1; i <= pad; i++) {
    cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, label: i });
  }

  return cells;
}

function formatMinutesToHHMM(minutes: number) {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const hh = Math.floor(safeMinutes / 60);
  const mm = safeMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function parseNumericValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getFirstNonEmptyString(record: AttendanceRow, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getValueByKnownKeys(record: AttendanceRow, keys: string[]) {
  for (const key of keys) {
    if (key in record) return record[key];
  }

  const lowerKeyMap = new Map<string, unknown>();
  for (const [recordKey, value] of Object.entries(record)) {
    lowerKeyMap.set(recordKey.toLowerCase(), value);
  }
  for (const key of keys) {
    const value = lowerKeyMap.get(key.toLowerCase());
    if (value !== undefined) return value;
  }

  return undefined;
}

function getNumericByKnownKeys(record: AttendanceRow, keys: string[]) {
  const value = getValueByKnownKeys(record, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKeyFromValue(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
  if (!text) return '';

  const isoLike = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoLike) {
    const [, year, month, day] = isoLike;
    return `${year}-${month}-${day}`;
  }

  const dmyLike = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmyLike) {
    const [, day, month, year] = dmyLike;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return toLocalDateKey(parsed);
}

function getAttendanceDateKey(record: AttendanceRow) {
  const directDateKey =
    getDateKeyFromValue(getValueByKnownKeys(record, ['date', 'Date'])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ['attendanceDate', 'attendance_date', 'AttendanceDate'])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ['attendanceOn', 'attendance_on', 'AttendanceOn'])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ['shiftDate', 'shift_date', 'ShiftDate'])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ['createdAt', 'created_at', 'CreatedAt'])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ['createdOn', 'created_on', 'CreatedOn']));

  if (directDateKey) return directDateKey;

  const year = getNumericByKnownKeys(record, ['year', 'Year']);
  const month = getNumericByKnownKeys(record, ['month', 'Month']);
  const day =
    getNumericByKnownKeys(record, ['day', 'Day']) ??
    getNumericByKnownKeys(record, ['dateNo', 'date_no', 'DateNo']) ??
    getNumericByKnownKeys(record, ['dayNo', 'day_no', 'DayNo']) ??
    getNumericByKnownKeys(record, ['dayOfMonth', 'day_of_month']) ??
    getNumericByKnownKeys(record, ['attendanceDay', 'attendance_day']) ??
    getNumericByKnownKeys(record, ['date', 'Date']);

  if (!year || !month || !day) return '';
  const resolved = new Date(year, month - 1, day);
  if (Number.isNaN(resolved.getTime())) return '';
  return toLocalDateKey(resolved);
}

function normalizeAttendanceRows(data: unknown): AttendanceRow[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!isRecord(item)) return [];

    const monthlyDetails = item.attendanceDetails;
    if (!Array.isArray(monthlyDetails)) return [item];

    return monthlyDetails
      .filter((detail) => isRecord(detail))
      .map((detail) => ({
        ...detail,
        organizationCode: detail.organizationCode ?? item.organizationCode ?? '',
        tenantCode: detail.tenantCode ?? item.tenantCode ?? '',
        employeeID: detail.employeeID ?? item.employeeID ?? '',
        month: detail.month ?? item.month,
        year: detail.year ?? item.year,
        workOrderNumber: detail.workOrderNumber ?? item.workOrderNumber ?? '',
      }));
  });
}

function getNumericField(record: AttendanceRow, key: string): number | null {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function buildAttendanceDetail(record: AttendanceRow): AttendanceDetail {
  const punchDetails = isRecord(record.punchDetails) ? record.punchDetails : null;
  const inPunches = Array.isArray(punchDetails?.inPunches) ? punchDetails.inPunches : [];
  const outPunches = Array.isArray(punchDetails?.outPunches) ? punchDetails.outPunches : [];

  const fallbackIn = inPunches.find((item) => isRecord(item) && typeof item.punchedTime === 'string' && item.punchedTime.trim() !== '');
  const fallbackOut = [...outPunches]
    .reverse()
    .find((item) => isRecord(item) && typeof item.punchedTime === 'string' && item.punchedTime.trim() !== '');

  return {
    workOrderNumber: getFirstNonEmptyString(record, ['workOrderNumber', 'workOrderNo', 'woNumber']) || '-',
    shiftsAllocated: getFirstNonEmptyString(record, ['shiftsAllocated', 'shiftAllocated']) || '-',
    shiftCode: getFirstNonEmptyString(record, ['shiftCode', 'shift']) || '-',
    extraManShift: getFirstNonEmptyString(record, ['extraManShift']) || '-',
    attendanceID:
      getFirstNonEmptyString(record, [
        'attendanceID',
        'attendanceId',
        'attendanceid',
        'attendanceCode',
        'attendanceStatus',
        'status',
      ]) || '-',
    hoursWorked: parseNumericValue(record.hoursWorked),
    lateIn: parseNumericValue(record.lateIn),
    earlyOut: parseNumericValue(record.earlyOut),
    extraHoursPostShift: parseNumericValue(record.extraHoursPostShift),
    extraHoursPreShift: parseNumericValue(record.extraHoursPreShift),
    extraHours: parseNumericValue(record.extraHours),
    personalOut: parseNumericValue(record.personalOut),
    officialOut: parseNumericValue(record.officialOut),
    otHours: parseNumericValue(record.otHours),
    leaveCode: getFirstNonEmptyString(record, ['leaveCode', 'leave_code', 'leave', 'leaveId']) || '-',
    firstIn: getFirstNonEmptyString(record, ['firstIn']) || (isRecord(fallbackIn) ? getFirstNonEmptyString(fallbackIn, ['punchedTime']) : ''),
    lastOut: getFirstNonEmptyString(record, ['lastOut']) || (isRecord(fallbackOut) ? getFirstNonEmptyString(fallbackOut, ['punchedTime']) : ''),
    inPunchCount: inPunches.length,
    outPunchCount: outPunches.length,
  };
}

function extractPunchRows(record: AttendanceRow): PunchRow[] {
  const punchDetails = isRecord(record.punchDetails) ? record.punchDetails : null;
  const buckets = [
    ...(Array.isArray(punchDetails?.inPunches) ? punchDetails.inPunches : []),
    ...(Array.isArray(punchDetails?.outPunches) ? punchDetails.outPunches : []),
    ...(Array.isArray(punchDetails?.defaultPunches) ? punchDetails.defaultPunches : []),
  ];

  const rows = buckets
    .filter((item) => isRecord(item))
    .map((item, index) => ({
      id:
        getFirstNonEmptyString(item, ['_id', 'id']) ||
        `${getFirstNonEmptyString(item, ['punchedTime', 'transactionTime', 'date']) || 'row'}-${index}`,
      employeeID: getFirstNonEmptyString(item, ['employeeID']) || getFirstNonEmptyString(record, ['employeeID']) || '-',
      inOut: getFirstNonEmptyString(item, ['inOut']) || '-',
      typeOfMovement: getFirstNonEmptyString(item, ['typeOfMovement']) || '-',
      punchedTime: getFirstNonEmptyString(item, ['punchedTime', 'transactionTime', 'date']) || '',
      readerSerialNumber: getFirstNonEmptyString(item, ['readerSerialNumber']) || '-',
      processed: typeof item.processed === 'boolean' ? (item.processed ? 'Processed' : 'Pending') : 'Processed',
    }));

  return rows.sort((a, b) => {
    const left = a.punchedTime ? new Date(a.punchedTime).getTime() : 0;
    const right = b.punchedTime ? new Date(b.punchedTime).getTime() : 0;
    return left - right;
  });
}

function formatPunchDateTime(value: string) {
  if (!value || value.trim() === '') return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTransactionTime(value: string): string {
  if (!value || !value.trim()) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

function getPunchTypeLabel(inOut: string) {
  const value = inOut.trim().toUpperCase();
  if (value === 'I') return 'In';
  if (value === 'O') return 'Out';
  return inOut || '-';
}

function getAttendanceRowForDay(date: Date, rows: AttendanceRow[]) {
  const dayKey = toLocalDateKey(date);
  return rows.find((row) => getAttendanceDateKey(row) === dayKey) ?? null;
}

function hasAttendanceForDay(date: Date, rows: AttendanceRow[]) {
  const dayKey = toLocalDateKey(date);
  return rows.some((row) => getAttendanceDateKey(row) === dayKey);
}

function getDayCardColor(detail: AttendanceDetail | null, hasAttendanceData: boolean) {
  // Default for current-month day with no row from API
  if (!hasAttendanceData || !detail) return '#e5e7eb'; // gray-200

  const leaveCode = (detail.leaveCode || '').trim().toUpperCase();
  const attendanceId = (detail.attendanceID || '').trim().toUpperCase();

  // 1) Highest priority: Leave code
  if (leaveCode && leaveCode !== '00' && leaveCode !== '0' && leaveCode !== '-') {
    if (leaveCode === 'AL' || leaveCode === 'AL001') return '#dbeafe'; // blue-100
    if (leaveCode === 'SL' || leaveCode === 'SL001') return '#cffafe'; // cyan-100
    if (leaveCode === 'CL' || leaveCode === 'CL001') return '#faf5ff'; // purple-100
    if (leaveCode === 'PL' || leaveCode === 'PL001') return '#fce7f3'; // pink-100
    if (leaveCode === 'EL') return '#fef2f2'; // rose-100
    if (leaveCode === 'ML' || leaveCode === 'ML001') return '#ede9fe'; // violet-100
    if (leaveCode === 'LWP') return '#ffedd5'; // orange-100
    if (leaveCode === 'HL') return '#e0e7ff'; // indigo-100
    if (leaveCode === 'VL') return '#ccfbf1'; // teal-100
    if (leaveCode === 'FL') return '#fef3c7'; // amber-100
    return '#eff6ff'; // blue-50 for unknown leave code
  }

  // 2) Secondary: Attendance status
  if (attendanceId === 'AA') return '#fee2e2'; // red-100
  if (attendanceId === 'HH') return '#fef3c7'; // yellow-100
  if (attendanceId === 'PP') return '#dbeafe'; // blue-100
  if (attendanceId === 'WW') return '#f3f4f6'; // gray-100

  // 3) Unknown/other condition
  return '#eff6ff'; // blue-50
}


function getAttendanceTextColor(bgColor: string): string {
  // All current background colors are light, so use dark text for contrast.
  return '#0f172a';
}

function FaceScanViewfinder({ status, onScan }: { status: 'idle' | 'scanning' | 'success'; onScan: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring1O = useRef(new Animated.Value(0.7)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring2O = useRef(new Animated.Value(0.7)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'scanning') {
      // Pulse the border
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      // Ripple rings
      const runRipple = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
        scale.setValue(0.4);
        opacity.setValue(0.6);
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.8, duration: 1800, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1800, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start(() => runRipple(scale, opacity, 0));
      };
      runRipple(ring1, ring1O, 0);
      runRipple(ring2, ring2O, 900);
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
      ring1.stopAnimation();
      ring2.stopAnimation();
    }

    if (status === 'success') {
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    } else {
      successScale.setValue(0);
    }
  }, [status]);

  const isScanning = status === 'scanning';
  const isSuccess = status === 'success';
  const borderColor = isSuccess ? '#16a34a' : isScanning ? COLORS.primary : '#cbd5e1';

  return (
    <View style={styles.faceViewfinder}>
      {/* Ripple rings behind the frame */}
      <Animated.View style={[styles.faceRipple, { transform: [{ scale: ring1 }], opacity: ring1O }]} />
      <Animated.View style={[styles.faceRipple, { transform: [{ scale: ring2 }], opacity: ring2O }]} />

      {/* Main oval frame */}
      <Animated.View style={[styles.faceOval, { borderColor, transform: [{ scale: pulse }] }]}>

        {/* Corner brackets */}
        <View style={[styles.corner, styles.corner_tl, { borderColor }]} />
        <View style={[styles.corner, styles.corner_tr, { borderColor }]} />
        <View style={[styles.corner, styles.corner_bl, { borderColor }]} />
        <View style={[styles.corner, styles.corner_br, { borderColor }]} />

        {/* Center icon / success check */}
        {isSuccess ? (
          <Animated.View style={{ transform: [{ scale: successScale }] }}>
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
          </Animated.View>
        ) : (
          <View style={styles.faceIconCenter}>
            <Ionicons name="person-outline" size={54} color={isScanning ? COLORS.primary : '#cbd5e1'} />
            {isScanning && (
              <View style={styles.faceScanLine} />
            )}
          </View>
        )}
      </Animated.View>

      {/* Scan label */}
      <View style={styles.faceScanBadge}>
        <View style={[styles.faceScanDot, { backgroundColor: isSuccess ? '#16a34a' : isScanning ? '#3b82f6' : '#cbd5e1' }]} />
        <Text style={[styles.faceScanBadgeText, { color: isSuccess ? '#16a34a' : isScanning ? COLORS.primary : COLORS.muted }]}>
          {isSuccess ? 'Verified' : isScanning ? 'Scanning' : 'Ready'}
        </Text>
      </View>
    </View>
  );
}

export default function LiteAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();

  // When mode=all and id are provided, show attendance for that specific employee
  const viewAllMode = mode === 'all' && Boolean(id);

  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [todayPunches, setTodayPunches] = useState<TodayPunch[]>([]);
  const [punchOffset, setPunchOffset] = useState(0);
  const [hasMorePunches, setHasMorePunches] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const PUNCH_PAGE_SIZE = 15;
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceScanStatus, setFaceScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  useEffect(() => {
    // In viewAllMode the employee ID comes from the route param, not the JWT
    if (viewAllMode) {
      setEmployeeId(String(id));
      return;
    }

    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;

      const payload = decodeJwtPayload(token);
      if (!payload) return;

      const resolvedEmployeeId =
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') ||
        '';
      const resolvedTenantCode =
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '';

      setEmployeeId(resolvedEmployeeId);
      setTenantCode(resolvedTenantCode);
    };

    void run();
  }, [viewAllMode, id]);

  const selectedMonthNumber = currentDate.getMonth() + 1;

  useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: [
      {
        field: 'employeeID',
        value: employeeId,
        operator: 'eq',
      },
      {
        field: 'tenantCode',
        value: tenantCode,
        operator: 'eq',
      },
      {
        field: 'month',
        value: selectedMonthNumber,
        operator: 'eq',
      },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode, selectedMonthNumber],
    onSuccess: (data) => {
      const normalizedRows = normalizeAttendanceRows(data);
      setAttendanceRows(normalizedRows);
      if (__DEV__) {
      }
    },
    onError: () => {
      setAttendanceRows([]);
    },
  });

  const selectedDateKey = useMemo(() => (selectedDate ? toLocalDateKey(selectedDate) : ''), [selectedDate]);

  // Reset punch list whenever the selected date changes
  useEffect(() => {
    setPunchOffset(0);
    setTodayPunches([]);
    setHasMorePunches(true);
    isFetchingMoreRef.current = false;
  }, [selectedDateKey]);

  const punchParams = useMemo(
    () => ({ offset: punchOffset, limit: PUNCH_PAGE_SIZE }),
    [punchOffset]
  );

  const punchData = useMemo(() => {
    const filters: Array<{ field: string; value: unknown; operator: string }> = [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ];
    if (selectedDateKey) {
      filters.push({ field: 'date', value: selectedDateKey, operator: 'eq' });
    }
    return filters;
  }, [employeeId, tenantCode, selectedDateKey]);

  useGetRequest<TodayPunch[]>({
    url: DATA_CHECK_URL,
    method: 'POST',
    params: punchParams,
    data: punchData,
    enabled: Boolean(employeeId && tenantCode && selectedDateKey),
    dependencies: [employeeId, tenantCode, selectedDateKey, punchOffset],
    onSuccess: (data) => {
      const page = data ?? [];
      setTodayPunches((prev) => (punchOffset === 0 ? page : [...prev, ...page]));
      setHasMorePunches(page.length === PUNCH_PAGE_SIZE);
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    },
    onError: () => {
      if (punchOffset === 0) setTodayPunches([]);
      setHasMorePunches(false);
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    },
  });

  const gridDays = useMemo(() => buildMonthGrid(currentDate), [currentDate]);
  const monthTitle = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const selectedAttendanceRecord = useMemo(() => {
    if (!selectedDate) return null;

    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth() + 1;
    const selectedDay = selectedDate.getDate();
    const selectedKey = toLocalDateKey(selectedDate);

    // 1) Preferred: exact date string match (yyyy-mm-dd)
    const exactDateMatch = attendanceRows.find((row) => getAttendanceDateKey(row) === selectedKey);
    if (exactDateMatch) return exactDateMatch;

    // 2) Fallback: records from selected month/year + same day-of-month
    const monthScopedRows = attendanceRows.filter((row) => {
      const rowMonth = getNumericField(row, 'month');
      const rowYear = getNumericField(row, 'year');
      return rowMonth === selectedMonth && rowYear === selectedYear;
    });

    const dayFallback = monthScopedRows.find((row) => {
      const dateText = typeof row.date === 'string' ? row.date : '';
      if (dateText.length >= 10) {
        const maybeDay = Number(dateText.slice(8, 10));
        return Number.isFinite(maybeDay) && maybeDay === selectedDay;
      }
      return false;
    });

    if (dayFallback) return dayFallback;

    return null;
  }, [selectedDate, attendanceRows]);

  const attendanceDetail = useMemo(
    () => (selectedAttendanceRecord ? buildAttendanceDetail(selectedAttendanceRecord) : null),
    [selectedAttendanceRecord]
  );
  const punchRows = useMemo(
    () => (selectedAttendanceRecord ? extractPunchRows(selectedAttendanceRecord) : []),
    [selectedAttendanceRecord]
  );
  const detailColumnOne = useMemo(
    () =>
      attendanceDetail
        ? [
            { label: 'Work Order Number', value: attendanceDetail.workOrderNumber },
            { label: 'Shifts Allocated', value: attendanceDetail.shiftsAllocated },
            { label: 'Shift Code', value: attendanceDetail.shiftCode },
            { label: 'Extra ManShift', value: attendanceDetail.extraManShift },
            { label: 'Attendance ID', value: attendanceDetail.attendanceID },
            { label: 'Hours Worked', value: formatMinutesToHHMM(attendanceDetail.hoursWorked) },
            { label: 'Late In', value: formatMinutesToHHMM(attendanceDetail.lateIn) },
          ]
        : [],
    [attendanceDetail]
  );

  const detailColumnTwo = useMemo(
    () =>
      attendanceDetail
        ? [
            { label: 'Early Out', value: formatMinutesToHHMM(attendanceDetail.earlyOut) },
            { label: 'Post Shift', value: formatMinutesToHHMM(attendanceDetail.extraHoursPostShift) },
            { label: 'Pre Shift', value: formatMinutesToHHMM(attendanceDetail.extraHoursPreShift) },
            { label: 'Extra Hours', value: formatMinutesToHHMM(attendanceDetail.extraHours) },
            { label: 'Personal Out', value: formatMinutesToHHMM(attendanceDetail.personalOut) },
            { label: 'Official Out', value: formatMinutesToHHMM(attendanceDetail.officialOut) },
            { label: 'OT Hours', value: formatMinutesToHHMM(attendanceDetail.otHours) },
            { label: 'Leave Code', value: attendanceDetail.leaveCode || '-' },
          ]
        : [],
    [attendanceDetail]
  );

  const sortedPunches = useMemo(
    () =>
      [...todayPunches].sort((a, b) => {
        const tA = a.transactionTime || a.punchedTime || '';
        const tB = b.transactionTime || b.punchedTime || '';
        return new Date(tA).getTime() - new Date(tB).getTime();
      }),
    [todayPunches]
  );

  const { startTime, endTime } = useMemo(() => {
    const withTime = sortedPunches.filter((p) => p.transactionTime || p.punchedTime);
    if (withTime.length === 0) return { startTime: '', endTime: '' };
    const first = withTime[0];
    const last = withTime[withTime.length - 1];
    return {
      startTime: first.transactionTime || first.punchedTime || '',
      endTime: last.transactionTime || last.punchedTime || '',
    };
  }, [sortedPunches]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(null);
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  const jumpToTodayMonth = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const handleCellPress = (cell: GridDay) => {
    setShowCalendar(false);
    const dateKey = toLocalDateKey(cell.date);
    router.push(`/(tabs-lite)/attendance/muster?date=${dateKey}` as any);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 120 &&
      hasMorePunches &&
      !isFetchingMoreRef.current
    ) {
      isFetchingMoreRef.current = true;
      setIsFetchingMore(true);
      setPunchOffset((prev) => prev + PUNCH_PAGE_SIZE);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* Header */}
      <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.push('/(tabs-lite)/main-launchpad' as any)} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={COLORS.white} />
            </Pressable>
            <Text style={styles.greeting}>Attendance</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.bannerSection}>
        <BannerCarousel />
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>

        {/* ── Quick Actions ── */}
        <View style={styles.actionPanel}>
          <View style={styles.actionPanelHead}>
            <Text style={styles.actionPanelKicker}>QUICK ACTIONS</Text>
            <Text style={styles.actionPanelLink}>2 services</Text>
          </View>

          <View style={styles.actionRow}>
            {/* Attendance Records card */}
            <Pressable style={{ flex: 1 }} onPress={() => setShowCalendar(true)}>
              {({ pressed }) => (
                <View style={[styles.actionCard, styles.actionCardBlue, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}>
                  <View style={styles.actionCardIconCircle}>
                    <Ionicons name="calendar-outline" size={22} color="#ffffff" />
                  </View>
                  <Text style={styles.actionCardTitle}>Attendance{'\n'}Records</Text>
                  <Text style={styles.actionCardSub}>View monthly logs</Text>
                  <View style={styles.actionCardFooter}>
                    <Text style={styles.actionCardFooterText}>Open</Text>
                    <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.85)" />
                  </View>
                </View>
              )}
            </Pressable>

            {/* Face Attendance card */}
            <Pressable style={{ flex: 1 }} onPress={() => { setFaceScanStatus('idle'); setShowFaceModal(true); }}>
              {({ pressed }) => (
                <View style={[styles.actionCard, styles.actionCardGreen, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}>
                  <View style={[styles.actionCardIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="scan-circle-outline" size={22} color="#ffffff" />
                  </View>
                  <Text style={styles.actionCardTitle}>Face{'\n'}Attendance</Text>
                  <Text style={styles.actionCardSub}>Mark via face scan</Text>
                  <View style={styles.actionCardFooter}>
                    <Text style={styles.actionCardFooterText}>Scan</Text>
                    <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.85)" />
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Core & Hours Information (above Today's Punches) ── */}
        {attendanceDetail && (() => {
          const allFields = [...detailColumnOne, ...detailColumnTwo];
          const pairs: typeof allFields[] = [];
          for (let i = 0; i < allFields.length; i += 2) {
            pairs.push(allFields.slice(i, i + 2));
          }
          return (
            <View style={styles.infoSectionCard}>
              <View style={styles.actionPanelHead}>
                <Text style={styles.actionPanelKicker}>ATTENDANCE DETAILS</Text>
                <Text style={styles.actionPanelLink}>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : ''}
                </Text>
              </View>
              {pairs.map((pair, pi) => (
                <View key={pi} style={[styles.detailRow, pi === pairs.length - 1 && { borderBottomWidth: 0 }]}>
                  {pair.map((item, ci) => {
                    const isDash = !item.value || item.value === '-' || item.value === '00:00';
                    return (
                      <View key={item.label} style={[styles.detailRowCell, ci === 0 && styles.detailRowCellLeft]}>
                        <Text style={styles.detailRowLabel}>{item.label}</Text>
                        <Text style={[styles.detailRowValue, isDash && styles.detailRowValueMuted]}>
                          {item.value || '-'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })()}

        {/* ── Today's Punches ── */}
        <View style={styles.todayPunchCard}>
          <View style={styles.actionPanelHead}>
            <Text style={styles.actionPanelKicker}>PUNCH RECORDS</Text>
            <Text style={styles.actionPanelLink}>
              {selectedDate
                ? selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : ''}{todayPunches.length > 0 ? ` · ${todayPunches.length}` : ''}
            </Text>
          </View>

          {/* Start / End time summary */}
          {sortedPunches.length > 0 && (
            <View style={styles.punchTimeSummary}>
              <View style={styles.punchTimeSummaryItem}>
                <View style={[styles.punchTimeDot, { backgroundColor: '#16a34a' }]} />
                <View>
                  <Text style={styles.punchTimeSummaryLabel}>Start Time</Text>
                  <Text style={styles.punchTimeSummaryValue}>{formatTransactionTime(startTime)}</Text>
                </View>
              </View>
              <View style={styles.punchTimeSummaryDivider} />
              <View style={styles.punchTimeSummaryItem}>
                <View style={[styles.punchTimeDot, { backgroundColor: '#1d4ed8' }]} />
                <View>
                  <Text style={styles.punchTimeSummaryLabel}>End Time</Text>
                  <Text style={styles.punchTimeSummaryValue}>{formatTransactionTime(endTime)}</Text>
                </View>
              </View>
            </View>
          )}

          {sortedPunches.length > 0 ? (
            <>
              {sortedPunches.map((punch, index) => {
                const isIn = punch.inOut?.trim().toUpperCase() === 'I';
                const time = punch.transactionTime || punch.punchedTime || '';
                const dt = time ? new Date(time) : null;
                const timeLabel = dt && !Number.isNaN(dt.getTime())
                  ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
                  : '--:--';
                const dateLabel = dt && !Number.isNaN(dt.getTime())
                  ? dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '--';
                const isProcessed = punch.processed;
                const isLast = index === sortedPunches.length - 1 && !hasMorePunches;

                return (
                  <View key={`${punch._id ?? ''}-${index}`} style={[styles.todayPunchRow, isLast && { borderBottomWidth: 0 }]}>
                    <View style={[styles.todayPunchTypeBox, { backgroundColor: isIn ? '#dcfce7' : '#dbeafe' }]}>
                      <Ionicons name={isIn ? 'log-in-outline' : 'log-out-outline'} size={18} color={isIn ? '#16a34a' : '#1d4ed8'} />
                    </View>
                    <View style={styles.todayPunchInfo}>
                      <View style={styles.todayPunchTopRow}>
                        <Text style={[styles.todayPunchType, { color: isIn ? '#16a34a' : '#1d4ed8' }]}>
                          {isIn ? 'In' : 'Out'}
                        </Text>
                        <View style={[styles.todayPunchMoveBadge, { backgroundColor: isIn ? '#dcfce7' : '#dbeafe' }]}>
                          <Text style={[styles.todayPunchMoveText, { color: isIn ? '#16a34a' : '#1d4ed8' }]}>
                            {punch.typeOfMovement || '-'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.todayPunchReader}>{punch.readerSerialNumber || '-'}</Text>
                      <Text style={styles.todayPunchEmpId}>EMP: {punch.employeeID || '-'}</Text>
                    </View>
                    <View style={styles.todayPunchRight}>
                      <Text style={styles.todayPunchTime}>{timeLabel}</Text>
                      <Text style={styles.todayPunchDate}>{dateLabel}</Text>
                    </View>
                  </View>
                );
              })}
              {isFetchingMore && (
                <View style={styles.punchLoadMore}>
                  <Text style={styles.punchLoadMoreText}>Loading more…</Text>
                </View>
              )}
              {!isFetchingMore && !hasMorePunches && sortedPunches.length > 0 && (
                <View style={styles.punchLoadMore}>
                  <Text style={styles.punchLoadMoreText}>All {sortedPunches.length} records loaded</Text>
                </View>
              )}
              {!isFetchingMore && hasMorePunches && (
                <View style={styles.punchLoadMore}>
                  <Text style={styles.punchLoadMoreText}>Scroll down to load more</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyPunchWrap}>
              <Ionicons name="finger-print-outline" size={28} color="#cbd5e1" />
              <Text style={styles.dayDetailsEmpty}>No punch records found.</Text>
            </View>
          )}
        </View>

        {/* ── Face Attendance Modal ── */}
        <Modal visible={showFaceModal} transparent animationType="slide" onRequestClose={() => setShowFaceModal(false)}>
          <View style={styles.faceModalOverlay}>
            <View style={styles.faceModalSheet}>
              <View style={styles.modalHandle} />

              {/* Header */}
              <View style={styles.faceModalHeader}>
                <View>
                  <Text style={styles.faceModalTitle}>Face Attendance</Text>
                  <Text style={styles.faceModalSub}>Position your face in the frame</Text>
                </View>
                <Pressable onPress={() => setShowFaceModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={COLORS.ink} />
                </Pressable>
              </View>

              {/* Face scan viewfinder */}
              <FaceScanViewfinder
                status={faceScanStatus}
                onScan={() => {
                  setFaceScanStatus('scanning');
                  setTimeout(() => setFaceScanStatus('success'), 2500);
                }}
              />

              {/* Status message */}
              {faceScanStatus === 'idle' && (
                <Text style={styles.faceScanHint}>Tap "Scan Face" to begin attendance</Text>
              )}
              {faceScanStatus === 'scanning' && (
                <Text style={[styles.faceScanHint, { color: COLORS.primary }]}>Scanning… please hold still</Text>
              )}
              {faceScanStatus === 'success' && (
                <Text style={[styles.faceScanHint, { color: '#16a34a', fontWeight: '700' }]}>
                  ✓ Attendance marked successfully!
                </Text>
              )}

              {/* Action button */}
              {faceScanStatus !== 'success' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.faceScanBtn,
                    faceScanStatus === 'scanning' && styles.faceScanBtnDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  disabled={faceScanStatus === 'scanning'}
                  onPress={() => {
                    setFaceScanStatus('scanning');
                    setTimeout(() => setFaceScanStatus('success'), 2500);
                  }}
                >
                  <Ionicons name="scan-circle-outline" size={20} color="#fff" />
                  <Text style={styles.faceScanBtnText}>
                    {faceScanStatus === 'scanning' ? 'Scanning...' : 'Scan Face'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.faceScanBtn, { backgroundColor: '#16a34a' }]}
                  onPress={() => { setFaceScanStatus('idle'); setShowFaceModal(false); }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.faceScanBtnText}>Done</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>

        {/* ── Calendar bottom-sheet Modal ── */}
        <Modal
          visible={showCalendar}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCalendar(false)}>
          <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCalendar(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Dark header with title + nav */}
            <View style={styles.calTopBar}>
              <View style={styles.calTopBarLeft}>
                <Text style={styles.calTopTitle}>Select Date</Text>
                <Pressable onPress={jumpToTodayMonth}>
                  <Text style={styles.calTopSub}>{monthTitle} · Tap to jump today</Text>
                </Pressable>
              </View>
              <View style={styles.calTopRight}>
                <Pressable style={styles.calNavBtnDark} onPress={() => navigateMonth('prev')}>
                  <Ionicons name="chevron-back" size={16} color="#fff" />
                </Pressable>
                <Pressable style={styles.calNavBtnDark} onPress={() => navigateMonth('next')}>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </Pressable>
                <Pressable hitSlop={10} onPress={() => setShowCalendar(false)} style={styles.calCloseBtn}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.weekdayRow}>
              {DAY_NAMES.map((name) => (
                <Text key={name} style={styles.weekdayCell}>{name}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {gridDays.map((cell, index) => {
                const isToday = isSameCalendarDay(cell.date, today);
                const isFuture = isFutureCalendarDay(cell.date, today);
                const isSelected = selectedDate ? isSameCalendarDay(cell.date, selectedDate) : false;
                const hasActivity = cell.isCurrentMonth && hasAttendanceForDay(cell.date, attendanceRows);
                const dayRow = cell.isCurrentMonth ? getAttendanceRowForDay(cell.date, attendanceRows) : null;
                const dayDetail = dayRow ? buildAttendanceDetail(dayRow) : null;
                const attendanceDayColor = cell.isCurrentMonth ? getDayCardColor(dayDetail, Boolean(dayRow)) : null;
                const attendanceTextColor = !isSelected && cell.isCurrentMonth && attendanceDayColor ? getAttendanceTextColor(attendanceDayColor) : undefined;
                const cellKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}-${index}`;

                return (
                  <Pressable key={cellKey} style={styles.gridCell} disabled={isFuture} onPress={() => handleCellPress(cell)}>
                    <View style={[
                      styles.dayInner,
                      !isSelected && cell.isCurrentMonth && attendanceDayColor ? { backgroundColor: attendanceDayColor } : null,
                      isFuture && styles.futureDayBlock,
                      isToday && !isSelected && styles.todayRing,
                      isSelected && styles.selectedBlock,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        isFuture && styles.dayFuture,
                        !cell.isCurrentMonth && styles.dayMuted,
                        isSelected && styles.dayTextOnSelected,
                        !isSelected && cell.isCurrentMonth && hasActivity && styles.dayActivity,
                        !isSelected && cell.isCurrentMonth && !hasActivity && styles.dayPlain,
                        attendanceTextColor ? { color: attendanceTextColor } : null,
                      ]}>
                        {cell.label}
                      </Text>
                      {isToday && !isSelected && <View style={styles.todayDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e2e8f0' }]} />
                <Text style={styles.legendLabel}>No data</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.heroBg, borderWidth: 2, borderColor: COLORS.primary }]} />
                <Text style={styles.legendLabel}>Today</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendLabel}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#dbeafe' }]} />
                <Text style={styles.legendLabel}>Present</Text>
              </View>
            </View>
          </View>
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a1c63',
  },

  /* ── Header ── */
  top: {
    backgroundColor: '#0a1c63',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  greeting: {
    fontFamily: APP_FONT_FAMILY,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  topIcons: {
    flexDirection: 'row',
    gap: 14,
  },

  bannerSection: { backgroundColor: '#0a1c63', paddingTop: 0, paddingBottom: 16 },

  /* ── ScrollView ── */
  sheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 96,
    gap: 12,
  },

  /* ── Calendar card ── */
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  /* ── Calendar top bar ── */
  calTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  calTopBarLeft: {
    gap: 3,
  },
  calTopTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  calTopSub: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  calTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calNavBtnDark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  calNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.heroBgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  monthTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.2,
  },
  monthSubtitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Weekday row */
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
    marginTop: 0,
    paddingVertical: 6,
  },
  weekdayCell: {
    width: '14.285%',
    textAlign: 'center',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.2,
  },

  /* Day grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  gridCell: {
    width: '14.285%',
    aspectRatio: 1,
    maxHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  todayRing: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  selectedBlock: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  futureDayBlock: {
    opacity: 0.3,
  },
  dayText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dayMuted: {
    color: '#e2e8f0',
    fontWeight: '400',
  },
  dayFuture: {
    color: '#cbd5e1',
  },
  dayPlain: {
    color: COLORS.ink,
  },
  dayActivity: {
    color: COLORS.primaryStrong,
    fontWeight: '700',
  },
  dayTextOnSelected: {
    color: COLORS.white,
    fontWeight: '800',
  },

  /* Legend */
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },

  /* ── Calendar Modal ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingBottom: 32,
    maxHeight: SCREEN_H * 0.88,
    elevation: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSheetTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },

  /* Date selector bar */
  dateSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8edf8',
  },
  dateSelectorIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dateSelectorCenter: {
    flex: 1,
    gap: 2,
  },
  dateSelectorWeekday: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateSelectorTodayInline: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dateSelectorDateMain: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: 0.1,
  },
  dateSelectorLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  dateSelectorToday: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dateSelectorChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.heroBgLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  changeDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  changeDateBtnText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },

  /* Detail section cards */
  infoSectionsWrap: {
    gap: 12,
  },
  infoSectionCard: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    padding: 14,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoSectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoSectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoSectionAccent: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  infoSectionTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  readOnlyBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  readOnlyText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.muted,
  },
  countBadge: {
    backgroundColor: COLORS.heroBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryStrong,
  },
  infoRows: {
    width: '100%',
  },
  infoFieldRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 9,
  },
  infoFieldRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  infoLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  infoValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },

  /* Punch table */
  punchTable: {
    minWidth: 760,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  punchHeaderRow: {
    backgroundColor: COLORS.heroBg,
  },
  punchRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  punchCell: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  punchHeadText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: COLORS.primaryStrong,
    fontWeight: '700',
  },
  punchCellText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  punchColEmployee: { width: 92 },
  punchColType: { width: 64 },
  punchColMove: { width: 90 },
  punchColTime: { width: 180 },
  punchColReader: { width: 200 },
  punchColStatus: { width: 90 },
  punchInText: {
    color: '#0f766e',
    fontWeight: '700',
  },
  punchOutText: {
    color: COLORS.primaryStrong,
    fontWeight: '700',
  },

  /* Empty / placeholder states */
  emptyPunchWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  emptyStateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyStateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.heroBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  placeholderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dayDetailsPlaceholder: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  dayDetailsEmpty: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },

  /* ── Quick Actions panel ── */
  actionPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  actionPanelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionPanelKicker: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  actionPanelLink: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
  },

  /* ── Action cards ── */
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 3,
  },
  actionCardBlue: {
    backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
  },
  actionCardGreen: {
    backgroundColor: '#0369a1',
    shadowColor: '#0369a1',
  },
  actionCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionCardTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 20,
  },
  actionCardSub: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
  },
  actionCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  actionCardFooterText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },

  /* ── Face Attendance Modal ── */
  faceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  faceModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: SCREEN_H * 0.88,
  },
  faceModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  faceModalTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  faceModalSub: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },

  /* Face viewfinder */
  faceViewfinder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  faceRipple: {
    position: 'absolute',
    width: OVAL_W + 4,
    height: OVAL_H + 4,
    borderRadius: (OVAL_W + 4) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(37,99,235,0.5)',
  },
  faceOval: {
    width: OVAL_W,
    height: OVAL_H,
    borderRadius: OVAL_W / 2,
    borderWidth: 2.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  corner: {
    position: 'absolute',
    width: Math.round(OVAL_W * 0.11),
    height: Math.round(OVAL_W * 0.11),
    borderColor: COLORS.primary,
  },
  corner_tl: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  corner_tr: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  corner_bl: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  corner_br: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  faceIconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceScanLine: {
    position: 'absolute',
    width: 120,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.7,
    borderRadius: 1,
  },
  faceScanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  faceScanDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  faceScanBadgeText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
  },
  faceScanHint: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  faceScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  faceScanBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  faceScanBtnText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* ── Today's Punches ── */
  todayPunchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  todayPunchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  todayPunchTypeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  todayPunchInfo: {
    flex: 1,
    gap: 2,
  },
  todayPunchType: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  todayPunchReader: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
  todayPunchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayPunchMoveBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayPunchMoveText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
  },
  todayPunchEmpId: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
  },
  todayPunchRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  todayPunchTime: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  todayPunchDate: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
  },
  todayPunchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayPunchStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  todayPunchStatusText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailRowCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  detailRowCellLeft: {
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    marginRight: 12,
    paddingRight: 12,
  },
  detailRowLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 3,
  },
  detailRowValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  detailRowValueMuted: {
    color: '#cbd5e1',
  },
  punchLoadMore: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },
  punchLoadMoreText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },

  /* ── Punch time summary (start / end) ── */
  punchTimeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    marginTop: 8,
  },
  punchTimeSummaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  punchTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  punchTimeSummaryLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  punchTimeSummaryValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: 0.2,
  },
  punchTimeSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
});
