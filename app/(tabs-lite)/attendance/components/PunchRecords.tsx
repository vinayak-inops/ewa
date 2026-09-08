/**
 * PunchRecords — daily punch detail card
 *
 * Shows the selected date header (with attendance status badge) and the
 * list of IN / OUT punch entries for that day.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AttendanceRow = Record<string, unknown>;

export type AttendanceDetail = {
  workOrderNumber:       string;
  shiftsAllocated:       string;
  shiftCode:             string;
  extraManShift:         string;
  attendanceID:          string;
  hoursWorked:           number;
  lateIn:                number;
  earlyOut:              number;
  extraHoursPostShift:   number;
  extraHoursPreShift:    number;
  extraHours:            number;
  personalOut:           number;
  officialOut:           number;
  otHours:               number;
  leaveCode:             string;
  firstIn:               string;
  lastOut:               string;
  inPunchCount:          number;
  outPunchCount:         number;
};

export type PunchRow = {
  id:                 string;
  employeeID:         string;
  inOut:              string;
  typeOfMovement:     string;
  punchedTime:        string;
  readerSerialNumber: string;
  processed:          string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseNumericValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getFirstNonEmptyString(record: AttendanceRow, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export function buildAttendanceDetail(record: AttendanceRow): AttendanceDetail {
  const punchDetails = isRecord(record.punchDetails) ? record.punchDetails : null;
  const inPunches    = Array.isArray(punchDetails?.inPunches)  ? punchDetails.inPunches  : [];
  const outPunches   = Array.isArray(punchDetails?.outPunches) ? punchDetails.outPunches : [];

  const fallbackIn  = inPunches.find((item) => isRecord(item) && typeof item.punchedTime === 'string' && item.punchedTime.trim() !== '');
  const fallbackOut = [...outPunches].reverse().find((item) => isRecord(item) && typeof item.punchedTime === 'string' && item.punchedTime.trim() !== '');

  return {
    workOrderNumber:     getFirstNonEmptyString(record, ['workOrderNumber', 'workOrderNo', 'woNumber']) || '-',
    shiftsAllocated:     getFirstNonEmptyString(record, ['shiftsAllocated', 'shiftAllocated']) || '-',
    shiftCode:           getFirstNonEmptyString(record, ['shiftCode', 'shift']) || '-',
    extraManShift:       getFirstNonEmptyString(record, ['extraManShift']) || '-',
    attendanceID:        getFirstNonEmptyString(record, ['attendanceID', 'attendanceId', 'attendanceid', 'attendanceCode', 'attendanceStatus', 'status']) || '-',
    hoursWorked:         parseNumericValue(record.hoursWorked),
    lateIn:              parseNumericValue(record.lateIn),
    earlyOut:            parseNumericValue(record.earlyOut),
    extraHoursPostShift: parseNumericValue(record.extraHoursPostShift),
    extraHoursPreShift:  parseNumericValue(record.extraHoursPreShift),
    extraHours:          parseNumericValue(record.extraHours),
    personalOut:         parseNumericValue(record.personalOut),
    officialOut:         parseNumericValue(record.officialOut),
    otHours:             parseNumericValue(record.otHours),
    leaveCode:           getFirstNonEmptyString(record, ['leaveCode', 'leave_code', 'leave', 'leaveId']) || '-',
    firstIn:             getFirstNonEmptyString(record, ['firstIn']) || (isRecord(fallbackIn)  ? getFirstNonEmptyString(fallbackIn,  ['punchedTime']) : ''),
    lastOut:             getFirstNonEmptyString(record, ['lastOut'])  || (isRecord(fallbackOut) ? getFirstNonEmptyString(fallbackOut, ['punchedTime']) : ''),
    inPunchCount:        inPunches.length,
    outPunchCount:       outPunches.length,
  };
}

export function extractPunchRows(record: AttendanceRow): PunchRow[] {
  const punchDetails = isRecord(record.punchDetails) ? record.punchDetails : null;
  const buckets = [
    ...(Array.isArray(punchDetails?.inPunches)      ? punchDetails.inPunches      : []),
    ...(Array.isArray(punchDetails?.outPunches)     ? punchDetails.outPunches     : []),
    ...(Array.isArray(punchDetails?.defaultPunches) ? punchDetails.defaultPunches : []),
  ];
  const rows = buckets
    .filter((item) => isRecord(item))
    .map((item, index) => ({
      id:                 getFirstNonEmptyString(item, ['_id', 'id']) || `${getFirstNonEmptyString(item, ['punchedTime', 'transactionTime', 'date']) || 'row'}-${index}`,
      employeeID:         getFirstNonEmptyString(item, ['employeeID']) || getFirstNonEmptyString(record, ['employeeID']) || '-',
      inOut:              getFirstNonEmptyString(item, ['inOut']) || '-',
      typeOfMovement:     getFirstNonEmptyString(item, ['typeOfMovement']) || '-',
      punchedTime:        getFirstNonEmptyString(item, ['punchedTime', 'transactionTime', 'date']) || '',
      readerSerialNumber: getFirstNonEmptyString(item, ['readerSerialNumber']) || '-',
      processed:          typeof item.processed === 'boolean' ? (item.processed ? 'Processed' : 'Pending') : 'Processed',
    }));
  return rows.sort((a, b) => {
    const l = a.punchedTime ? new Date(a.punchedTime).getTime() : 0;
    const r = b.punchedTime ? new Date(b.punchedTime).getTime() : 0;
    return l - r;
  });
}

function formatTime(value: string): string {
  if (!value?.trim()) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Status badge helpers ─────────────────────────────────────────────────────

function getStatusLabel(attendanceID: string): string {
  if (attendanceID === 'PP') return 'Present';
  if (attendanceID === 'AA') return 'Absent';
  if (attendanceID === 'HH') return 'Half Day';
  if (attendanceID === 'WW') return 'Week Off';
  if (attendanceID !== '-')  return attendanceID;
  return 'No Data';
}

function getStatusColors(attendanceID: string): { bg: string; text: string } {
  if (attendanceID === 'PP') return { bg: '#dbeafe', text: '#1d4ed8' };
  if (attendanceID === 'AA') return { bg: '#fee2e2', text: '#b91c1c' };
  if (attendanceID === 'HH') return { bg: '#fef3c7', text: '#92400e' };
  if (attendanceID === 'WW') return { bg: '#f1f5f9', text: '#475569' };
  return { bg: '#eff6ff', text: '#3730a3' };
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  selectedDate:    Date;
  attendanceRow:   AttendanceRow | null;  /* null = no data for this date */
};

export function PunchRecords({ selectedDate, attendanceRow }: Props) {
  const detail  = attendanceRow ? buildAttendanceDetail(attendanceRow) : null;
  const punches = attendanceRow ? extractPunchRows(attendanceRow) : [];
  const dateLabel = `${selectedDate.getDate()} ${MON_SHORT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  const statusColors = detail ? getStatusColors(detail.attendanceID) : null;

  return (
    <View
      className="bg-white rounded-2xl overflow-hidden"
      style={{ shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }}
    >
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
            <Ionicons name="calendar-outline" size={16} color="#2563eb" />
          </View>
          <Text className="text-[14px] font-bold text-slate-900">{dateLabel}</Text>
        </View>

        {detail && statusColors && (
          <View className="px-[10px] py-[3px] rounded-full" style={{ backgroundColor: statusColors.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: statusColors.text }}>
              {getStatusLabel(detail.attendanceID)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Punch list ── */}
      <View className="px-4 py-3">
        <Text className="text-[11px] font-bold text-slate-400 mb-2" style={{ letterSpacing: 0.6 }}>
          PUNCH RECORDS{punches.length > 0 ? ` · ${punches.length}` : ''}
        </Text>

        {punches.length === 0 ? (
          <View className="items-center py-5 gap-1">
            <Ionicons name="finger-print-outline" size={28} color="#cbd5e1" />
            <Text className="text-[12px] text-slate-400 font-medium">No punch records for this day</Text>
          </View>
        ) : (
          <View className="gap-[6px]">
            {punches.map((punch) => {
              const isIn  = punch.inOut === 'I';
              const timeStr = formatTime(punch.punchedTime);
              const isProcessed = punch.processed === 'Processed';

              return (
                <View
                  key={punch.id}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-[10px]"
                  style={{ backgroundColor: isIn ? '#f0fdf4' : '#fff7f7' }}
                >
                  {/* Icon */}
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: isIn ? '#dcfce7' : '#fee2e2' }}
                  >
                    <Ionicons
                      name={isIn ? 'log-in-outline' : 'log-out-outline'}
                      size={16}
                      color={isIn ? '#16a34a' : '#dc2626'}
                    />
                  </View>

                  {/* Time + reader */}
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold" style={{ color: isIn ? '#15803d' : '#b91c1c' }}>
                      {isIn ? 'IN' : 'OUT'} · {timeStr}
                    </Text>
                    <Text className="text-[10px] text-slate-400 font-medium">
                      {punch.typeOfMovement === 'P' ? 'Physical' : punch.typeOfMovement}
                      {' · '}
                      {punch.readerSerialNumber !== '-' ? punch.readerSerialNumber : 'Unknown reader'}
                    </Text>
                  </View>

                  {/* Status pill */}
                  <View
                    className="px-2 py-[2px] rounded-full"
                    style={{ backgroundColor: isProcessed ? '#dcfce7' : '#fef9c3' }}
                  >
                    <Text
                      className="text-[9px] font-bold"
                      style={{ color: isProcessed ? '#15803d' : '#854d0e' }}
                    >
                      {punch.processed}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
