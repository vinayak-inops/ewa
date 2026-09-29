/**
 * GateStatusCard
 *
 * Full-width gate-status banner + "Show gate pass" button.
 *
 * Props:
 *   status      — multi-line status text e.g. "CLEARED\nTO WORK"
 *   subtitle    — one-liner below the status
 *   shiftInfo   — shift details line at the bottom of the banner
 *   onGatePress — called when "Show gate pass" is tapped
 */

import { Text, View } from 'react-native';

// ─── Diagonal stripe decoration (pure-RN) ────────────────────────────────────

function DiagonalStripes() {
  return (
    <View
      className="absolute top-0 right-0 bottom-0 w-[55%] overflow-hidden opacity-[0.18] flex-row items-start gap-3 -ml-5 -mt-[60px]"
      pointerEvents="none"
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <View key={i} className="w-[10px] h-[300px] bg-white rotate-[-35deg] shrink-0" />
      ))}
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  status?:    string;   // default: "CLEARED\nTO WORK"
  subtitle?:  string;   // default: "You can come to work tomorrow"
  shiftInfo?: string;   // default: "B Shift · 14:00–22:00 · Gate 3 · Plant 2"
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GateStatusCard({
  status    = 'CLEARED\nTO WORK',
  subtitle  = 'You can come to work tomorrow',
  shiftInfo = 'B Shift · 14:00–22:00 · Gate 3 · Plant 2 — Hosur',
}: Props) {
  const today    = new Date();
  const dayLabel = today
    .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();

  return (
    <>
      {/* ── Banner ── */}
      <View className="bg-green-600 overflow-hidden mb-4 min-h-[148px] p-[18px] justify-between">
        <DiagonalStripes />

        {/* Date label */}
        <Text className="text-white/75 text-[11px] font-bold tracking-[1.2px]">
          GATE STATUS · {dayLabel}
        </Text>

        {/* Status lines */}
        <View className="mt-1.5">
          {status.split('\n').map((line, i) => (
            <Text
              key={i}
              className="text-white text-[32px] font-black leading-[38px] tracking-[0.5px]"
            >
              {line}
            </Text>
          ))}
          <Text className="text-white/80 text-[13px] font-normal mt-1">
            {subtitle}
          </Text>
        </View>

        {/* Shift info */}
        <Text className="text-white/[0.72] text-xs font-medium mt-3">
          {shiftInfo}
        </Text>
      </View>

    </>
  );
}
