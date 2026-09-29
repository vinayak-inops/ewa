/**
 * PunchRecords — Daily punch detail card
 *
 * Visual design matches TodayPunches:
 *  • Light gray-blue card (#EFF1F4), rounded 13 px
 *  • Header row: date label  |  status badge
 *  • "PUNCH RECORDS · N" small-caps section label with dashed tail
 *  • Each row: time (bold dark) | location (blue) | In/Out pill
 *  • Dashed dividers between rows, none after last
 */

import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

// ─── Types (all exported for consumers) ──────────────────────────────────────

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

// ─── Pure helpers (exported for WeekDayStrip) ────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

function firstStr(rec: AttendanceRow, keys: string[]): string {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

export function buildAttendanceDetail(record: AttendanceRow): AttendanceDetail {
  const pd   = isRecord(record.punchDetails) ? record.punchDetails : null;
  const ins  = Array.isArray(pd?.inPunches)  ? pd.inPunches  : [];
  const outs = Array.isArray(pd?.outPunches) ? pd.outPunches : [];
  const fIn  = ins.find((x) => isRecord(x) && typeof x.punchedTime === 'string' && x.punchedTime.trim());
  const fOut = [...outs].reverse().find((x) => isRecord(x) && typeof x.punchedTime === 'string' && x.punchedTime.trim());

  return {
    workOrderNumber:     firstStr(record, ['workOrderNumber','workOrderNo','woNumber']) || '-',
    shiftsAllocated:     firstStr(record, ['shiftsAllocated','shiftAllocated'])         || '-',
    shiftCode:           firstStr(record, ['shiftCode','shift'])                         || '-',
    extraManShift:       firstStr(record, ['extraManShift'])                             || '-',
    attendanceID:        firstStr(record, ['attendanceID','attendanceId','attendanceid','attendanceCode','attendanceStatus','status']) || '-',
    hoursWorked:         parseNum(record.hoursWorked),
    lateIn:              parseNum(record.lateIn),
    earlyOut:            parseNum(record.earlyOut),
    extraHoursPostShift: parseNum(record.extraHoursPostShift),
    extraHoursPreShift:  parseNum(record.extraHoursPreShift),
    extraHours:          parseNum(record.extraHours),
    personalOut:         parseNum(record.personalOut),
    officialOut:         parseNum(record.officialOut),
    otHours:             parseNum(record.otHours),
    leaveCode:           firstStr(record, ['leaveCode','leave_code','leave','leaveId']) || '-',
    firstIn:             firstStr(record, ['firstIn'])  || (isRecord(fIn)  ? firstStr(fIn  as AttendanceRow, ['punchedTime']) : ''),
    lastOut:             firstStr(record, ['lastOut'])  || (isRecord(fOut) ? firstStr(fOut as AttendanceRow, ['punchedTime']) : ''),
    inPunchCount:        ins.length,
    outPunchCount:       outs.length,
  };
}

export function extractPunchRows(record: AttendanceRow): PunchRow[] {
  const pd = isRecord(record.punchDetails) ? record.punchDetails : null;
  const all = [
    ...(Array.isArray(pd?.inPunches)      ? pd.inPunches      : []),
    ...(Array.isArray(pd?.outPunches)     ? pd.outPunches     : []),
    ...(Array.isArray(pd?.defaultPunches) ? pd.defaultPunches : []),
  ];
  return all
    .filter(isRecord)
    .map((item, i) => ({
      id:                 firstStr(item as AttendanceRow, ['_id','id']) || `${firstStr(item as AttendanceRow, ['punchedTime','transactionTime','date']) || 'row'}-${i}`,
      employeeID:         firstStr(item as AttendanceRow, ['employeeID'])          || firstStr(record, ['employeeID']) || '-',
      inOut:              firstStr(item as AttendanceRow, ['inOut'])               || '-',
      typeOfMovement:     firstStr(item as AttendanceRow, ['typeOfMovement'])      || '-',
      punchedTime:        firstStr(item as AttendanceRow, ['punchedTime','transactionTime','date']) || '',
      readerSerialNumber: firstStr(item as AttendanceRow, ['readerSerialNumber'])  || '-',
      processed:          typeof item.processed === 'boolean' ? (item.processed ? 'Processed' : 'Pending') : 'Processed',
    }))
    .sort((a, b) => (a.punchedTime ? new Date(a.punchedTime).getTime() : 0) - (b.punchedTime ? new Date(b.punchedTime).getTime() : 0));
}

// ─── Design tokens (NativeWind class strings) ────────────────────────────────

const C = {
  in:  { dotClass: 'bg-green-500', textClass: 'text-green-700', bgClass: 'bg-[#E1F5EE]' },
  out: { dotClass: 'bg-amber-400', textClass: 'text-[#854F0B]', bgClass: 'bg-[#FAEEDA]' },

  badge: {
    present:  { bgClass: 'bg-[#E1F5EE]', textClass: 'text-green-700'  },
    absent:   { bgClass: 'bg-red-100',   textClass: 'text-red-700'    },
    halfday:  { bgClass: 'bg-amber-100', textClass: 'text-amber-800'  },
    weekoff:  { bgClass: 'bg-slate-100', textClass: 'text-slate-600'  },
    default:  { bgClass: 'bg-blue-50',   textClass: 'text-indigo-700' },
    nodata:   { bgClass: 'bg-[#F8FAFC]', textClass: 'text-slate-400'  },
  },
} as const;

const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Sub-components ──────────────────────────────────────────────────────────

function DashedLine({ dotClass = 'bg-gray-300' }: { dotClass?: string }) {
  return (
    <View aria-hidden className="flex-row overflow-hidden gap-[3px] items-center">
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} className={`w-1 h-px rounded-[1px] ${dotClass}`} />
      ))}
    </View>
  );
}

function StatusBadge({ id }: { id: string }) {
  const up = id.trim().toUpperCase();
  const token =
    up === 'PP' ? C.badge.present  :
    up === 'AA' ? C.badge.absent   :
    up === 'HH' ? C.badge.halfday  :
    up === 'WW' ? C.badge.weekoff  :
    up !== '-'  ? C.badge.default  : C.badge.nodata;

  const label =
    up === 'PP' ? 'Present'  :
    up === 'AA' ? 'Absent'   :
    up === 'HH' ? 'Half Day' :
    up === 'WW' ? 'Week Off' :
    up !== '-'  ? up         : 'No Data';

  return (
    <View className={`px-2.5 py-[3px] rounded-full ${token.bgClass}`}>
      <Text className={`text-[11px] font-bold ${token.textClass}`}>{label}</Text>
    </View>
  );
}

function DirectionPill({ inOut }: { inOut: string }) {
  const isIn = inOut.toUpperCase() === 'I';
  const tok  = isIn ? C.in : C.out;
  return (
    <View className={`flex-row items-center gap-1 px-2 py-[3px] rounded-full ${tok.bgClass}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${tok.dotClass}`} />
      <Text className={`text-[11px] font-bold ${tok.textClass}`}>
        {isIn ? 'In' : 'Out'}
      </Text>
    </View>
  );
}

function PunchItem({ punch }: { punch: PunchRow }) {
  const timeLabel = (() => {
    if (!punch.punchedTime?.trim()) return '—';
    const dt = new Date(punch.punchedTime);
    if (isNaN(dt.getTime())) return '—';
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  })();

  const movement =
    punch.typeOfMovement === 'F' ? 'Face reader' :
    punch.typeOfMovement === 'T' ? 'Turnstile'   :
    punch.typeOfMovement === 'P' ? 'Physical'    :
    punch.typeOfMovement !== '-' ? punch.typeOfMovement : 'Physical';
  const reader   = punch.readerSerialNumber !== '-' ? punch.readerSerialNumber : '';
  const location = reader ? `${movement} · ${reader}` : movement;

  return (
    <View className="flex-row items-center gap-2.5 px-3 py-4">
      <Text className="w-11 text-[13px] font-bold text-[#111827] tabular-nums tracking-[0.2px]">
        {timeLabel}
      </Text>
      <Text className="flex-1 text-[13px] font-medium text-blue-600" numberOfLines={1}>
        {location}
      </Text>
      <DirectionPill inOut={punch.inOut} />
    </View>
  );
}

// ─── Raw punch shape ──────────────────────────────────────────────────────────

export type RawPunch = {
  _id?:                string;
  punchedTime?:        string;
  transactionTime?:    string;
  inOut?:              string;
  typeOfMovement?:     string;
  readerSerialNumber?: string;
  processed?:          boolean;
};

function rawToPunchRow(raw: RawPunch, i: number): PunchRow {
  const ts = (raw.punchedTime || raw.transactionTime || '').trim();
  return {
    id:                 raw._id ?? `raw-${i}`,
    employeeID:         '-',
    inOut:              raw.inOut ?? '-',
    typeOfMovement:     raw.typeOfMovement ?? '-',
    punchedTime:        ts,
    readerSerialNumber: raw.readerSerialNumber ?? '-',
    processed:          raw.processed === false ? 'Pending' : 'Processed',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  selectedDate:  Date;
  attendanceRow: AttendanceRow | null;
  rawPunches?:   RawPunch[];
};

export function PunchRecords({ selectedDate, attendanceRow, rawPunches }: Props) {
  const detail  = attendanceRow ? buildAttendanceDetail(attendanceRow) : null;
  const punches = useMemo(() => {
    if (rawPunches && rawPunches.length > 0) {
      return rawPunches
        .map(rawToPunchRow)
        .sort((a, b) =>
          (a.punchedTime ? new Date(a.punchedTime).getTime() : 0) -
          (b.punchedTime ? new Date(b.punchedTime).getTime() : 0)
        );
    }
    return attendanceRow ? extractPunchRows(attendanceRow) : [];
  }, [rawPunches, attendanceRow]);

  const dateLabel =
    `${selectedDate.getDate()} ${MON_SHORT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <View>
      {/* ── Section header ── */}
      <View className="flex-row items-center justify-between mb-3.5 px-0.5">
        {/* Left: label + dashed tail */}
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-[11px] font-bold text-gray-500 tracking-[0.9px] uppercase">
            {`Punch Records · ${punches.length}`}
          </Text>
          <View className="flex-1 overflow-hidden">
            <DashedLine dotClass="bg-gray-500" />
          </View>
        </View>

        {/* Right: date + status badge */}
        <View className="flex-row items-center gap-2 ml-2.5">
          <Text className="text-xs font-semibold text-[#111827]">{dateLabel}</Text>
          {detail && <StatusBadge id={detail.attendanceID} />}
        </View>
      </View>

      {/* ── Card ── */}
      <View className="bg-white rounded-[13px] overflow-hidden py-1.5">
        {punches.length === 0 ? (
          <View className="items-center py-[22px] gap-1">
            <Text className="text-xs text-slate-400 font-medium">
              No punch records for this day
            </Text>
          </View>
        ) : (
          punches.map((punch, i) => (
            <React.Fragment key={punch.id}>
              <PunchItem punch={punch} />
              {i < punches.length - 1 && (
                <View className="px-3">
                  <DashedLine />
                </View>
              )}
            </React.Fragment>
          ))
        )}
      </View>
    </View>
  );
}
