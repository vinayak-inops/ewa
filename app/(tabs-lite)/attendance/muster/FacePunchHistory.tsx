
import React from 'react';
import { Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FacePunchRecord = {
  _id:                    string;
  employeeID:             string;
  dateTime:               string;
  latitude:               number;
  longitude:              number;
  accuracy:               number;
  tenantCode:             string;
  punchPhotoPath:         string;
  status:                 string;   // 'SUCCESS' | 'FAILED'
  geofenceValidated:      boolean;
  matchedSiteCode:        string;
  distanceFromSiteMeters: number;
  radiusMeters:           number;
  accuracyToleranceMeters:number;
  effectiveRadiusMeters:  number;
  validated:              boolean;
  errorDescription:       string;
};

// ─── Design tokens (NativeWind class strings) ─────────────────────────────────

const C = {
  ok:   { dotClass: 'bg-green-500', textClass: 'text-green-700', bgClass: 'bg-[#E1F5EE]' },
  fail: { dotClass: 'bg-red-500',   textClass: 'text-red-700',   bgClass: 'bg-red-100'   },
} as const;

const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }

function toHHMM(iso: string): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function toDateLabel(iso: string): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  return `${pad(dt.getDate())} ${MON_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
}

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

function StatusPill({ verified }: { verified: boolean }) {
  const tok = verified ? C.ok : C.fail;
  return (
    <View className={`flex-row items-center gap-1 px-2 py-[3px] rounded-full ${tok.bgClass}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${tok.dotClass}`} />
      <Text className={`text-[11px] font-bold ${tok.textClass}`}>
        {verified ? 'Verified' : 'Failed'}
      </Text>
    </View>
  );
}

function HistoryRow({ rec }: { rec: FacePunchRecord }) {
  const verified  = rec.status === 'SUCCESS' || rec.validated === true;
  const timeLabel = toHHMM(rec.dateTime);
  const dateLabel = toDateLabel(rec.dateTime);
  const site      = rec.matchedSiteCode
    ? rec.matchedSiteCode.replace(/_/g, ' ')
    : 'Face reader';
  const location  = rec.matchedSiteCode ? `${dateLabel} · ${site}` : dateLabel;

  return (
    <View className="flex-row items-center gap-2.5 px-3 py-3">
      {/* Time — fixed width so all times align */}
      <Text className="w-11 text-[13px] font-bold text-[#111827] tabular-nums tracking-[0.2px]">
        {timeLabel}
      </Text>

      {/* Date · site */}
      <Text className="flex-1 text-[13px] font-medium text-blue-600" numberOfLines={1}>
        {location}
      </Text>

      {/* Verified / Failed pill */}
      <StatusPill verified={verified} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  records: FacePunchRecord[];
};

export function FacePunchHistory({ records }: Props) {
  return (
    <View>
      {/* ── Section header ── */}
      <View className="flex-row items-center gap-2 mb-3.5 px-0.5">
        <Text className="text-[11px] font-bold text-gray-500 tracking-[0.9px] uppercase">
          {records.length > 0 ? `Face Punches · ${records.length}` : 'Face Punches'}
        </Text>
        <View className="flex-1 overflow-hidden">
          <DashedLine dotClass="bg-gray-500" />
        </View>
      </View>

      {/* ── Card ── */}
      <View className="bg-white rounded-[13px] overflow-hidden py-1.5">
        {records.length === 0 ? (
          <View className="items-center py-[22px] gap-1">
            <Text className="text-xs text-slate-400 font-medium">
              No face punches recorded yet
            </Text>
          </View>
        ) : (
          records.map((rec, i) => (
            <React.Fragment key={rec._id}>
              <HistoryRow rec={rec} />
              {i < records.length - 1 && (
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
