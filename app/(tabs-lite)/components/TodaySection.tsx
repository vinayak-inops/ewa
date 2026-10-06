/**
 * TodaySection
 *
 * Fetches today's attendance and shows first punch time + hours worked.
 *
 * Real API response shape (abridged):
 * [
 *   {
 *     employeeID: "EMP025",
 *     attendanceDetails: [
 *       {
 *         date: "2026-09-10",
 *         hoursWorked: 547,          ← minutes
 *         firstIn: "2026-09-10T09:50:35",
 *         lastOut: "",
 *         punchDetails: {
 *           inPunches:  [{ punchedTime: "2026-09-10T09:50:35", ... }],
 *           outPunches: [],
 *           defaultPunches: [],
 *         }
 *       }
 *     ]
 *   }
 * ]
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format minutes → "H:MM hrs" e.g. "9:07 hrs" */
function minsToDisplay(mins: number): string {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, '0')} hrs`;
}

/** Format an ISO datetime or time string → "HH:MM" */
function toTimeDisplay(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    // already "HH:MM:SS"
    return value.slice(0, 5);
  } catch { return '—'; }
}

// ─── Types (matching real API shape) ─────────────────────────────────────────

type PunchRecord = {
  punchedTime?: string;
  transactionTime?: string;
  inOut?: string;
};

type AttendanceDetail = {
  date:          string;
  hoursWorked?:  number;   // in minutes
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

// ─── Derive display values ────────────────────────────────────────────────────

function extractStats(detail: AttendanceDetail): { firstPunch: string; hoursSoFar: string } {
  // Prefer firstIn (pre-computed by server), else first inPunch
  const firstPunchTime =
    detail.firstIn && detail.firstIn.trim()
      ? toTimeDisplay(detail.firstIn)
      : toTimeDisplay(detail.punchDetails?.inPunches?.[0]?.punchedTime);

  const hoursSoFar = minsToDisplay(detail.hoursWorked ?? 0);

  return { firstPunch: firstPunchTime, hoursSoFar };
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5">
      <Text className="text-[#374151] text-[13.5px] font-medium">{label}</Text>
      <Text className="text-[#0f172a] text-sm font-bold tabular-nums">{value}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TodaySection() {
  const [apiRow,     setApiRow]     = useState<ApiRow | null>(null);

  const today = useMemo(() => todayISO(), []);

  const { loading } = useGetRequest<ApiRow[]>({
    url:    'muster/muster/day',
    method: 'POST',
    data: {
      date: today,
    },
    enabled:      true,
    dependencies: [today],
    onSuccess: (rows) => setApiRow(Array.isArray(rows) && rows.length > 0 ? rows[0] : null),
    onError:   ()     => setApiRow(null),
  });

  // Find today's detail entry
  const todayDetail = useMemo(
    () => apiRow?.attendanceDetails?.find((d) => d.date === today) ?? null,
    [apiRow, today],
  );

  const hasPunch = Boolean(
    todayDetail?.firstIn?.trim() ||
    (todayDetail?.punchDetails?.inPunches ?? []).length > 0,
  );

  const stats = todayDetail && hasPunch ? extractStats(todayDetail) : null;

  return (
    <>
      {/* ── Section divider ── */}
      <View className="flex-row items-center mb-3 mx-4">
        <View className="flex-1 h-px bg-slate-200" />
        <Text className="text-slate-400 text-[11px] font-bold tracking-[1.2px] mx-2.5">TODAY</Text>
        <View className="flex-1 h-px bg-slate-200" />
      </View>

      {/* ── Card ── */}
      <View className="bg-white rounded-[14px] overflow-hidden mx-4">

        {loading ? (
          /* Loading */
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#9ca3af" />
          </View>

        ) : !stats ? (
          /* Empty — not punched in yet */
          <View className="py-6 px-4 items-center" style={{ gap: 8 }}>
            <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="time-outline" size={22} color="#94a3b8" />
            </View>
            <Text className="text-[14px] font-bold text-slate-700 text-center">
              Your shift hasn't started yet
            </Text>
            <Text className="text-[12px] text-slate-400 text-center leading-[17px]">
              Punch in to start tracking your hours for today.
            </Text>
          </View>

        ) : (
          /* Data */
          <>
            <Row label="First punch"  value={stats.firstPunch} />
            <View className="h-px bg-slate-50 mx-4" />
            <Row label="Hours so far" value={stats.hoursSoFar} />
          </>
        )}

      </View>
    </>
  );
}
