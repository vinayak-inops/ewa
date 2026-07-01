import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedSuccessState } from '@/components/ui/animated-success-state';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

import { EwaActionsBar } from './_components/EwaActionsBar';
import { EwaHeroCard } from './_components/EwaHeroCard';
import { EwaSyncGate } from './_components/EwaSyncGate';
import { EwaTransactionList } from './_components/EwaTransactionList';
import { EwaWithdrawalChart } from './_components/EwaWithdrawalChart';
import {
  decodeJwtPayload,
  formatAppliedDate,
  formatCurrency,
  hasDataObject,
  parseNumericValue,
  truncateReference,
  type WithdrawalTransaction,
} from './_utils/ewa-formatters';

export default function EwaScreen() {
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

  const availableBalance = useMemo(() => formatCurrency(ewaSummary?.available), [ewaSummary]);
  const limitBalance = useMemo(() => formatCurrency(ewaSummary?.limit), [ewaSummary]);
  const takenBalance = useMemo(
    () => formatCurrency(ewaSummary?.withdrawn ?? ewaSummary?.withdrawal ?? ewaSummary?.spent),
    [ewaSummary]
  );

  const handleMainScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 120 && transactionsVisibleCount < transactions.length) {
      setTransactionsVisibleCount((prev) => Math.min(prev + 15, transactions.length));
    }
  };

  return (
    <EwaSyncGate>
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
            <EwaHeroCard
              availableBalance={availableBalance}
              limitBalance={limitBalance}
              todayDate={todayDate}
            />
          </View>

          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleMainScroll}
            scrollEventThrottle={16}>
            <EwaActionsBar />
            <EwaWithdrawalChart
              transactions={transactions}
              takenBalance={takenBalance}
              onSelectTransaction={setSelectedTransaction}
            />
            <EwaTransactionList
              transactions={transactions}
              visibleCount={transactionsVisibleCount}
              onSelectTransaction={setSelectedTransaction}
            />
          </ScrollView>
        </>
      )}
    </View>
    </EwaSyncGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a1c63' },
  statusScreen: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 58, paddingBottom: 24 },
  top: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 18, backgroundColor: '#0a1c63' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '700' },
  topIcons: { flexDirection: 'row', gap: 14 },
  sheet: { flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 92, gap: 12 },
});
