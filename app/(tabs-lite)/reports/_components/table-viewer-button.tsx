import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      className="flex-row items-center gap-[6px] bg-[#2563eb] py-[10px] px-4 rounded-[10px]"
      style={({ pressed }) => [
        { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
        pressed && { opacity: 0.88 },
      ]}
      onPress={onOpen}
    >
      <Ionicons name="document-text-outline" size={16} color="#ffffff" />
      <Text className="text-[14px] font-semibold text-white">Generate new reports</Text>
      {totalSelected > 0 && (
        <View className="bg-white rounded-lg min-w-[20px] h-5 items-center justify-center px-[5px]">
          <Text className="text-[11px] font-bold text-[#1d4ed8]">{totalSelected}</Text>
        </View>
      )}
    </Pressable>
  );

  if (variant === 'fixed') {
    return (
      <View className="absolute right-4 z-50" style={{ top: (insets.top || 0) + 12 }}>
        {inner}
      </View>
    );
  }

  return inner;
}
