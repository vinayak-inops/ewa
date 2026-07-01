import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatAxisAmount, formatChartDate, normalizeWorkflowState, type WithdrawalTransaction } from '../_utils/ewa-formatters';

type Props = {
  transactions: WithdrawalTransaction[];
  takenBalance: string;
  onSelectTransaction: (item: WithdrawalTransaction) => void;
};

export function EwaWithdrawalChart({ transactions, takenBalance, onSelectTransaction }: Props) {
  const barScrollRef = useRef<ScrollView>(null);

  const recentWithdrawals = transactions
    .filter((item) => normalizeWorkflowState(item.workflowState) === 'APPROVED')
    .slice(0, 7);

  const maxWithdrawalAmount = recentWithdrawals.reduce((max, item) => Math.max(max, item.numericAmount), 0);
  const chartMax = maxWithdrawalAmount > 0 ? maxWithdrawalAmount : 1;
  const amountTicks = [chartMax, chartMax * 0.66, chartMax * 0.33, 0].map((v) => formatAxisAmount(v));

  const raisedThisMonthCount = (() => {
    const now = new Date();
    return transactions.filter((item) => {
      const d = new Date(item.createdAt);
      const state = normalizeWorkflowState(item.workflowState);
      return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && state === 'APPROVED';
    }).length;
  })();

  return (
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
                    <Pressable key={item.id} style={styles.barColumn} onPress={() => onSelectTransaction(item)}>
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
  );
}

const styles = StyleSheet.create({
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
});
