import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const PRIMARY = '#0a1c63';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportCategory =
  | 'all' | 'contractEmployee' | 'shift' | 'attendance'
  | 'leave' | 'contractor' | 'salary' | 'compliance' | 'other';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  workflowName: string;
}

interface ReportOption {
  value: string;
  label: string;
  category: string;
  workflowName: string;
  description: string;
}

interface TenantReportConfiguration {
  options: ReportOption[];
  tenantCode: string;
  isActive: boolean;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

const API_CATEGORY_MAP: Record<string, ReportCategory> = {
  Employee: 'contractEmployee',
  Shift: 'shift',
  Attendance: 'attendance',
  Leave: 'leave',
  Contractor: 'contractor',
  Salary: 'salary',
  Compliance: 'compliance',
};

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  all: 'All',
  contractEmployee: 'Employee',
  shift: 'Shift',
  attendance: 'Attendance',
  leave: 'Leave',
  contractor: 'Contractor',
  salary: 'Salary',
  compliance: 'Compliance',
  other: 'Other',
};

function mapCategory(raw: string): ReportCategory {
  return API_CATEGORY_MAP[raw] ?? 'other';
}

function convertOptions(options: ReportOption[]): ReportItem[] {
  return options.map((o) => ({
    id: o.value,
    title: o.label,
    description: o.description ?? '',
    category: mapCategory(o.category),
    workflowName: o.workflowName,
  }));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const p = token.split('.')[1];
    if (!p) return null;
    const b = p.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b.padEnd(b.length + ((4 - (b.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch { return null; }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SelectReportsProps {
  selectedReport: string | null;
  onSelectionChange: (id: string, workflowName?: string) => void;
  onSaveAndContinue: () => void;
  searchLabel?: string;
  searchPlaceholder?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SelectReports({
  selectedReport,
  onSelectionChange,
  onSaveAndContinue,
  searchLabel = 'Search by Report Title',
  searchPlaceholder = 'Report title, category, or keyword',
}: SelectReportsProps) {
  const insets = useSafeAreaInsets();
  const footerBottom = Math.max(insets.bottom, 14) + 72 + 12;

  const [tenantCode, setTenantCode] = useState('');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ReportCategory>('all');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getAccessToken().then((token) => {
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? ''));
    });
  }, []);

  // ── Fetch reports ─────────────────────────────────────────────────────────
  const requestBody = useMemo(
    () => [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
    [tenantCode]
  );

  const { data: configData, loading, error } = useGetRequest<TenantReportConfiguration[]>({
    url: 'tenantReportConfiguration/search',
    method: 'POST',
    data: requestBody,
    enabled: Boolean(tenantCode),
    dependencies: [tenantCode],
  });

  // ── Parse reports ─────────────────────────────────────────────────────────
  const reports = useMemo<ReportItem[]>(() => {
    if (!Array.isArray(configData) || configData.length === 0) return [];
    const config = configData[0];
    if (!config?.options || !Array.isArray(config.options)) return [];
    return convertOptions(config.options);
  }, [configData]);

  // ── Tabs (dynamic from available categories, with counts) ────────────────
  const tabs = useMemo<{ id: ReportCategory; label: string; count: number }[]>(() => {
    const countMap = new Map<ReportCategory, number>();
    reports.forEach((r) => countMap.set(r.category, (countMap.get(r.category) ?? 0) + 1));
    const dynamic = Array.from(countMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({ id, label: CATEGORY_LABELS[id], count }));
    return [{ id: 'all', label: 'All', count: reports.length }, ...dynamic];
  }, [reports]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = reports;
    if (activeTab !== 'all') list = list.filter((r) => r.category === activeTab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reports, activeTab, query]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-[#f8fafc] pt-[14px]">

      {/* ── Tabs ── */}
      <View
        className="bg-white border-b border-[#e2e8f0]"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 2 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}
        >
          {tabs.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                className={`flex-row items-center gap-[6px] px-[14px] py-2 rounded-lg border ${on ? 'bg-[#0a1c63] border-[#0a1c63]' : 'bg-[#f1f5f9] border-[#e2e8f0]'}`}
                style={on ? { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 } : undefined}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text className={`text-[13px] font-semibold ${on ? 'text-white' : 'text-[#64748b]'}`}>{tab.label}</Text>
                <View className={`min-w-[20px] h-5 rounded-[10px] px-[5px] items-center justify-center ${on ? 'bg-white/25' : 'bg-[#e2e8f0]'}`}>
                  <Text className={`text-[10px] font-bold ${on ? 'text-white' : 'text-[#64748b]'}`}>{tab.count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search ── */}
      <View className="px-4 py-3 bg-white border-b border-[#f1f5f9]">
        <Text className="text-[10px] font-bold text-[#64748b] mb-[6px]" style={{ letterSpacing: 0.5 }}>
          {searchLabel}
        </Text>
        <View className="flex-row items-center border border-[#e2e8f0] rounded-[10px] px-3 h-10 bg-[#f8fafc]">
          <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-[13px] text-[#0f172a]"
            placeholder={searchPlaceholder}
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Results count ── */}
      {!loading && !error && reports.length > 0 && (
        <View className="px-4 py-2 bg-white border-b border-[#f1f5f9]">
          <Text className="text-[12px] text-[#64748b]">
            Showing <Text className="font-bold text-[#0f172a]">{filtered.length}</Text>{' '}
            {filtered.length === 1 ? 'result' : 'results'}
            {query.trim() ? ` for "${query.trim()}"` : ''}
          </Text>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}
        renderItem={({ item }) => {
          const isSelected = selectedReport === item.id;
          return (
            <Pressable
              className={`flex-row items-center gap-3 p-[14px] rounded-xl border ${isSelected ? 'border-[#0a1c63] bg-[#f0f3ff]' : 'border-[#e2e8f0] bg-white'}`}
              onPress={() => onSelectionChange(item.id, item.workflowName)}
            >
              <View className={`w-5 h-5 rounded-[10px] border-2 items-center justify-center shrink-0 ${isSelected ? 'border-[#0a1c63]' : 'border-[#cbd5e1]'}`}>
                {isSelected && <View className="w-[10px] h-[10px] rounded-[5px] bg-[#0a1c63]" />}
              </View>
              <View className="flex-1">
                <Text className={`text-[13px] font-semibold ${isSelected ? 'text-[#0a1c63]' : 'text-[#0f172a]'}`}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text className="text-[11px] text-[#64748b] mt-[3px] leading-4" numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-12 gap-[10px]">
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text className="text-[13px] text-[#94a3b8]">Loading reports…</Text>
            </View>
          ) : error ? (
            <View className="items-center py-12 gap-[10px]">
              <Ionicons name="alert-circle-outline" size={32} color="#dc2626" />
              <Text className="text-[13px] text-[#dc2626]">Failed to load reports</Text>
            </View>
          ) : (
            <View className="items-center py-12 gap-[10px]">
              <Ionicons name="search-outline" size={28} color="#cbd5e1" />
              <Text className="text-[13px] text-[#94a3b8]">
                {query.trim() ? 'No reports match your search' : 'No reports available'}
              </Text>
            </View>
          )
        }
      />

      {/* ── Sticky footer ── */}
      <View className="p-4 border-t border-[#f1f5f9] bg-white" style={{ paddingBottom: footerBottom }}>
        <Pressable
          className={`flex-row items-center justify-center rounded-xl h-[46px] ${selectedReport ? 'bg-[#0a1c63]' : 'bg-[#cbd5e1]'}`}
          style={({ pressed }) => pressed && selectedReport ? [{ opacity: 0.88 }] : []}
          disabled={!selectedReport}
          onPress={onSaveAndContinue}
        >
          <Text className="text-[14px] font-extrabold text-white">Save & Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}
