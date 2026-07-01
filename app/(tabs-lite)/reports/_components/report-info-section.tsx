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
  StyleSheet,
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

const F = 'Inter';

const C = {
  navy:        '#0a1c63',
  navyLight:   'rgba(255,255,255,0.12)',
  navyBorder:  'rgba(255,255,255,0.18)',
  primary:     '#2563eb',
  ink:         '#0f172a',
  muted:       '#64748b',
  faint:       '#94a3b8',
  border:      '#e2e8f0',
  divider:     '#f1f5f9',
  bg:          '#f8fafc',
  white:       '#ffffff',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  red:         '#dc2626',
  redBg:       '#fff1f2',
  amber:       '#a16207',
  amberBg:     '#fef9c3',
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
    <View style={ft.wrap}>
      {/* Section kicker */}
      <View style={ft.kicker}>
        <Ionicons name={icon as any} size={13} color={C.primary} />
        <Text style={ft.kickerTxt}>{title}</Text>
        <View style={ft.countBadge}>
          <Text style={ft.countBadgeTxt}>{items.length}</Text>
        </View>
      </View>
      <View style={ft.card}>

      {/* Search */}
      <View style={ft.searchWrap}>
        <Ionicons name="search-outline" size={14} color={C.faint} />
        <TextInput
          style={ft.searchInput}
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
      <View style={ft.colHead}>
        {singleColumn ? (
          <Text style={[ft.colHeadTxt, { flex: 1 }]}>Employee ID</Text>
        ) : (
          <>
            <Text style={[ft.colHeadTxt, { flex: 1 }]}>Code</Text>
            <Text style={[ft.colHeadTxt, { flex: 2 }]}>Name</Text>
          </>
        )}
      </View>

      {/* Rows */}
      {paged.map((item, i) => (
        <View key={`${item.code}-${i}`} style={[ft.row, i % 2 === 1 && ft.rowAlt]}>
          {singleColumn ? (
            <Text style={[ft.cell, ft.cellBold, { flex: 1 }]} numberOfLines={1}>{item.code}</Text>
          ) : (
            <>
              <Text style={[ft.cell, { flex: 1 }]} numberOfLines={1}>{item.code}</Text>
              <Text style={[ft.cell, ft.cellBold, { flex: 2 }]} numberOfLines={1}>
                {item.name !== item.code ? item.name : '—'}
              </Text>
            </>
          )}
        </View>
      ))}

      {filtered.length === 0 && (
        <View style={ft.empty}>
          <Ionicons name="search-outline" size={18} color={C.faint} />
          <Text style={ft.emptyTxt}>No results</Text>
        </View>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={ft.pageRow}>
          <Pressable
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={[ft.pageBtn, page === 1 && ft.pageBtnDis]}>
            <Ionicons name="chevron-back" size={13} color={page === 1 ? C.border : C.primary} />
          </Pressable>
          <Text style={ft.pageInfo}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>{page}</Text>
            {' / '}{totalPages}
          </Text>
          <Pressable
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={[ft.pageBtn, page >= totalPages && ft.pageBtnDis]}>
            <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? C.border : C.primary} />
          </Pressable>
        </View>
      )}
      </View>
    </View>
  );
}

const ft = StyleSheet.create({
  wrap: { marginBottom: 12 },
  kicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6,
  },
  kickerTxt: {
    flex: 1,
    fontFamily: F, fontSize: 11, fontWeight: '800',
    color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7,
  },
  card: {
    backgroundColor: C.white, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: C.divider,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  countBadge: {
    backgroundColor: '#eff6ff', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countBadgeTxt: { fontFamily: F, fontSize: 11, fontWeight: '800', color: C.primary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginVertical: 10,
    backgroundColor: C.bg, borderRadius: 10,
    paddingHorizontal: 10, height: 36,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontFamily: F, fontSize: 13, color: C.ink },
  colHead: {
    flexDirection: 'row', backgroundColor: C.divider,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  colHeadTxt: {
    fontFamily: F, fontSize: 10, fontWeight: '700',
    color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  rowAlt: { backgroundColor: '#fafbff' },
  cell: { fontFamily: F, fontSize: 12, color: C.muted },
  cellBold: { color: C.ink, fontWeight: '600' },
  empty: { paddingVertical: 18, alignItems: 'center', gap: 6 },
  emptyTxt: { fontFamily: F, fontSize: 12, color: C.faint },
  pageRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  pageBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  pageBtnDis: { opacity: 0.35 },
  pageInfo: { fontFamily: F, fontSize: 12, color: C.muted },
});

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
    <View style={[s.metaRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue} numberOfLines={2}>{value}</Text>
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
      <View style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={[s.header, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text style={s.headerTitle}>Report Details</Text>
        </View>
        <View style={s.center}>
          <View style={s.spinnerWrap}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
          <Text style={s.loadTxt}>Loading report…</Text>
        </View>
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!report) {
    return (
      <View style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={[s.header, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text style={s.headerTitle}>Report Details</Text>
        </View>
        <View style={s.center}>
          <View style={[s.emptyIconWrap, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="document-text-outline" size={32} color={C.primary} />
          </View>
          <Text style={s.emptyTitle}>Report not found</Text>
          <Text style={s.emptySub}>The requested report could not be loaded.</Text>
          <Pressable style={s.goBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={14} color={C.white} />
            <Text style={s.goBackBtnTxt}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasDateRange = report.fromDate && report.toDate;
  const metaRows = [
    { label: 'Extension',   value: extLabel },
    { label: 'Period',      value: report.period ? capitalize(report.period) : '—' },
    ...(hasDateRange
      ? [
          { label: 'From', value: fmtDate(report.fromDate) },
          { label: 'To',   value: fmtDate(report.toDate) },
        ]
      : []),
  ];

  const hasAnyFilters = SECTIONS.some((sec) => {
    const d = (enrichedData as any)[sec.key];
    return Array.isArray(d) && d.length > 0;
  });

  const fileIconName = isPdf ? 'document-outline' : 'grid-outline';
  const fileColor = isPdf ? C.red : C.green;
  const fileBg = isPdf ? C.redBg : C.greenBg;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.headerWrap, { paddingTop: insets.top + 14 }]}>
        {/* Top row — matches muster reference exactly */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text style={s.headerTitle}>Report Details</Text>
          <View style={{ width: 32 }} />
        </View>

      </View>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Report identity card ── */}
        <View style={s.identityCard}>
          {/* Navy header: icon + title + status badge */}
          <View style={s.identityTop}>
            <View style={[s.fileIconBox, { backgroundColor: fileBg }]}>
              <Ionicons name={fileIconName} size={26} color={fileColor} />
            </View>
            <View style={s.identityText}>
              <Text style={s.identityTitle} numberOfLines={2}>{title}</Text>
              {createdAt ? (
                <View style={s.identityDateRow}>
                  <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.5)" />
                  <Text style={s.identityDate}>{fmtDate(createdAt)}</Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={() => setStatusOpen(true)} hitSlop={10} style={[s.statusBadge, { backgroundColor: sm.bg }]}>
              <Ionicons
                name={sm.label === 'Completed' ? 'checkmark-circle' : sm.label === 'Failed' ? 'close-circle' : 'time'}
                size={13} color={sm.txt}
              />
              <Text style={[s.statusBadgeTxt, { color: sm.txt }]}>{sm.label}</Text>
            </Pressable>
          </View>

          {/* Info grid */}
          <View style={s.infoGrid}>
            {/* Extension pill */}
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>Extension</Text>
              <View style={[s.extPill, { backgroundColor: isPdf ? C.redBg : C.greenBg }]}>
                <Ionicons name={fileIconName} size={12} color={fileColor} />
                <Text style={[s.extPillTxt, { color: fileColor }]}>{extLabel}</Text>
              </View>
            </View>

            {/* Period */}
            <View style={[s.infoCell, s.infoCellBorderLeft]}>
              <Text style={s.infoCellLabel}>Period</Text>
              <Text style={s.infoCellValue}>{report.period ? capitalize(report.period) : '—'}</Text>
            </View>

            {hasDateRange && (
              <>
                <View style={[s.infoCell, s.infoCellBorderTop]}>
                  <Text style={s.infoCellLabel}>From</Text>
                  <Text style={s.infoCellValue}>{fmtDate(report.fromDate)}</Text>
                </View>
                <View style={[s.infoCell, s.infoCellBorderLeft, s.infoCellBorderTop]}>
                  <Text style={s.infoCellLabel}>To</Text>
                  <Text style={s.infoCellValue}>{fmtDate(report.toDate)}</Text>
                </View>
              </>
            )}
          </View>

          {/* Action buttons inside card */}
          <View style={s.actionRow}>
            <Pressable
              style={({ pressed }) => [s.btn, s.btnPrimary, !report.report && s.btnDisabled, pressed && !!report.report && !downloadLoading && { opacity: 0.88 }]}
              onPress={handleDownload}
              disabled={downloadLoading}>
              {downloadLoading
                ? <ActivityIndicator size="small" color={C.white} />
                : <Ionicons name="download-outline" size={16} color={C.white} />}
              <Text style={s.btnTxt}>Download</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.btn, s.btnOutline, !report.report && s.btnOutlineDisabled, pressed && !!report.report && { opacity: 0.88 }]}
              onPress={handlePreview}>
              <Ionicons name="eye-outline" size={16} color={report.report ? C.primary : C.faint} />
              <Text style={[s.btnTxt, { color: report.report ? C.primary : C.faint }]}>Preview</Text>
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
          <View style={s.noFilters}>
            <View style={s.noFiltersIcon}>
              <Ionicons name="filter-outline" size={22} color={C.primary} />
            </View>
            <Text style={s.noFiltersTitle}>No filters applied</Text>
            <Text style={s.noFiltersSub}>This report was generated without any filter criteria.</Text>
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
        onRequestClose={() => setStatusOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setStatusOpen(false)} />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalTitleRow}>
            <Text style={s.modalTitle}>Status Updates</Text>
            <Pressable onPress={() => setStatusOpen(false)} hitSlop={8} style={s.modalCloseBtn}>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header — outer column container (navy bg)
  headerWrap: {
    backgroundColor: C.navy,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  // Top row — matches muster reference exactly
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 12,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: F, fontSize: 16, fontWeight: '700',
    color: C.white, flex: 1,
  },
  statusIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // Identity card
  identityCard: {
    backgroundColor: C.white,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: C.divider,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
    marginBottom: 16,
  },
  identityTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.navy,
    padding: 16,
  },
  fileIconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  identityText: { flex: 1, paddingTop: 2 },
  identityTitle: {
    fontFamily: F, fontSize: 15, fontWeight: '800', color: C.white,
    lineHeight: 20,
  },
  identityDateRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 5,
  },
  identityDate: {
    fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.55)',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    marginLeft: 8, marginTop: 2,
  },
  statusBadgeTxt: {
    fontFamily: F, fontSize: 11, fontWeight: '700', marginLeft: 4,
  },

  // Info grid
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  infoCell: {
    width: '50%', padding: 14,
    justifyContent: 'center',
  },
  infoCellBorderLeft: {
    borderLeftWidth: 1, borderLeftColor: C.divider,
  },
  infoCellBorderTop: {
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  infoCellLabel: {
    fontFamily: F, fontSize: 10, fontWeight: '700',
    color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoCellValue: {
    fontFamily: F, fontSize: 13, fontWeight: '700', color: C.ink,
  },
  extPill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  extPillTxt: {
    fontFamily: F, fontSize: 12, fontWeight: '800', marginLeft: 4,
  },

  // Scroll
  scroll: { flex: 1 },
  content: { padding: 14 },

  // Meta rows (kept for loading/error states)
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  metaLabel: { fontFamily: F, fontSize: 12, fontWeight: '500', color: C.muted },
  metaValue: {
    fontFamily: F, fontSize: 13, fontWeight: '700', color: C.ink,
    textAlign: 'right', flex: 1, marginLeft: 16,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 14, marginBottom: 16,
    borderTopWidth: 1, borderTopColor: C.divider,
    paddingTop: 14,
  },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: 12, height: 44,
  },
  btnPrimary: { backgroundColor: C.navy, marginRight: 8 },
  btnDisabled: { backgroundColor: C.faint, marginRight: 8 },
  btnOutline: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.primary },
  btnOutlineDisabled: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  btnTxt: { fontFamily: F, fontSize: 13, fontWeight: '700', color: C.white, marginLeft: 6 },

  // No filters
  noFilters: {
    alignItems: 'center', paddingVertical: 28, gap: 8,
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.divider,
  },
  noFiltersIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  noFiltersTitle: { fontFamily: F, fontSize: 14, fontWeight: '700', color: C.ink },
  noFiltersSub: {
    fontFamily: F, fontSize: 12, color: C.muted,
    textAlign: 'center', paddingHorizontal: 24,
  },

  // Loading / empty states
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 32,
  },
  spinnerWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  loadTxt: { fontFamily: F, fontSize: 13, color: C.muted },
  emptyIconWrap: {
    width: 68, height: 68, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: F, fontSize: 17, fontWeight: '800', color: C.ink },
  emptySub: { fontFamily: F, fontSize: 13, color: C.muted, textAlign: 'center' },
  goBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.navy, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 11, marginTop: 4,
  },
  goBackBtnTxt: { fontFamily: F, fontSize: 13, fontWeight: '700', color: C.white },

  // Status modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 16,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  modalTitle: { fontFamily: F, fontSize: 15, fontWeight: '800', color: C.ink },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.divider,
    alignItems: 'center', justifyContent: 'center',
  },
});
