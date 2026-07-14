import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AutoStatusUpdate from '@/components/ui/auto-status-update';
import { useByteToBase64 } from '@/hooks/api/file-handle/useByteToBase64';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { useGraphQLQuery } from '@/hooks/api/useGraphQLQuery';
import { getAccessToken } from '@/hooks/auth/token-store';
import ReportPreviewModal from './report-preview-modal';

const C = {
  navy:    '#0a1c63',
  primary: '#2563eb',
  ink:     '#0f172a',
  muted:   '#64748b',
  faint:   '#94a3b8',
  border:  '#e2e8f0',
  divider: '#f1f5f9',
  bg:      '#f8fafc',
  white:   '#ffffff',
  green:   '#16a34a',
  greenBg: '#f0fdf4',
  red:     '#dc2626',
  redBg:   '#fff1f2',
  amber:   '#a16207',
  amberBg: '#fef9c3',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportData {
  _id?: string;
  report?: string;
  reportName?: string;
  reportTitle?: string;
  extension?: string;
  tenantId?: string;
  workflowName?: string;
  subsidiaries?: any[];
  divisions?: any[];
  departments?: any[];
  designations?: any[];
  subDepartments?: any[];
  sections?: any[];
  grades?: any[];
  contractor?: any[];
  location?: any[];
  fromDate?: string;
  toDate?: string;
  period?: string;
  employeeID?: string[];
  employeeCategories?: any[];
  workOrderNumber?: string[];
  shifts?: any[];
  shiftGroups?: any[];
  status?: string;
  createdOn?: string;
  createdAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractItems(data: any[]): { code: string; name: string }[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (typeof item === 'string') return { code: item, name: item };
      const code =
        item.subsidiaryCode ?? item.divisionCode ?? item.departmentCode ??
        item.designationCode ?? item.subDepartmentCode ?? item.sectionCode ??
        item.gradeCode ?? item.contractorCode ?? item.locationCode ??
        item.employeeCategoryCode ?? item.shiftCode ?? item.shiftGroupCode ??
        item.workOrderNumber ?? item.code ?? '';
      const name =
        item.subsidiaryName ?? item.divisionName ?? item.departmentName ??
        item.designationName ?? item.subDepartmentName ?? item.sectionName ??
        item.gradeName ?? item.contractorName ?? item.locationName ??
        item.employeeCategoryName ?? item.shiftName ?? item.shiftGroupName ??
        item.name ?? code;
      return { code, name };
    })
    .filter((x) => x.code);
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return iso ?? ''; }
}

function statusMeta(status: string): { bg: string; txt: string; label: string } {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed') return { bg: C.greenBg, txt: C.green, label: 'Completed' };
  if (s === 'failed' || s === 'error') return { bg: C.redBg, txt: C.red, label: 'Failed' };
  return { bg: C.amberBg, txt: C.amber, label: 'Pending' };
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const p = token.split('.')[1];
    if (!p) return null;
    const b = p.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b.padEnd(b.length + ((4 - (b.length % 4)) % 4), '=');
    return JSON.parse(
      decodeURIComponent(
        atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
      )
    ) as Record<string, unknown>;
  } catch { return null; }
}

// ── GraphQL query strings ─────────────────────────────────────────────────────

const GQL_ORG = `
  query FetchOrg($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
    fetchOrganization(criteriaRequests: $criteriaRequests, collection: $collection) {
      _id
      organizationCode
      subsidiaries      { subsidiaryCode subsidiaryName }
      divisions         { divisionCode divisionName }
      departments       { departmentCode departmentName }
      designations      { designationCode designationName }
      subDepartments    { subDepartmentCode subDepartmentName }
      sections          { sectionCode sectionName }
      grades            { gradeCode gradeName }
      location          { locationCode locationName }
      employeeCategories { employeeCategoryCode employeeCategoryName }
    }
  }
`;

const GQL_CONTRACTORS = `
  query FetchContractors($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
    fetchContractors(criteriaRequests: $criteriaRequests, collection: $collection) {
      contractorCode
      contractorName
      workOrders {
        workOrderNumber
        contractPeriodFrom
        contractPeriodTo
      }
    }
  }
`;

const GQL_SHIFTS = `
  query FetchShifts($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
    fetchShifts(criteriaRequests: $criteriaRequests, collection: $collection) {
      shiftGroupCode
      shiftGroupName
      shift { shiftCode shiftName }
    }
  }
`;

// ── FilterTable ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

function FilterTable({
  title,
  icon,
  items,
  singleColumn = false,
}: {
  title: string;
  icon: string;
  items: { code: string; name: string }[];
  singleColumn?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (x) => x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (items.length === 0) return null;

  return (
    <View className="mb-3">
      {/* Section kicker */}
      <View className="flex-row items-center gap-[6px] mb-[6px]">
        <Ionicons name={icon as any} size={13} color={C.primary} />
        <Text className="flex-1 text-[11px] font-extrabold text-slate-500 uppercase" style={{ letterSpacing: 0.7 }}>{title}</Text>
        <View className="bg-[#eff6ff] rounded-lg px-2 py-[3px]">
          <Text className="text-[11px] font-extrabold text-[#2563eb]">{items.length}</Text>
        </View>
      </View>

      <View
        className="bg-white rounded-2xl overflow-hidden border border-[#f1f5f9]"
        style={{ shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}
      >
        {/* Search */}
        <View className="flex-row items-center gap-2 mx-[14px] my-[10px] bg-[#f8fafc] rounded-[10px] px-[10px] h-9 border border-[#e2e8f0]">
          <Ionicons name="search-outline" size={14} color={C.faint} />
          <TextInput
            className="flex-1 text-[13px] text-[#0f172a]"
            placeholder={`Search ${title.toLowerCase()}…`}
            placeholderTextColor={C.faint}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={C.faint} />
            </Pressable>
          )}
        </View>

        {/* Column headers */}
        <View className="flex-row bg-[#f1f5f9] px-[14px] py-[7px]">
          {singleColumn ? (
            <Text className="text-[10px] font-bold text-slate-500 uppercase flex-1" style={{ letterSpacing: 0.5 }}>Employee ID</Text>
          ) : (
            <>
              <Text className="text-[10px] font-bold text-slate-500 uppercase flex-1" style={{ letterSpacing: 0.5 }}>Code</Text>
              <Text className="text-[10px] font-bold text-slate-500 uppercase" style={{ flex: 2, letterSpacing: 0.5 }}>Name</Text>
            </>
          )}
        </View>

        {/* Rows */}
        {paged.map((item, i) => (
          <View key={`${item.code}-${i}`} className={`flex-row px-[14px] py-[10px] ${i % 2 === 1 ? 'bg-[#fafbff]' : ''}`}>
            {singleColumn ? (
              <Text className="text-[12px] text-[#0f172a] font-semibold flex-1" numberOfLines={1}>{item.code}</Text>
            ) : (
              <>
                <Text className="text-[12px] text-slate-500 flex-1" numberOfLines={1}>{item.code}</Text>
                <Text className="text-[12px] text-[#0f172a] font-semibold" style={{ flex: 2 }} numberOfLines={1}>
                  {item.name !== item.code ? item.name : '—'}
                </Text>
              </>
            )}
          </View>
        ))}

        {filtered.length === 0 && (
          <View className="py-[18px] items-center gap-[6px]">
            <Ionicons name="search-outline" size={18} color={C.faint} />
            <Text className="text-[12px] text-[#94a3b8]">No results</Text>
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View className="flex-row items-center justify-center gap-[14px] py-[10px] border-t border-[#f1f5f9]">
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`w-7 h-7 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] items-center justify-center ${page === 1 ? 'opacity-[0.35]' : ''}`}
            >
              <Ionicons name="chevron-back" size={13} color={page === 1 ? C.border : C.primary} />
            </Pressable>
            <Text className="text-[12px] text-slate-500">
              <Text style={{ color: C.primary, fontWeight: '700' }}>{page}</Text>
              {' / '}{totalPages}
            </Text>
            <Pressable
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`w-7 h-7 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] items-center justify-center ${page >= totalPages ? 'opacity-[0.35]' : ''}`}
            >
              <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? C.border : C.primary} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Section config ────────────────────────────────────────────────────────────

const SECTIONS: { key: keyof ReportData; label: string; icon: string }[] = [
  { key: 'subsidiaries',       label: 'Subsidiaries',       icon: 'git-branch-outline' },
  { key: 'divisions',          label: 'Divisions',           icon: 'people-outline' },
  { key: 'departments',        label: 'Departments',         icon: 'business-outline' },
  { key: 'subDepartments',     label: 'Sub Departments',     icon: 'business-outline' },
  { key: 'sections',           label: 'Sections',            icon: 'people-outline' },
  { key: 'designations',       label: 'Designations',        icon: 'people-outline' },
  { key: 'grades',             label: 'Grades',              icon: 'school-outline' },
  { key: 'employeeCategories', label: 'Employee Categories', icon: 'layers-outline' },
  { key: 'location',           label: 'Locations',           icon: 'location-outline' },
  { key: 'contractor',         label: 'Contractors',         icon: 'shield-checkmark-outline' },
  { key: 'workOrderNumber',    label: 'Work Orders',         icon: 'document-text-outline' },
  { key: 'shiftGroups',        label: 'Shift Groups',        icon: 'time-outline' },
  { key: 'shifts',             label: 'Shifts',              icon: 'time-outline' },
  { key: 'employeeID',         label: 'Employee IDs',        icon: 'id-card-outline' },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row justify-between items-center px-[14px] py-[11px] ${last ? '' : 'border-b border-[#f1f5f9]'}`}>
      <Text className="text-[12px] font-medium text-slate-500">{label}</Text>
      <Text className="text-[13px] font-bold text-[#0f172a] text-right flex-1 ml-4" numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ReportInfoSection({ fileId }: { fileId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [tenantCode, setTenantCode] = useState('');
  useEffect(() => {
    getAccessToken().then((token) => {
      if (!token) return;
      const p = decodeJwtPayload(token);
      if (!p) return;
      setTenantCode(String(p.tenantCode ?? p.tenant ?? p.org ?? ''));
    });
  }, []);

  // ── Report fetch ──────────────────────────────────────────────────────────
  const { data: raw, loading } = useGetRequest<any>({
    url: `map/reports/search?_id=${encodeURIComponent(fileId)}`,
    method: 'GET',
    enabled: Boolean(fileId),
    dependencies: [fileId],
  });

  const report: ReportData | null = useMemo(() => {
    if (!raw) return null;
    if (Array.isArray(raw)) return (raw as ReportData[])[0] ?? null;
    if (raw.data && Array.isArray(raw.data)) return raw.data[0] ?? null;
    return raw as ReportData;
  }, [raw]);

  // ── GraphQL — org hierarchy ───────────────────────────────────────────────
  const orgVars = useMemo(() => ({
    criteriaRequests: [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
    collection: 'organization',
  }), [tenantCode]);

  const { data: orgData } = useGraphQLQuery<{ fetchOrganization: any[] }>({
    query: GQL_ORG, variables: orgVars, skip: !tenantCode,
  });

  const { data: contractorData } = useGraphQLQuery<{ fetchContractors: any[] }>({
    query: GQL_CONTRACTORS,
    variables: useMemo(() => ({
      criteriaRequests: [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
      collection: 'contractor',
    }), [tenantCode]),
    skip: !tenantCode,
  });

  const { data: shiftData } = useGraphQLQuery<{ fetchShifts: any[] }>({
    query: GQL_SHIFTS,
    variables: useMemo(() => ({
      criteriaRequests: [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
      collection: 'shift',
    }), [tenantCode]),
    skip: !tenantCode,
  });

  // ── Normalize ─────────────────────────────────────────────────────────────
  const org = orgData?.fetchOrganization?.[0];

  function resolveOrNull<T>(
    gqlItems: T[] | undefined,
    reportItems: any[] | undefined,
    getCode: (x: T) => string,
    getName: (x: T) => string,
    reportCodes: string[],
  ): { code: string; name: string }[] {
    const fallback = extractItems(reportItems ?? []);
    if (!gqlItems || reportCodes.length === 0) return fallback;
    const matched = gqlItems
      .filter((x) => reportCodes.includes(getCode(x)))
      .map((x) => ({ code: getCode(x), name: getName(x) }));
    return matched.length > 0 ? matched : fallback;
  }

  const getCodes = (arr: any[] | undefined) => extractItems(arr ?? []).map((x) => x.code);

  const enrichedData = useMemo(() => {
    if (!report) return {};
    return {
      subsidiaries:       resolveOrNull(org?.subsidiaries,       report.subsidiaries,       (x: any) => x.subsidiaryCode,       (x: any) => x.subsidiaryName,       getCodes(report.subsidiaries)),
      divisions:          resolveOrNull(org?.divisions,          report.divisions,          (x: any) => x.divisionCode,         (x: any) => x.divisionName,         getCodes(report.divisions)),
      departments:        resolveOrNull(org?.departments,        report.departments,        (x: any) => x.departmentCode,       (x: any) => x.departmentName,       getCodes(report.departments)),
      designations:       resolveOrNull(org?.designations,       report.designations,       (x: any) => x.designationCode,      (x: any) => x.designationName,      getCodes(report.designations)),
      subDepartments:     resolveOrNull(org?.subDepartments,     report.subDepartments,     (x: any) => x.subDepartmentCode,    (x: any) => x.subDepartmentName,    getCodes(report.subDepartments)),
      sections:           resolveOrNull(org?.sections,           report.sections,           (x: any) => x.sectionCode,          (x: any) => x.sectionName,          getCodes(report.sections)),
      grades:             resolveOrNull(org?.grades,             report.grades,             (x: any) => x.gradeCode,            (x: any) => x.gradeName,            getCodes(report.grades)),
      location:           resolveOrNull(org?.location,           report.location,           (x: any) => x.locationCode,         (x: any) => x.locationName,         getCodes(report.location)),
      employeeCategories: resolveOrNull(org?.employeeCategories, report.employeeCategories, (x: any) => x.employeeCategoryCode, (x: any) => x.employeeCategoryName, getCodes(report.employeeCategories)),
      contractor:         resolveOrNull(contractorData?.fetchContractors, report.contractor, (x: any) => x.contractorCode, (x: any) => x.contractorName, getCodes(report.contractor)),
      shiftGroups: (() => {
        const codes = getCodes(report.shiftGroups);
        const gqlGroups = shiftData?.fetchShifts?.map((x: any) => ({ code: x.shiftGroupCode, name: x.shiftGroupName })) ?? [];
        const matched = gqlGroups.filter((x) => codes.includes(x.code));
        return matched.length > 0 ? matched : extractItems(report.shiftGroups ?? []);
      })(),
      shifts: (() => {
        const codes = getCodes(report.shifts);
        const gqlShifts = (shiftData?.fetchShifts ?? []).flatMap((x: any) =>
          (x.shift ?? []).map((sh: any) => ({ code: sh.shiftCode, name: sh.shiftName }))
        );
        const matched = gqlShifts.filter((x: any) => codes.includes(x.code));
        return matched.length > 0 ? matched : extractItems(report.shifts ?? []);
      })(),
      workOrderNumber: (() => {
        const topLevel = Array.isArray(report.workOrderNumber) ? report.workOrderNumber : [];
        const fromContractors = (report.contractor ?? []).flatMap((ctr: any) =>
          Array.isArray(ctr.workOrders)
            ? ctr.workOrders.map((wo: any) => wo.workOrderNumber ?? wo).filter(Boolean)
            : typeof ctr === 'string' ? [] : []
        );
        const rawWONums: string[] = topLevel.length > 0
          ? topLevel.map((x: any) => typeof x === 'string' ? x : (x.workOrderNumber ?? String(x)))
          : fromContractors.map((x: any) => typeof x === 'string' ? x : (x.workOrderNumber ?? String(x)));
        const allGqlWOs = (contractorData?.fetchContractors ?? []).flatMap((ctr: any) =>
          Array.isArray(ctr.workOrders) ? ctr.workOrders : []
        );
        return rawWONums.map((woNum) => {
          const gqlWO = allGqlWOs.find((wo: any) => wo.workOrderNumber === woNum);
          const name = gqlWO?.contractPeriodFrom && gqlWO?.contractPeriodTo
            ? `${fmtDate(gqlWO.contractPeriodFrom)} – ${fmtDate(gqlWO.contractPeriodTo)}`
            : woNum;
          return { code: woNum, name };
        });
      })(),
      employeeID: (() => {
        const arr = report.employeeID;
        if (!Array.isArray(arr) || arr.length === 0) return [];
        return arr.map((x: any) => {
          const id = typeof x === 'string' ? x : (x?.employeeID ?? x?.code ?? x?.id ?? String(x));
          return { code: id, name: id };
        });
      })(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, org, contractorData, shiftData]);

  // ── Derived display values ────────────────────────────────────────────────
  const isPdf = (report?.extension ?? '').toLowerCase() === 'pdf';
  const sm = statusMeta(report?.status ?? '');
  const title = report?.reportTitle ?? report?.reportName ?? 'Report';
  const createdAt = report?.createdOn ?? report?.createdAt;
  const extLabel = (report?.extension ?? 'EXCEL').toUpperCase();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const { fetchByteArray } = useByteToBase64();

  const MIME_MAP: Record<string, string> = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  const handlePreview = () => {
    if (!report?.report) { Alert.alert('No File', 'No report file is available.'); return; }
    setPreviewOpen(true);
  };

  const handleDownload = async () => {
    if (!report?.report) { Alert.alert('No File', 'No report file is available.'); return; }
    setDownloadLoading(true);
    try {
      const mimeType = MIME_MAP[(report.extension ?? '').toLowerCase()] ?? 'application/octet-stream';
      const isPath = report.report.startsWith('/') || report.report.startsWith('app/');
      let uri: string;
      if (isPath) {
        const result = await fetchByteArray(report.report, mimeType);
        if (!result.success || !result.objectUrl) {
          Alert.alert('Error', result.error ?? 'Failed to load file.'); return;
        }
        uri = result.objectUrl;
      } else {
        uri = `data:${mimeType};base64,${report.report}`;
      }
      await Linking.openURL(uri);
    } catch (e: any) {
      Alert.alert('Download Error', e?.message ?? 'Unable to download file.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc]">
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View className="flex-row items-center gap-[10px] mb-3" style={{ paddingTop: insets.top + 14 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/15 items-center justify-center">
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text className="text-base font-bold text-white flex-1">Report Details</Text>
        </View>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <View className="w-16 h-16 rounded-[18px] bg-[#eff6ff] items-center justify-center">
            <ActivityIndicator size="large" color={C.primary} />
          </View>
          <Text className="text-[13px] text-slate-500">Loading report…</Text>
        </View>
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!report) {
    return (
      <View className="flex-1 bg-[#f8fafc]">
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View className="flex-row items-center gap-[10px] mb-3" style={{ paddingTop: insets.top + 14 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/15 items-center justify-center">
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text className="text-base font-bold text-white flex-1">Report Details</Text>
        </View>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <View className="w-[68px] h-[68px] rounded-[20px] items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
            <Ionicons name="document-text-outline" size={32} color={C.primary} />
          </View>
          <Text className="text-[17px] font-extrabold text-[#0f172a]">Report not found</Text>
          <Text className="text-[13px] text-slate-500 text-center">The requested report could not be loaded.</Text>
          <Pressable className="flex-row items-center gap-[6px] bg-[#0a1c63] rounded-xl px-5 py-[11px] mt-1" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={14} color={C.white} />
            <Text className="text-[13px] font-bold text-white">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasDateRange = report.fromDate && report.toDate;

  const hasAnyFilters = SECTIONS.some((sec) => {
    const d = (enrichedData as any)[sec.key];
    return Array.isArray(d) && d.length > 0;
  });

  const fileIconName = isPdf ? 'document-outline' : 'grid-outline';
  const fileColor = isPdf ? C.red : C.green;
  const fileBg = isPdf ? C.redBg : C.greenBg;

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View className="bg-[#0a1c63] px-4 pb-2" style={{ paddingTop: insets.top + 14 }}>
        <View className="flex-row items-center gap-[10px] mb-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/15 items-center justify-center">
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text className="text-base font-bold text-white flex-1">Report Details</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Report identity card ── */}
        <View
          className="bg-white rounded-[20px] overflow-hidden border border-[#f1f5f9] mb-4"
          style={{ shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4 }}
        >
          {/* Navy header: icon + title + status badge */}
          <View className="flex-row items-start bg-[#0a1c63] p-4">
            <View className="w-[52px] h-[52px] rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: fileBg }}>
              <Ionicons name={fileIconName} size={26} color={fileColor} />
            </View>
            <View className="flex-1 pt-[2px]">
              <Text className="text-[15px] font-extrabold text-white leading-5" numberOfLines={2}>{title}</Text>
              {createdAt ? (
                <View className="flex-row items-center mt-[5px]">
                  <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.5)" />
                  <Text className="text-[11px] text-white/55 ml-1">{fmtDate(createdAt)}</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => setStatusOpen(true)}
              hitSlop={10}
              className="flex-row items-center rounded-[20px] px-[10px] py-[5px] ml-2 mt-[2px]"
              style={{ backgroundColor: sm.bg }}
            >
              <Ionicons
                name={sm.label === 'Completed' ? 'checkmark-circle' : sm.label === 'Failed' ? 'close-circle' : 'time'}
                size={13} color={sm.txt}
              />
              <Text className="text-[11px] font-bold ml-1" style={{ color: sm.txt }}>{sm.label}</Text>
            </Pressable>
          </View>

          {/* Info grid */}
          <View className="flex-row flex-wrap border-t border-[#f1f5f9]">
            {/* Extension pill */}
            <View className="w-1/2 p-[14px] justify-center">
              <Text className="text-[10px] font-bold text-[#94a3b8] uppercase mb-[5px]" style={{ letterSpacing: 0.5 }}>Extension</Text>
              <View className="flex-row items-center self-start rounded-lg px-2 py-1" style={{ backgroundColor: isPdf ? C.redBg : C.greenBg }}>
                <Ionicons name={fileIconName} size={12} color={fileColor} />
                <Text className="text-[12px] font-extrabold ml-1" style={{ color: fileColor }}>{extLabel}</Text>
              </View>
            </View>

            {/* Period */}
            <View className="w-1/2 p-[14px] justify-center border-l border-[#f1f5f9]">
              <Text className="text-[10px] font-bold text-[#94a3b8] uppercase mb-[5px]" style={{ letterSpacing: 0.5 }}>Period</Text>
              <Text className="text-[13px] font-bold text-[#0f172a]">{report.period ? capitalize(report.period) : '—'}</Text>
            </View>

            {hasDateRange && (
              <>
                <View className="w-1/2 p-[14px] justify-center border-t border-[#f1f5f9]">
                  <Text className="text-[10px] font-bold text-[#94a3b8] uppercase mb-[5px]" style={{ letterSpacing: 0.5 }}>From</Text>
                  <Text className="text-[13px] font-bold text-[#0f172a]">{fmtDate(report.fromDate)}</Text>
                </View>
                <View className="w-1/2 p-[14px] justify-center border-l border-t border-[#f1f5f9]">
                  <Text className="text-[10px] font-bold text-[#94a3b8] uppercase mb-[5px]" style={{ letterSpacing: 0.5 }}>To</Text>
                  <Text className="text-[13px] font-bold text-[#0f172a]">{fmtDate(report.toDate)}</Text>
                </View>
              </>
            )}
          </View>

          {/* Action buttons */}
          <View className="flex-row mx-[14px] mb-4 border-t border-[#f1f5f9] pt-[14px]">
            <Pressable
              className={`flex-1 flex-row items-center justify-center rounded-xl h-11 mr-2 ${!report.report ? 'bg-[#94a3b8]' : 'bg-[#0a1c63]'}`}
              style={({ pressed }) => [pressed && !!report.report && !downloadLoading && { opacity: 0.88 }]}
              onPress={handleDownload}
              disabled={downloadLoading}
            >
              {downloadLoading
                ? <ActivityIndicator size="small" color={C.white} />
                : <Ionicons name="download-outline" size={16} color={C.white} />}
              <Text className="text-[13px] font-bold text-white ml-[6px]">Download</Text>
            </Pressable>
            <Pressable
              className={`flex-1 flex-row items-center justify-center rounded-xl h-11 bg-white ${!report.report ? 'border-[#e2e8f0]' : 'border-[#2563eb]'}`}
              style={({ pressed }) => [{ borderWidth: 1.5 }, pressed && !!report.report && { opacity: 0.88 }]}
              onPress={handlePreview}
            >
              <Ionicons name="eye-outline" size={16} color={report.report ? C.primary : C.faint} />
              <Text className="text-[13px] font-bold ml-[6px]" style={{ color: report.report ? C.primary : C.faint }}>Preview</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 6 }} />
        {SECTIONS.map((sec) => {
          const items: { code: string; name: string }[] =
            (enrichedData as any)[sec.key] ?? extractItems(
              Array.isArray(report[sec.key]) ? report[sec.key] as any[] : []
            );
          return (
            <FilterTable
              key={sec.key}
              title={sec.label}
              icon={sec.icon}
              items={items}
              singleColumn={sec.key === 'employeeID'}
            />
          );
        })}

        {!hasAnyFilters && (
          <View className="items-center py-7 gap-2 bg-white rounded-2xl border border-[#f1f5f9]">
            <View className="w-12 h-12 rounded-[14px] bg-[#eff6ff] items-center justify-center">
              <Ionicons name="filter-outline" size={22} color={C.primary} />
            </View>
            <Text className="text-[14px] font-bold text-[#0f172a]">No filters applied</Text>
            <Text className="text-[12px] text-slate-500 text-center px-6">This report was generated without any filter criteria.</Text>
          </View>
        )}

        <View style={{ height: 64 }} />
      </ScrollView>

      {/* Preview Modal */}
      <ReportPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        reportName={title}
        extension={report.extension}
        rawReport={report.report}
        onDownload={handleDownload}
      />

      {/* Status updates modal */}
      <Modal
        visible={statusOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setStatusOpen(false)} />
        <View className="bg-white rounded-tl-3xl rounded-tr-3xl pb-4" style={{ maxHeight: '75%' }}>
          <View className="w-9 h-1 rounded-sm bg-[#e2e8f0] self-center mt-[10px] mb-1" />
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#f1f5f9]">
            <Text className="text-[15px] font-extrabold text-[#0f172a]">Status Updates</Text>
            <Pressable onPress={() => setStatusOpen(false)} hitSlop={8} className="w-[30px] h-[30px] rounded-full bg-[#f1f5f9] items-center justify-center">
              <Ionicons name="close" size={18} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <AutoStatusUpdate
              fileId={fileId}
              onContinue={() => {}}
              onClose={() => setStatusOpen(false)}
            />
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
