import { getPostLoginRoute } from '@/constants/app-variant';
import { isBiometricSessionUnlocked, setBiometricSessionUnlocked } from '@/hooks/auth/biometric-session';
import { getAccessToken, saveAuthTokens } from '@/hooks/auth/token-store';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const RAW_AUTH_OR_ISSUER_URL =
  process.env.EXPO_PUBLIC_KEYCLOAK_AUTH_URL ?? process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? '';
const KEYCLOAK_ISSUER = RAW_AUTH_OR_ISSUER_URL.includes('/protocol/openid-connect')
  ? RAW_AUTH_OR_ISSUER_URL.split('/protocol/openid-connect')[0]
  : RAW_AUTH_OR_ISSUER_URL;
const KEYCLOAK_AUTH_URL = KEYCLOAK_ISSUER ? `${KEYCLOAK_ISSUER}/protocol/openid-connect/auth` : '';
const KEYCLOAK_TOKEN_URL = KEYCLOAK_ISSUER ? `${KEYCLOAK_ISSUER}/protocol/openid-connect/token` : '';
const KEYCLOAK_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? '';
const KEYCLOAK_CLIENT_SECRET = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_SECRET ?? '';
const KEYCLOAK_SCOPE = process.env.EXPO_PUBLIC_KEYCLOAK_SCOPE ?? 'openid profile email';
const APP_FONT_FAMILY = 'Inter';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function toQueryString(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function parseUrlParams(url: string) {
  const parsed = Linking.parse(url);
  const qp = parsed.queryParams ?? {};
  const code = typeof qp.code === 'string' ? qp.code : undefined;
  const error = typeof qp.error === 'string' ? qp.error : undefined;
  return { code, error };
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const body = toQueryString({
    grant_type: 'authorization_code',
    client_id: KEYCLOAK_CLIENT_ID,
    code,
    redirect_uri: redirectUri,
  });
  const finalBody = KEYCLOAK_CLIENT_SECRET
    ? `${body}&${toQueryString({ client_secret: KEYCLOAK_CLIENT_SECRET })}`
    : body;

  const response = await fetch(KEYCLOAK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: finalBody,
  });

  const json = (await response.json()) as TokenResponse;
  if (!response.ok) {
    return {
      error: json.error ?? 'token_exchange_failed',
      error_description: json.error_description ?? 'Keycloak token exchange failed.',
    };
  }
  return json;
}

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
        <FeatureCard icon={FEATURES[0].icon} title={FEATURES[0].title} desc={FEATURES[0].desc} style={{ marginRight: 10 }} />
        <FeatureCard icon={FEATURES[1].icon} title={FEATURES[1].title} desc={FEATURES[1].desc} />
      </View>
      <View style={[styles.featureRow, { justifyContent: 'center', marginTop: 10 }]}>
        <View style={{ width: '55%' }}>
          <FeatureCard icon={FEATURES[2].icon} title={FEATURES[2].title} desc={FEATURES[2].desc} />
        </View>
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

  const redirectUri = useMemo(() => Linking.createURL('/(auth)/login'), []);

  const canStartAuth =
    KEYCLOAK_ISSUER.length > 0 &&
    KEYCLOAK_AUTH_URL.length > 0 &&
    KEYCLOAK_TOKEN_URL.length > 0 &&
    KEYCLOAK_CLIENT_ID.length > 0;

  useEffect(() => {
    const redirectSavedSession = async () => {
      const token = await getAccessToken();
      if (!token) return;
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

  const onLogin = async () => {
    if (loading || !canStartAuth) {
      if (!canStartAuth) {
        setErrorMessage(
          'Keycloak config is missing. Set EXPO_PUBLIC_KEYCLOAK_AUTH_URL (or EXPO_PUBLIC_KEYCLOAK_ISSUER) and EXPO_PUBLIC_KEYCLOAK_CLIENT_ID.',
        );
      }
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const authUrl = `${KEYCLOAK_AUTH_URL}?${toQueryString({
        client_id: KEYCLOAK_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: KEYCLOAK_SCOPE,
        prompt: 'login',
      })}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type !== 'success' || !result.url) {
        setErrorMessage('Sign-in was cancelled or did not complete.');
        return;
      }
      const { code, error } = parseUrlParams(result.url);
      if (error || !code) {
        setErrorMessage(error ? `Authentication failed: ${error}` : 'Authentication code missing from callback.');
        return;
      }
      const validation = await exchangeCodeForTokens(code, redirectUri);
      if (!validation.access_token) {
        setErrorMessage(validation.error_description ?? 'Keycloak token exchange failed. Please try again.');
        return;
      }
      await saveAuthTokens({
        accessToken: validation.access_token,
        refreshToken: validation.refresh_token,
        idToken: validation.id_token,
        tokenType: validation.token_type,
        expiresIn: validation.expires_in,
      });
      setBiometricSessionUnlocked(true);
      router.replace('/');
    } catch {
      setErrorMessage('Unable to complete login right now. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* Blue top area */}
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
            Securely access your EWA account and manage your workplace finances.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButtonWrap,
            pressed && { opacity: 0.85 },
            loading && { opacity: 0.7 },
          ]}
          onPress={onLogin}
          disabled={loading}
        >
          <View style={styles.primaryButton}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.primaryButtonText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Sign in with IDDION</Text>
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
    flex: 1,
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
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 18,
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
    marginBottom: 20,
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
  primaryButtonWrap: {
    width: '100%',
    alignSelf: 'stretch',
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
