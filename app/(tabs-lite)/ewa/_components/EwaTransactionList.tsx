import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { normalizeWorkflowState, type WithdrawalTransaction } from '../_utils/ewa-formatters';

type Props = {
  transactions: WithdrawalTransaction[];
  visibleCount: number;
  onSelectTransaction: (item: WithdrawalTransaction) => void;
};

export function EwaTransactionList({ transactions, visibleCount, onSelectTransaction }: Props) {
  const router = useRouter();

  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelKicker}>TRANSACTIONS</Text>
        <Pressable onPress={() => router.push('../all-transactions')}>
          <Text style={styles.panelLink}>{`All requests: ${transactions.length}`}</Text>
        </Pressable>
      </View>
      {transactions.length > 0 ? (
        transactions.slice(0, visibleCount).map((item) => {
          const state = normalizeWorkflowState(item.workflowState);
          const label = state || 'PENDING';
          const isApproved = state === 'APPROVED';
          const isRejected = state === 'REJECTED';
          const isCancelled = state === 'CANCELLED';
          const isFailed = state === 'FAILED';
          return (
            <Pressable key={item.id} style={styles.txRow} onPress={() => onSelectTransaction(item)}>
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
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelKicker: { fontSize: 10, letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' },
  panelLink: { fontSize: 12, color: '#64748b' },
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
