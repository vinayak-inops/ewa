import { getPostLoginRoute } from '@/constants/app-variant';
import { bffLogin, fetchCsrf } from '@/hooks/auth/bff-session';
import { isBiometricSessionActive, isBiometricSessionUnlocked, setBiometricSessionUnlocked, startBiometricSession } from '@/hooks/auth/biometric-session';
import { hasGrantedPermissions, recordPostLoginState } from '@/hooks/auth/install-guard';
import { AppDispatch } from '@/store';
import { fetchRolePermissions, initializeRoleFromBffProfile } from '@/store/slices/roleSlice';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading]           = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSigned, setKeepSigned]     = useState(false);

  useEffect(() => {
    const redirectSavedSession = async () => {
      const biometricActive = await isBiometricSessionActive();
      if (!biometricActive) return;
      router.replace(isBiometricSessionUnlocked() ? getPostLoginRoute() : '/(auth)/biometric');
    };
    void redirectSavedSession();
  }, [router]);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const onLogin = async () => {
    if (loading) return;
    if (!canSubmit) {
      setErrorMessage('Please enter your employee ID and password.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await fetchCsrf();
      const profile = await bffLogin(username.trim(), password);
      await startBiometricSession();
      await recordPostLoginState(profile.username);
      setBiometricSessionUnlocked(true);
      // Clear any leftover failure count from prior sessions
      AsyncStorage.removeItem('ewa_biometric_fail_count').catch(() => {});

      // Fetch and store role info in Redux before entering the app
      const roleResult = await dispatch(initializeRoleFromBffProfile(profile));
      const payload    = (roleResult as any).payload;
      const roleType   = payload?.roleType as string | null;
      const org        = payload?.org as string | null;
      if (roleType) {
        await dispatch(fetchRolePermissions({ roleType, org }));
      }

      const alreadyGranted = await hasGrantedPermissions();
      router.replace(alreadyGranted ? getPostLoginRoute() : '/(auth)/permissions');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header row */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-9 h-9 rounded-[10px] border border-slate-200 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={22} color="#0a1c63" />
        </Pressable>
        <Image
          source={require('@/assets/images/logoiddion.png')}
          style={{ width: 110, height: 34 }}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View className="mb-7">
          <Text className="text-[30px] font-extrabold text-[#0a1c63] tracking-[-0.6px] mb-2">
            Welcome <Text className="italic font-bold">back</Text>
          </Text>
          <Text className="text-sm leading-[21px] text-slate-500">
            Sign in with the details your employer registered with EWA.
          </Text>
        </View>

        {/* Employee ID */}
        <View className="mb-[18px]">
          <Text className="text-[13px] font-semibold text-slate-900 mb-[7px]">
            Employee ID or mobile number
          </Text>
          <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
            <TextInput
              className="flex-1 text-[15px] text-slate-900 p-0 m-0"
              placeholder="Enter employee ID or mobile"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>
        </View>

        {/* Password */}
        <View className="mb-[18px]">
          <View className="flex-row justify-between items-center mb-[7px]">
            <Text className="text-[13px] font-semibold text-slate-900">Password</Text>
            <Pressable hitSlop={8}>
              <Text className="text-[13px] font-semibold text-[#0a1c63]">Forgot password?</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
            <TextInput
              className="flex-1 text-[15px] text-slate-900 p-0 m-0"
              placeholder="Enter password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onLogin}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} className="pl-2">
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
            </Pressable>
          </View>
        </View>

        {/* Keep signed in */}
        <Pressable
          className="flex-row items-center gap-2.5 mb-6"
          onPress={() => setKeepSigned((v) => !v)}
        >
          <View className={`w-5 h-5 rounded-[5px] border-[1.5px] items-center justify-center ${keepSigned ? 'bg-[#0a1c63] border-[#0a1c63]' : 'bg-white border-slate-300'}`}>
            {keepSigned && <Ionicons name="checkmark" size={13} color="#ffffff" />}
          </View>
          <Text className="text-[13px] text-slate-600">Keep me signed in on this device</Text>
        </Pressable>

        {/* Error */}
        {!!errorMessage && (
          <Text className="text-[13px] text-red-600 mb-[14px] text-center">{errorMessage}</Text>
        )}

        {/* Sign in button */}
        <Pressable
          className={`bg-[#f5c518] rounded-[14px] h-[54px] items-center justify-center mb-5 active:opacity-[0.88] ${(loading || !canSubmit) ? 'opacity-55' : 'opacity-100'}`}
          onPress={onLogin}
          disabled={loading || !canSubmit}
        >
          {loading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#0a1c63" />
              <Text className="text-base font-extrabold text-[#0a1c63]">Signing in…</Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Text className="text-base font-extrabold text-[#0a1c63]">Sign in</Text>
              <View className="ml-1.5">
                <Ionicons name="arrow-forward" size={18} color="#0a1c63" />
              </View>
            </View>
          )}
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center gap-2.5 mb-4">
          <View className="flex-1 h-px bg-slate-200" />
          <Text className="text-[13px] text-slate-400">or</Text>
          <View className="flex-1 h-px bg-slate-200" />
        </View>

        {/* OTP button */}
        <Pressable className="rounded-[14px] h-[54px] border-[1.5px] border-slate-200 items-center justify-center mb-8 active:opacity-80">
          <Text className="text-[15px] font-bold text-[#0a1c63]">Sign in with OTP</Text>
        </Pressable>

        {/* Footer */}
        <Text className="text-[13px] text-slate-400 text-center">
          New to EWA?{' '}
          <Text className="font-bold text-slate-500">Ask your HR team to invite you.</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
