import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const APP_FONT_FAMILY = 'Inter';

const rules = [
  'Complete at least 7 working days in the current wage cycle.',
  'Minimum net earned amount should be Rs. 500 before raising a claim.',
  'Maximum claim per request is up to 50% of earned wages.',
  'One claim is allowed per day, up to 4 claims per month.',
  'No pending compliance issues or attendance mismatch should exist.',
  'Bank account details must be active and verified.',
  'Approved claims are usually settled within 24 working hours.',
];

export default function ClaimRulesScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Text style={styles.title}>Earned Wage Access</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Before You Claim</Text>
          <Text style={styles.summaryText}>
            Check these rules before submitting your earned wage claim request.
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Eligibility Rules</Text>
          <Text style={styles.sectionMeta}>{rules.length} checks</Text>
        </View>

        <View style={styles.card}>
          {rules.map((rule, index) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{index + 1}</Text>
              </View>
              <View style={styles.ruleBody}>
                <Text style={styles.ruleTitle}>Rule {index + 1}</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color="#1d4ed8" />
          <Text style={styles.noteText}>
            Claims are subject to company policy and approval checks based on attendance and payroll status.
          </Text>
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
  header: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  topIcons: {
    flexDirection: 'row',
    gap: 14,
  },
  title: {
    fontFamily: APP_FONT_FAMILY,
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    fontFamily: APP_FONT_FAMILY,
    color: '#dbeafe',
    fontSize: 11,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sheetContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 120,
  },
  summaryCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  summaryText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 2,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionMeta: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  badgeText: {
    fontFamily: APP_FONT_FAMILY,
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '800',
  },
  ruleBody: {
    flex: 1,
  },
  ruleTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 2,
  },
  ruleText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 19,
    color: '#0f172a',
  },
  noteCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  noteText: {
    fontFamily: APP_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#1e3a8a',
  },
  ctaButton: {
    marginTop: 6,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  ctaText: {
    fontFamily: APP_FONT_FAMILY,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

