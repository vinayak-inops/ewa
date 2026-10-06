import { clearBiometricSession } from '@/hooks/auth/biometric-session';
import { bffLogout } from '@/hooks/auth/bff-session';
import { clearAuthTokens } from '@/hooks/auth/token-store';
import { AppDispatch } from '@/store';
import { clearRole } from '@/store/slices/roleSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

// const INFO_ITEMS = [
//   { icon: 'shield-outline' as const,       text: 'Your login session will be cleared from this device' },
//   { icon: 'finger-print-outline' as const, text: 'Biometric unlock will be disabled until you sign in again' },
//   { icon: 'lock-closed-outline' as const,  text: 'Your personal data remains safe and is not deleted' },
// ];

export default function LogoutScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  // Tab bar is position:absolute — floats over content, does not reserve layout space.
  const tabBarClearance = Math.max(insets.bottom, 14) + 72 + 12;

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await bffLogout();
    } catch (error) {
    } finally {
      await clearBiometricSession();
      await clearAuthTokens();
      dispatch(clearRole());
      router.replace('/(auth)/login');
    }
  };

  const handleCancel = () => {
    if (isLoggingOut) return;
    router.back();
  };

  if (isLoggingOut) {
    return (
      <View className="flex-1 bg-[#f8fafc] items-center justify-center">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View className="items-center gap-4">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-[15px] font-semibold text-[#475569]">Signing you out…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f8fafc] items-center justify-center px-7" style={{ paddingBottom: tabBarClearance }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Icon */}
      <View className="w-[72px] h-[72px] rounded-full bg-[#dbeafe] items-center justify-center mb-5">
        <Ionicons name="log-out-outline" size={32} color="#2563eb" />
      </View>

      <Text className="text-[22px] font-extrabold text-[#0f172a] text-center mb-2">
        Log out?
      </Text>
      <Text className="text-sm text-[#64748b] text-center mb-7 leading-[21px]">
        You'll need to sign in again to access your account.
      </Text>

      {/* Info list */}
      {/* <View className="w-full mb-9" style={{ gap: 14 }}>
        {INFO_ITEMS.map((item, idx) => (
          <View key={idx} className="flex-row items-start" style={{ gap: 12 }}>
            <Ionicons name={item.icon} size={16} color="#64748b" />
            <Text className="flex-1 text-[13px] text-[#475569]" style={{ lineHeight: 19 }}>
              {item.text}
            </Text>
          </View>
        ))}
      </View> */}

      {/* Actions */}
      <View className="w-full gap-[10px]">
        <Pressable
          onPress={performLogout}
          className="w-full bg-red-600 rounded-2xl h-12 items-center justify-center"
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <Text className="text-base font-extrabold text-white" style={{ letterSpacing: 0.5 }}>Log Out</Text>
        </Pressable>

        <Pressable
          onPress={handleCancel}
          className="w-full bg-[#0a1c63] rounded-2xl h-12 items-center justify-center"
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <Text className="text-base font-bold text-white" style={{ letterSpacing: 0.5 }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
