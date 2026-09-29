/**
 * AttendanceAlert — Attendance notice / action card
 *
 * Design (from screenshot):
 *  ┌─────────────────────────────────────────────┐
 *  │  18 Aug marked absent              ● 2      │
 *  │  Your punch at 06:58 wasn't           days  │
 *  │  matched to a shift. Raise it…             │
 *  └─────────────────────────────────────────────┘
 *
 * • White card, soft shadow, rounded 14 px
 * • Bold title + body text on the left
 * • Pill badge (dot + count + label) on the right
 * • Severity: 'absent' | 'late' | 'early' | 'unmatched' | 'info'
 *
 * Usage:
 *   import { AttendanceAlert, type AlertItem } from './muster/AttendanceAlert';
 *
 *   <AttendanceAlert
 *     title="18 Aug marked absent"
 *     message="Your punch at 06:58 wasn't matched to a shift."
 *     badge={{ count: 2, label: 'days' }}
 *     severity="absent"
 *   />
 *
 *   // Or pass a list:
 *   <AttendanceAlertList alerts={alerts} />
 */

import React from 'react';
import { Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'absent' | 'late' | 'early' | 'unmatched' | 'info';

export type AlertBadge = {
  count: number;
  label: string;   // e.g. "days", "hrs", "min"
};

export type AlertItem = {
  id:        string;
  title:     string;
  message:   string;
  badge?:    AlertBadge;
  severity?: AlertSeverity;
};

// ─── Design tokens (NativeWind class strings — scanned at build time) ────────

const SEVERITY: Record<AlertSeverity, { dot: string; badgeBg: string; badgeText: string }> = {
  absent:    { dot: 'bg-red-500',   badgeBg: 'bg-red-100',   badgeText: 'text-red-700' },
  late:      { dot: 'bg-amber-400', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800' },
  early:     { dot: 'bg-amber-400', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800' },
  unmatched: { dot: 'bg-red-500',   badgeBg: 'bg-red-100',   badgeText: 'text-red-700' },
  info:      { dot: 'bg-blue-600',  badgeBg: 'bg-blue-50',   badgeText: 'text-blue-800' },
};

// ─── Single alert card ────────────────────────────────────────────────────────

type CardProps = Omit<AlertItem, 'id'>;

export function AttendanceAlert({
  title,
  message,
  badge,
  severity = 'absent',
}: CardProps) {
  const tok = SEVERITY[severity];

  return (
    <View
      className="bg-white rounded-[14px] px-3.5 py-3.5 flex-row items-start gap-3"
      style={{
        shadowColor:   '#94A3B8',
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius:  8,
        elevation:     2,
      }}
    >
      {/* ── Left: text block ── */}
      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900 mb-1 leading-5">
          {title}
        </Text>
        <Text className="text-xs font-normal text-gray-500 leading-[18px]">
          {message}
        </Text>
      </View>

      {/* ── Right: badge pill ── */}
      {badge && (
        <View className={`items-center justify-center rounded-full px-2.5 py-2 min-w-[44px] gap-[3px] ${tok.badgeBg}`}>
          {/* Dot */}
          <View className={`w-2 h-2 rounded-full ${tok.dot}`} />
          {/* Count */}
          <Text className={`text-[15px] font-extrabold leading-[18px] ${tok.badgeText}`}>
            {badge.count}
          </Text>
          {/* Label */}
          <Text className={`text-[10px] font-semibold leading-[13px] ${tok.badgeText}`}>
            {badge.label}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── List wrapper (renders multiple alerts with section header) ───────────────

function DashedLine() {
  return (
    <View className="flex-row overflow-hidden gap-[3px] items-center">
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} className="w-1 h-px rounded-[1px] bg-gray-300" />
      ))}
    </View>
  );
}

type ListProps = {
  alerts: AlertItem[];
  label?: string;
};

export function AttendanceAlertList({ alerts, label = 'ALERTS' }: ListProps) {
  if (alerts.length === 0) return null;

  return (
    <View className="gap-2.5">
      {/* Section header */}
      <View className="flex-row items-center gap-2 px-0.5">
        <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.9px]">
          {`${label} · ${alerts.length}`}
        </Text>
        <View className="flex-1 overflow-hidden">
          <DashedLine />
        </View>
      </View>

      {/* Cards */}
      {alerts.map((alert) => (
        <AttendanceAlert
          key={alert.id}
          title={alert.title}
          message={alert.message}
          badge={alert.badge}
          severity={alert.severity}
        />
      ))}
    </View>
  );
}
