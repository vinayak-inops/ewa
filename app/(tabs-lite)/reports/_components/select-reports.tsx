import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const F = 'Inter';
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
    <View style={s.container}>

      {/* ── Tabs ── */}
      <View style={s.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsScroll}
        >
          {tabs.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[s.tab, on && s.tabOn]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[s.tabTxt, on && s.tabTxtOn]}>{tab.label}</Text>
                <View style={[s.tabBadge, on && s.tabBadgeOn]}>
                  <Text style={[s.tabBadgeTxt, on && s.tabBadgeTxtOn]}>{tab.count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Text style={s.searchLabel}>{searchLabel}</Text>
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
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
        <View style={s.countRow}>
          <Text style={s.countTxt}>
            Showing <Text style={s.countBold}>{filtered.length}</Text>{' '}
            {filtered.length === 1 ? 'result' : 'results'}
            {query.trim() ? ` for "${query.trim()}"` : ''}
          </Text>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={s.list}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedReport === item.id;
          return (
            <Pressable
              style={[s.reportRow, isSelected && s.reportRowActive]}
              onPress={() => onSelectionChange(item.id, item.workflowName)}
            >
              <View style={[s.radioOuter, isSelected && s.radioOuterActive]}>
                {isSelected && <View style={s.radioInner} />}
              </View>
              <View style={s.reportText}>
                <Text style={[s.reportName, isSelected && s.reportNameActive]}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={s.reportDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={s.emptyTxt}>Loading reports…</Text>
            </View>
          ) : error ? (
            <View style={s.center}>
              <Ionicons name="alert-circle-outline" size={32} color="#dc2626" />
              <Text style={[s.emptyTxt, { color: '#dc2626' }]}>Failed to load reports</Text>
            </View>
          ) : (
            <View style={s.center}>
              <Ionicons name="search-outline" size={28} color="#cbd5e1" />
              <Text style={s.emptyTxt}>
                {query.trim() ? 'No reports match your search' : 'No reports available'}
              </Text>
            </View>
          )
        }
      />

      {/* ── Sticky footer ── */}
      <View style={[s.footer, { paddingBottom: footerBottom }]}>
        <Pressable
          style={({ pressed }) => [
            s.continueBtn,
            !selectedReport && s.continueBtnOff,
            pressed && selectedReport && { opacity: 0.88 },
          ]}
          disabled={!selectedReport}
          onPress={onSaveAndContinue}
        >
          <Text style={s.continueBtnTxt}>Save & Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 14 },

  /* Tabs */
  tabsWrap: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 2,
  },
  tabsScroll: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  tabTxt: { fontFamily: F, fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTxtOn: { color: '#ffffff' },
  tabBadge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeTxt: { fontFamily: F, fontSize: 10, fontWeight: '700', color: '#64748b' },
  tabBadgeTxtOn: { color: '#ffffff' },

  /* Search */
  searchWrap: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  searchLabel: {
    fontFamily: F, fontSize: 10, fontWeight: '700',
    color: '#64748b', letterSpacing: 0.5, marginBottom: 6,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, height: 40, backgroundColor: '#f8fafc',
  },
  searchInput: { flex: 1, fontFamily: F, fontSize: 13, color: '#0f172a' },

  /* Count */
  countRow: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  countTxt: { fontFamily: F, fontSize: 12, color: '#64748b' },
  countBold: { fontWeight: '700', color: '#0f172a' },

  /* List */
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },

  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  reportRowActive: { borderColor: PRIMARY, backgroundColor: '#f0f3ff' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterActive: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  reportText: { flex: 1 },
  reportName: { fontFamily: F, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  reportNameActive: { color: PRIMARY },
  reportDesc: { fontFamily: F, fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 16 },

  /* Empty / loading */
  center: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTxt: { fontFamily: F, fontSize: 13, color: '#94a3b8' },

  /* Footer */
  footer: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY, borderRadius: 12, height: 46,
  },
  continueBtnOff: { backgroundColor: '#cbd5e1' },
  continueBtnTxt: { fontFamily: F, fontSize: 14, fontWeight: '800', color: '#ffffff' },
});
