import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const F = 'Inter';

interface TableViewerButtonProps {
  totalSelected?: number;
  onOpen: () => void;
  variant?: 'fixed' | 'inline';
}

export function TableViewerButton({
  totalSelected = 0,
  onOpen,
  variant = 'fixed',
}: TableViewerButtonProps) {
  const insets = useSafeAreaInsets();

  const inner = (
    <Pressable
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.88 }]}
      onPress={onOpen}>
      <Ionicons name="document-text-outline" size={16} color="#ffffff" />
      <Text style={s.label}>Generate new reports</Text>
      {totalSelected > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{totalSelected}</Text>
        </View>
      )}
    </Pressable>
  );

  if (variant === 'fixed') {
    return (
      <View style={[s.fixed, { top: (insets.top || 0) + 12 }]}>
        {inner}
      </View>
    );
  }

  return inner;
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    fontFamily: F,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  badge: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: F,
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  fixed: {
    position: 'absolute',
    right: 16,
    zIndex: 50,
  },
});
