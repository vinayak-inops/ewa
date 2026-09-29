import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';

export default function MainLaunchpadScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#f4f5f7]">
      <StatusBar barStyle="dark-content" backgroundColor="#f4f5f7" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 58, paddingBottom: 96, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-0.5 text-xl font-bold text-[#0f172a]">Applications</Text>

        {/* EWA Card */}
        <Pressable
          className="rounded-2xl overflow-hidden p-3 bg-[#4c008f] min-h-[104px]"
          style={({ pressed }) => pressed ? { transform: [{ scale: 0.99 }] } : undefined}
          onPress={() => router.push('/(tabs-lite)/ewa' as any)}
        >
          <View className="absolute w-[140px] h-[140px] rounded-full -right-6 -top-[84px] bg-[#9d14d9]" />
          <View className="absolute w-[160px] h-[120px] rounded-[60px] -right-[18px] -bottom-[76px] bg-[#3b0077]" />

          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold leading-[21px] text-white">EWA</Text>
              <Text className="text-xs font-semibold leading-[17px] mt-[3px] text-[#e9d5ff]">
                Earned wage access, withdrawals, balance, and requests
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full items-center justify-center bg-green-600">
              <Ionicons name="wallet-outline" size={23} color="#ffffff" />
            </View>
          </View>

          <View className="mt-auto pt-3 flex-row items-center justify-center gap-0.5">
            <Text className="text-xs font-bold text-white">Open EWA</Text>
            <Ionicons name="chevron-forward" size={13} color="#ffffff" />
          </View>
        </Pressable>

        {/* Applications Card */}
        <Pressable
          className="rounded-2xl overflow-hidden p-3 bg-[#1f2937] min-h-[104px]"
          style={({ pressed }) => pressed ? { transform: [{ scale: 0.99 }] } : undefined}
          onPress={() => router.push('/(tabs-lite)/applications' as any)}
        >
          <View className="absolute w-[140px] h-[140px] rounded-full -right-6 -top-[84px] bg-[#374151]" />
          <View className="absolute w-[160px] h-[120px] rounded-[60px] -right-[18px] -bottom-[76px] bg-[#111827]" />

          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold leading-[21px] text-white">Applications</Text>
              <Text className="text-xs font-semibold leading-[17px] mt-0.5 text-[#b7c0cb]">
                Leave, shift, OT, punch and more services
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full items-center justify-center bg-amber-400 border-[3px] border-amber-300">
              <Ionicons name="apps-outline" size={23} color="#ffffff" />
            </View>
          </View>

          <View className="mt-auto pt-3 flex-row items-center justify-center gap-0.5">
            <Text className="text-xs font-bold text-white">View Applications</Text>
            <Ionicons name="chevron-forward" size={13} color="#ffffff" />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
