import { getPostLoginRoute } from '@/constants/app-variant';
import { clearBiometricSession, isBiometricSessionActive, isBiometricSessionUnlocked, setBiometricSessionUnlocked, startBiometricSession } from '@/hooks/auth/biometric-session';
import { recordPostLoginState } from '@/hooks/auth/install-guard';
import { bffLogin, fetchCsrf, makeSyntheticToken } from '@/hooks/auth/bff-session';
import { clearAuthTokens, saveAuthTokens } from '@/hooks/auth/token-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const APP_FONT_FAMILY = 'Inter';

const FEATURES = [
  { icon: 'wallet-outline' as const,        title: 'Earned Wages',  desc: 'Access salary anytime'   },
  { icon: 'document-text-outline' as const, title: 'Applications',  desc: 'Leave, OT, shift & more' },
  { icon: 'calendar-outline' as const,      title: 'Attendance',    desc: 'Track your work records' },
];

function FeatureCard({ icon, title, desc, style }: { icon: typeof FEATURES[number]['icon']; title: string; desc: string; style?: object }) {
  return (
    <View style={[styles.featureCard, style]}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={20} color="#ffffff" />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  );
}

function FeatureGrid() {
  return (
    <View style={styles.featureWrap}>
      <View style={styles.featureRow}>
        <FeatureCard icon={FEATURES[0].icon} title={FEATURES[0].title} desc={FEATURES[0].desc} style={{ flex: 1, marginRight: 10 }} />
        <FeatureCard icon={FEATURES[1].icon} title={FEATURES[1].title} desc={FEATURES[1].desc} style={{ flex: 1 }} />
      </View>
      <View style={[styles.featureRow, { justifyContent: 'center', marginTop: 10 }]}>
        <FeatureCard icon={FEATURES[2].icon} title={FEATURES[2].title} desc={FEATURES[2].desc} style={{ width: '55%' }} />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const orbFloatA = useRef(new Animated.Value(0)).current;
  const orbFloatB = useRef(new Animated.Value(0)).current;
  const orbPulse = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const redirectSavedSession = async () => {
      const biometricActive = await isBiometricSessionActive();
      if (!biometricActive) return;
      router.replace(isBiometricSessionUnlocked() ? getPostLoginRoute() : '/(auth)/biometric');
    };
    void redirectSavedSession();
  }, [router]);

  useEffect(() => {
    const floatLoopA = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloatA, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbFloatA, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const floatLoopB = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloatB, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbFloatB, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    floatLoopA.start();
    floatLoopB.start();
    pulseLoop.start();
    return () => { floatLoopA.stop(); floatLoopB.stop(); pulseLoop.stop(); };
  }, [orbFloatA, orbFloatB, orbPulse]);

  const orbATranslateY = orbFloatA.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const orbATranslateX = orbFloatA.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const orbBTranslateY = orbFloatB.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const orbBTranslateX = orbFloatB.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const pulseScale   = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.12] });
  const pulseOpacity = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0.1] });

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const onLogin = async () => {
    if (loading) return;
    if (!canSubmit) {
      setErrorMessage('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await fetchCsrf();
      const profile = await bffLogin(username.trim(), password);

      // Save a synthetic decodable token so JWT-decode callers (e.g. attendance) get employeeID/tenantCode
      const syntheticToken = makeSyntheticToken(profile);
      await saveAuthTokens({ accessToken: syntheticToken });

      await startBiometricSession();
      await recordPostLoginState(syntheticToken);
      setBiometricSessionUnlocked(true);
      router.replace('/(auth)/permissions');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* Blue top area */}
      <View style={{ flex: 1 }}>
      <View style={styles.topArea}>
        <Animated.View
          pointerEvents="none"
          style={[styles.orbTop, { transform: [{ translateX: orbATranslateX }, { translateY: orbATranslateY }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.orbBottom, { transform: [{ translateX: orbBTranslateX }, { translateY: orbBTranslateY }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.orbCenter, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}
        />

        <View style={styles.logoRow}>
          <Image source={require('@/assets/images/logoiddion.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.taglineSection}>
          <Text style={styles.tagline}>Get paid when{'\n'}you need it</Text>
          <View style={styles.featureOuter}>
            <FeatureGrid />
          </View>
        </View>
      </View>
      </View>

      {/* White bottom card */}
      <View style={styles.bottomCard}>
        <View style={styles.dragHandle} />

        <View style={styles.progressRow}>
          <View style={styles.progressActive} />
          <View style={styles.progressInactive} />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>Earned Wage Access</Text>
          <Text style={styles.subtitle}>
            Sign in to your EWA account to manage your workplace finances.
          </Text>
        </View>

        {/* Username field */}
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#94a3b8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!loading}
          />
        </View>

        {/* Password field */}
        <View style={[styles.inputWrap, { marginTop: 10 }]}>
          <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
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
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButtonWrap,
            { marginTop: 18 },
            pressed && { opacity: 0.85 },
            (loading || !canSubmit) && { opacity: 0.6 },
          ]}
          onPress={onLogin}
          disabled={loading || !canSubmit}
        >
          <View style={styles.primaryButton}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.primaryButtonText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </View>
        </Pressable>

        <Text style={styles.secondaryText}>Your workspace is ready when you are</Text>

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a1c63',
  },
  topArea: {
    flex: 1,
    backgroundColor: '#0a1c63',
    overflow: 'hidden',
    alignItems: 'center',
  },

  orbTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1e3a8a',
    opacity: 0.7,
  },
  orbBottom: {
    position: 'absolute',
    left: -40,
    bottom: 20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#172554',
    opacity: 0.6,
  },
  orbCenter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1e3a8a',
    top: '30%',
    alignSelf: 'center',
  },
  logoRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  logoImage: {
    width: 220,
    height: 66,
  },
  taglineSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  featureOuter: {
    width: '100%',
    marginTop: 0,
  },
  tagline: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 38,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 10,
  },
  featureIconWrap: {
    marginBottom: 8,
  },
  featureWrap: {
    width: '100%',
    marginTop: 16,
  },
  featureRow: {
    flexDirection: 'row',
  },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 12,
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 15,
  },
  bottomCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 18,
    alignSelf: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    marginBottom: 12,
  },
  progressActive: {
    width: 16,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#0a1c63',
  },
  progressInactive: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  copyBlock: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  title: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: '#0a1c63',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 300,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeButton: {
    paddingLeft: 8,
  },
  primaryButtonWrap: {
    borderRadius: 14,
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a1c63',
  },
  primaryButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  secondaryText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#0a1c63',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#c53030',
    textAlign: 'center',
  },
});
