import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

interface EmptyStateProps {
  onOpen: () => void;
}

export function EmptyState({ onOpen }: EmptyStateProps) {
  return (
    <View className="flex-1 p-6 items-center justify-center min-h-[400px]">
      <View className="items-center">
        <Ionicons name="business-outline" size={64} color="#d1d5db" style={{ marginBottom: 24 }} />
        <Text className="text-[18px] font-bold text-[#374151] mb-[10px]">View Tables</Text>
        <Text className="text-[13px] text-[#6b7280] text-center mb-5 leading-5 max-w-[260px]">
          Tap the{' '}
          <Text className="font-semibold text-[#374151]">"Select Tables"</Text>
          {' '}button to open the table viewer
        </Text>
        <Pressable
          className="flex-row items-center gap-2 bg-[#2563eb] rounded-[10px] px-[18px] py-[11px]"
          style={({ pressed }) => [
            { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 3 },
            pressed && { opacity: 0.88 },
          ]}
          onPress={onOpen}
        >
          <Ionicons name="filter-outline" size={16} color="#ffffff" />
          <Text className="text-[14px] font-bold text-white">Open Table Viewer</Text>
        </Pressable>
      </View>
    </View>
  );
}
