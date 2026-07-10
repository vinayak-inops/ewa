import { setBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { clearAuthTokens, getIdToken } from '@/hooks/auth/token-store';
import { AppDispatch } from '@/store';
import { clearRole } from '@/store/slices/roleSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

const RAW_AUTH_OR_ISSUER_URL =
  process.env.EXPO_PUBLIC_KEYCLOAK_AUTH_URL ?? process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? '';
const KEYCLOAK_ISSUER = RAW_AUTH_OR_ISSUER_URL.includes('/protocol/openid-connect')
  ? RAW_AUTH_OR_ISSUER_URL.split('/protocol/openid-connect')[0]
  : RAW_AUTH_OR_ISSUER_URL;
const KEYCLOAK_LOGOUT_URL = KEYCLOAK_ISSUER ? `${KEYCLOAK_ISSUER}/protocol/openid-connect/logout` : '';

function toQueryString(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

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
      const idToken = await getIdToken();

      // Silent server-side logout via fetch avoids opening an in-app browser
      // that would show Keycloak's error page when the deep-link redirect URI
      // isn't registered as a valid post-logout URI in the Keycloak client.
      if (KEYCLOAK_LOGOUT_URL && idToken) {
        const logoutUrl = `${KEYCLOAK_LOGOUT_URL}?${toQueryString({ id_token_hint: idToken })}`;
        try {
          await fetch(logoutUrl);
        } catch (error) {
        }
      }
    } catch (error) {
    } finally {
      await clearAuthTokens();
      setBiometricSessionUnlocked(false);
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
        <View className="items-center" style={{ gap: 16 }}>
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
      <Text className="text-sm text-[#64748b] text-center mb-7" style={{ lineHeight: 21 }}>
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
      <View className="w-full" style={{ gap: 10 }}>
        <Pressable
          onPress={performLogout}
          style={({ pressed }) => [{
            width: '100%', backgroundColor: '#dc2626',
            borderRadius: 16, height: 48,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          }]}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>Log Out</Text>
        </Pressable>

        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [{
            width: '100%', backgroundColor: '#0a1c63',
            borderRadius: 16, height: 48,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          }]}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.5 }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
