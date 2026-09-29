/**
 * TodayPunches — Chronological punch list for a selected date
 *
 * Layout:
 *   TODAY'S PUNCHES  -------- (dashed decorator)
 *
 *   [ 14:02   Gate 3 · face reader           ● In  ]
 *   [ - - - - - - - - - - - - - - - - - - - - - - ]  (dashed divider)
 *   [ 17:31   Canteen turnstile               ● Out ]
 *   [ - - - - - - - - - - - - - - - - - - - - - - ]
 *   [  —     Shift end punch pending         ● Open ]
 */

import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Raw punch record as returned from DATA_CHECK_URL */
export type RawPunch = {
  _id?:               string;
  employeeID?:        string;
  punchedTime?:       string;
  transactionTime?:   string;
  inOut?:             string;        // 'I' = in, 'O' = out
  typeOfMovement?:    string;        // 'P' = physical, 'F' = face, 'T' = turnstile …
  readerSerialNumber?: string;
  processed?:         boolean;
  organizationCode?:  string;
  tenantCode?:        string;
};

type Direction = 'in' | 'out' | 'open';

type PunchRow = {
  id:        string;
  timeLabel: string;   // "HH:MM" or "—"
  location:  string;
  direction: Direction;
  sortMs:    number;
};

// ─── Design tokens (NativeWind class strings) ────────────────────────────────

const C = {
  in:   { dotClass: 'bg-green-500', textClass: 'text-green-700',   bgClass: 'bg-[#E1F5EE]' },
  out:  { dotClass: 'bg-amber-400', textClass: 'text-[#854F0B]',   bgClass: 'bg-[#FAEEDA]' },
  open: { dotClass: 'bg-amber-400', textClass: 'text-[#854F0B]',   bgClass: 'bg-[#FAEEDA]' },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a human-friendly location from the reader serial + movement type */
function deriveLocation(punch: RawPunch): string {
  const reader   = (punch.readerSerialNumber ?? '').trim();
  const movement = (punch.typeOfMovement    ?? '').trim().toUpperCase();
  const suffix   =
    movement === 'F' ? ' · face reader'  :
    movement === 'T' ? ' · turnstile'    :
    movement === 'P' ? ' · physical'     : '';
  return reader ? `${reader}${suffix}` : suffix.replace(' · ', '') || 'Unknown reader';
}

/** Pick the best timestamp string from a raw punch */
function punchTimestamp(punch: RawPunch): string {
  return (punch.punchedTime || punch.transactionTime || '').trim();
}

/** Format a timestamp string to "HH:MM" */
function toHHMM(ts: string): string {
  if (!ts) return '—';
  const dt = new Date(ts);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

/** Convert a raw punch to our internal row shape */
function toPunchRow(punch: RawPunch, index: number): PunchRow {
  const ts  = punchTimestamp(punch);
  const dir = (punch.inOut ?? '').toUpperCase() === 'I' ? 'in' : 'out';
  return {
    id:        punch._id ?? `${ts}-${index}`,
    timeLabel: toHHMM(ts),
    location:  deriveLocation(punch),
    direction: dir,
    sortMs:    ts ? new Date(ts).getTime() : 0,
  };
}

/** Build the full row list, adding a synthetic "Open" row when last punch is In */
function buildRows(rawPunches: RawPunch[]): PunchRow[] {
  const rows = rawPunches
    .map(toPunchRow)
    .sort((a, b) => a.sortMs - b.sortMs);

  const last = rows[rows.length - 1];
  if (last && last.direction === 'in') {
    rows.push({
      id:        'pending-open',
      timeLabel: '—',
      location:  'Shift end punch pending',
      direction: 'open',
      sortMs:    Infinity,
    });
  }

  return rows;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Dashed line: a row of small rectangles */
function DashedLine({ dotClass = 'bg-gray-300' }: { dotClass?: string }) {
  return (
    <View aria-hidden className="flex-row overflow-hidden gap-[3px] items-center">
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} className={`w-1 h-px rounded-[1px] ${dotClass}`} />
      ))}
    </View>
  );
}

/** Colored dot + label pill */
function StatusPill({ dir }: { dir: Direction }) {
  const token = C[dir];
  const label = dir === 'in' ? 'In' : dir === 'out' ? 'Out' : 'Open';
  return (
    <View className={`flex-row items-center gap-1 px-2 py-[3px] rounded-full ${token.bgClass}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${token.dotClass}`} />
      <Text className={`text-[11px] font-bold tracking-[0.1px] ${token.textClass}`}>
        {label}
      </Text>
    </View>
  );
}

/** Single punch row */
function PunchItem({ row }: { row: PunchRow }) {
  const isPending = row.direction === 'open';
  return (
    <View className="flex-row items-center gap-2.5 px-3 py-4">
      {/* Time — fixed 44px so all times align */}
      <Text
        className={`w-11 text-[13px] font-bold tabular-nums ${
          isPending ? 'text-gray-400' : 'text-[#111827] tracking-[0.2px]'
        }`}
      >
        {row.timeLabel}
      </Text>

      {/* Location */}
      <Text
        className={`flex-1 text-[13px] font-medium leading-[18px] ${
          isPending ? 'text-gray-400' : 'text-blue-600'
        }`}
        numberOfLines={1}
      >
        {row.location}
      </Text>

      {/* Status pill */}
      <StatusPill dir={row.direction} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  punches: RawPunch[];
  /** Optional label override; default "TODAY'S PUNCHES" */
  label?:  string;
};

export function TodayPunches({ punches, label = "TODAY'S PUNCHES" }: Props) {
  const rows = useMemo(() => buildRows(punches), [punches]);

  if (rows.length === 0) return null;

  return (
    <View>
      {/* ── Section header ── */}
      <View className="flex-row items-center gap-2 mb-2 px-0.5">
        <Text className="text-[11px] font-bold text-gray-500 tracking-[0.9px] uppercase">
          {label}
        </Text>

        {/* Decorative dashed tail */}
        <View className="flex-1 overflow-hidden">
          <DashedLine dotClass="bg-gray-500" />
        </View>
      </View>

      {/* ── Card ── */}
      <View className="bg-white rounded-[13px] overflow-hidden py-1.5">
        {rows.map((row, i) => (
          <React.Fragment key={row.id}>
            <PunchItem row={row} />
            {/* Dashed divider — not after last row */}
            {i < rows.length - 1 && (
              <View className="px-3">
                <DashedLine />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
