import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function EwaActionsBar() {
  const router = useRouter();

  return (
    <View style={styles.actions}>
      <Pressable style={styles.actionItem} onPress={() => router.push('../information')}>
        <View style={[styles.iconWrap, styles.iconPrimary]}>
          <Ionicons name="document-text-outline" size={16} color="#1d4ed8" />
        </View>
        <Text style={styles.actionLabel}>Request</Text>
      </Pressable>
      <Pressable style={styles.actionItem} onPress={() => router.push('../attendance')}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={15} color="#334155" />
        </View>
        <Text style={styles.actionLabel}>Attendance</Text>
      </Pressable>
      <Pressable style={styles.actionItem} onPress={() => router.push('../bank-details')}>
        <View style={styles.iconWrap}>
          <Ionicons name="card-outline" size={15} color="#334155" />
        </View>
        <Text style={styles.actionLabel}>Bank</Text>
      </Pressable>
      <Link href="../claim-rules" style={styles.infoLink}>
        Open Information
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionItem: { alignItems: 'center', gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconPrimary: { backgroundColor: '#dbeafe' },
  actionLabel: { fontSize: 11, color: '#334155' },
  infoLink: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
});
