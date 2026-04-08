import { getPostLoginRoute } from '@/constants/app-variant';
import { saveAuthTokens } from '@/hooks/auth/token-store';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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

function TeamIllustration() {
  return (
    <View style={styles.illustrationWrap}>
      <Image source={require('@/assets/images/user.png')} style={styles.illustrationImage} resizeMode="contain" />
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
    const floatLoopA = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloatA, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbFloatA, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoopB = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloatB, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbFloatB, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbPulse, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoopA.start();
    floatLoopB.start();
    pulseLoop.start();

    return () => {
      floatLoopA.stop();
      floatLoopB.stop();
      pulseLoop.stop();
    };
  }, [orbFloatA, orbFloatB, orbPulse]);

  const orbATranslateY = orbFloatA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });
  const orbATranslateX = orbFloatA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const orbBTranslateY = orbFloatB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });
  const orbBTranslateX = orbFloatB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });
  const pulseScale = orbPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.12],
  });
  const pulseOpacity = orbPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.1],
  });

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

      router.replace(getPostLoginRoute());
    } catch {
      setErrorMessage('Unable to complete login right now. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.screen}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backgroundOrbTop,
            { transform: [{ translateX: orbATranslateX }, { translateY: orbATranslateY }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backgroundOrbBottom,
            { transform: [{ translateX: orbBTranslateX }, { translateY: orbBTranslateY }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backgroundOrbCenter,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        <View style={styles.logoRow}>
          <Image source={require('@/assets/images/logoiddion.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.contentSet}>
          <View style={styles.illustrationSection}>
            <TeamIllustration />
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressActive} />
            <View style={styles.progressInactive} />
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>Earned Wage Access</Text>
            <Text style={styles.subtitle}>
              Access your Earned Wage Access account securely and manage your workplace financial tools with ease.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={onLogin}
            disabled={loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.primaryButtonText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Sign in with Keycloak</Text>
            )}
          </Pressable>

          <Text style={styles.secondaryText}>Your workspace is ready when you are</Text>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 26,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  backgroundOrbTop: {
    position: 'absolute',
    top: -90,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#dbeafe',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    left: -50,
    bottom: 100,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e7ff',
  },
  backgroundOrbCenter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#bfdbfe',
    top: '34%',
    alignSelf: 'center',
  },
  logoRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  logoImage: {
    width: 260,
    height: 78,
  },
  contentSet: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 70,
    alignItems: 'center',
  },
  illustrationSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  illustrationWrap: {
    width: 290,
    height: 330,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: 312,
    height: 312,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  progressActive: {
    width: 16,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#2563eb',
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
    marginBottom: 28,
  },
  title: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#0a1c63',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    lineHeight: 23,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 312,
  },
  primaryButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d4ed8',
    borderWidth: 1,
    borderColor: '#1e40af',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.82,
  },
  primaryButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: '#c53030',
    textAlign: 'center',
  },
});
