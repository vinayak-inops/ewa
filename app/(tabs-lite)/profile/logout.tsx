import { clearAuthTokens, getIdToken } from '@/hooks/auth/token-store';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type LogoutStatus = 'confirm' | 'processing' | 'error';
const APP_FONT_FAMILY = 'Inter';

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

export default function LogoutScreen() {
  const router = useRouter();
  const [logoutStatus, setLogoutStatus] = useState<LogoutStatus>('confirm');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const performLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutStatus('processing');

    try {
      const redirectUri = Linking.createURL('/(auth)/login');
      const idToken = await getIdToken();

      if (KEYCLOAK_LOGOUT_URL) {
        const logoutUrl = `${KEYCLOAK_LOGOUT_URL}?${toQueryString({
          post_logout_redirect_uri: redirectUri,
          ...(idToken ? { id_token_hint: idToken } : {}),
        })}`;

        await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
      }

      await clearAuthTokens();
      router.replace('/(auth)/login');
    } catch (error) {
      if (__DEV__) {
        console.error('[logout] failed to clear local session', error);
      }
      setLogoutStatus('error');
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    if (isLoggingOut) return;
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={logoutStatus === 'error' ? 'alert-circle-outline' : 'log-out-outline'}
            size={30}
            color={logoutStatus === 'error' ? '#dc2626' : '#2563eb'}
          />
        </View>

        {logoutStatus === 'confirm' ? (
          <>
            <Text style={styles.title}>Log out from Earned Wage Access?</Text>
            <Text style={styles.subtitle}>You will need to sign in again to continue using the application.</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.dot} />
                <Text style={styles.infoText}>Your saved login session on this device will be cleared</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.dot} />
                <Text style={styles.infoText}>You will return to the secure login screen</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.dot} />
                <Text style={styles.infoText}>You can sign back in any time with Keycloak</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.logoutButton} onPress={performLogout}>
                <Ionicons name="log-out-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{logoutStatus === 'error' ? 'Something went wrong' : 'Logging out'}</Text>
            <Text style={styles.subtitle}>
              {logoutStatus === 'error'
                ? 'We could not complete logout cleanly. Please try again.'
                : 'Clearing your local session and returning to login.'}
            </Text>

            <View style={styles.loaderWrap}>
              {logoutStatus === 'error' ? (
                <Pressable style={styles.retryButton} onPress={performLogout}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </Pressable>
              ) : (
                <ActivityIndicator size="large" color="#2563eb" />
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  content: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 26,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    marginTop: 7,
  },
  infoText: {
    fontFamily: APP_FONT_FAMILY,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#1e3a8a',
  },
  actionRow: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  logoutButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  loaderWrap: {
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  retryButton: {
    minWidth: 140,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  retryButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
