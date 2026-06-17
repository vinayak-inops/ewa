import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedSuccessState } from '@/components/ui/animated-success-state';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'FAILED';

type WithdrawalTransaction = {
  id: string;
  reference: string;
  appliedDate: string;
  amount: string;
  createdAt: string;
  workflowState?: unknown;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasDataObject(value: unknown) {
  return Boolean(value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0);
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatCurrency(value?: unknown) {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (Number.isNaN(numericValue)) return 'Rs. 0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(numericValue)
    .replace('₹', 'Rs. ');
}

function formatAppliedDate(value?: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return 'Date not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncateReference(value?: unknown, maxLength = 15) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  if (!text) return 'Request';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function normalizeWorkflowState(value?: unknown) {
  if (typeof value === 'string') return value.toUpperCase();
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const raw = (value as Record<string, unknown>).value;
    return typeof raw === 'string' ? raw.toUpperCase() : '';
  }
  return '';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AllTransactionsScreen() {
  const router = useRouter();

  // Auth / identity
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');

  // UI state
  const [transactions, setTransactions] = useState<WithdrawalTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<WithdrawalTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;

  // ── Decode JWT once on mount ────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? ''));
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? ''));
    };
    void run();
  }, []);

  // Reset pagination when identity or tab changes
  useEffect(() => {
    setCurrentPage(1);
    setTransactions([]);
    setTotalCount(0);
  }, [employeeId, tenantCode, activeTab]);

  // ── Collection name – mirrors web component logic ───────────────────────────
  // PENDING / FAILED  → source collection  (EWA_withdrawal_application)
  // APPROVED / REJECTED / CANCELLED → transaction collection (EWA_withdrawal_application_transaction)
  const collectionName = useMemo(() => {
    if (activeTab === 'PENDING' || activeTab === 'FAILED' || activeTab === 'ALL') {
      return 'EWA_withdrawal_application';
    }
    // APPROVED, REJECTED, CANCELLED
    return 'EWA_withdrawal_application';
  }, [activeTab]);

  // ── Build request data – mirrors buildRequestData in web component ──────────
  const buildRequestData = useMemo(() => {
    const base: any[] = [
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'createdOn', value: '', operator: 'desc' },
    ];

    // APPROVED: filter by approvedBy (matches web pattern)
    if (activeTab === 'PENDING') {
      base.push({ field: 'workflowState', value: ["APPROVED", "REJECTED", "CANCELLED", "FAILED"], operator: 'nin' });
    }

    // PENDING: no extra workflowState filter — backend treats no-filter as pending queue
    // (matches web: workflowState filter is commented out for pending)

    // APPROVED: filter by approvedBy (matches web pattern)
    if (activeTab === 'APPROVED') {
      base.push({ field: 'workflowState', value: "APPROVED", operator: 'eq' });
    }

    // FAILED: filter by workflowState FAILED
    if (activeTab === 'FAILED') {
      base.push({ field: 'workflowState', value: 'FAILED', operator: 'eq' });
    }

    

    // REJECTED: filter by rejectedBy
    // if (activeTab === 'REJECTED') {
    //   base.push({ field: 'rejectedBy', value: employeeId, operator: 'eq' });
    // }

    // CANCELLED: filter by cancelledBy
    // if (activeTab === 'CANCELLED') {
    //   base.push({ field: 'cancelledBy', value: employeeId, operator: 'eq' });
    // }

    return base;
  }, [activeTab, employeeId, tenantCode]);

  // Derived pagination offset
  const offset = useMemo(() => (currentPage - 1) * pageSize, [currentPage]);
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = currentPage < totalPages;

  // ── Count API ───────────────────────────────────────────────────────────────
  useGetRequest<number>({
    url: `${collectionName}/count`,
    method: 'POST',
    data: buildRequestData,
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [collectionName, JSON.stringify(buildRequestData)],
    onSuccess: (data) => {
      setTotalCount(typeof data === 'number' && Number.isFinite(data) ? data : 0);
    },
    onError: () => setTotalCount(0),
  });

  // ── Search / list API ───────────────────────────────────────────────────────
  const { refetch: refetchTransactions } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${pageSize}`,
    method: 'POST',
    data: buildRequestData,
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [collectionName, JSON.stringify(buildRequestData), offset],
    onSuccess: (data) => {
      if (!Array.isArray(data)) {
        if (currentPage === 1) setTransactions([]);
        setIsLoadingMore(false);
        return;
      }

      const mapped: WithdrawalTransaction[] = data
        .filter((item) => hasDataObject(item))
        .map((item, index) => ({
          id: String(item._id ?? item.id ?? `withdrawal-${offset + index}`),
          reference: truncateReference(item._id ?? item.id ?? `Request ${index + 1}`),
          appliedDate: formatAppliedDate(item.createdOn ?? item.date ?? item.createdAt ?? item.applyDate),
          amount: formatCurrency(item.amount),
          createdAt: String(item.createdOn ?? item.date ?? item.createdAt ?? item.applyDate ?? ''),
          workflowState: item.workflowState,
        }));

      setTransactions((prev) => {
        if (currentPage === 1) return mapped;
        const existing = new Set(prev.map((t) => t.id));
        return [...prev, ...mapped.filter((t) => !existing.has(t.id))];
      });

      setIsLoadingMore(false);
    },
    onError: () => {
      if (currentPage === 1) setTransactions([]);
      setIsLoadingMore(false);
    },
  });

  // ── Status-specific counts for summary badges ───────────────────────────────
  // These always query the source collection so counts are consistent
  const { data: approvedCount } = useGetRequest<number>({
    url: `EWA_withdrawal_application/count`,
    method: 'POST',
    data: [...buildRequestData],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
  });

  const { data: rejectedCount } = useGetRequest<number>({
    url: `EWA_withdrawal_application/count`,
    method: 'POST',
    data: [...buildRequestData],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
  });

  const { data: cancelledCount } = useGetRequest<number>({
    url: `EWA_withdrawal_application/count`,
    method: 'POST',
    data: [...buildRequestData],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
  });

  // ── Pagination handlers ─────────────────────────────────────────────────────
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setCurrentPage((prev) => prev + 1);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
    if (isNearBottom) handleLoadMore();
  };

  // ── Tab definitions ─────────────────────────────────────────────────────────
  const TABS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    // { key: 'REJECTED', label: 'Rejected' },
    // { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'FAILED', label: 'Failed' },
  ];

  // Badge counts per tab
  const tabBadge: Partial<Record<StatusFilter, number>> = {
    APPROVED: typeof approvedCount === 'number' ? approvedCount : 0,
    REJECTED: typeof rejectedCount === 'number' ? rejectedCount : 0,
    CANCELLED: typeof cancelledCount === 'number' ? cancelledCount : 0,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {selectedTransaction ? (
        // Detail / status view
        <View style={styles.statusScreen}>
          <AnimatedSuccessState
            title="Request Status"
            message="This is the saved withdrawal request status for your selected transaction."
            referenceLabel="Request ID"
            referenceValue={selectedTransaction.reference}
            id={selectedTransaction.id}
            amountLabel="Amount"
            amountValue={selectedTransaction.amount}
            balanceLabel="Available Balance"
            balanceValue="-"
            employeeLabel="Employee ID"
            employeeValue={employeeId || '-'}
            reasonLabel="Applied Date"
            reasonValue={selectedTransaction.appliedDate}
            workflowState={selectedTransaction.workflowState}
            buttonLabel="Back to All Transactions"
            onPressButton={() => setSelectedTransaction(null)}
          />
        </View>
      ) : (
        <>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View style={styles.leftGroup}>
                <Pressable onPress={() => router.replace('/')} hitSlop={8} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </Pressable>
                <Text style={styles.title}>All Transactions</Text>
              </View>
            </View>

            {/* ── Tab bar (inside header for dark bg) ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabRow}
              style={styles.tabScroll}>
              {TABS.map(({ key, label }) => {
                const active = activeTab === key;
                const badge = tabBadge[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => setActiveTab(key)}
                    style={[styles.tab, active && styles.tabActive]}>
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                    {badge !== undefined && badge > 0 ? (
                      <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                        <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                          {badge > 99 ? '99+' : badge}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Sheet ── */}
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}>

            {/* Summary card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {activeTab === 'ALL' ? 'Transaction History' : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Transactions`}
              </Text>
              <Text style={styles.summaryText}>
                {activeTab === 'PENDING' && 'Transactions awaiting approval from the approver.'}
                {activeTab === 'APPROVED' && 'Transactions that have been approved.'}
                {/* {activeTab === 'REJECTED' && 'Transactions that were rejected.'}
                {activeTab === 'CANCELLED' && 'Transactions that were cancelled.'} */}
                {activeTab === 'FAILED' && 'Transactions that failed during processing.'}
                {activeTab === 'ALL' && 'Showing all transaction details without filter.'}
              </Text>
            </View>

            {/* Transaction list panel */}
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>TRANSACTIONS</Text>
                <Text style={styles.panelMeta}>{totalCount} total</Text>
              </View>

              {transactions.length > 0 ? (
                transactions.map((item) => {
                  const state = normalizeWorkflowState(item.workflowState);
                  const label = state || 'PENDING';
                  const isApproved = state === 'APPROVED';
                  const isRejected = state === 'REJECTED';
                  const isCancelled = state === 'CANCELLED' || state === 'CANCEL';
                  const isFailed = state === 'FAILED';

                  return (
                    <Pressable key={item.id} style={styles.txRow} onPress={() => setSelectedTransaction(item)}>
                      <View style={styles.avatar}>
                        <Ionicons name="document-text-outline" size={16} color="#334155" />
                      </View>
                      <View style={styles.txMeta}>
                        <Text style={styles.txName}>{item.reference}</Text>
                        <View style={styles.txSubRow}>
                          <Text style={styles.txSub}>{item.appliedDate}</Text>
                          <View
                            style={[
                              styles.txStatusBadge,
                              isApproved && styles.txStatusApproved,
                              isRejected && styles.txStatusRejected,
                              isCancelled && styles.txStatusCancelled,
                              isFailed && styles.txStatusFailed,
                              !isApproved && !isRejected && !isCancelled && !isFailed && styles.txStatusUnknown,
                            ]}>
                            <Text
                              style={[
                                styles.txStatusText,
                                isApproved && styles.txStatusTextApproved,
                                isRejected && styles.txStatusTextRejected,
                                isCancelled && styles.txStatusTextCancelled,
                                isFailed && styles.txStatusTextFailed,
                                !isApproved && !isRejected && !isCancelled && !isFailed && styles.txStatusTextUnknown,
                              ]}>
                              {label}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.txAmount}>{item.amount}</Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.emptyStateText}>No records found for the selected tab.</Text>
              )}
            </View>

            {/* Load more indicator */}
            {isLoadingMore ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loaderText}>Loading more...</Text>
              </View>
            ) : null}

            {!hasMore && transactions.length > 0 ? (
              <Text style={styles.endText}>No more records.</Text>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a1c63' },
  statusScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingTop: 58,
    paddingBottom: 24,
  },

  // Header
  header: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  title: { color: '#fff', fontSize: 19, fontWeight: '800' },

  // Tab bar
  tabScroll: { marginBottom: 0 },
  tabRow: { paddingHorizontal: 0, gap: 6, paddingBottom: 0 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: '#f8fafc',
  },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: '#0a1c63' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: '#0a1c63' },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  tabBadgeTextActive: { color: '#fff' },

  // Sheet
  sheet: { flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  sheetContent: { padding: 14, gap: 12, paddingBottom: 120 },

  // Summary card
  summaryCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  summaryText: { marginTop: 2, fontSize: 12, color: '#334155', lineHeight: 17 },

  // Panel (matches launchpad design)
  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelKicker: { fontSize: 10, letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' },
  panelMeta: { fontSize: 12, color: '#64748b' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txMeta: { flex: 1 },
  txName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  txSub: { fontSize: 12, color: '#64748b' },
  txSubRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Status badges
  txStatusBadge: { borderRadius: 999, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 1 },
  txStatusApproved: { backgroundColor: '#dbeafe' },
  txStatusRejected: { backgroundColor: '#fee2e2' },
  txStatusCancelled: { backgroundColor: '#e5e7eb' },
  txStatusFailed: { backgroundColor: '#ffedd5' },
  txStatusUnknown: { backgroundColor: '#e5e7eb' },
  txStatusText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  txStatusTextApproved: { color: '#15803d' },
  txStatusTextRejected: { color: '#b91c1c' },
  txStatusTextCancelled: { color: '#374151' },
  txStatusTextFailed: { color: '#c2410c' },
  txStatusTextUnknown: { color: '#475569' },

  txAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  emptyStateText: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingVertical: 10 },

  // Loader / end text
  loaderWrap: { paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  loaderText: { fontSize: 11, color: '#64748b' },
  endText: { textAlign: 'center', color: '#94a3b8', fontSize: 11, paddingVertical: 6 },
});