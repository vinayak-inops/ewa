import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const F = 'Inter';

interface EmptyStateProps {
  onOpen: () => void;
}

export function EmptyState({ onOpen }: EmptyStateProps) {
  return (
    <View style={s.container}>
      <View style={s.inner}>
        <Ionicons name="business-outline" size={64} color="#d1d5db" style={s.icon} />
        <Text style={s.title}>View Tables</Text>
        <Text style={s.body}>
          Tap the{' '}
          <Text style={s.bold}>"Select Tables"</Text>
          {' '}button to open the table viewer
        </Text>
        <Pressable
          style={({ pressed }) => [s.btn, pressed && { opacity: 0.88 }]}
          onPress={onOpen}>
          <Ionicons name="filter-outline" size={16} color="#ffffff" />
          <Text style={s.btnTxt}>Open Table Viewer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  inner: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontFamily: F,
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  body: {
    fontFamily: F,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 260,
  },
  bold: {
    fontWeight: '600',
    color: '#374151',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  btnTxt: {
    fontFamily: F,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
