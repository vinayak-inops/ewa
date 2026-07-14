import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { ReportPopup } from './report-popup';
import { EMPTY_FILTER_DATA, TableMenuItem, TableType } from './types';

// ── tableMenuItems config ────────────────────────────────────────────────────

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
    const { txt } = statusColors(item.status);
    const isPdf = (item.extension ?? '').toLowerCase() === 'pdf';
    const status = (item.status ?? 'Pending').toUpperCase();
    const createdDate = fmtDate(item.createdOn ?? item.createdAt ?? '');

    return (
      <Pressable
        onPress={() =>
          router.push(`/(tabs-lite)/reports/application?mode=all&id=${encodeURIComponent(item._id ?? item.id ?? '')}` as any)
        }
      >
        {({ pressed }) => (
          <View className={`flex-row items-center gap-3 bg-white py-[14px] px-1 border-b border-[#f1f5f9] ${pressed ? 'opacity-[0.92]' : ''}`}>
            {/* Left icon */}
            <View className="w-10 h-10 rounded-full bg-[#f1f5f9] items-center justify-center">
              <Ionicons
                name={isPdf ? 'document-text-outline' : 'grid-outline'}
                size={20}
                color="#64748b"
              />
            </View>

            {/* Body */}
            <View className="flex-1 gap-[2px]">
              <Text className="text-[13px] font-bold text-[#0f172a]" numberOfLines={1}>
                {item.reportTitle ?? item.reportName ?? 'Untitled'}
              </Text>
              {item.reportName ? (
                <Text className="text-[11px] text-[#64748b] font-medium" numberOfLines={1}>{item.reportName}</Text>
              ) : null}
              <View className="flex-row items-center gap-[5px]">
                <Text className="text-[11px] text-[#94a3b8] mt-[1px]">{createdDate || '—'}</Text>
                <View className="w-[3px] h-[3px] rounded-sm bg-[#cbd5e1]" />
                <Text className={`text-[11px] font-semibold mt-[1px] ${isPdf ? 'text-[#dc2626]' : 'text-[#64748b]'}`}>
                  {(item.extension ?? 'EXCEL').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Right: status + date */}
            <View className="items-end gap-[5px]">
              <View className="rounded-md px-2 py-[3px]" style={{ backgroundColor: txt }}>
                <Text className="text-[10px] font-extrabold text-white" style={{ letterSpacing: 0.3 }}>{status}</Text>
              </View>
              <Text className="text-[10px] text-[#94a3b8] mt-[2px]">{createdDate || '—'}</Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View className={`flex-1 ${hideHeader ? 'bg-transparent' : 'bg-[#f5f3ff]'}`}>
      {!hideHeader && <StatusBar barStyle="light-content" backgroundColor="#4c1d95" />}

      {/* Header — only shown when not wrapped by index.tsx */}
      {!hideHeader && (
        <View
          className="bg-[#4c1d95] px-4 pb-4 overflow-hidden"
          style={{ paddingTop: insets.top + 14 }}
        >
          {/* Blobs — negative offsets stay inline */}
          <View className="absolute w-[180px] h-[180px] rounded-full bg-[#6d28d9] opacity-50" style={{ right: -40, top: -60 }} />
          <View className="absolute w-[120px] h-[120px] rounded-full bg-[#7c3aed] opacity-25" style={{ right: 60, top: 10 }} />

          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-[10px]">
              <Pressable
                onPress={() => router.push('/(tabs-lite)/main-launchpad' as any)}
                hitSlop={8}
                className="w-[34px] h-[34px] rounded-full items-center justify-center bg-white/15"
              >
                <Ionicons name="arrow-back" size={18} color="#ffffff" />
              </Pressable>
              <Text className="text-xl font-bold text-white">Reports</Text>
            </View>
            <Pressable
              className="flex-row items-center gap-[5px] bg-[#7c3aed] rounded-[20px] px-[14px] py-2"
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
              onPress={() => setOpen(true)}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text className="text-[13px] font-bold text-white">Generate</Text>
              {totalSelected > 0 && (
                <View className="bg-white rounded-lg min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-[10px] font-extrabold text-[#7c3aed]">{totalSelected}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Search bar (dark) — rgba stays inline */}
          <View
            className="flex-row items-center gap-2 rounded-xl px-3 h-[42px] border"
            style={{ backgroundColor: 'rgba(255,255,255,0.13)', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.6)" />
            <TextInput
              className="flex-1 text-[14px] text-white"
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

      {/* Applications-style header — shown when header is hidden */}
      {hideHeader && (
        <View className="bg-white px-[14px] pt-3 pb-0">
          {/* Search row */}
          <View
            className="flex-row items-center gap-2 bg-white rounded-[14px] px-[10px] h-12 border border-[#e2e8f0]"
            style={{ shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
          >
            <View className="w-8 h-8 rounded-[10px] bg-[#eff6ff] items-center justify-center">
              <Ionicons name="search-outline" size={15} color="#1d4ed8" />
            </View>
            <TextInput
              className="flex-1 text-[14px] text-[#0f172a]"
              placeholder="Search Att. Data..."
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
            <Pressable hitSlop={8}>
              <Ionicons name="menu-outline" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Section label + count */}
          <View className="flex-row items-center justify-between mt-[14px] mb-[2px]">
            <Text className="text-[11px] font-bold text-[#94a3b8]" style={{ letterSpacing: 0.8 }}>REPORTS</Text>
            <Text className="text-[11px] text-[#94a3b8]">{totalCount} total</Text>
          </View>

          {/* Tab bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 0, paddingTop: 6 }}>
            {FILTER_CHIPS.map((chip) => {
              const isOn = activeChip === chip;
              return (
                <Pressable key={chip} className="px-[14px] pb-[10px] items-center" onPress={() => setActiveChip(chip)}>
                  <Text className={`text-[13px] ${isOn ? 'text-[#0f172a] font-bold' : 'font-medium text-[#94a3b8]'}`}>{chip}</Text>
                  {isOn && <View className="absolute bottom-0 left-[14px] right-[14px] h-[2px] rounded-sm bg-[#0f172a]" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Filter chips — dark header mode */}
      {!hideHeader && (
        <View className="bg-white border-b border-[#f1f5f9]">
          <FlatList
            data={FILTER_CHIPS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}
            renderItem={({ item: chip }) => (
              <Pressable
                className={`px-[14px] py-[6px] rounded-[20px] border ${activeChip === chip ? 'bg-[#ede9fe] border-[#7c3aed]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
                onPress={() => setActiveChip(chip)}
              >
                <Text className={`text-[13px] font-semibold ${activeChip === chip ? 'text-[#6d28d9]' : 'text-slate-500'}`}>{chip}</Text>
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
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center py-20 gap-[10px]">
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : (
            <View className="items-center justify-center py-20 gap-[10px]">
              <Ionicons name="document-text-outline" size={52} color="#c4b5fd" />
              <Text className="text-[17px] font-bold text-[#6d28d9]">No reports found</Text>
              <Text className="text-[13px] text-[#94a3b8] text-center">Tap "Generate" to create your first report</Text>
              <Pressable className="flex-row items-center gap-[6px] bg-[#7c3aed] rounded-xl px-[18px] py-[10px] mt-2" onPress={() => setOpen(true)}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text className="text-[14px] font-bold text-white">Generate Report</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View className="flex-row items-center justify-between py-4 px-1">
              <Pressable
                className={`flex-row items-center gap-1 px-[14px] py-2 border border-[#e2e8f0] rounded-[10px] bg-white ${currentPage === 1 ? 'opacity-40' : ''}`}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <Ionicons name="chevron-back" size={15} color={currentPage === 1 ? '#cbd5e1' : '#6d28d9'} />
                <Text className={`text-[13px] font-semibold ${currentPage === 1 ? 'text-[#94a3b8]' : 'text-[#6d28d9]'}`}>Prev</Text>
              </Pressable>
              <Text className="text-[13px] text-[#64748b]">{currentPage} / {totalPages}</Text>
              <Pressable
                className={`flex-row items-center gap-1 px-[14px] py-2 border border-[#e2e8f0] rounded-[10px] bg-white ${currentPage >= totalPages ? 'opacity-40' : ''}`}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <Text className={`text-[13px] font-semibold ${currentPage >= totalPages ? 'text-[#94a3b8]' : 'text-[#6d28d9]'}`}>Next</Text>
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
