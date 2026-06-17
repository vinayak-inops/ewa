// Path: app/(tabs-lite)/applications/leave-application/components/ApplicationSummaryCards.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const APP_FONT_FAMILY = 'Inter';

interface SummaryCardsProps {
  data: Array<{ status?: string; workflowState?: string }>;
  countsOverride?: {
    total: number;
    approved: number;
    rejected: number;
    cancelled: number;
    pending: number;
  };
}

type CardItemProps = {
  title: string;
  value: number;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  cardBg: string;
  cardBorder: string;
  accentBg: string;
};

function CardItem({ title, value, iconName, iconColor, cardBg, cardBorder, accentBg }: CardItemProps) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.cardInner}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardValue}>{value}</Text>
        </View>
        <View style={[styles.iconCircle, { backgroundColor: accentBg }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

export default function ApplicationSummaryCards({ data, countsOverride }: SummaryCardsProps) {
  const counts = useMemo(() => {
    if (countsOverride) return countsOverride;

    const norm = (s?: string) => (s || '').toString().toUpperCase();
    const total = data.length;
    let approved = 0, rejected = 0, cancelled = 0, pending = 0;

    for (const row of data) {
      const s = norm(row.status || row.workflowState);
      if (s === 'APPROVED') approved++;
      else if (s === 'REJECTED') rejected++;
      else if (s === 'CANCELLED' || s === 'CANCEL') cancelled++;
      else pending++;
    }

    return { total, approved, rejected, cancelled, pending };
  }, [data, countsOverride]);

  return (
    <View style={styles.grid}>
      {/* Row 1: Total (full width) */}
      <CardItem
        title="Total Applications"
        value={counts.total}
        iconName="list-outline"
        iconColor="#374151"
        cardBg="#ffffff"
        cardBorder="#e5e7eb"
        accentBg="#f3f4f6"
      />

      {/* Row 2: Approved + Rejected */}
      <View style={styles.row}>
        <View style={styles.halfCard}>
          <CardItem
            title="Approved"
            value={counts.approved}
            iconName="checkmark-circle-outline"
            iconColor="#16a34a"
            cardBg="#f0fdf4"
            cardBorder="#dcfce7"
            accentBg="#dcfce7"
          />
        </View>
        <View style={styles.halfCard}>
          <CardItem
            title="Rejected"
            value={counts.rejected}
            iconName="close-circle-outline"
            iconColor="#dc2626"
            cardBg="#fef2f2"
            cardBorder="#fee2e2"
            accentBg="#fee2e2"
          />
        </View>
      </View>

      {/* Row 3: Cancelled + Pending */}
      <View style={styles.row}>
        <View style={styles.halfCard}>
          <CardItem
            title="Cancelled"
            value={counts.cancelled}
            iconName="close-circle-outline"
            iconColor="#374151"
            cardBg="#f9fafb"
            cardBorder="#e5e7eb"
            accentBg="#e5e7eb"
          />
        </View>
        <View style={styles.halfCard}>
          <CardItem
            title="Pending"
            value={counts.pending}
            iconName="time-outline"
            iconColor="#2563eb"
            cardBg="#eff6ff"
            cardBorder="#dbeafe"
            accentBg="#dbeafe"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCard: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  cardValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});