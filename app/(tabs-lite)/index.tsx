import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const transactions = [
  { id: 'tx-1', initials: 'RK', name: 'Ricardo Kim', type: 'Sending', amount: '200.00 USD' },
  { id: 'tx-2', initials: 'AN', name: 'Ava Nelson', type: 'Received', amount: '120.00 USD' },
  { id: 'tx-3', initials: 'MS', name: 'Maya Singh', type: 'Payment', amount: '48.50 USD' },
  { id: 'tx-4', initials: 'DT', name: 'Daniel Thomas', type: 'Refund', amount: '32.00 USD' },
  { id: 'tx-5', initials: 'PL', name: 'Priya Lal', type: 'Sending', amount: '410.00 USD' },
  { id: 'tx-6', initials: 'JH', name: 'Jason Hall', type: 'Received', amount: '89.99 USD' },
  { id: 'tx-7', initials: 'EO', name: 'Emma Ortiz', type: 'Transfer', amount: '64.20 USD' },
  { id: 'tx-8', initials: 'BK', name: 'Brian King', type: 'Payment', amount: '15.75 USD' },
];

export default function LiteLaunchpadScreen() {
  const router = useRouter();
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const todayDate = new Date().toLocaleDateString('en-US');

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

  return (
    <View style={styles.screen}>
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
            <Text style={styles.balance}>Rs. 56813,20</Text>
            <Text style={styles.balanceMeta}>Owning Rs. 5852,20</Text>
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
            <Text style={styles.spentValue}>$40</Text>
            <Text style={styles.spentRight}>$40</Text>
          </View>
          <Text style={styles.onTrack}>On Track</Text>
          <View style={styles.chart}>
            <View style={styles.chartPath}>
              <View style={styles.segA} />
              <View style={styles.segB} />
              <View style={styles.segC} />
              <View style={styles.segD} />
            </View>
            <View style={styles.axisRow}>
              <Text style={styles.axisLabel}>1</Text>
              <Text style={styles.axisLabel}>5</Text>
              <Text style={styles.axisLabel}>10</Text>
              <Text style={styles.axisLabel}>15</Text>
              <Text style={styles.axisLabel}>20</Text>
              <Text style={styles.axisLabel}>25</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>TRANSACTIONS</Text>
            <Text style={styles.panelLink}>See All</Text>
          </View>
          {transactions.map((item) => (
            <View key={item.id} style={styles.txRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.txMeta}>
                <Text style={styles.txName}>{item.name}</Text>
                <Text style={styles.txSub}>{item.type}</Text>
              </View>
              <Text style={styles.txAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a1c63',
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
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
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
