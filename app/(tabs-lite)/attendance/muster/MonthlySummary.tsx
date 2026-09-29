/**
 * MonthlySummary — Monthly attendance stats tile row
 *
 * Design (matches screenshot exactly):
 *   THIS MONTH  - - - - - - - - - - - - - - - - -
 *
 *   ┌───────────┐  ┌───────────┐  ┌───────────┐
 *   │           │  │           │  │           │
 *   │    190    │  │   11:30   │  │     2     │
 *   │           │  │           │  │           │
 *   │Hours worked│  │  OT hours │  │ Leave left│
 *   └───────────┘  └───────────┘  └───────────┘
 *
 *  • White tile, 1 px #E5E7EB border, 16 px radius, gentle shadow
 *  • Value: large bold dark (#1E293B), tabular nums
 *  • Label: small, centered, accent color per tile
 */

import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { type AttendanceRow } from './PunchRecords';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
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

/** minutes → "H:MM" */
function minsToHHMM(totalMins: number): string {
  const safe = Math.max(0, Math.round(totalMins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ─── DashedLine ───────────────────────────────────────────────────────────────

function DashedLine() {
  return (
    <View className="flex-row overflow-hidden gap-[3px] items-center">
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} className="w-1 h-px bg-gray-300 rounded-[1px]" />
      ))}
    </View>
  );
}

// ─── Single tile ──────────────────────────────────────────────────────────────

type TileProps = {
  value:      string;
  label:      string;
  labelColor: string;
};

function Tile({ value, label, labelColor }: TileProps) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl border border-gray-200 py-5 px-2 items-center justify-center gap-1.5"
      style={{
        shadowColor:   '#CBD5E1',
        shadowOffset:  { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius:  4,
        elevation:     1,
      }}
    >
      {/* Value — same dark color for all tiles */}
      <Text className="text-[26px] font-extrabold text-slate-800 leading-[30px] tabular-nums tracking-[-0.5px] text-center">
        {value}
      </Text>
      {/* Label — accent color (runtime prop) */}
      <Text
        className="text-[11px] font-semibold text-center leading-[15px]"
        style={{ color: labelColor }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Month label helper ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function isCurrentMonth(d?: Date): boolean {
  if (!d) return true;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** Left label: "THIS MONTH" for current, "SUMMARY" for past/future */
function sectionLabel(selectedMonth?: Date): string {
  return isCurrentMonth(selectedMonth) ? 'THIS MONTH' : 'SUMMARY';
}

/** Right label: always shows the actual month + year e.g. "June 2026" */
function monthYearLabel(selectedMonth?: Date): string {
  const d = selectedMonth ?? new Date();
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  attendanceRows:  AttendanceRow[];
  selectedMonth?:  Date;     // the month currently shown in the calendar
};

export function MonthlySummary({ attendanceRows, selectedMonth }: Props) {

  const leftLabel  = useMemo(() => sectionLabel(selectedMonth),  [selectedMonth]);
  const rightLabel = useMemo(() => monthYearLabel(selectedMonth), [selectedMonth]);

  const stats = useMemo(() => {
    let hoursWorkedMins = 0;
    let otMins          = 0;
    let leaveDays       = 0;

    for (const row of attendanceRows) {
      const leaveCode = firstStr(row, ['leaveCode','leave_code','leave','leaveId']).toUpperCase();

      hoursWorkedMins += parseNum(row.hoursWorked);
      otMins          += parseNum(row.otHours);

      if (leaveCode && leaveCode !== '-' && leaveCode !== '0' && leaveCode !== '00') {
        leaveDays++;
      }
    }

    const totalHours   = Math.round(hoursWorkedMins / 60);
    const hoursDisplay = totalHours > 0 ? String(totalHours) : '—';
    const otDisplay    = otMins > 0 ? minsToHHMM(otMins) : '—';

    return { hoursDisplay, otDisplay, leaveDays };
  }, [attendanceRows]);

  // Always render the section (even while loading) so layout doesn't jump.
  // Show dashes when there's no data yet.
  return (
    <View className="gap-2.5">

      {/* ── Section header: left = THIS MONTH / SUMMARY, right = "June 2026" ── */}
      <View className="flex-row items-center gap-2 px-0.5">
        <Text className="text-[11px] font-bold text-gray-500 tracking-[0.9px] uppercase">
          {leftLabel}
        </Text>
        <View className="flex-1 overflow-hidden">
          <DashedLine />
        </View>
        <Text className="text-[11px] font-semibold text-gray-400">
          {rightLabel}
        </Text>
      </View>

      {/* ── Tile row ── */}
      <View className="flex-row gap-2.5">
        <Tile value={stats.hoursDisplay}       label="Hours worked" labelColor="#111827" />
        <Tile value={stats.otDisplay}          label="OT hours"     labelColor="#111827" />
        <Tile value={String(stats.leaveDays)}  label="Leave days"   labelColor="#111827" />
      </View>

    </View>
  );
}
