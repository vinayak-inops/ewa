/**
 * DailySummary — Daily attendance stats tile row
 *
 * Self-contained: decodes JWT → fetches shift_attendance_details/search
 * for the selected date and displays clock-in, clock-out, hours today.
 *
 * Real API response shape (abridged):
 * [
 *   {
 *     attendanceDetails: [
 *       {
 *         date: "2026-09-10",
 *         hoursWorked: 547,            ← minutes
 *         firstIn:  "2026-09-10T09:50:35",
 *         lastOut:  "",
 *         punchDetails: {
 *           inPunches:  [{ punchedTime: "2026-09-10T09:50:35", ... }],
 *           outPunches: [{ punchedTime: "2026-09-10T18:56:00", ... }],
 *         }
 *       }
 *     ]
 *   }
 * ]
 *
 *   TODAY  - - - - - - - - - - - - - - - - - - -
 *
 *   ┌───────────┐  ┌───────────┐  ┌───────────┐
 *   │   09:50   │  │   18:56   │  │   9:07    │
 *   │  Clock in │  │ Clock out │  │Hours today│
 *   └───────────┘  └───────────┘  └───────────┘
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

// ─── JWT helper ───────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part   = token.split('.')[1];
    if (!part) return null;
    const b64    = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    return JSON.parse(
      decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      )
    ) as Record<string, unknown>;
  } catch { return null; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO datetime or "HH:MM:SS" → "HH:MM". Returns "—" if empty/invalid. */
function toTimeDisplay(value: string | null | undefined): string {
  if (!value || !value.trim()) return '—';
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    // Bare time string "HH:MM:SS"
    return value.trim().slice(0, 5);
  } catch { return '—'; }
}

/** minutes → "H:MM" e.g. 547 → "9:07" */
function minsToHHMM(mins: number): string {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${pad(m)}`;
}

function dayLabel(date: Date): string {
  const today = new Date();
  if (
    date.getDate()     === today.getDate() &&
    date.getMonth()    === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) return 'TODAY';
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${MON[date.getMonth()].toUpperCase()}`;
}

// ─── Types (matching real API shape) ─────────────────────────────────────────

type PunchRecord = {
  punchedTime?:      string;
  transactionTime?:  string;
  inOut?:            string;
};

type AttendanceDetail = {
  date:          string;
  hoursWorked?:  number;   // minutes
  firstIn?:      string;
  lastOut?:      string;
  punchDetails?: {
    inPunches?:      PunchRecord[];
    outPunches?:     PunchRecord[];
    defaultPunches?: PunchRecord[];
  };
};

type ApiRow = {
  employeeID?:        string;
  attendanceDetails?: AttendanceDetail[];
};

// ─── Time extraction ──────────────────────────────────────────────────────────

/** Earliest in-punch time */
function clockInTime(detail: AttendanceDetail): string {
  // Prefer server-computed firstIn
  if (detail.firstIn?.trim()) return toTimeDisplay(detail.firstIn);
  // Fall back to first inPunch object
  const first = detail.punchDetails?.inPunches?.[0];
  return toTimeDisplay(first?.punchedTime ?? first?.transactionTime);
}

/** Latest out-punch time */
function clockOutTime(detail: AttendanceDetail): string {
  // Prefer server-computed lastOut
  if (detail.lastOut?.trim()) return toTimeDisplay(detail.lastOut);
  // Fall back to last outPunch object
  const punches = detail.punchDetails?.outPunches ?? [];
  if (punches.length === 0) return '—';
  const last = punches[punches.length - 1];
  return toTimeDisplay(last?.punchedTime ?? last?.transactionTime);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DashedLine() {
  return (
    <View className="flex-row overflow-hidden gap-[3px] items-center">
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} className="w-1 h-px bg-gray-300 rounded-[1px]" />
      ))}
    </View>
  );
}

function Tile({ value, label, loading }: { value: string; label: string; loading: boolean }) {
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
      {loading ? (
        <ActivityIndicator size="small" color="#94a3b8" />
      ) : (
        <Text className="text-slate-800 text-center text-[26px] font-extrabold leading-[30px] tabular-nums tracking-[-0.5px]">
          {value}
        </Text>
      )}
      <Text className="text-[11px] font-semibold text-gray-900 text-center leading-[15px]">
        {label}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  selectedDate: Date;
};

export function DailySummary({ selectedDate }: Props) {
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [apiRow,     setApiRow]     = useState<ApiRow | null>(null);

  // Decode JWT once on mount
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const p = decodeJwtPayload(token);
      if (!p) return;
      setEmployeeId(String(p.employeeID ?? p.employeeId ?? p.empId ?? ''));
      setTenantCode(String(p.tenantCode  ?? p.tenant    ?? p.org   ?? ''));
    })();
  }, []);

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const { loading } = useGetRequest<ApiRow[]>({
    url:    'muster/muster/day',
    method: 'POST',
    data: {
      employeeIDs: [employeeId],
      date:        dateKey,
      tenantCode,
    },
    enabled:      Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode, dateKey],
    onSuccess: (rows) => setApiRow(Array.isArray(rows) && rows.length > 0 ? rows[0] : null),
    onError:   ()     => setApiRow(null),
  });

  // Derive stats from the matching detail entry
  const stats = useMemo(() => {
    const detail = apiRow?.attendanceDetails?.find((d) => d.date === dateKey);
    if (!detail) return { clockIn: '—', clockOut: '—', hours: '—' };
    return {
      clockIn:  clockInTime(detail),
      clockOut: clockOutTime(detail),
      hours:    minsToHHMM(detail.hoursWorked ?? 0),
    };
  }, [apiRow, dateKey]);

  return (
    <View className="gap-2.5">

      {/* ── Section header ── */}
      <View className="flex-row items-center gap-2 px-0.5">
        <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.9px]">
          {dayLabel(selectedDate)}
        </Text>
        <View className="flex-1 overflow-hidden">
          <DashedLine />
        </View>
      </View>

      {/* ── Tile row ── */}
      <View className="flex-row gap-2.5">
        <Tile value={stats.clockIn}  label="Clock in"    loading={loading} />
        <Tile value={stats.clockOut} label="Clock out"   loading={loading} />
        <Tile value={stats.hours}    label="Hours today" loading={loading} />
      </View>

    </View>
  );
}
