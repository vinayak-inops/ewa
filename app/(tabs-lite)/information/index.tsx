import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LiteInformationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.phoneFrame}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text style={styles.greeting}>Afternoon</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
            <Ionicons name="settings-outline" size={18} color="#0f172a" />
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Cash</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1000</Text>
            <Ionicons name="diamond" size={11} color="#e9d5ff" />
          </View>
        </View>
        <Text style={styles.subtitle}>Redeem your points for cash value.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How much do you want to redeem?</Text>
          <Text style={styles.cardSub}>Enter the amount of Points you want to redeem below to see the cash value.</Text>

          <View style={styles.separator} />

          <Text style={styles.label}>No. of Points</Text>
          <View style={styles.inputWrap}>
            <TextInput
              placeholder="Enter points to withdraw"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              underlineColorAndroid="transparent"
            />
            <Text style={styles.maxText}>Max Points</Text>
          </View>
          <Text style={styles.rateText}>1 Point = Rs.0.5</Text>

          <Text style={styles.label}>Cash Equivalent</Text>
          <View style={styles.cashBox} />
        </View>

        <Text style={styles.note}>
          Cash value will be paid out to your bank account provided. Read our Terms & Conditions.
        </Text>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Redeem Points</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingTop: 58,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: '700',
  },
  topIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#13206b',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#475569',
  },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  cardSub: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 14,
  },
  label: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
  },
  inputWrap: {
    height: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
    paddingRight: 8,
  },
  maxText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
    minWidth: 64,
    textAlign: 'right',
  },
  rateText: {
    marginTop: 6,
    fontSize: 10,
    color: '#94a3b8',
  },
  cashBox: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  note: {
    marginTop: 20,
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 12,
  },
  button: {
    marginTop: 12,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#13206b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
