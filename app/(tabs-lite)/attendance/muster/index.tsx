import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';

const ATTENDANCE_SEARCH_URL = process.env.EXPO_PUBLIC_ATTENDANCE_SEARCH_URL ?? 'muster/muster/search';

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
  const { date } = useLocalSearchParams<{ date?: string }>();

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
    setCalAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1));
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
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
    return () => sub.remove();
  }, [router]);

  const searchData = useMemo(() => [
    { field: 'month', value: selectedMonthNumber, operator: 'eq' },
    { field: 'year', value: selectedYear, operator: 'eq' },
  ], [selectedMonthNumber, selectedYear]);

  useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: searchData,
    enabled: true,
    dependencies: [selectedMonthNumber, selectedYear],
    onSuccess: (data) => setAttendanceRows(normalizeRows(data)),
    onError: () => setAttendanceRows([]),
  });

  const calAnchorMonthNumber = calAnchor.getMonth() + 1;
  const calAnchorYear = calAnchor.getFullYear();
  const calMonthDiffers = calAnchorMonthNumber !== selectedMonthNumber || calAnchorYear !== selectedYear;

  const calSearchData = useMemo(() => [
    { field: 'month', value: calAnchorMonthNumber, operator: 'eq' },
    { field: 'year', value: calAnchorYear, operator: 'eq' },
  ], [calAnchorMonthNumber, calAnchorYear]);

  useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL,
    method: 'POST',
    data: calSearchData,
    enabled: Boolean(showCalendar && calMonthDiffers),
    dependencies: [calAnchorMonthNumber, calAnchorYear, showCalendar, calMonthDiffers],
    onSuccess: (data) => setCalMonthRows(normalizeRows(data)),
    onError: () => setCalMonthRows([]),
  });

  const activeCalRows = useMemo(() => {
    if (calAnchorMonthNumber === selectedMonthNumber && calAnchorYear === selectedYear) return attendanceRows;
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
    <View className="flex-1 bg-[#f8fafc]">
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} className="bg-[#0a1c63]">
        <View className="px-4 pt-3.5 pb-[18px] flex-row items-center gap-2.5">
          <Pressable onPress={() => router.back()} hitSlop={8}
            className="w-8 h-8 rounded-full items-center justify-center bg-white/15">
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text className="text-base font-bold text-white flex-1">Attendance Detail</Text>
          <View className="bg-white/15 rounded-[20px] px-2.5 py-1">
            <Text className="text-[11px] font-bold text-[#c7d2fe]">{punches.length} records</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 14, paddingBottom: 96, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Day navigator ── */}
        <View
          className="bg-white rounded-[20px] overflow-hidden"
          style={{
            shadowColor: '#1e3a8a',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          {/* Dark header band */}
          <View className="bg-[#0a1c63] flex-row items-center px-3 py-4">
            <Pressable onPress={() => goDay('prev')} hitSlop={10}
              className="w-[34px] h-[34px] rounded-full bg-white/[0.12] items-center justify-center">
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>

            <Pressable
              className="flex-1 items-center gap-1"
              onPress={() => { setCalAnchor(selectedDate); setShowCalendar(true); }}
            >
              <Text className="text-[10px] font-semibold text-white/55 uppercase tracking-[1px]">
                {selectedDate.toLocaleDateString('en-IN', { weekday: 'long' })}
                {isToday ? <Text className="text-[#93c5fd] font-bold"> · Today</Text> : null}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-base font-extrabold text-white tracking-[0.1px]">
                  {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <View className="ml-[5px]">
                  <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.6)" />
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={() => goDay('next')}
              disabled={isFuture}
              hitSlop={10}
              className={`w-[34px] h-[34px] rounded-full bg-white/[0.12] items-center justify-center ${isFuture ? 'opacity-25' : ''}`}
            >
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {/* Stat tiles */}
          <View className="flex-row py-3.5 px-2 bg-white">
            {/* First In */}
            <View className="flex-1 items-center gap-[5px]">
              <View className="w-8 h-8 rounded-[10px] items-center justify-center bg-[#dcfce7]">
                <Ionicons name="log-in-outline" size={14} color="#16a34a" />
              </View>
              <Text className="text-[10px] font-medium text-slate-500 tracking-[0.2px]">First In</Text>
              <Text className="text-[13px] font-extrabold tracking-[0.3px] text-[#16a34a]">
                {detail?.firstIn ? new Date(detail.firstIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
              </Text>
            </View>

            <View className="w-px bg-slate-200 my-1" />

            {/* Last Out */}
            <View className="flex-1 items-center gap-[5px]">
              <View className="w-8 h-8 rounded-[10px] items-center justify-center bg-[#dbeafe]">
                <Ionicons name="log-out-outline" size={14} color="#1d4ed8" />
              </View>
              <Text className="text-[10px] font-medium text-slate-500 tracking-[0.2px]">Last Out</Text>
              <Text className="text-[13px] font-extrabold tracking-[0.3px] text-[#1d4ed8]">
                {detail?.lastOut ? new Date(detail.lastOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
              </Text>
            </View>

            <View className="w-px bg-slate-200 my-1" />

            {/* Hours */}
            <View className="flex-1 items-center gap-[5px]">
              <View className="w-8 h-8 rounded-[10px] items-center justify-center bg-[#e0e7ff]">
                <Ionicons name="time-outline" size={14} color="#1d4ed8" />
              </View>
              <Text className="text-[10px] font-medium text-slate-500 tracking-[0.2px]">Hours</Text>
              <Text className="text-[13px] font-extrabold tracking-[0.3px] text-[#1d4ed8]">
                {detail ? toHHMM(detail.hoursWorked) : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Calendar modal ── */}
        <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
          <Pressable className="flex-1 bg-black/[0.45]" onPress={() => setShowCalendar(false)} />
          <View
            className="bg-white rounded-tl-[28px] rounded-tr-[28px] px-3.5 pb-8"
            style={{ elevation: 20 }}
          >
            <View className="w-9 h-1 rounded-sm bg-slate-300 self-center mt-2.5 mb-1" />

            {/* Top bar */}
            <View className="flex-row items-center justify-between bg-[#1e3a8a] rounded-2xl px-3.5 py-3 mb-3 mt-1">
              <View className="gap-[3px]">
                <Text className="text-[15px] font-extrabold text-white tracking-[0.2px]">Select Date</Text>
                <Pressable onPress={jumpCalToToday}>
                  <Text className="text-[10px] text-white/55 font-medium">{calMonthTitle} · Tap to jump to today</Text>
                </Pressable>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Pressable className="w-[30px] h-[30px] rounded-full bg-white/15 items-center justify-center"
                  onPress={() => goCalMonth('prev')} hitSlop={8}>
                  <Ionicons name="chevron-back" size={16} color="#fff" />
                </Pressable>
                <Pressable className="w-[30px] h-[30px] rounded-full bg-white/15 items-center justify-center"
                  onPress={() => goCalMonth('next')} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </Pressable>
                <Pressable hitSlop={10} onPress={() => setShowCalendar(false)}
                  className="w-[30px] h-[30px] rounded-full bg-white/[0.12] items-center justify-center ml-0.5">
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* Weekday headers */}
            <View className="flex-row mb-1 py-1.5">
              {DAY_NAMES.map((d) => (
                <Text key={d} className="w-[14.285%] text-center text-[11px] font-bold text-slate-500 tracking-[0.2px]">{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View className="flex-row flex-wrap mt-0.5">
              {calGrid.map((cell, idx) => {
                const isSelected  = sameDay(cell.date, selectedDate);
                const isTodayCell = sameDay(cell.date, today);
                const disabled    = !cell.isCurrentMonth || isFutureDay(cell.date, today);
                const dayRow      = cell.isCurrentMonth ? getAttendanceRowForDay(cell.date, activeCalRows) : null;
                const dayDetail   = dayRow ? buildDetail(dayRow) : null;
                const dayColor    = cell.isCurrentMonth && !isSelected ? getDayCardColor(dayDetail, Boolean(dayRow)) : null;
                const cellKey     = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}-${idx}`;
                return (
                  <Pressable
                    key={cellKey}
                    className="w-[14.285%] aspect-square max-h-[46px] items-center justify-center py-0.5"
                    disabled={disabled}
                    onPress={() => handleCalSelect(cell)}
                  >
                    <View
                      className={`w-9 h-9 items-center justify-center rounded-full
                        ${isTodayCell && !isSelected ? 'border-2 border-blue-600 bg-blue-50' : ''}
                        ${isSelected ? 'bg-blue-600' : ''}
                        ${disabled && !isSelected ? 'opacity-30' : ''}
                      `}
                      style={[
                        dayColor && !isSelected ? { backgroundColor: dayColor } : null,
                        isSelected ? {
                          shadowColor: '#2563eb',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.4,
                          shadowRadius: 6,
                          elevation: 5,
                        } : null,
                      ]}
                    >
                      <Text className={`text-[13px] font-semibold text-[#0f172a]
                        ${!cell.isCurrentMonth ? 'text-[#e2e8f0] font-normal' : ''}
                        ${isTodayCell && !isSelected ? 'text-blue-700 font-extrabold' : ''}
                        ${isSelected ? 'text-white font-extrabold' : ''}
                        ${disabled && !isSelected ? 'text-slate-300' : ''}
                      `}>
                        {cell.label}
                      </Text>
                      {isTodayCell && !isSelected && (
                        <View className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Legend */}
            <View className="flex-row flex-wrap items-center justify-center gap-3 mt-3 py-2.5 bg-[#f8fafc] rounded-xl">
              <View className="flex-row items-center gap-[5px]">
                <View className="w-2 h-2 rounded-full bg-slate-200" />
                <Text className="text-[10px] text-slate-500 font-semibold">No data</Text>
              </View>
              <View className="flex-row items-center gap-[5px]">
                <View className="w-2 h-2 rounded-full bg-blue-100 border-2 border-blue-600" />
                <Text className="text-[10px] text-slate-500 font-semibold">Today</Text>
              </View>
              <View className="flex-row items-center gap-[5px]">
                <View className="w-2 h-2 rounded-full bg-blue-600" />
                <Text className="text-[10px] text-slate-500 font-semibold">Selected</Text>
              </View>
              <View className="flex-row items-center gap-[5px]">
                <View className="w-2 h-2 rounded-full bg-blue-100" />
                <Text className="text-[10px] text-slate-500 font-semibold">Present</Text>
              </View>
            </View>
          </View>
        </Modal>

        {detail ? (
          <>
            {/* ── Attendance Details grid ── */}
            <View
              className="bg-white rounded-2xl p-3.5"
              style={{
                shadowColor: '#1e3a8a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row justify-between items-center mb-2.5">
                <Text className="text-[10px] font-bold text-slate-400 tracking-[0.8px]">ATTENDANCE DETAILS</Text>
                <Text className="text-[11px] text-slate-500">{dateLabel}</Text>
              </View>
              {pairs.map((pair, pi) => (
                <View key={pi} className={`flex-row border-b border-[#f1f5f9] ${pi === pairs.length - 1 ? 'border-b-0' : ''}`}>
                  {pair.map((item, ci) => {
                    const isDash = !item.value || item.value === '-' || item.value === '00:00';
                    return (
                      <View key={item.label}
                        className={`flex-1 py-2 px-0.5 ${ci === 0 ? 'border-r border-[#f1f5f9] mr-3 pr-3' : ''}`}>
                        <Text className="text-[10px] text-slate-500 font-medium mb-0.5">{item.label}</Text>
                        <Text className={`text-[13px] font-bold ${isDash ? 'text-slate-300' : 'text-[#0f172a]'}`}>
                          {item.value || '-'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* ── Punch Details ── */}
            <View
              className="bg-white rounded-2xl p-3.5"
              style={{
                shadowColor: '#1e3a8a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row justify-between items-center mb-2.5">
                <Text className="text-[10px] font-bold text-slate-400 tracking-[0.8px]">PUNCH DETAILS</Text>
                <Text className="text-[11px] text-slate-500">{punches.length} records</Text>
              </View>
              {punches.length > 0 ? (
                punches.map((p, i) => {
                  const isIn   = p.inOut.trim().toUpperCase() === 'I';
                  const isLast = i === punches.length - 1;
                  return (
                    <View key={p.id}
                      className={`flex-row items-center py-2.5 gap-3 ${!isLast ? 'border-b border-[#f1f5f9]' : ''}`}>
                      <View className={`w-10 h-10 rounded-xl items-center justify-center shrink-0 ${isIn ? 'bg-[#dcfce7]' : 'bg-[#dbeafe]'}`}>
                        <Ionicons name={isIn ? 'log-in-outline' : 'log-out-outline'} size={18} color={isIn ? '#16a34a' : '#1d4ed8'} />
                      </View>
                      <View className="flex-1 gap-0.5">
                        <View className="flex-row items-center gap-1.5">
                          <Text className={`text-[13px] font-bold ${isIn ? 'text-[#16a34a]' : 'text-[#1d4ed8]'}`}>
                            {punchLabel(p.inOut)}
                          </Text>
                          <View className={`rounded-[4px] px-1.5 py-0.5 ${isIn ? 'bg-[#dcfce7]' : 'bg-[#dbeafe]'}`}>
                            <Text className={`text-[10px] font-bold ${isIn ? 'text-[#16a34a]' : 'text-[#1d4ed8]'}`}>
                              {p.typeOfMovement}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[11px] text-slate-500">{p.readerSerialNumber}</Text>
                        <Text className="text-[10px] text-slate-500">EMP: {p.employeeID}</Text>
                      </View>
                      <View className="items-end gap-0.5">
                        <Text className="text-sm font-extrabold text-[#0f172a]">
                          {p.punchedTime ? new Date(p.punchedTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                        </Text>
                        <Text className="text-[10px] text-slate-500">
                          {p.punchedTime ? new Date(p.punchedTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                        </Text>
                        <Text className={`text-[10px] font-semibold ${p.processed === 'Processed' ? 'text-green-600' : 'text-amber-400'}`}>
                          {p.processed}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="items-center py-5 gap-1.5">
                  <Ionicons name="finger-print-outline" size={28} color="#cbd5e1" />
                  <Text className="text-[13px] text-slate-500">No punch records for this date.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View className="items-center py-12 gap-2.5 bg-white rounded-2xl mt-2">
            <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center">
              <Ionicons name="calendar-outline" size={32} color="#2563eb" />
            </View>
            <Text className="text-base font-bold text-[#0f172a]">No Attendance Data</Text>
            <Text className="text-[13px] text-slate-500 text-center">No records found for {dateLabel}.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
