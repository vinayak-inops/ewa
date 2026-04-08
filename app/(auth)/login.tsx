import { getPostLoginRoute } from '@/constants/app-variant';
import { saveAuthTokens } from '@/hooks/auth/token-store';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const RAW_AUTH_OR_ISSUER_URL = process.env.EXPO_PUBLIC_KEYCLOAK_AUTH_URL ?? process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? '';
const KEYCLOAK_ISSUER = RAW_AUTH_OR_ISSUER_URL.includes('/protocol/openid-connect')
  ? RAW_AUTH_OR_ISSUER_URL.split('/protocol/openid-connect')[0]
  : RAW_AUTH_OR_ISSUER_URL;
const KEYCLOAK_AUTH_URL = KEYCLOAK_ISSUER ? `${KEYCLOAK_ISSUER}/protocol/openid-connect/auth` : '';
const KEYCLOAK_TOKEN_URL = KEYCLOAK_ISSUER ? `${KEYCLOAK_ISSUER}/protocol/openid-connect/token` : '';
const KEYCLOAK_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? '';
const KEYCLOAK_CLIENT_SECRET = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_SECRET ?? '';
const KEYCLOAK_SCOPE = process.env.EXPO_PUBLIC_KEYCLOAK_SCOPE ?? 'openid profile email';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
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
  const finalBody = KEYCLOAK_CLIENT_SECRET ? `${body}&${toQueryString({ client_secret: KEYCLOAK_CLIENT_SECRET })}` : body;

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

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const redirectUri = useMemo(() => Linking.createURL('/(auth)/login'), []);

  const canStartAuth =
    KEYCLOAK_ISSUER.length > 0 &&
    KEYCLOAK_AUTH_URL.length > 0 &&
    KEYCLOAK_TOKEN_URL.length > 0 &&
    KEYCLOAK_CLIENT_ID.length > 0;

  const onLogin = async () => {
    if (__DEV__) {
      console.log('[login] onLogin start', {
        hasAuthUrl: KEYCLOAK_AUTH_URL.length > 0,
        hasIssuer: KEYCLOAK_ISSUER.length > 0,
        hasTokenUrl: KEYCLOAK_TOKEN_URL.length > 0,
        hasClientId: KEYCLOAK_CLIENT_ID.length > 0,
        hasClientSecret: KEYCLOAK_CLIENT_SECRET.length > 0,
        redirectUri,
      });
    }

    if (loading || !canStartAuth) {
      if (!canStartAuth) {
        setErrorMessage(
          'Keycloak config is missing. Set EXPO_PUBLIC_KEYCLOAK_AUTH_URL (or EXPO_PUBLIC_KEYCLOAK_ISSUER) and EXPO_PUBLIC_KEYCLOAK_CLIENT_ID.',
        );
      }
      if (__DEV__) {
        console.log('[login] blocked', { loading, canStartAuth });
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
      })}`;
      if (__DEV__) {
        console.log('[login] opening auth session', { authUrl });
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (__DEV__) {
        console.log('[login] auth session result', { type: result.type, hasUrl: Boolean(result.type === 'success' && result.url) });
      }

      if (result.type !== 'success' || !result.url) {
        setErrorMessage('Sign-in was cancelled or did not complete.');
        if (__DEV__) {
          console.log('[login] auth cancelled/failed');
        }
        return;
      }

      const { code, error } = parseUrlParams(result.url);
      if (__DEV__) {
        console.log('[login] callback params', { hasCode: Boolean(code), error });
      }
      if (error || !code) {
        setErrorMessage(error ? `Authentication failed: ${error}` : 'Authentication code missing from callback.');
        return;
      }

      const validation = await exchangeCodeForTokens(code, redirectUri);
      if (__DEV__) {
        console.log('[login] token response', {
          hasAccessToken: Boolean(validation.access_token),
          hasRefreshToken: Boolean(validation.refresh_token),
          tokenType: validation.token_type,
          expiresIn: validation.expires_in,
          error: validation.error,
          errorDescription: validation.error_description,
        });
      }
      if (!validation.access_token) {
        setErrorMessage(validation.error_description ?? 'Keycloak token exchange failed. Please try again.');
        return;
      }

      if (__DEV__) {
        console.log('[login] saving tokens...');
      }
      await saveAuthTokens({
        accessToken: validation.access_token,
        refreshToken: validation.refresh_token,
        tokenType: validation.token_type,
        expiresIn: validation.expires_in,
      });

      if (__DEV__) {
        console.log('[login] navigating to post login route');
      }
      router.replace(getPostLoginRoute());
    } catch (e) {
      if (__DEV__) {
        console.log('[login] exception', e);
      }
      setErrorMessage('Unable to complete login right now. Please retry.');
    } finally {
      setLoading(false);
      if (__DEV__) {
        console.log('[login] onLogin end');
      }
    }
  };

  return (
    <ImageBackground source={require('@/assets/images/splash-icon.png')} style={styles.screen} imageStyle={styles.bgImage}>
      <View style={styles.overlay} />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <View style={styles.gridGlow} />

      <View style={styles.card}>
        <Text style={styles.title}>Employee Work Assistant</Text>
        <Text style={styles.subtitle}>Secure access through Keycloak</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={onLogin}
          disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#0d2142" />
              <Text style={styles.buttonText}>Validating...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Continue with Keycloak</Text>
          )}
        </Pressable>

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 148,
    backgroundColor: '#0b1d3a',
    overflow: 'hidden',
  },
  bgImage: {
    resizeMode: 'cover',
    opacity: 0.22,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 22, 44, 0.82)',
  },
  orbTop: {
    position: 'absolute',
    top: -76,
    right: -58,
    width: 234,
    height: 234,
    borderRadius: 117,
    backgroundColor: '#244f88',
    opacity: 0.92,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -108,
    left: -74,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#8a6c35',
    opacity: 0.88,
  },
  gridGlow: {
    position: 'absolute',
    top: 140,
    left: 28,
    right: 28,
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 11,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    color: '#0d2142',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 14,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#f5bf5a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f0b84c',
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d2142',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    marginTop: 4,
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
});
