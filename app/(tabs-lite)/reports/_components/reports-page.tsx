import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APP_FONT_FAMILY = 'Inter';

const COLORS = {
  bg: '#f5f3ff',
  ink: '#0f172a',
  muted: '#64748b',
  primary: '#7c3aed',
  primaryStrong: '#6d28d9',
  primaryDark: '#4c1d95',
  heroBg: '#ede9fe',
  heroBgLight: '#f5f3ff',
  white: '#ffffff',
  border: '#e2e8f0',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SUMMARY_ITEMS = [
  { label: 'Present Days', icon: 'checkmark-circle-outline' as const, color: '#16a34a', bg: '#dcfce7' },
  { label: 'Absent Days', icon: 'close-circle-outline' as const, color: '#dc2626', bg: '#fee2e2' },
  { label: 'Late In', icon: 'time-outline' as const, color: '#d97706', bg: '#fef3c7' },
  { label: 'OT Hours', icon: 'moon-outline' as const, color: '#7c3aed', bg: '#ede9fe' },
];

type Props = {
  id: string;
};

export default function ReportsPage({ id }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear] = useState(today.getFullYear());

  const monthTitle = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const navigateMonth = (dir: 'prev' | 'next') => {
    setSelectedMonth((prev) => {
      if (dir === 'next') return prev === 11 ? 0 : prev + 1;
      return prev === 0 ? 11 : prev - 1;
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#4c1d95" />

      {/* Header */}
      <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={COLORS.white} />
            </Pressable>
            <Text style={styles.title}>Reports</Text>
          </View>
          <View style={styles.topIcons}>
            <Pressable style={styles.iconButton} hitSlop={8}>
              <Ionicons name="download-outline" size={19} color={COLORS.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.headerCard}>
          <View style={styles.headerCardIcon}>
            <Ionicons name="person-outline" size={22} color={COLORS.white} />
          </View>
          <View style={styles.headerCardText}>
            <Text style={styles.headerCardKicker}>Employee Report</Text>
            <Text style={styles.headerCardTitle}>ID: {id}</Text>
            <Text style={styles.headerCardSub}>{monthTitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#c4b5fd" />
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <Pressable hitSlop={12} style={styles.navBtn} onPress={() => navigateMonth('prev')}>
            <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.monthNavTitle}>{monthTitle}</Text>
          <Pressable hitSlop={12} style={styles.navBtn} onPress={() => navigateMonth('next')}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </Pressable>
        </View>

        {/* Summary grid */}
        <View style={styles.summaryGrid}>
          {SUMMARY_ITEMS.map((item) => (
            <View key={item.label} style={[styles.summaryCard, { backgroundColor: item.bg }]}>
              <View style={[styles.summaryIconWrap, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={18} color={COLORS.white} />
              </View>
              <Text style={[styles.summaryValue, { color: item.color }]}>--</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Details card */}
        <View style={styles.detailCard}>
          <View style={styles.detailCardHead}>
            <View style={styles.detailAccentRow}>
              <View style={styles.detailAccent} />
              <Text style={styles.detailCardTitle}>Monthly Summary</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{monthTitle}</Text>
            </View>
          </View>

          {[
            { label: 'Employee ID', value: id },
            { label: 'Total Working Days', value: '--' },
            { label: 'Days Present', value: '--' },
            { label: 'Days Absent', value: '--' },
            { label: 'Total Hours Worked', value: '--' },
            { label: 'Overtime Hours', value: '--' },
            { label: 'Leave Balance', value: '--' },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.detailRow, i === arr.length - 1 && styles.detailRowLast]}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Empty state prompt */}
        <View style={styles.emptyCard}>
          <Ionicons name="bar-chart-outline" size={32} color="#c4b5fd" />
          <Text style={styles.emptyTitle}>No Report Data</Text>
          <Text style={styles.emptyBody}>Report data for employee {id} will appear here once available.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  top: {
    backgroundColor: '#4c1d95',
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    right: -40, top: -60, backgroundColor: '#6d28d9', opacity: 0.5,
  },
  blobB: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    right: 60, top: 10, backgroundColor: '#7c3aed', opacity: 0.25,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
  },
  title: { fontFamily: APP_FONT_FAMILY, color: COLORS.white, fontSize: 20, fontWeight: '700' },
  topIcons: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  headerCardIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerCardText: { flex: 1 },
  headerCardKicker: {
    fontFamily: APP_FONT_FAMILY, fontSize: 11, fontWeight: '700',
    color: '#c4b5fd', letterSpacing: 0.4, textTransform: 'uppercase',
  },
  headerCardTitle: {
    fontFamily: APP_FONT_FAMILY, fontSize: 14, fontWeight: '800',
    color: COLORS.white, marginTop: 2,
  },
  headerCardSub: { fontFamily: APP_FONT_FAMILY, fontSize: 11, color: '#c4b5fd', marginTop: 2 },
  sheet: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 96, gap: 12 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, borderRadius: 14, padding: 12,
    shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.heroBg,
    alignItems: 'center', justifyContent: 'center',
  },
  monthNavTitle: {
    fontFamily: APP_FONT_FAMILY, fontSize: 16, fontWeight: '800',
    color: COLORS.primaryDark,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    width: '47.5%', borderRadius: 14, padding: 14, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  summaryIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryValue: { fontFamily: APP_FONT_FAMILY, fontSize: 22, fontWeight: '800' },
  summaryLabel: {
    fontFamily: APP_FONT_FAMILY, fontSize: 11, fontWeight: '600',
    color: COLORS.muted,
  },
  detailCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  detailCardHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  detailAccentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.primary },
  detailCardTitle: {
    fontFamily: APP_FONT_FAMILY, fontSize: 13, fontWeight: '700', color: COLORS.ink,
  },
  badge: {
    backgroundColor: COLORS.heroBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: {
    fontFamily: APP_FONT_FAMILY, fontSize: 10, fontWeight: '700', color: COLORS.primaryStrong,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  detailRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  detailLabel: {
    fontFamily: APP_FONT_FAMILY, fontSize: 12, color: COLORS.muted, fontWeight: '500',
  },
  detailValue: {
    fontFamily: APP_FONT_FAMILY, fontSize: 13, color: COLORS.ink,
    fontWeight: '700', textAlign: 'right',
  },
  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 8,
    shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  emptyTitle: {
    fontFamily: APP_FONT_FAMILY, fontSize: 15, fontWeight: '700', color: COLORS.ink,
  },
  emptyBody: {
    fontFamily: APP_FONT_FAMILY, fontSize: 12, color: COLORS.muted,
    textAlign: 'center', lineHeight: 18,
  },
});
