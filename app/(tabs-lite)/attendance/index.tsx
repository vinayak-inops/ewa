import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const APP_FONT_FAMILY = 'Inter';
const ATTENDANCE_SEARCH_URL = process.env.EXPO_PUBLIC_ATTENDANCE_SEARCH_URL ?? 'muster/muster/search';

type EventType = 'punch-in' | 'punch-out' | 'punch-miss';

type PunchEvent = {
  id: string;
  type: EventType;
  count: number;
  employee: string;
  day: number;
};

type Holiday = {
  id: string;
  day: number;
  name: string;
  reason: string;
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

const PUNCH_EVENTS: PunchEvent[] = [
  { id: '1', type: 'punch-in', count: 1000, employee: 'John Smith', day: 6 },
  { id: '2', type: 'punch-out', count: 800, employee: 'John Smith', day: 6 },
  { id: '3', type: 'punch-miss', count: 0, employee: 'Tom Wilson', day: 6 },
  { id: '4', type: 'punch-in', count: 950, employee: 'Sarah Wilson', day: 7 },
  { id: '5', type: 'punch-in', count: 1200, employee: 'Mike Johnson', day: 8 },
  { id: '6', type: 'punch-out', count: 750, employee: 'Sarah Wilson', day: 8 },
  { id: '7', type: 'punch-miss', count: 0, employee: 'Alex Brown', day: 8 },
  { id: '8', type: 'punch-in', count: 1100, employee: 'Emily Davis', day: 9 },
  { id: '9', type: 'punch-out', count: 900, employee: 'Mike Johnson', day: 9 },
  { id: '10', type: 'punch-in', count: 1050, employee: 'Alex Brown', day: 10 },
  { id: '11', type: 'punch-miss', count: 0, employee: 'Lisa Garcia', day: 10 },
  { id: '12', type: 'punch-in', count: 980, employee: 'Lisa Garcia', day: 13 },
  { id: '13', type: 'punch-out', count: 820, employee: 'Emily Davis', day: 13 },
  { id: '14', type: 'punch-in', count: 1150, employee: 'Tom Wilson', day: 14 },
  { id: '15', type: 'punch-out', count: 780, employee: 'Alex Brown', day: 14 },
  { id: '16', type: 'punch-miss', count: 0, employee: 'Sarah Wilson', day: 14 },
  { id: '17', type: 'punch-in', count: 1080, employee: 'Maria Lopez', day: 15 },
  { id: '18', type: 'punch-out', count: 850, employee: 'Lisa Garcia', day: 15 },
  { id: '19', type: 'punch-in', count: 1020, employee: 'David Kim', day: 16 },
  { id: '20', type: 'punch-out', count: 760, employee: 'Tom Wilson', day: 16 },
  { id: '21', type: 'punch-miss', count: 0, employee: 'Maria Lopez', day: 16 },
];

const HOLIDAYS: Holiday[] = [
  { id: 'h1', day: 1, name: "New Year's Day", reason: 'National Holiday' },
  { id: 'h2', day: 20, name: 'Martin Luther King Jr. Day', reason: 'Federal Holiday' },
  { id: 'h3', day: 26, name: 'Republic Day', reason: 'National Holiday' },
];

/** Screen + header bar match `app/(tabs-lite)/bank-details/index.tsx` */
const COLORS = {
  sheet: '#f8fafc',
  ink: '#0f172a',
  muted: '#94a3b8',
  primary: '#1d4ed8',
  primaryStrong: '#1e40af',
  accent: '#2563eb',
  heroBg: '#dbeafe',
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

function getDayDotColor(detail: AttendanceDetail | null, hasAttendanceData: boolean) {
  return getDayCardColor(detail, hasAttendanceData);
}

function getAttendanceTextColor(bgColor: string): string {
  // All current background colors are light, so use dark text for contrast.
  return '#0f172a';
}

export default function LiteAttendanceScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);

  useEffect(() => {
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
  }, []);

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
      console.log('[attendance] fetched attendance data', data);
      const normalizedRows = normalizeAttendanceRows(data);
      setAttendanceRows(normalizedRows);
      if (__DEV__) {
        console.log('[attendance] normalized attendance rows', normalizedRows.length);
      }
    },
    onError: () => {
      setAttendanceRows([]);
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

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return null;
    return selectedDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

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
    setSelectedDate(cell.date);
    if (!cell.isCurrentMonth) {
      setCurrentDate(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.push('/(tabs-lite)/applications' as any)} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text style={styles.greeting}>Attendance</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
            <Ionicons name="settings-outline" size={18} color="#0f172a" />
          </View>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <Pressable
              hitSlop={12}
              style={styles.calNavHit}
              onPress={() => navigateMonth('prev')}
              accessibilityRole="button"
              accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            </Pressable>
            <Pressable onPress={jumpToTodayMonth} style={styles.monthTitleHit}>
              <Text style={styles.monthTitle}>{monthTitle}</Text>
            </Pressable>
            <Pressable
              hitSlop={12}
              style={styles.calNavHit}
              onPress={() => navigateMonth('next')}
              accessibilityRole="button"
              accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {DAY_NAMES.map((name) => (
              <Text key={name} style={styles.weekdayCell}>
                {name}
              </Text>
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
                <Pressable
                  key={cellKey}
                  style={styles.gridCell}
                  disabled={isFuture}
                  onPress={() => handleCellPress(cell)}>
                  <View
                    style={[
                      styles.dayInner,
                      !isSelected && cell.isCurrentMonth && attendanceDayColor ? { backgroundColor: attendanceDayColor } : null,
                      isFuture && styles.futureDayBlock,
                      isToday && !isSelected && styles.todayRing,
                      isSelected && styles.selectedBlock,
                    ]}>
                    <Text
                      style={[
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
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.legendChipNeutral} />
              <Text style={styles.legendLabel}>In Month</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendChipIn} />
              <Text style={styles.legendLabel}>Punch In</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendChipOut} />
              <Text style={styles.legendLabel}>Punch Out</Text>
            </View>
          </View>
        </View>

        <View>
          {selectedDate && selectedDateLabel ? (
            <>
              {attendanceDetail ? (
                <View style={styles.infoSectionsWrap}>
                  <View style={styles.infoSectionCard}>
                    <View style={styles.infoSectionHead}>
                      <Text style={styles.infoSectionKicker}>Attendance Core Information</Text>
                      <Text style={styles.infoSectionLink}>Read Only</Text>
                    </View>
                    <View style={styles.infoRows}>
                      {detailColumnOne.map((item) => (
                        <View key={item.label} style={styles.infoFieldRow}>
                          <Text style={styles.infoLabel}>{item.label}</Text>
                          <Text style={styles.infoValue}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.infoSectionCard}>
                    <View style={styles.infoSectionHead}>
                      <Text style={styles.infoSectionKicker}>Attendance Hours Information</Text>
                      <Text style={styles.infoSectionLink}>Read Only</Text>
                    </View>
                    <View style={styles.infoRows}>
                      {detailColumnTwo.map((item) => (
                        <View key={item.label} style={styles.infoFieldRow}>
                          <Text style={styles.infoLabel}>{item.label}</Text>
                          <Text style={styles.infoValue}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.infoSectionCard}>
                    <View style={styles.infoSectionHead}>
                      <Text style={styles.infoSectionKicker}>Punch Details</Text>
                      <Text style={styles.infoSectionLink}>{punchRows.length} Records</Text>
                    </View>
                    {punchRows.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.punchTable}>
                          <View style={[styles.punchRow, styles.punchHeaderRow]}>
                            <Text style={[styles.punchCell, styles.punchHeadText, styles.punchColEmployee]}>Employee</Text>
                            <Text style={[styles.punchCell, styles.punchHeadText, styles.punchColType]}>Type</Text>
                            <Text style={[styles.punchCell, styles.punchHeadText, styles.punchColMove]}>Movement</Text>
                            <Text style={[styles.punchCell, styles.punchHeadText, styles.punchColTime]}>Punch Time</Text>
                            <Text style={[styles.punchCell, styles.punchHeadText, styles.punchColReader]}>Reader</Text>
                            <Text style={[styles.punchCell, styles.punchHeadText, styles.punchColStatus]}>Status</Text>
                          </View>

                          {punchRows.map((row) => (
                            <View key={row.id} style={styles.punchRow}>
                              <Text style={[styles.punchCell, styles.punchCellText, styles.punchColEmployee]}>{row.employeeID}</Text>
                              <Text
                                style={[
                                  styles.punchCell,
                                  styles.punchCellText,
                                  styles.punchColType,
                                  row.inOut.trim().toUpperCase() === 'I' ? styles.punchInText : styles.punchOutText,
                                ]}>
                                {getPunchTypeLabel(row.inOut)}
                              </Text>
                              <Text style={[styles.punchCell, styles.punchCellText, styles.punchColMove]}>{row.typeOfMovement || '-'}</Text>
                              <Text style={[styles.punchCell, styles.punchCellText, styles.punchColTime]}>{formatPunchDateTime(row.punchedTime)}</Text>
                              <Text style={[styles.punchCell, styles.punchCellText, styles.punchColReader]}>{row.readerSerialNumber || '-'}</Text>
                              <Text style={[styles.punchCell, styles.punchCellText, styles.punchColStatus]}>{row.processed}</Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    ) : (
                      <Text style={styles.dayDetailsEmpty}>No punch records for this date.</Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyStateWrap}>
                  <Ionicons name="calendar-outline" size={36} color="#cbd5e1" />
                  <Text style={styles.emptyStateTitle}>No Attendance Data</Text>
                  <Text style={styles.dayDetailsEmpty}>No attendance records found for this date.</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.dayDetailsPlaceholder}>Tap a date to view details below.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.sheet,
  },
  top: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.sheet,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  greeting: {
    fontFamily: APP_FONT_FAMILY,
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  topIcons: {
    flexDirection: 'row',
    gap: 14,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.sheet,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
    gap: 12,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  calNavHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  monthTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primaryStrong,
    letterSpacing: 0.2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
    marginTop: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 6,
  },
  weekdayCell: {
    width: '14.285%',
    textAlign: 'center',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '14.285%',
    aspectRatio: 1,
    maxHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayInner: {
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  todayRing: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.heroBg,
  },
  selectedBlock: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
  },
  dayMuted: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
  dayFuture: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
  futureDayBlock: {
    backgroundColor: '#f8fafc',
    opacity: 0.9,
  },
  dayPlain: {
    color: COLORS.ink,
  },
  dayActivity: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  dayTextOnSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendTodayIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.heroBg,
  },
  legendTodayNum: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  legendActivityNum: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  legendSelectedIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSelectedNum: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  legendChipNeutral: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
  },
  legendChipIn: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16a34a',
  },
  legendChipOut: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  legendLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '500',
  },
  punchTable: {
    minWidth: 760,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  punchHeaderRow: {
    backgroundColor: '#f8fafc',
  },
  punchRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  punchCell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  punchHeadText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  punchCellText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  punchColEmployee: {
    width: 92,
  },
  punchColType: {
    width: 64,
  },
  punchColMove: {
    width: 90,
  },
  punchColTime: {
    width: 180,
  },
  punchColReader: {
    width: 200,
  },
  punchColStatus: {
    width: 90,
  },
  punchInText: {
    color: '#0f766e',
    fontWeight: '700',
  },
  punchOutText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  dayDetailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  dayDetailsPanelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayDetailsPanelKicker: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  dayDetailsPanelLink: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
  },
  dayDetailsDateMeta: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  infoSectionsWrap: {
    gap: 12,
  },
  infoSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  infoSectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoSectionKicker: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  infoSectionLink: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
  },
  infoRows: {
    width: '100%',
    gap: 2,
  },
  infoFieldRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    paddingVertical: 8,
  },
  infoLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  dayDetailsPlaceholder: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyStateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    gap: 6,
  },
  emptyStateTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  dayDetailsHoliday: {
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    gap: 4,
  },
  dayDetailsHolidayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDetailsHolidayName: {
    fontFamily: APP_FONT_FAMILY,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  dayDetailsHolidayReason: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#dc2626',
  },
  dayDetailsList: {
    gap: 4,
    marginTop: 2,
  },
  dayDetailsMeta: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#475569',
  },
  dayDetailsEmpty: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
