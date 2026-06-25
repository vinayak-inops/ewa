import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { ReportPopup } from './report-popup';
import { EMPTY_FILTER_DATA, TableMenuItem, TableType } from './types';

const F = 'Inter';

// ── tableMenuItems config (mirrors web, icons = Ionicon names) ────────────────

const TABLE_MENU_ITEMS: TableMenuItem[] = [
  { id: 'subsidiaries',       label: 'Subsidiaries',       icon: 'git-branch-outline',   parent: 'organization' },
  { id: 'divisions',          label: 'Divisions',          icon: 'people-outline',        parent: 'organization' },
  { id: 'departments',        label: 'Departments',        icon: 'business-outline',      parent: 'organization' },
  { id: 'subDepartments',     label: 'Sub Departments',    icon: 'business-outline',      parent: 'organization' },
  { id: 'sections',           label: 'Sections',           icon: 'people-outline',        parent: 'organization' },
  { id: 'designations',       label: 'Designations',       icon: 'people-outline',        parent: 'organization' },
  { id: 'grades',             label: 'Grades',             icon: 'people-outline',        parent: 'organization' },
  { id: 'employeeCategories', label: 'Categories',         icon: 'people-outline',        parent: 'organization' },
  { id: 'locations',          label: 'Locations',          icon: 'location-outline',      parent: 'organization' },
  { id: 'contractors',        label: 'Contractors',        icon: 'shield-outline',        parent: 'contractor' },
  { id: 'workOrders',         label: 'Work Orders',        icon: 'document-text-outline', parent: 'contractor' },
  { id: 'shiftGroups',        label: 'Shift Groups',       icon: 'time-outline',          parent: 'shift' },
  { id: 'shifts',             label: 'Shifts',             icon: 'time-outline',          parent: 'shift' },
  { id: 'contractEmployees',  label: 'Contract Employees', icon: 'people-outline',        parent: 'contractEmployee' },
];

// ── JWT helper ────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILTER_CHIPS = ['All', 'Excel', 'PDF', 'Pending', 'Completed'];

function statusColors(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed') return { bg: '#dcfce7', txt: '#15803d' };
  if (s === 'failed' || s === 'error') return { bg: '#fee2e2', txt: '#dc2626' };
  return { bg: '#fef9c3', txt: '#a16207' };
}

function fmtDate(iso: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { open: boolean; setOpen: (v: boolean) => void; hideHeader?: boolean };

export default function ReportsEditor({ open, setOpen, hideHeader = false }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [tenantCode, setTenantCode] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    getAccessToken().then((token) => {
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? ''));
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? ''));
    });
  }, []);

  // ── Search / filter ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeChip]);

  // ── filterData for ReportPopup ────────────────────────────────────────────
  const [filterData, setFilterData] = useState<Record<TableType, string[]>>({ ...EMPTY_FILTER_DATA });
  const totalSelected = useMemo(
    () => Object.values(filterData).reduce((sum, a) => sum + a.length, 0),
    [filterData]
  );
  const handleReset = useCallback(() => setFilterData({ ...EMPTY_FILTER_DATA }), []);

  // ── API ───────────────────────────────────────────────────────────────────
  const offset = (currentPage - 1) * itemsPerPage;
  const ready = Boolean(tenantCode && employeeId);

  const requestBody = useMemo(() => {
    const criteria: any[] = [
      { field: 'tenantCode', operator: 'eq', value: tenantCode },
      { field: 'createdOn',  operator: 'desc', value: '' },
      { field: 'employeeId', operator: 'eq', value: employeeId },
    ];
    if (searchTerm.trim()) criteria.push({ field: 'reportName', operator: 'like', value: searchTerm.trim() });
    const chip = activeChip.toLowerCase();
    if (chip === 'excel') criteria.push({ field: 'extension', operator: 'eq', value: 'excel' });
    if (chip === 'pdf')   criteria.push({ field: 'extension', operator: 'eq', value: 'pdf' });
    if (chip === 'pending' || chip === 'completed') criteria.push({ field: 'status', operator: 'eq', value: chip });
    return criteria;
  }, [tenantCode, employeeId, searchTerm, activeChip]);

  const { data: reportsRaw, loading, refetch: refetchReports } = useGetRequest<any>({
    url: `reports/search?offset=${offset}&limit=${itemsPerPage}`,
    method: 'POST', data: requestBody,
    enabled: ready,
    dependencies: [tenantCode, employeeId, offset, searchTerm, activeChip],
  });

  const { data: countRaw, refetch: refetchCount } = useGetRequest<any>({
    url: 'reports/count',
    method: 'POST', data: requestBody,
    enabled: ready,
    dependencies: [tenantCode, employeeId, searchTerm, activeChip],
  });

  const reports: any[] = useMemo(() => {
    if (!reportsRaw) return [];
    if (Array.isArray(reportsRaw)) return reportsRaw;
    if (Array.isArray(reportsRaw?.data)) return reportsRaw.data;
    return [];
  }, [reportsRaw]);

  const totalCount = typeof countRaw === 'number' ? countRaw : (countRaw?.count ?? reports.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const refreshAll = useCallback(() => { refetchReports(); refetchCount(); }, [refetchReports, refetchCount]);

  useFocusEffect(useCallback(() => { refreshAll(); }, [refreshAll]));

  // ── Report card ───────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: any }) => {
    const { bg, txt } = statusColors(item.status);
    const isPdf = (item.extension ?? '').toLowerCase() === 'pdf';

    return (
      <Pressable
        onPress={() =>
          router.push(`/(tabs-lite)/reports/application?mode=all&id=${encodeURIComponent(item._id ?? item.id ?? '')}` as any)
        }
      >
        {({ pressed }) => (
          <View style={[s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
            {/* Icon */}
            <View style={[s.cardIcon, { backgroundColor: isPdf ? '#fef2f2' : '#eff6ff' }]}>
              <Ionicons
                name={isPdf ? 'document-text-outline' : 'grid-outline'}
                size={24}
                color={isPdf ? '#dc2626' : '#1d4ed8'}
              />
            </View>

            {/* Body */}
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.reportName ?? item.reportTitle ?? 'Untitled'}
              </Text>
              <View style={s.cardFooter}>
                <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                <Text style={s.cardMeta}>{fmtDate(item.createdOn ?? item.createdAt ?? '') || '—'}</Text>
                <View style={s.cardTypeDot} />
                <Text style={[s.cardTypeTag, isPdf && { color: '#dc2626' }]}>
                  {(item.extension ?? 'EXCEL').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Status badge */}
            <View style={[s.statusBadge, { backgroundColor: bg }]}>
              <View style={[s.statusDot, { backgroundColor: txt }]} />
              <Text style={[s.statusTxt, { color: txt }]}>{item.status ?? 'Pending'}</Text>
            </View>

            {/* Chevron */}
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </View>
        )}
      </Pressable>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.screen, hideHeader && { backgroundColor: 'transparent' }]}>
      {!hideHeader && <StatusBar barStyle="light-content" backgroundColor="#4c1d95" />}

      {/* Header — only shown when not wrapped by index.tsx */}
      {!hideHeader && (
        <View style={[s.top, { paddingTop: insets.top + 14 }]}>
          <View style={s.blobA} />
          <View style={s.blobB} />
          <View style={s.topRow}>
            <View style={s.leftGroup}>
              <Pressable
                onPress={() => router.push('/(tabs-lite)/main-launchpad' as any)}
                hitSlop={8} style={s.backBtn}>
                <Ionicons name="arrow-back" size={18} color="#ffffff" />
              </Pressable>
              <Text style={s.headerTitle}>Reports</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.genBtn, pressed && { opacity: 0.88 }]}
              onPress={() => setOpen(true)}>
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={s.genBtnTxt}>Generate</Text>
              {totalSelected > 0 && (
                <View style={s.selBadge}>
                  <Text style={s.selBadgeTxt}>{totalSelected}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Search bar (dark) */}
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={s.searchInput}
              placeholder="Search reports…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Search bar (light) — shown when header is hidden */}
      {hideHeader && (
        <View style={s.searchBarLightWrap}>
          <View style={s.searchBarLight}>
            <View style={s.searchIconBox}>
              <Ionicons name="search-outline" size={15} color="#1d4ed8" />
            </View>
            <TextInput
              style={s.searchInputLight}
              placeholder="Search reports…"
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#cbd5e1" />
              </Pressable>
            )}
            <View style={s.searchDivider} />
            <Pressable
              onPress={() => setShowFilters((v) => !v)}
              hitSlop={8}
              style={[s.filterIconBtn, showFilters && s.filterIconBtnOn]}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={showFilters ? '#1d4ed8' : '#64748b'}
              />
              {activeChip !== 'All' && <View style={s.filterDot} />}
            </Pressable>
          </View>

          {/* Collapsible filter panel */}
          {showFilters && (
            <View style={s.filterPanel}>
              <View style={s.filterPanelHead}>
                <Text style={s.filterPanelLabel}>FILTER BY</Text>
                <Pressable hitSlop={8} onPress={() => { setActiveChip('All'); setShowFilters(false); }}>
                  <Text style={s.filterPanelClear}>Clear</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterPanelRow}>
                {FILTER_CHIPS.map((chip) => {
                  const isOn = activeChip === chip;
                  const chipIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
                    All: 'apps-outline',
                    Excel: 'grid-outline',
                    PDF: 'document-outline',
                    Pending: 'time-outline',
                    Completed: 'checkmark-circle-outline',
                  };
                  return (
                    <Pressable
                      key={chip}
                      style={[s.filterChip, isOn && s.filterChipOn]}
                      onPress={() => { setActiveChip(chip); setShowFilters(false); }}
                    >
                      <Ionicons
                        name={chipIcons[chip] ?? 'ellipse-outline'}
                        size={14}
                        color={isOn ? '#1d4ed8' : '#64748b'}
                      />
                      <Text style={[s.filterChipTxt, isOn && s.filterChipTxtOn]}>{chip}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Filter chips — dark header mode */}
      {!hideHeader && (
        <View style={s.chipsWrap}>
          <FlatList
            data={FILTER_CHIPS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c}
            contentContainerStyle={s.chipsList}
            renderItem={({ item: chip }) => (
              <Pressable
                style={[s.chip, activeChip === chip && s.chipOn]}
                onPress={() => setActiveChip(chip)}>
                <Text style={[s.chipTxt, activeChip === chip && s.chipTxtOn]}>{chip}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Reports list */}
      <FlatList
        data={reports}
        keyExtractor={(item, i) => item._id ?? item.id ?? String(i)}
        renderItem={renderCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : (
            <View style={s.center}>
              <Ionicons name="document-text-outline" size={52} color="#c4b5fd" />
              <Text style={s.emptyTitle}>No reports found</Text>
              <Text style={s.emptySub}>Tap "Generate" to create your first report</Text>
              <Pressable style={s.emptyBtn} onPress={() => setOpen(true)}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={s.emptyBtnTxt}>Generate Report</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={s.pagination}>
              <Pressable
                style={[s.pageBtn, currentPage === 1 && s.pageBtnDis]}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}>
                <Ionicons name="chevron-back" size={15} color={currentPage === 1 ? '#cbd5e1' : '#6d28d9'} />
                <Text style={[s.pageTxt, currentPage === 1 && s.pageTxtDis]}>Prev</Text>
              </Pressable>
              <Text style={s.pageInfo}>{currentPage} / {totalPages}</Text>
              <Pressable
                style={[s.pageBtn, currentPage >= totalPages && s.pageBtnDis]}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}>
                <Text style={[s.pageTxt, currentPage >= totalPages && s.pageTxtDis]}>Next</Text>
                <Ionicons name="chevron-forward" size={15} color={currentPage >= totalPages ? '#cbd5e1' : '#6d28d9'} />
              </Pressable>
            </View>
          ) : null
        }
      />

      {/* Report Popup modal */}
      <ReportPopup
        isOpen={open}
        onClose={() => setOpen(false)}
        tableMenuItems={TABLE_MENU_ITEMS}
        onReset={handleReset}
        onFilterDataChange={(data) => {
          setFilterData(data);
          refreshAll();
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f3ff' },

  top: {
    backgroundColor: '#4c1d95',
    paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden',
  },
  blobA: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    right: -40, top: -60, backgroundColor: '#6d28d9', opacity: 0.5,
  },
  blobB: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    right: 60, top: 10, backgroundColor: '#7c3aed', opacity: 0.25,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: { fontFamily: F, fontSize: 20, fontWeight: '700', color: '#ffffff' },

  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#7c3aed', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  genBtnTxt: { fontFamily: F, fontSize: 13, fontWeight: '700', color: '#ffffff' },
  selBadge: {
    backgroundColor: '#ffffff', borderRadius: 8,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  selBadgeTxt: { fontFamily: F, fontSize: 10, fontWeight: '800', color: '#7c3aed' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 12, paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  searchInput: { flex: 1, fontFamily: F, fontSize: 14, color: '#ffffff' },

  searchBarLightWrap: {
    marginHorizontal: 14, marginTop: 12, marginBottom: 4, gap: 8,
  },
  searchBarLight: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14, paddingHorizontal: 10, height: 48,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  searchIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  searchInputLight: { flex: 1, fontFamily: F, fontSize: 14, color: '#0f172a' },
  searchDivider: { width: 1, height: 22, backgroundColor: '#e2e8f0' },
  filterIconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  filterIconBtnOn: { backgroundColor: '#eff6ff' },
  filterDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#1d4ed8', borderWidth: 1.5, borderColor: '#fff',
  },
  filterPanel: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    gap: 10,
  },
  filterPanelHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  filterPanelLabel: {
    fontFamily: F, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: '#94a3b8',
  },
  filterPanelClear: {
    fontFamily: F, fontSize: 12, fontWeight: '700', color: '#1d4ed8',
  },
  filterPanelRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  filterChipOn: { backgroundColor: '#dbeafe', borderColor: '#1d4ed8' },
  filterChipTxt: { fontFamily: F, fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterChipTxtOn: { color: '#1d4ed8', fontWeight: '700' },

  chipsWrap: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  chipsList: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  chipOn: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  chipTxt: { fontFamily: F, fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTxtOn: { color: '#6d28d9' },

  listContent: { padding: 14, gap: 10, paddingBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 14,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: F, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardWorkflow: { fontFamily: F, fontSize: 11, color: '#64748b', fontWeight: '500' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMeta: { fontFamily: F, fontSize: 11, color: '#94a3b8' },
  cardTypeDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#cbd5e1' },
  cardTypeTag: { fontFamily: F, fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontFamily: F, fontSize: 11, fontWeight: '700' },
  extBadge: {
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: '#eff6ff',
  },
  extBadgePdf: { backgroundColor: '#fef2f2' },
  extTxt: { fontFamily: F, fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  extTxtPdf: { color: '#dc2626' },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontFamily: F, fontSize: 17, fontWeight: '700', color: '#6d28d9' },
  emptySub: { fontFamily: F, fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7c3aed', borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 8,
  },
  emptyBtnTxt: { fontFamily: F, fontSize: 14, fontWeight: '700', color: '#ffffff' },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#ffffff',
  },
  pageBtnDis: { opacity: 0.4 },
  pageTxt: { fontFamily: F, fontSize: 13, fontWeight: '600', color: '#6d28d9' },
  pageTxtDis: { color: '#94a3b8' },
  pageInfo: { fontFamily: F, fontSize: 13, color: '#64748b' },
});
