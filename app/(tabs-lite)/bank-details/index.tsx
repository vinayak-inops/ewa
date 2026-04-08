import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type FieldRow = {
  label: string;
  value: string;
};

const identityFields: FieldRow[] = [
  { label: 'Aadhar Number', value: 'Not provided' },
  { label: 'ESI Number', value: 'Not provided' },
  { label: 'UAN Number', value: 'Not provided' },
  { label: 'PF Number', value: 'Not provided' },
];

const bankFields: FieldRow[] = [
  { label: 'Bank Name', value: 'Not provided' },
  { label: 'IFSC Code', value: 'Not provided' },
  { label: 'Branch Name', value: 'Not provided' },
  { label: 'Account Number', value: 'Not provided' },
];

function Field({ label, value }: FieldRow) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function BankDetailsScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text style={styles.greeting}>Bank Details</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
            <Ionicons name="settings-outline" size={18} color="#0f172a" />
          </View>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>Identity Information</Text>
            <Text style={styles.panelLink}>Read Only</Text>
          </View>
          <View style={styles.fieldGrid}>
            {identityFields.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>Bank Account Information</Text>
            <Text style={styles.panelLink}>Read Only</Text>
          </View>
          <View style={styles.fieldGrid}>
            {bankFields.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  top: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#f8fafc',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  greeting: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  topIcons: {
    flexDirection: 'row',
    gap: 14,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  fieldGrid: {
    gap: 2,
  },
  fieldWrap: {
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  fieldValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});

