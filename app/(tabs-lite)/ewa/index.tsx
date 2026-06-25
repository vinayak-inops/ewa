import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedSuccessState } from '@/components/ui/animated-success-state';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

type WithdrawalTransaction = {
  id: string;
  reference: string;
  appliedDate: string;
  amount: string;
  numericAmount: number;
  createdAt: string;
  workflowState?: unknown;
};

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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
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

function parseNumericValue(value?: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
  return 0;
}

function formatAxisAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatChartDate(value?: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function normalizeWorkflowState(value?: unknown) {
  if (typeof value === 'string') return value.toUpperCase();
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const raw = (value as Record<string, unknown>).value;
    return typeof raw === 'string' ? raw.toUpperCase() : '';
  }
  return '';
}

export default function EwaScreen() {
  const router = useRouter();
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const barScrollRef = useRef<ScrollView>(null);

  const todayDate = new Date().toLocaleDateString('en-IN');
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [ewaSummary, setEwaSummary] = useState<Record<string, any> | null>(null);
  const [transactions, setTransactions] = useState<WithdrawalTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<WithdrawalTransaction | null>(null);
  const [transactionsVisibleCount, setTransactionsVisibleCount] = useState(15);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setEmployeeId(
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') || ''
      );
      setTenantCode(
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || ''
      );
    };
    void run();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSelectedTransaction(null);
      if (employeeId && tenantCode) {
        refetchSummary();
        refetchTransactions();
      }
    }, [employeeId, tenantCode])
  );

  const { refetch: refetchSummary } = useGetRequest<any[]>({
    url: 'EWA_allowed_withdrawl/search',
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (data) => {
      if (Array.isArray(data) && data.length > 0 && hasDataObject(data[0])) {
        setEwaSummary(data[0] as Record<string, any>);
      } else {
        setEwaSummary(null);
      }
    },
    onError: () => setEwaSummary(null),
  });

  const { refetch: refetchTransactions } = useGetRequest<any[]>({
    url: 'EWA_withdrawal_application/search',
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
      { field: 'createdOn', value: tenantCode, operator: 'desc' },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (data) => {
      if (!Array.isArray(data) || data.length === 0) { setTransactions([]); return; }
      const validItems = data.filter((item) => hasDataObject(item));
      if (validItems.length === 0) { setTransactions([]); return; }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const mapped = validItems
        .filter((item) => {
          const rawDate = item.createdOn ?? item.date ?? item.createdAt ?? item.applyDate;
          const d = new Date(String(rawDate ?? ''));
          if (Number.isNaN(d.getTime())) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .map((item, index) => ({
          id: String(item._id ?? item.id ?? `withdrawal-${index}`),
          reference: truncateReference(item._id ?? item.id ?? `Request ${index + 1}`),
          appliedDate: formatAppliedDate(item.createdOn ?? item.date ?? item.createdAt ?? item.applyDate),
          amount: formatCurrency(item.amount),
          numericAmount: parseNumericValue(item.amount),
          createdAt: String(item.createdOn ?? item.date ?? item.createdAt ?? item.applyDate ?? ''),
          workflowState: item.workflowState,
        }));

      setTransactions(mapped);
      setTransactionsVisibleCount(15);
    },
    onError: () => { setTransactions([]); setTransactionsVisibleCount(15); },
  });

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatA, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatB, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, [floatA, floatB]);

  const bubbleATranslateX = floatA.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] });
  const bubbleATranslateY = floatA.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  const bubbleBTranslateX = floatB.interpolate({ inputRange: [0, 1], outputRange: [10, -8] });
  const bubbleBTranslateY = floatB.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] });

  const availableBalance = useMemo(() => formatCurrency(ewaSummary?.available), [ewaSummary]);
  const limitBalance = useMemo(() => formatCurrency(ewaSummary?.limit), [ewaSummary]);
  const takenBalance = useMemo(
    () => formatCurrency(ewaSummary?.withdrawn ?? ewaSummary?.withdrawal ?? ewaSummary?.spent),
    [ewaSummary]
  );

  const recentWithdrawals = useMemo(
    () => transactions.filter((item) => normalizeWorkflowState(item.workflowState) === 'APPROVED').slice(0, 7),
    [transactions]
  );
  const maxWithdrawalAmount = useMemo(
    () => recentWithdrawals.reduce((max, item) => Math.max(max, item.numericAmount), 0),
    [recentWithdrawals]
  );
  const chartMax = maxWithdrawalAmount > 0 ? maxWithdrawalAmount : 1;
  const amountTicks = useMemo(
    () => [chartMax, chartMax * 0.66, chartMax * 0.33, 0].map((v) => formatAxisAmount(v)),
    [chartMax]
  );
  const raisedThisMonthCount = useMemo(() => {
    const now = new Date();
    return transactions.filter((item) => {
      const d = new Date(item.createdAt);
      const state = normalizeWorkflowState(item.workflowState);
      return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && state === 'APPROVED';
    }).length;
  }, [transactions]);

  const handleMainScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 120 && transactionsVisibleCount < transactions.length) {
      setTransactionsVisibleCount((prev) => Math.min(prev + 15, transactions.length));
    }
  };

  return (
    <View style={styles.screen}>
      {selectedTransaction ? (
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
            balanceValue={availableBalance}
            employeeLabel="Employee ID"
            employeeValue={employeeId || '-'}
            reasonLabel="Applied Date"
            reasonValue={selectedTransaction.appliedDate}
            workflowState={selectedTransaction.workflowState}
            buttonLabel="Back to Launchpad"
            onPressButton={() => setSelectedTransaction(null)}
          />
        </View>
      ) : (
        <>
          <View style={styles.top}>
            <View style={styles.topRow}>
              <Text style={styles.greeting}>Earned Wage Access</Text>
              <View style={styles.topIcons}>
                <Ionicons name="notifications-outline" size={18} color="#fff" />
                <Ionicons name="settings-outline" size={18} color="#fff" />
              </View>
            </View>

            <View style={styles.heroCard}>
              <Animated.View
                pointerEvents="none"
                style={[styles.glowLarge, { transform: [{ translateX: bubbleATranslateX }, { translateY: bubbleATranslateY }] }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.glowSmall, { transform: [{ translateX: bubbleBTranslateX }, { translateY: bubbleBTranslateY }] }]}
              />
              <View style={styles.heroContent}>
                <Text style={styles.brand}>Available Balance</Text>
                <Text style={styles.balance}>{availableBalance}</Text>
                <Text style={styles.balanceMeta}>Limit {limitBalance}</Text>
                <Text style={styles.date}>{todayDate}</Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleMainScroll}
            scrollEventThrottle={16}>

            <View style={styles.actions}>
              <Pressable style={styles.actionItem} onPress={() => router.push('../information')}>
                <View style={[styles.iconWrap, styles.iconPrimary]}>
                  <Ionicons name="document-text-outline" size={16} color="#1d4ed8" />
                </View>
                <Text style={styles.actionLabel}>Request</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={() => router.push('../attendance')}>
                <View style={styles.iconWrap}>
                  <Ionicons name="calendar-outline" size={15} color="#334155" />
                </View>
                <Text style={styles.actionLabel}>Attendance</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={() => router.push('../bank-details')}>
                <View style={styles.iconWrap}>
                  <Ionicons name="card-outline" size={15} color="#334155" />
                </View>
                <Text style={styles.actionLabel}>Bank</Text>
              </Pressable>
              <Link href="../claim-rules" style={styles.infoLink}>
                Open Information
              </Link>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>Amount Withdrawn</Text>
                <Text style={styles.panelLink}>{`Approved requests: ${raisedThisMonthCount}`}</Text>
              </View>
              <View style={styles.spentRow}>
                <View style={styles.spentLeftWrap}>
                  <Text style={styles.spentValue} numberOfLines={1}>{takenBalance}</Text>
                </View>
              </View>

              <View style={styles.withdrawChart}>
                <View style={styles.withdrawChartBody}>
                  {recentWithdrawals.length > 0 ? (
                    <>
                      <View style={styles.amountAxis}>
                        {amountTicks.map((tick, index) => (
                          <Text key={`tick-${tick}-${index}`} style={styles.amountAxisLabel}>{tick}</Text>
                        ))}
                      </View>
                      <ScrollView
                        ref={barScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.barAreaContent}
                        style={styles.barAreaScroll}
                        onContentSizeChange={() => barScrollRef.current?.scrollToEnd({ animated: false })}>
                        {recentWithdrawals.map((item) => {
                          const heightRatio = chartMax > 0 ? item.numericAmount / chartMax : 0;
                          return (
                            <Pressable key={item.id} style={styles.barColumn} onPress={() => setSelectedTransaction(item)}>
                              <View style={styles.barTrack}>
                                <View style={[styles.barFill, { height: `${Math.max(heightRatio * 100, 6)}%` }]} />
                              </View>
                              <Text style={styles.dateLabel} numberOfLines={1} ellipsizeMode="tail">
                                {formatChartDate(item.createdAt)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </>
                  ) : (
                    <View style={styles.emptyChart}>
                      <Text style={styles.emptyChartText}>No recent withdrawals to plot.</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>TRANSACTIONS</Text>
                <Pressable onPress={() => router.push('../all-transactions')}>
                  <Text style={styles.panelLink}>{`All requests: ${transactions.length}`}</Text>
                </Pressable>
              </View>
              {transactions.length > 0 ? (
                transactions.slice(0, transactionsVisibleCount).map((item) => {
                  const state = normalizeWorkflowState(item.workflowState);
                  const label = state || 'PENDING';
                  const isApproved = state === 'APPROVED';
                  const isRejected = state === 'REJECTED';
                  const isCancelled = state === 'CANCELLED';
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
                <Text style={styles.emptyStateText}>No withdrawal requests found.</Text>
              )}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a1c63' },
  statusScreen: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 58, paddingBottom: 24 },
  top: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 18, backgroundColor: '#0a1c63' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '700' },
  topIcons: { flexDirection: 'row', gap: 14 },
  heroCard: { borderRadius: 18, minHeight: 140, padding: 16, backgroundColor: '#dbeafe', borderWidth: 1.5, borderColor: '#1d4ed8', overflow: 'hidden' },
  heroContent: { flex: 1, justifyContent: 'space-between', zIndex: 2 },
  glowLarge: { position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -26, bottom: -46, backgroundColor: 'rgba(37, 99, 235, 0.28)', borderWidth: 6, borderColor: 'rgba(29, 78, 216, 0.45)' },
  glowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -38, top: -54, backgroundColor: 'rgba(59, 130, 246, 0.18)' },
  brand: { fontSize: 16, fontWeight: '700', color: '#1e40af' },
  balance: { fontSize: 30, fontWeight: '800', color: '#001b4a', alignSelf: 'flex-end' },
  balanceMeta: { fontSize: 12, color: '#475569', alignSelf: 'flex-end' },
  date: { fontSize: 11, color: '#334155', alignSelf: 'flex-end' },
  sheet: { flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 92, gap: 12 },
  actions: { backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionItem: { alignItems: 'center', gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconPrimary: { backgroundColor: '#dbeafe' },
  actionLabel: { fontSize: 11, color: '#334155' },
  infoLink: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelKicker: { fontSize: 10, letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' },
  panelLink: { fontSize: 12, color: '#64748b' },
  spentRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  spentLeftWrap: { flex: 1, paddingTop: 2 },
  spentValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: 0.2, flexShrink: 1 },
  withdrawChart: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 8 },
  withdrawChartBody: { flexDirection: 'row', minHeight: 140, alignItems: 'flex-end', gap: 8 },
  amountAxis: { width: 34, height: 120, justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 18 },
  amountAxisLabel: { fontSize: 9, color: '#64748b', fontWeight: '600' },
  barAreaScroll: { flex: 1 },
  barAreaContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingRight: 2 },
  barColumn: { width: 42, alignItems: 'center', gap: 0 },
  barTrack: { width: '100%', maxWidth: 28, height: 110, backgroundColor: '#e2e8f0', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#2563eb', borderRadius: 8 },
  dateLabel: { fontSize: 9, color: '#475569', fontWeight: '600', marginTop: 2 },
  emptyChart: { flex: 1, height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyChartText: { fontSize: 11, color: '#64748b' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  txMeta: { flex: 1 },
  txName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  txSub: { fontSize: 12, color: '#64748b' },
  txSubRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  txStatusBadge: { borderRadius: 999, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 1 },
  txStatusApproved: { backgroundColor: '#dbeafe' },
  txStatusRejected: { backgroundColor: '#fee2e2' },
  txStatusCancelled: { backgroundColor: '#e5e7eb' },
  txStatusFailed: { backgroundColor: '#ffedd5' },
  txStatusUnknown: { backgroundColor: '#e5e7eb' },
  txStatusText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  txStatusTextApproved: { color: '#15803d' },
  txStatusTextRejected: { color: '#b91c1c' },
  txStatusTextCancelled: { color: '#374155' },
  txStatusTextFailed: { color: '#c2410c' },
  txStatusTextUnknown: { color: '#475569' },
  txAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  emptyStateText: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingVertical: 10 },
});
