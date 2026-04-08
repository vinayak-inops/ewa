import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedSuccessState } from '@/components/ui/animated-success-state';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

type WithdrawalTransaction = {
  id: string;
  reference: string;
  appliedDate: string;
  amount: string;
};

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

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function LiteLaunchpadScreen() {
  const router = useRouter();
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const todayDate = new Date().toLocaleDateString('en-IN');
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [ewaSummary, setEwaSummary] = useState<Record<string, any> | null>(null);
  const [transactions, setTransactions] = useState<WithdrawalTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<WithdrawalTransaction | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;

      const payload = decodeJwtPayload(token);
      if (!payload) return;

      const resolvedEmployeeId =
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') ||
        '';
      const resolvedTenantCode =
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '';

      setEmployeeId(resolvedEmployeeId);
      setTenantCode(resolvedTenantCode);
    };

    void run();
  }, []);

  useGetRequest<any[]>({
    url: 'EWA_allowed_withdrawl/search',
    method: 'POST',
    data: [
      {
        field: 'employeeID',
        value: employeeId,
        operator: 'eq',
      },
      {
        field: 'tenantCode',
        value: tenantCode,
        operator: 'eq',
      },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (data) => {
      if (__DEV__) {
        console.log('[launchpad] fetched EWA summary', data);
      }
      if (Array.isArray(data) && data.length > 0) {
        setEwaSummary(data[0]);
      } else {
        setEwaSummary(null);
      }
    },
    onError: () => {
      setEwaSummary(null);
    },
  });

  useGetRequest<any[]>({
    url: 'EWA_withdrawl_request/search',
    method: 'POST',
    data: [
      {
        field: 'employeeID',
        value: employeeId,
        operator: 'eq',
      },
      {
        field: 'tenantCode',
        value: tenantCode,
        operator: 'eq',
      },
      {
        field: 'createdOn',
        value: tenantCode,
        operator: 'desc',
      },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        setTransactions([]);
        return;
      }

      const mappedTransactions = data.map((item, index) => ({
        id: String(item._id ?? item.id ?? `withdrawal-${index}`),
        reference: truncateReference(item._id ?? item.id ?? `Request ${index + 1}`),
        appliedDate: formatAppliedDate(item.date ?? item.createdAt ?? item.applyDate),
        amount: formatCurrency(item.amount),
      }));

      setTransactions(mappedTransactions);
    },
    onError: () => {
      setTransactions([]);
    },
  });

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatA, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatB, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loopA.start();
    loopB.start();

    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [floatA, floatB]);

  const bubbleATranslateX = floatA.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] });
  const bubbleATranslateY = floatA.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  const bubbleBTranslateX = floatB.interpolate({ inputRange: [0, 1], outputRange: [10, -8] });
  const bubbleBTranslateY = floatB.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] });

  const limitAmount = useMemo(() => parseNumericValue(ewaSummary?.limit), [ewaSummary]);
  const availableAmount = useMemo(() => parseNumericValue(ewaSummary?.available), [ewaSummary]);
  const takenAmount = useMemo(() => Math.max(limitAmount - availableAmount, 0), [limitAmount, availableAmount]);
  const availableBalance = useMemo(() => formatCurrency(ewaSummary?.available), [ewaSummary]);
  const limitBalance = useMemo(() => formatCurrency(ewaSummary?.limit), [ewaSummary]);
  const takenBalance = useMemo(() => formatCurrency(takenAmount), [takenAmount]);
  const usageRatio = limitAmount > 0 ? Math.min(takenAmount / limitAmount, 1) : 0;
  const graphTop = 30 - usageRatio * 20;
  const segAWidth = 42;
  const segBHeight = Math.max(usageRatio * 20, 2);
  const segCWidth = 44 + usageRatio * 18;
  const segDWidth = 74 + usageRatio * 22;
  const graphMarkerLeft = segAWidth + 4 + segCWidth + segDWidth - 4;
  const trackStatus = takenAmount <= limitAmount ? 'On Track' : 'Above Limit';
  const trackColor = takenAmount <= limitAmount ? '#3b82f6' : '#b91c1c';
  const axisLabels = useMemo(() => {
    const stepCount = 5;
    const safeLimit = Math.max(limitAmount, 0);

    return Array.from({ length: stepCount + 1 }, (_, index) => {
      const value = safeLimit === 0 ? 0 : (safeLimit / stepCount) * index;
      return formatAxisAmount(value);
    });
  }, [limitAmount]);

  return (
    <View style={styles.screen}>
      {selectedTransaction ? (
        <View style={styles.statusScreen}>
          <AnimatedSuccessState
            title="Request Status"
            message="This is the saved withdrawal request status for your selected transaction."
            referenceLabel="Request ID"
            referenceValue={selectedTransaction.reference}
            amountLabel="Amount"
            amountValue={selectedTransaction.amount}
            balanceLabel="Available Balance"
            balanceValue={availableBalance}
            employeeLabel="Employee ID"
            employeeValue={employeeId || '-'}
            reasonLabel="Applied Date"
            reasonValue={selectedTransaction.appliedDate}
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
                style={[
                  styles.glowLarge,
                  { transform: [{ translateX: bubbleATranslateX }, { translateY: bubbleATranslateY }] },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.glowSmall,
                  { transform: [{ translateX: bubbleBTranslateX }, { translateY: bubbleBTranslateY }] },
                ]}
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
            showsVerticalScrollIndicator={false}>
            <View style={styles.actions}>
              <Pressable style={styles.actionItem} onPress={() => router.push('./information')}>
                <View style={[styles.iconWrap, styles.iconPrimary]}>
                  <Ionicons name="document-text-outline" size={16} color="#1d4ed8" />
                </View>
                <Text style={styles.actionLabel}>Request</Text>
              </Pressable>
              <View style={styles.actionItem}>
                <View style={styles.iconWrap}>
                  <Ionicons name="calendar-outline" size={15} color="#334155" />
                </View>
                <Text style={styles.actionLabel}>Attendance</Text>
              </View>
              <Pressable style={styles.actionItem} onPress={() => router.push('./bank-details')}>
                <View style={styles.iconWrap}>
                  <Ionicons name="card-outline" size={15} color="#334155" />
                </View>
                <Text style={styles.actionLabel}>Bank</Text>
              </Pressable>
              <Link href="./claim-rules" style={styles.infoLink}>
                Open Information
              </Link>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>SPENT THIS MONTH</Text>
                <Text style={styles.panelLink}>See Details</Text>
              </View>
              <View style={styles.spentRow}>
                <Text style={styles.spentValue}>{takenBalance}</Text>
                <Text style={styles.spentRight}>Limit {limitBalance}</Text>
              </View>
              <Text style={[styles.onTrack, { color: trackColor }]}>{trackStatus}</Text>
                <View style={styles.chart}>
                  <View style={styles.chartPath}>
                    <View style={[styles.segA, { width: segAWidth }]} />
                    <View style={[styles.segB, { left: segAWidth + 4, top: graphTop, height: segBHeight }]} />
                    <View style={[styles.segC, { left: segAWidth + 4, top: graphTop, width: segCWidth }]} />
                    <View style={[styles.segD, { left: segAWidth + 4 + segCWidth, top: graphTop, width: segDWidth }]} />
                    <View style={[styles.graphMarker, { left: graphMarkerLeft, top: graphTop - 3 }]} />
                    <View style={[styles.graphAmountTag, { left: Math.max(graphMarkerLeft - 26, 0), top: graphTop - 28 }]}>
                      <Text style={styles.graphAmountText}>{takenBalance}</Text>
                    </View>
                  </View>
                  <View style={styles.axisRow}>
                    {axisLabels.map((label, index) => (
                    <Text key={`${label}-${index}`} style={styles.axisLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>TRANSACTIONS</Text>
                <Text style={styles.panelLink}>See All</Text>
              </View>
              {transactions.length > 0 ? (
                transactions.map((item) => (
                  <Pressable key={item.id} style={styles.txRow} onPress={() => setSelectedTransaction(item)}>
                    <View style={styles.avatar}>
                      <Ionicons name="document-text-outline" size={16} color="#334155" />
                    </View>
                    <View style={styles.txMeta}>
                      <Text style={styles.txName}>{item.reference}</Text>
                      <Text style={styles.txSub}>{item.appliedDate}</Text>
                    </View>
                    <Text style={styles.txAmount}>{item.amount}</Text>
                  </Pressable>
                ))
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
  screen: {
    flex: 1,
    backgroundColor: '#0a1c63',
  },
  statusScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingTop: 58,
    paddingBottom: 24,
  },
  top: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 18,
    backgroundColor: '#0a1c63',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greeting: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  topIcons: {
    flexDirection: 'row',
    gap: 14,
  },
  heroCard: {
    borderRadius: 18,
    minHeight: 140,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderWidth: 1.5,
    borderColor: '#1d4ed8',
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  glowLarge: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -26,
    bottom: -46,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
    borderWidth: 6,
    borderColor: 'rgba(29, 78, 216, 0.45)',
  },
  glowSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -38,
    top: -54,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  balance: {
    fontSize: 30,
    fontWeight: '800',
    color: '#001b4a',
    alignSelf: 'flex-end',
  },
  balanceMeta: {
    fontSize: 12,
    color: '#475569',
    alignSelf: 'flex-end',
  },
  date: {
    fontSize: 11,
    color: '#334155',
    alignSelf: 'flex-end',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 92,
    gap: 12,
  },
  actions: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPrimary: {
    backgroundColor: '#dbeafe',
  },
  actionLabel: {
    fontSize: 11,
    color: '#334155',
  },
  infoLink: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 10,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelKicker: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  panelLink: {
    fontSize: 12,
    color: '#64748b',
  },
  spentValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  spentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  spentRight: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  onTrack: {
    marginTop: -2,
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  chart: {
    height: 72,
    marginTop: 2,
    justifyContent: 'space-between',
  },
  chartPath: {
    height: 44,
    position: 'relative',
  },
  segA: {
    position: 'absolute',
    left: 4,
    top: 30,
    width: 52,
    height: 2,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  segB: {
    position: 'absolute',
    left: 56,
    top: 10,
    width: 2,
    height: 22,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  segC: {
    position: 'absolute',
    left: 56,
    top: 10,
    width: 56,
    height: 2,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  segD: {
    position: 'absolute',
    left: 112,
    top: 10,
    width: 88,
    height: 2,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  graphMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
  },
  graphAmountTag: {
    position: 'absolute',
    minWidth: 56,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  graphAmountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4338ca',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  axisLabel: {
    fontSize: 9,
    color: '#a3a3a3',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txMeta: {
    flex: 1,
  },
  txName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  txSub: {
    fontSize: 12,
    color: '#64748b',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
});
