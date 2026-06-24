import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const APP_FONT_FAMILY = 'Inter';
const ATTENDANCE_SEARCH_URL = process.env.EXPO_PUBLIC_ATTENDANCE_SEARCH_URL ?? 'muster/muster/search';

const COLORS = {
  ink: '#0f172a',
  muted: '#64748b',
  primary: '#2563eb',
  primaryStrong: '#1d4ed8',
  primaryDark: '#1e3a8a',
  heroBg: '#dbeafe',
  heroBgLight: '#eff6ff',
  white: '#ffffff',
  border: '#e2e8f0',
};

type AttendanceRow = Record<string, unknown>;

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

type PunchRow = {
  id: string;
  employeeID: string;
  inOut: string;
  typeOfMovement: string;
  punchedTime: string;
  readerSerialNumber: string;
  processed: string;
};

// ── helpers ──────────────────────────────────────────────

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch { return null; }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getFirst(record: AttendanceRow, keys: string[]) {
  for (const k of keys) {
    const v = record[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

function toHHMM(minutes: number) {
  const m = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function toLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateKey(record: AttendanceRow): string {
  const candidates = [
    record.date, record.Date, record.attendanceDate, record.attendanceOn,
    record.shiftDate, record.createdAt, record.createdOn,
  ];
  for (const c of candidates) {
    const text = typeof c === 'string' ? c.trim() : '';
    if (!text) continue;
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return toLocalDateKey(parsed);
  }
  const year = record.year ?? record.Year;
  const month = record.month ?? record.Month;
  const day = record.day ?? record.Day ?? record.dateNo ?? record.date;
  if (year && month && day) {
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(d.getTime())) return toLocalDateKey(d);
  }
  return '';
}

function normalizeRows(data: unknown): AttendanceRow[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!isRecord(item)) return [];
    const details = item.attendanceDetails;
    if (!Array.isArray(details)) return [item];
    return details.filter(isRecord).map((d) => ({
      ...d,
      organizationCode: d.organizationCode ?? item.organizationCode ?? '',
      tenantCode: d.tenantCode ?? item.tenantCode ?? '',
      employeeID: d.employeeID ?? item.employeeID ?? '',
      month: d.month ?? item.month,
      year: d.year ?? item.year,
      workOrderNumber: d.workOrderNumber ?? item.workOrderNumber ?? '',
    }));
  });
}

function buildDetail(record: AttendanceRow): AttendanceDetail {
  const pd = isRecord(record.punchDetails) ? record.punchDetails : null;
  const inP = Array.isArray(pd?.inPunches) ? pd!.inPunches : [];
  const outP = Array.isArray(pd?.outPunches) ? pd!.outPunches : [];
  const fbIn = inP.find((x) => isRecord(x) && typeof x.punchedTime === 'string' && x.punchedTime.trim());
  const fbOut = [...outP].reverse().find((x) => isRecord(x) && typeof x.punchedTime === 'string' && x.punchedTime.trim());
  return {
    workOrderNumber: getFirst(record, ['workOrderNumber', 'workOrderNo']) || '-',
    shiftsAllocated: getFirst(record, ['shiftsAllocated', 'shiftAllocated']) || '-',
    shiftCode: getFirst(record, ['shiftCode', 'shift']) || '-',
    extraManShift: getFirst(record, ['extraManShift']) || '-',
    attendanceID: getFirst(record, ['attendanceID', 'attendanceId', 'attendanceStatus', 'status']) || '-',
    hoursWorked: parseNum(record.hoursWorked),
    lateIn: parseNum(record.lateIn),
    earlyOut: parseNum(record.earlyOut),
    extraHoursPostShift: parseNum(record.extraHoursPostShift),
    extraHoursPreShift: parseNum(record.extraHoursPreShift),
    extraHours: parseNum(record.extraHours),
    personalOut: parseNum(record.personalOut),
    officialOut: parseNum(record.officialOut),
    otHours: parseNum(record.otHours),
    leaveCode: getFirst(record, ['leaveCode', 'leave_code', 'leave']) || '-',
    firstIn: getFirst(record, ['firstIn']) || (isRecord(fbIn) ? getFirst(fbIn, ['punchedTime']) : ''),
    lastOut: getFirst(record, ['lastOut']) || (isRecord(fbOut) ? getFirst(fbOut, ['punchedTime']) : ''),
    inPunchCount: inP.length,
    outPunchCount: outP.length,
  };
}

function extractPunches(record: AttendanceRow): PunchRow[] {
  const pd = isRecord(record.punchDetails) ? record.punchDetails : null;
  const all = [
    ...(Array.isArray(pd?.inPunches) ? pd!.inPunches : []),
    ...(Array.isArray(pd?.outPunches) ? pd!.outPunches : []),
    ...(Array.isArray(pd?.defaultPunches) ? pd!.defaultPunches : []),
  ];
  return all.filter(isRecord).map((item, i) => ({
    id: getFirst(item, ['_id', 'id']) || `row-${i}`,
    employeeID: getFirst(item, ['employeeID']) || getFirst(record, ['employeeID']) || '-',
    inOut: getFirst(item, ['inOut']) || '-',
    typeOfMovement: getFirst(item, ['typeOfMovement']) || '-',
    punchedTime: getFirst(item, ['punchedTime', 'transactionTime']) || '',
    readerSerialNumber: getFirst(item, ['readerSerialNumber']) || '-',
    processed: typeof item.processed === 'boolean' ? (item.processed ? 'Processed' : 'Pending') : 'Processed',
  })).sort((a, b) => new Date(a.punchedTime).getTime() - new Date(b.punchedTime).getTime());
}

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type GridDay = { date: Date; isCurrentMonth: boolean; label: number };

function buildMonthGrid(anchor: Date): GridDay[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDayPrev = new Date(year, month, 0).getDate();
  const cells: GridDay[] = [];
  for (let i = 0; i < offset; i++) cells.push({ date: new Date(year, month - 1, lastDayPrev - offset + i + 1), isCurrentMonth: false, label: lastDayPrev - offset + i + 1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), isCurrentMonth: true, label: d });
  const pad = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= pad; i++) cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, label: i });
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isFutureDay(date: Date, today: Date) {
  return date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function getAttendanceRowForDay(date: Date, rows: AttendanceRow[]): AttendanceRow | null {
  const key = toLocalDateKey(date);
  return rows.find((r) => getDateKey(r) === key) ?? null;
}

function hasAttendanceForDay(date: Date, rows: AttendanceRow[]): boolean {
  return getAttendanceRowForDay(date, rows) !== null;
}

function getDayCardColor(d: AttendanceDetail | null, hasData: boolean): string {
  if (!hasData || !d) return '#e5e7eb';
  const leave = (d.leaveCode || '').trim().toUpperCase();
  const att = (d.attendanceID || '').trim().toUpperCase();
  if (leave && leave !== '00' && leave !== '0' && leave !== '-') {
    if (leave === 'AL' || leave === 'AL001') return '#dbeafe';
    if (leave === 'SL' || leave === 'SL001') return '#cffafe';
    if (leave === 'CL' || leave === 'CL001') return '#faf5ff';
    if (leave === 'PL' || leave === 'PL001') return '#fce7f3';
    if (leave === 'EL') return '#fef2f2';
    if (leave === 'ML' || leave === 'ML001') return '#ede9fe';
    if (leave === 'LWP') return '#ffedd5';
    if (leave === 'HL') return '#e0e7ff';
    if (leave === 'VL') return '#ccfbf1';
    if (leave === 'FL') return '#fef3c7';
    return '#eff6ff';
  }
  if (att === 'AA') return '#fee2e2';
  if (att === 'HH') return '#fef3c7';
  if (att === 'PP') return '#dbeafe';
  if (att === 'WW') return '#f3f4f6';
  return '#eff6ff';
}

function punchLabel(inOut: string) {
  const v = inOut.trim().toUpperCase();
  if (v === 'I') return 'In';
  if (v === 'O') return 'Out';
  return inOut || '-';
}

// ── Component ────────────────────────────────────────────

export default function MusterDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();

  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [calMonthRows, setCalMonthRows] = useState<AttendanceRow[]>([]);

  const initialDate = useMemo(() => {
    if (!date) return new Date();
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [date]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const today = useMemo(() => new Date(), []);

  const isFuture = useMemo(() => {
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selMidnight = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return selMidnight > todayMidnight;
  }, [selectedDate, today]);

  const isToday = useMemo(() => {
    return selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();
  }, [selectedDate, today]);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calAnchor, setCalAnchor] = useState<Date>(initialDate);

  const calGrid = useMemo(() => buildMonthGrid(calAnchor), [calAnchor]);

  const goDay = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  const goCalMonth = (direction: 'prev' | 'next') => {
    setCalAnchor((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1);
      return next;
    });
  };

  const jumpCalToToday = () => {
    setCalAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    setShowCalendar(false);
  };

  const calMonthTitle = `${MONTH_NAMES[calAnchor.getMonth()]} ${calAnchor.getFullYear()}`;

  const handleCalSelect = (cell: GridDay) => {
    if (!cell.isCurrentMonth || isFutureDay(cell.date, today)) return;
    setSelectedDate(cell.date);
    setShowCalendar(false);
  };

  const dateLabel = useMemo(() =>
    selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [selectedDate]
  );

  const selectedMonthNumber = selectedDate.getMonth() + 1;
  const selectedYear = selectedDate.getFullYear();

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? ''));
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? ''));
    };
    void run();
  }, []);

  const searchData = useMemo(() => [
    { field: 'employeeID', value: employeeId, operator: 'eq' },
    { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    { field: 'month', value: selectedMonthNumber, operator: 'eq' },
  ], [employeeId, tenantCode, selectedMonthNumber]);

  useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: searchData,
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode, selectedMonthNumber],
    onSuccess: (data) => setAttendanceRows(normalizeRows(data)),
    onError: () => setAttendanceRows([]),
  });

  const calAnchorMonthNumber = calAnchor.getMonth() + 1;
  const calAnchorYear = calAnchor.getFullYear();

  const calSearchData = useMemo(() => [
    { field: 'employeeID', value: employeeId, operator: 'eq' },
    { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    { field: 'month', value: calAnchorMonthNumber, operator: 'eq' },
  ], [employeeId, tenantCode, calAnchorMonthNumber]);

  useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: calSearchData,
    enabled: Boolean(employeeId && tenantCode && showCalendar),
    dependencies: [employeeId, tenantCode, calAnchorMonthNumber, showCalendar],
    onSuccess: (data) => setCalMonthRows(normalizeRows(data)),
    onError: () => setCalMonthRows([]),
  });

  const activeCalRows = useMemo(() => {
    if (calAnchorMonthNumber === selectedMonthNumber && calAnchorYear === selectedYear) {
      return attendanceRows;
    }
    return calMonthRows;
  }, [calAnchorMonthNumber, calAnchorYear, selectedMonthNumber, selectedYear, attendanceRows, calMonthRows]);

  const dateKey = useMemo(() => toLocalDateKey(selectedDate), [selectedDate]);

  const record = useMemo(() => {
    const exact = attendanceRows.find((r) => getDateKey(r) === dateKey);
    if (exact) return exact;
    return attendanceRows.find((r) => {
      const m = Number(r.month ?? r.Month);
      const y = Number(r.year ?? r.Year);
      const d = Number(r.day ?? r.Day ?? r.dateNo ?? r.date);
      return m === selectedMonthNumber && y === selectedYear && d === selectedDate.getDate();
    }) ?? null;
  }, [attendanceRows, dateKey, selectedMonthNumber, selectedYear, selectedDate]);

  const detail = useMemo(() => record ? buildDetail(record) : null, [record]);
  const punches = useMemo(() => record ? extractPunches(record) : [], [record]);

  const allFields = useMemo(() => detail ? [
    { label: 'Work Order Number', value: detail.workOrderNumber },
    { label: 'Shifts Allocated', value: detail.shiftsAllocated },
    { label: 'Shift Code', value: detail.shiftCode },
    { label: 'Extra ManShift', value: detail.extraManShift },
    { label: 'Attendance ID', value: detail.attendanceID },
    { label: 'Hours Worked', value: toHHMM(detail.hoursWorked) },
    { label: 'Late In', value: toHHMM(detail.lateIn) },
    { label: 'Early Out', value: toHHMM(detail.earlyOut) },
    { label: 'Post Shift', value: toHHMM(detail.extraHoursPostShift) },
    { label: 'Pre Shift', value: toHHMM(detail.extraHoursPreShift) },
    { label: 'Extra Hours', value: toHHMM(detail.extraHours) },
    { label: 'Personal Out', value: toHHMM(detail.personalOut) },
    { label: 'Official Out', value: toHHMM(detail.officialOut) },
    { label: 'OT Hours', value: toHHMM(detail.otHours) },
    { label: 'Leave Code', value: detail.leaveCode },
  ] : [], [detail]);

  const pairs: { label: string; value: string }[][] = [];
  for (let i = 0; i < allFields.length; i += 2) pairs.push(allFields.slice(i, i + 2));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance Detail</Text>
        <View style={styles.recordsBadge}>
          <Text style={styles.recordsBadgeText}>{punches.length} records</Text>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Day navigator ── */}
        <View style={styles.dayCard}>
          {/* Dark header band */}
          <View style={styles.dayHeader}>
            <Pressable onPress={() => goDay('prev')} style={styles.dayNavBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>

            <Pressable style={styles.dayCenter} onPress={() => { setCalAnchor(selectedDate); setShowCalendar(true); }}>
              <Text style={styles.dayWeekday}>
                {selectedDate.toLocaleDateString('en-IN', { weekday: 'long' })}
                {isToday ? <Text style={styles.dayTodayBadge}> · Today</Text> : null}
              </Text>
              <View style={styles.dayDateRow}>
                <Text style={styles.dayDate}>
                  {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.6)" style={{ marginLeft: 5 }} />
              </View>
            </Pressable>

            <Pressable onPress={() => goDay('next')} disabled={isFuture} hitSlop={10}
              style={[styles.dayNavBtn, isFuture && { opacity: 0.25 }]}>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {/* Stat tiles */}
          <View style={styles.dayStatsRow}>
            <View style={styles.dayStat}>
              <View style={[styles.dayStatIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="log-in-outline" size={14} color="#16a34a" />
              </View>
              <Text style={styles.dayStatLabel}>First In</Text>
              <Text style={[styles.dayStatValue, { color: '#16a34a' }]}>
                {detail?.firstIn ? new Date(detail.firstIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
              </Text>
            </View>

            <View style={styles.dayStatDivider} />

            <View style={styles.dayStat}>
              <View style={[styles.dayStatIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="log-out-outline" size={14} color="#1d4ed8" />
              </View>
              <Text style={styles.dayStatLabel}>Last Out</Text>
              <Text style={[styles.dayStatValue, { color: '#1d4ed8' }]}>
                {detail?.lastOut ? new Date(detail.lastOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
              </Text>
            </View>

            <View style={styles.dayStatDivider} />

            <View style={styles.dayStat}>
              <View style={[styles.dayStatIcon, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="time-outline" size={14} color={COLORS.primaryStrong} />
              </View>
              <Text style={styles.dayStatLabel}>Hours</Text>
              <Text style={[styles.dayStatValue, { color: COLORS.primaryStrong }]}>
                {detail ? toHHMM(detail.hoursWorked) : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Calendar modal ── */}
        <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
          <Pressable style={styles.calBackdrop} onPress={() => setShowCalendar(false)} />
          <View style={styles.calSheet}>
            <View style={styles.calHandle} />

            {/* Top bar: title + month nav + close */}
            <View style={styles.calTopBar}>
              <View style={styles.calTopBarLeft}>
                <Text style={styles.calTopTitle}>Select Date</Text>
                <Pressable onPress={jumpCalToToday}>
                  <Text style={styles.calTopSub}>{calMonthTitle} · Tap to jump to today</Text>
                </Pressable>
              </View>
              <View style={styles.calTopRight}>
                <Pressable style={styles.calNavBtnDark} onPress={() => goCalMonth('prev')} hitSlop={8}>
                  <Ionicons name="chevron-back" size={16} color="#fff" />
                </Pressable>
                <Pressable style={styles.calNavBtnDark} onPress={() => goCalMonth('next')} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </Pressable>
                <Pressable hitSlop={10} onPress={() => setShowCalendar(false)} style={styles.calCloseBtn}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* Weekday headers */}
            <View style={styles.calWeekRow}>
              {DAY_NAMES.map((d) => (
                <Text key={d} style={styles.calWeekCell}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.calGrid}>
              {calGrid.map((cell, idx) => {
                const isSelected = sameDay(cell.date, selectedDate);
                const isTodayCell = sameDay(cell.date, today);
                const disabled = !cell.isCurrentMonth || isFutureDay(cell.date, today);
                const dayRow = cell.isCurrentMonth ? getAttendanceRowForDay(cell.date, activeCalRows) : null;
                const dayDetail = dayRow ? buildDetail(dayRow) : null;
                const dayColor = cell.isCurrentMonth && !isSelected ? getDayCardColor(dayDetail, Boolean(dayRow)) : null;
                const cellKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}-${idx}`;
                return (
                  <Pressable key={cellKey} style={styles.calGridCell} disabled={disabled} onPress={() => handleCalSelect(cell)}>
                    <View style={[
                      styles.calDayInner,
                      dayColor ? { backgroundColor: dayColor } : null,
                      isTodayCell && !isSelected && styles.calTodayRing,
                      isSelected && styles.calSelectedBlock,
                      disabled && !isSelected && styles.calFuture,
                    ]}>
                      <Text style={[
                        styles.calDayText,
                        !cell.isCurrentMonth && styles.calDayMuted,
                        isTodayCell && !isSelected && styles.calDayToday,
                        isSelected && styles.calDaySelected,
                        disabled && !isSelected && styles.calDayDisabled,
                      ]}>
                        {cell.label}
                      </Text>
                      {isTodayCell && !isSelected && <View style={styles.calTodayDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.calLegend}>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDot, { backgroundColor: '#e2e8f0' }]} />
                <Text style={styles.calLegendText}>No data</Text>
              </View>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDot, { backgroundColor: COLORS.heroBg, borderWidth: 2, borderColor: COLORS.primary }]} />
                <Text style={styles.calLegendText}>Today</Text>
              </View>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.calLegendText}>Selected</Text>
              </View>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDot, { backgroundColor: '#dbeafe' }]} />
                <Text style={styles.calLegendText}>Present</Text>
              </View>
            </View>
          </View>
        </Modal>

        {detail ? (
          <>
            {/* Attendance Details grid */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardKicker}>ATTENDANCE DETAILS</Text>
                <Text style={styles.cardSub}>{dateLabel}</Text>
              </View>
              {pairs.map((pair, pi) => (
                <View key={pi} style={[styles.detailRow, pi === pairs.length - 1 && { borderBottomWidth: 0 }]}>
                  {pair.map((item, ci) => {
                    const isDash = !item.value || item.value === '-' || item.value === '00:00';
                    return (
                      <View key={item.label} style={[styles.detailCell, ci === 0 && styles.detailCellLeft]}>
                        <Text style={styles.detailLabel}>{item.label}</Text>
                        <Text style={[styles.detailValue, isDash && styles.detailValueMuted]}>{item.value || '-'}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Punch Details */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardKicker}>PUNCH DETAILS</Text>
                <Text style={styles.cardSub}>{punches.length} records</Text>
              </View>
              {punches.length > 0 ? (
                punches.map((p, i) => {
                  const isIn = p.inOut.trim().toUpperCase() === 'I';
                  const isLast = i === punches.length - 1;
                  return (
                    <View key={p.id} style={[styles.punchItem, isLast && { borderBottomWidth: 0 }]}>
                      <View style={[styles.punchIcon, { backgroundColor: isIn ? '#dcfce7' : '#dbeafe' }]}>
                        <Ionicons name={isIn ? 'log-in-outline' : 'log-out-outline'} size={18} color={isIn ? '#16a34a' : '#1d4ed8'} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.punchType, { color: isIn ? '#16a34a' : '#1d4ed8' }]}>{punchLabel(p.inOut)}</Text>
                          <View style={[styles.moveBadge, { backgroundColor: isIn ? '#dcfce7' : '#dbeafe' }]}>
                            <Text style={[styles.moveBadgeText, { color: isIn ? '#16a34a' : '#1d4ed8' }]}>{p.typeOfMovement}</Text>
                          </View>
                        </View>
                        <Text style={styles.punchReader}>{p.readerSerialNumber}</Text>
                        <Text style={styles.punchEmp}>EMP: {p.employeeID}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={styles.punchTime}>
                          {p.punchedTime ? new Date(p.punchedTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                        </Text>
                        <Text style={styles.punchDate}>
                          {p.punchedTime ? new Date(p.punchedTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                        </Text>
                        <Text style={[styles.punchStatus, { color: p.processed === 'Processed' ? '#16a34a' : '#f59e0b' }]}>{p.processed}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="finger-print-outline" size={28} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No punch records for this date.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Attendance Data</Text>
            <Text style={styles.emptyStateSub}>No records found for {dateLabel}.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    backgroundColor: '#0a1c63',
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontFamily: APP_FONT_FAMILY, fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  recordsBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recordsBadgeText: { fontFamily: APP_FONT_FAMILY, fontSize: 11, fontWeight: '700', color: '#c7d2fe' },

  sheet: { flex: 1 },
  content: { padding: 14, paddingBottom: 96, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardKicker: { fontFamily: APP_FONT_FAMILY, fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8 },
  cardSub: { fontFamily: APP_FONT_FAMILY, fontSize: 11, color: COLORS.muted },

  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 2 },
  detailCellLeft: { borderRightWidth: 1, borderRightColor: '#f1f5f9', marginRight: 12, paddingRight: 12 },
  detailLabel: { fontFamily: APP_FONT_FAMILY, fontSize: 10, color: COLORS.muted, fontWeight: '500', marginBottom: 2 },
  detailValue: { fontFamily: APP_FONT_FAMILY, fontSize: 13, fontWeight: '700', color: COLORS.ink },
  detailValueMuted: { color: '#cbd5e1' },

  punchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  punchIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  punchType: { fontFamily: APP_FONT_FAMILY, fontSize: 13, fontWeight: '700' },
  moveBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  moveBadgeText: { fontFamily: APP_FONT_FAMILY, fontSize: 10, fontWeight: '700' },
  punchReader: { fontFamily: APP_FONT_FAMILY, fontSize: 11, color: COLORS.muted },
  punchEmp: { fontFamily: APP_FONT_FAMILY, fontSize: 10, color: COLORS.muted },
  punchTime: { fontFamily: APP_FONT_FAMILY, fontSize: 14, fontWeight: '800', color: COLORS.ink },
  punchDate: { fontFamily: APP_FONT_FAMILY, fontSize: 10, color: COLORS.muted },
  punchStatus: { fontFamily: APP_FONT_FAMILY, fontSize: 10, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyText: { fontFamily: APP_FONT_FAMILY, fontSize: 13, color: COLORS.muted },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10, backgroundColor: '#fff', borderRadius: 16, marginTop: 8 },
  emptyStateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  emptyStateTitle: { fontFamily: APP_FONT_FAMILY, fontSize: 16, fontWeight: '700', color: COLORS.ink },
  emptyStateSub: { fontFamily: APP_FONT_FAMILY, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  dayHeader: {
    backgroundColor: '#0a1c63',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  dayNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dayWeekday: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayTodayBadge: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  dayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayDate: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
  },
  dayStatsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  dayStat: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  dayStatDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  dayStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayStatLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.muted,
    letterSpacing: 0.2,
  },
  dayStatValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  calBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  calSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingBottom: 32,
    elevation: 20,
  },
  calHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
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
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 6,
  },
  calWeekCell: {
    width: '14.285%' as any,
    textAlign: 'center',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.2,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  calGridCell: {
    width: '14.285%' as any,
    aspectRatio: 1,
    maxHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calDayInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  calTodayRing: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  calTodayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  calSelectedBlock: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  calFuture: {
    opacity: 0.3,
  },
  calDayText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  calDayMuted: {
    color: '#e2e8f0',
    fontWeight: '400',
  },
  calDayToday: {
    color: COLORS.primaryStrong,
    fontWeight: '800',
  },
  calDaySelected: {
    color: COLORS.white,
    fontWeight: '800',
  },
  calDayDisabled: {
    color: '#cbd5e1',
  },
  calLegend: {
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
  calLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calLegendText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },
});
