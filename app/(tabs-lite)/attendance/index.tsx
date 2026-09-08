import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { FaceAttendanceButton } from './components/FaceAttendance';
import { PunchRecords, buildAttendanceDetail, type AttendanceDetail } from './components/PunchRecords';
import { WeekDayStrip } from './components/WeekDayStrip';

const { height: SCREEN_H } = Dimensions.get('window');

const ATTENDANCE_SEARCH_URL = process.env.EXPO_PUBLIC_ATTENDANCE_SEARCH_URL ?? 'muster/muster/search';
const DATA_CHECK_URL = process.env.EXPO_PUBLIC_DATA_CHECK_URL ?? 'muster/data_check/search';
const FACE_PUNCH_URL = process.env.EXPO_PUBLIC_FACE_PUNCH_URL ?? 'muster/mobile_attendance_punches/search';

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

type FacePunchRecord = {
  _id: string;
  employeeID: string;
  dateTime: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  tenantCode: string;
  punchPhotoPath: string;
  status: string;                    /* 'SUCCESS' | 'FAILED' */
  geofenceValidated: boolean;
  matchedSiteCode: string;
  distanceFromSiteMeters: number;
  radiusMeters: number;
  accuracyToleranceMeters: number;
  effectiveRadiusMeters: number;
  validated: boolean;
  errorDescription: string;
};

type AttendanceRow = Record<string, unknown>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

const COLORS = {
  primary: '#2563eb',
  primaryStrong: '#1d4ed8',
  primaryDark: '#1e3a8a',
  muted: '#64748b',
  white: '#ffffff',
  heroBg: '#dbeafe',
};

// ─── Helper functions (unchanged) ────────────────────────────────────────────

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

function getAttendanceRowForDay(date: Date, rows: AttendanceRow[]) {
  const dayKey = toLocalDateKey(date);
  return rows.find((row) => getAttendanceDateKey(row) === dayKey) ?? null;
}

function hasAttendanceForDay(date: Date, rows: AttendanceRow[]) {
  const dayKey = toLocalDateKey(date);
  return rows.some((row) => getAttendanceDateKey(row) === dayKey);
}

function getDayCardColor(detail: AttendanceDetail | null, hasAttendanceData: boolean) {
  if (!hasAttendanceData || !detail) return '#e5e7eb';
  const leaveCode = (detail.leaveCode || '').trim().toUpperCase();
  const attendanceId = (detail.attendanceID || '').trim().toUpperCase();
  if (leaveCode && leaveCode !== '00' && leaveCode !== '0' && leaveCode !== '-') {
    if (leaveCode === 'AL' || leaveCode === 'AL001') return '#dbeafe';
    if (leaveCode === 'SL' || leaveCode === 'SL001') return '#cffafe';
    if (leaveCode === 'CL' || leaveCode === 'CL001') return '#faf5ff';
    if (leaveCode === 'PL' || leaveCode === 'PL001') return '#fce7f3';
    if (leaveCode === 'EL') return '#fef2f2';
    if (leaveCode === 'ML' || leaveCode === 'ML001') return '#ede9fe';
    if (leaveCode === 'LWP') return '#ffedd5';
    if (leaveCode === 'HL') return '#e0e7ff';
    if (leaveCode === 'VL') return '#ccfbf1';
    if (leaveCode === 'FL') return '#fef3c7';
    return '#eff6ff';
  }
  if (attendanceId === 'AA') return '#fee2e2';
  if (attendanceId === 'HH') return '#fef3c7';
  if (attendanceId === 'PP') return '#dbeafe';
  if (attendanceId === 'WW') return '#f3f4f6';
  return '#eff6ff';
}

// ─── Components ──────────────────────────────────────────────────────────────

function BannerIllustration({ b }: { b: BannerDef }) {
  return (
    <View pointerEvents="none" className="absolute right-0 top-0 bottom-0 w-[110px] items-center justify-center">
      <View className="absolute w-24 h-24 rounded-full" style={{ backgroundColor: b.ringB }} />
      <View className="absolute w-[68px] h-[68px] rounded-full" style={{ backgroundColor: b.ringA }} />
      <View className="w-[52px] h-[52px] rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Ionicons name={b.primaryIcon} size={36} color={b.accent} />
      </View>
      <View className="absolute top-[14px] right-[10px] w-[26px] h-[26px] rounded-full items-center justify-center" style={{ backgroundColor: b.ringA }}>
        <Ionicons name={b.secondaryIcon} size={14} color={b.accent} />
      </View>
      <View className="absolute bottom-[18px] left-[6px] w-[22px] h-[22px] rounded-full items-center justify-center" style={{ backgroundColor: b.ringA }}>
        <Ionicons name={b.tertiaryIcon} size={12} color={b.accent} />
      </View>
    </View>
  );
}

function BannerCarousel({ totalMonthMinutes }: { totalMonthMinutes: number }) {
  const totalHH = Math.floor(totalMonthMinutes / 60);
  const totalMM = totalMonthMinutes % 60;
  const totalLabel = totalMonthMinutes > 0
    ? `${totalHH}h ${String(totalMM).padStart(2, '0')}m this month`
    : 'No hours recorded yet';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={272}
      snapToAlignment="start"
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
    >
      {BANNERS.map((b) => (
        <View key={b.id} className="w-[260px] h-[160px] rounded-[18px] overflow-hidden flex-row" style={{ backgroundColor: b.bg }}>
          <View
            pointerEvents="none"
            className="absolute w-[200px] h-[200px] rounded-full opacity-40"
            style={{ backgroundColor: b.ringA, top: -80, right: -60 }}
          />
          <BannerIllustration b={b} />
          <View className="flex-1 py-4 pl-4 pr-1 justify-end">
            <Text className="text-base font-extrabold text-white leading-[22px] mb-1" style={{ letterSpacing: -0.3 }}>{b.title}</Text>
            {b.id === 'b1' ? (
              <View className="flex-row items-center gap-1 mb-[10px]">
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.75)" />
                <Text className="text-[10px] text-white/60 font-medium leading-[14px]">{totalLabel}</Text>
              </View>
            ) : (
              <Text className="text-[10px] text-white/60 font-medium leading-[14px] mb-[10px]">{b.sub}</Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LiteAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();

  const viewAllMode = mode === 'all' && Boolean(id);
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');

  // Pause all fetches when muster (or any child screen) is on top of this screen
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [currentMonthAttendanceRows, setCurrentMonthAttendanceRows] = useState<AttendanceRow[]>([]);
  const [todayPunches, setTodayPunches] = useState<TodayPunch[]>([]);
  const [punchOffset, setPunchOffset] = useState(0);
  const [hasMorePunches, setHasMorePunches] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const PUNCH_PAGE_SIZE = 15;
  const [showCalendar, setShowCalendar] = useState(false);
  const [facePunchHistory, setFacePunchHistory] = useState<FacePunchRecord[]>([]);

  useEffect(() => {
    if (viewAllMode) {
      setEmployeeId(String(id));
      return;
    }
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') || '');
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '');
    };
    void run();
  }, [viewAllMode, id]);

  const selectedMonthNumber = currentDate.getMonth() + 1;
  const selectedYearNumber = currentDate.getFullYear();
  const currentMonthNumber = today.getMonth() + 1;
  const currentYearNumber = today.getFullYear();
  const currentMonthDataNeeded = selectedMonthNumber !== currentMonthNumber || selectedYearNumber !== currentYearNumber;

  const { loading: attendanceLoading } = useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
      { field: 'month', value: selectedMonthNumber, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode && isFocused),
    dependencies: [employeeId, tenantCode, selectedMonthNumber, isFocused],
    onSuccess: (data) => {
      const rows = normalizeAttendanceRows(data);
      setAttendanceRows(rows);
      if (!currentMonthDataNeeded) setCurrentMonthAttendanceRows(rows);
    },
    onError: () => {
      setAttendanceRows([]);
      if (!currentMonthDataNeeded) setCurrentMonthAttendanceRows([]);
    },
  });

  const selectedDateKey = useMemo(() => (selectedDate ? toLocalDateKey(selectedDate) : ''), [selectedDate]);

  const { loading: currentMonthAttendanceLoading } = useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
      { field: 'month', value: currentMonthNumber, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode && isFocused && currentMonthDataNeeded),
    dependencies: [employeeId, tenantCode, currentMonthNumber, currentMonthDataNeeded, isFocused],
    onSuccess: (data) => {
      setCurrentMonthAttendanceRows(normalizeAttendanceRows(data));
    },
    onError: () => {
      setCurrentMonthAttendanceRows([]);
    },
  });

  const totalMonthMinutes = useMemo(() => {
    return currentMonthAttendanceRows.reduce((sum, row) => {
      const v = Number(row.hoursWorked);
      return sum + (Number.isFinite(v) ? Math.max(0, v) : 0);
    }, 0);
  }, [currentMonthAttendanceRows]);

  useEffect(() => {
    setPunchOffset(0);
    setTodayPunches([]);
    setHasMorePunches(true);
    isFetchingMoreRef.current = false;
  }, [selectedDateKey]);

  const punchParams = useMemo(() => ({ offset: punchOffset, limit: PUNCH_PAGE_SIZE }), [punchOffset]);

  const punchData = useMemo(() => {
    const filters: Array<{ field: string; value: unknown; operator: string }> = [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ];
    if (selectedDateKey) filters.push({ field: 'date', value: selectedDateKey, operator: 'eq' });
    return filters;
  }, [employeeId, tenantCode, selectedDateKey]);

  useGetRequest<TodayPunch[]>({
    url: DATA_CHECK_URL,
    method: 'POST',
    params: punchParams,
    data: punchData,
    enabled: Boolean(employeeId && tenantCode && selectedDateKey && isFocused),
    dependencies: [employeeId, tenantCode, selectedDateKey, punchOffset, isFocused],
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

  /* Face punch history — mobile_attendance_punches collection */
  useGetRequest<FacePunchRecord[]>({
    url: FACE_PUNCH_URL,
    method: 'POST',
    params: { offset: 0, limit: 20 },
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode && isFocused),
    dependencies: [employeeId, tenantCode, isFocused],
    onSuccess: (data) => {
      const sorted = [...(data ?? [])].sort(
        (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );
      setFacePunchHistory(sorted);
    },
    onError: () => setFacePunchHistory([]),
  });

  const gridDays = useMemo(() => buildMonthGrid(currentDate), [currentDate]);
  const monthTitle = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const selectedAttendanceRecord = useMemo(() => {
    if (!selectedDate) return null;
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth() + 1;
    const selectedDay = selectedDate.getDate();
    const selectedKey = toLocalDateKey(selectedDate);

    const exactDateMatch = attendanceRows.find((row) => getAttendanceDateKey(row) === selectedKey);
    if (exactDateMatch) return exactDateMatch;

    const monthScopedRows = attendanceRows.filter((row) => {
      const rowMonth = getNumericField(row, 'month');
      const rowYear = getNumericField(row, 'year');
      return rowMonth === selectedMonth && rowYear === selectedYear;
    });

    return monthScopedRows.find((row) => {
      const dateText = typeof row.date === 'string' ? row.date : '';
      if (dateText.length >= 10) {
        const maybeDay = Number(dateText.slice(8, 10));
        return Number.isFinite(maybeDay) && maybeDay === selectedDay;
      }
      return false;
    }) ?? null;
  }, [selectedDate, attendanceRows]);

  const sortedPunches = useMemo(
    () =>
      [...todayPunches].sort((a, b) => {
        const tA = a.transactionTime || a.punchedTime || '';
        const tB = b.transactionTime || b.punchedTime || '';
        return new Date(tA).getTime() - new Date(tB).getTime();
      }),
    [todayPunches]
  );

  const handleStripDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

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
    <View className="flex-1 bg-[#0a1c63]">
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* ── Header ── */}
      <View className="bg-[#0a1c63] px-4 pb-[18px]" style={{ paddingTop: insets.top + 14 }}>
        <View className="flex-row justify-between items-center mb-[14px]">
          <View className="flex-row items-center gap-[10px]">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="w-8 h-8 rounded-full items-center justify-center bg-white/15"
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Text className="text-white text-xl font-bold">Attendance</Text>
          </View>
          <View className="flex-row gap-[14px]">
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>
      </View>

      {/* ── Monthly Hours Card ── */}
      <View className="bg-[#0a1c63] pb-4 px-4">
        <View className="bg-[#1d4ed8] rounded-[18px] h-[130px] overflow-hidden flex-row">
          <View
            pointerEvents="none"
            className="absolute w-[200px] h-[200px] rounded-full opacity-40"
            style={{ backgroundColor: 'rgba(59,130,246,0.35)', top: -80, right: -60 }}
          />
          <View pointerEvents="none" className="absolute right-0 top-0 bottom-0 w-[110px] items-center justify-center">
            <View className="absolute w-24 h-24 rounded-full bg-blue-400/20" />
            <View className="absolute w-[68px] h-[68px] rounded-full bg-blue-500/35" />
            <View className="w-[52px] h-[52px] rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Ionicons name="time-outline" size={30} color="rgba(191,219,254,0.9)" />
            </View>
            <View className="absolute top-[14px] right-[10px] w-[26px] h-[26px] rounded-full bg-blue-500/35 items-center justify-center">
              <Ionicons name="analytics-outline" size={12} color="#bfdbfe" />
            </View>
            <View className="absolute bottom-[18px] left-[6px] w-[22px] h-[22px] rounded-full bg-blue-500/35 items-center justify-center">
              <Ionicons name="checkmark-done-outline" size={10} color="#bfdbfe" />
            </View>
          </View>
          <View className="flex-1 py-4 pl-4 pr-1 justify-center">
            <View className="flex-row items-center justify-between pr-3">
              <View className="flex-1">
                <Text className="text-[13px] text-white font-bold leading-[18px] mb-1">Monthly{'\n'}Working Hours</Text>
                <Text className="text-[10px] text-white/55 font-medium">Total this month</Text>
              </View>
              <Text className="text-[26px] font-extrabold text-white" style={{ letterSpacing: -0.5 }}>
                {`${Math.floor(totalMonthMinutes / 60)}h ${String(totalMonthMinutes % 60).padStart(2, '0')}m`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Sheet wrapper ── */}
      <View className="flex-1 bg-[#f8fafc] rounded-tl-3xl rounded-tr-3xl overflow-hidden">

        {/* Face Attendance button */}
        <FaceAttendanceButton />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 96, gap: 6 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* ── Week Day Strip ── */}
          <WeekDayStrip
            today={today}
            selectedDate={selectedDate}
            attendanceRows={currentMonthAttendanceRows}
            onSelectDate={handleStripDateSelect}
            onOpenCalendar={() => setShowCalendar(true)}
            loading={currentMonthDataNeeded ? currentMonthAttendanceLoading : attendanceLoading}
          />

          {/* ── Color Legend ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}
          >
            {[
              { bg: '#2563eb', label: 'Present' },
              { bg: '#fca5a5', label: 'Absent' },
              { bg: '#fde68a', label: 'Half Day' },
              { bg: '#f59e0b', label: 'Leave' },
              { bg: '#cbd5e1', label: 'Week Off' },
              { bg: '#a78bfa', label: 'Other' },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-row items-center gap-1 bg-white rounded-full px-[7px] py-1"
                style={{ shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
              >
                <View className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: item.bg }} />
                <Text className="text-[11px] font-semibold text-slate-600">{item.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* ── Punch Detail for Selected Date ── */}
          {selectedDate && (
            <PunchRecords
              selectedDate={selectedDate}
              attendanceRow={selectedAttendanceRecord}
            />
          )}

          {/* ── Face Punch History ── */}
          {facePunchHistory.length > 0 && (
            <View style={{ marginTop: 4 }}>
              {/* Section header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="scan-circle-outline" size={15} color="#2563eb" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', letterSpacing: 0.1 }}>
                    Face Punch History
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                  {facePunchHistory.length} record{facePunchHistory.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Record cards */}
              <View style={{ gap: 8 }}>
                {facePunchHistory.map((rec) => {
                  const isSuccess = rec.status === 'SUCCESS' || rec.validated === true;
                  const dt = rec.dateTime ? new Date(rec.dateTime) : null;
                  const dateLabel = dt
                    ? dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  const timeLabel = dt
                    ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : '—';

                  return (
                    <View
                      key={rec._id}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        padding: 12,
                        shadowColor: '#1e3a8a',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      {/* Top row: time + status pill */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 }}>
                            {timeLabel}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 1 }}>
                            {dateLabel}
                          </Text>
                        </View>
                        {/* Status badge */}
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: isSuccess ? '#dcfce7' : '#fef3c7',
                          borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
                        }}>
                          <Ionicons
                            name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
                            size={12}
                            color={isSuccess ? '#16a34a' : '#d97706'}
                          />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSuccess ? '#15803d' : '#92400e' }}>
                            {isSuccess ? 'Verified' : 'Failed'}
                          </Text>
                        </View>
                      </View>

                      {/* Badge row: geofence + site */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: rec.errorDescription ? 8 : 0 }}>
                        {/* Geofence badge */}
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: rec.geofenceValidated ? '#f0fdf4' : '#fef2f2',
                          borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
                        }}>
                          <Ionicons
                            name={rec.geofenceValidated ? 'location' : 'location-outline'}
                            size={11}
                            color={rec.geofenceValidated ? '#16a34a' : '#dc2626'}
                          />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: rec.geofenceValidated ? '#15803d' : '#b91c1c' }}>
                            {rec.geofenceValidated ? 'Geofence ✓' : 'Geofence ✗'}
                          </Text>
                        </View>

                        {/* Site code badge */}
                        {!!rec.matchedSiteCode && (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
                          }}>
                            <Ionicons name="business-outline" size={10} color="#475569" />
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
                              {rec.matchedSiteCode.replace(/_/g, ' ')}
                            </Text>
                          </View>
                        )}

                        {/* Distance badge */}
                        {rec.distanceFromSiteMeters !== undefined && (
                          <View style={{
                            backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>
                              {Math.round(rec.distanceFromSiteMeters)}m away · r{Math.round(rec.effectiveRadiusMeters ?? rec.radiusMeters)}m
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Error description — only for failed records */}
                      {!isSuccess && !!rec.errorDescription && (
                        <View style={{
                          marginTop: 4,
                          backgroundColor: '#fef9c3',
                          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
                        }}>
                          <Text style={{ fontSize: 11, color: '#78350f', lineHeight: 16 }} numberOfLines={3}>
                            {rec.errorDescription}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Calendar Modal ── */}
          <Modal
            visible={showCalendar}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCalendar(false)}
          >
            <View className="flex-1 bg-black/45 justify-end">
              <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowCalendar(false)} />
              <View className="bg-white rounded-tl-[28px] rounded-tr-[28px] px-[14px] pb-8" style={{ maxHeight: SCREEN_H * 0.88, elevation: 20 }}>
                <View className="w-9 h-1 rounded-sm bg-slate-300 self-center mt-[10px] mb-1" />

                {/* Calendar header */}
                <View className="flex-row items-center justify-between bg-[#1e3a8a] rounded-2xl px-[14px] py-3 mb-3 mt-1">
                  <View className="gap-[3px]">
                    <Text className="text-[15px] font-extrabold text-white" style={{ letterSpacing: 0.2 }}>Select Date</Text>
                    <Pressable onPress={jumpToTodayMonth}>
                      <Text className="text-[10px] text-white/55 font-medium">{monthTitle} · Tap to jump today</Text>
                    </Pressable>
                  </View>
                  <View className="flex-row items-center gap-[6px]">
                    <Pressable className="w-[30px] h-[30px] rounded-full bg-white/15 items-center justify-center" onPress={() => navigateMonth('prev')}>
                      <Ionicons name="chevron-back" size={16} color="#fff" />
                    </Pressable>
                    <Pressable className="w-[30px] h-[30px] rounded-full bg-white/15 items-center justify-center" onPress={() => navigateMonth('next')}>
                      <Ionicons name="chevron-forward" size={16} color="#fff" />
                    </Pressable>
                    <Pressable hitSlop={10} onPress={() => setShowCalendar(false)} className="w-[30px] h-[30px] rounded-full bg-white/10 items-center justify-center ml-[2px]">
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>

                {/* Weekday headers */}
                <View className="flex-row mb-1 py-[6px]">
                  {DAY_NAMES.map((name) => (
                    <Text key={name} className="text-center text-[11px] font-bold text-slate-500" style={{ width: '14.285%', letterSpacing: 0.2 }}>
                      {name}
                    </Text>
                  ))}
                </View>

                {/* Day grid */}
                <View className="flex-row flex-wrap mt-[2px]">
                  {gridDays.map((cell, index) => {
                    const isToday = isSameCalendarDay(cell.date, today);
                    const isFuture = isFutureCalendarDay(cell.date, today);
                    const isSelected = selectedDate ? isSameCalendarDay(cell.date, selectedDate) : false;
                    const hasActivity = cell.isCurrentMonth && hasAttendanceForDay(cell.date, attendanceRows);
                    const dayRow = cell.isCurrentMonth ? getAttendanceRowForDay(cell.date, attendanceRows) : null;
                    const dayDetail = dayRow ? buildAttendanceDetail(dayRow) : null;
                    const attendanceDayColor = cell.isCurrentMonth ? getDayCardColor(dayDetail, Boolean(dayRow)) : null;
                    const cellKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}-${index}`;

                    return (
                      <Pressable
                        key={cellKey}
                        className="items-center justify-center py-[2px]"
                        style={{ width: '14.285%', aspectRatio: 1, maxHeight: 46 }}
                        disabled={isFuture}
                        onPress={() => handleCellPress(cell)}
                      >
                        <View
                          className={`w-9 h-9 items-center justify-center rounded-full ${isFuture ? 'opacity-30' : ''} ${isToday && !isSelected ? 'border-2 border-blue-600 bg-blue-50' : ''} ${isSelected ? 'bg-blue-600' : ''}`}
                          style={[
                            !isSelected && cell.isCurrentMonth && attendanceDayColor ? { backgroundColor: attendanceDayColor } : undefined,
                            isSelected ? { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 } : undefined,
                          ]}
                        >
                          <Text
                            className={`text-[13px] font-semibold
                              ${isFuture ? 'text-slate-300' : ''}
                              ${!cell.isCurrentMonth ? 'text-slate-200 font-normal' : ''}
                              ${isSelected ? 'text-white font-extrabold' : ''}
                              ${!isSelected && cell.isCurrentMonth && hasActivity ? 'text-blue-800 font-bold' : ''}
                              ${!isSelected && cell.isCurrentMonth && !hasActivity ? 'text-slate-900' : ''}
                            `}
                            style={!isSelected && cell.isCurrentMonth && attendanceDayColor ? { color: '#0f172a' } : undefined}
                          >
                            {cell.label}
                          </Text>
                          {isToday && !isSelected && (
                            <View className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Legend */}
                <View className="flex-row flex-wrap items-center justify-center gap-3 mt-3 py-[10px] bg-[#f8fafc] rounded-xl">
                  {[
                    { bg: '#e2e8f0', label: 'No data' },
                    { bg: '#dbeafe', label: 'Today', border: true },
                    { bg: '#2563eb', label: 'Selected' },
                    { bg: '#dbeafe', label: 'Present' },
                  ].map((item) => (
                    <View key={item.label} className="flex-row items-center gap-[5px]">
                      <View
                        className="w-2 h-2 rounded-full"
                        style={[{ backgroundColor: item.bg }, item.border ? { borderWidth: 2, borderColor: '#2563eb' } : undefined]}
                      />
                      <Text className="text-[10px] text-slate-500 font-semibold">{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </View>
    </View>
  );
}
