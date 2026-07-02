import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { usePostRequest } from '@/hooks/api/usePostRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

type SyncDetail = {
  _id: string;
  employeeID: string;
  user_id: string;
  kycDetails: Record<string, unknown>;
  tenantCode: string;
  organizationCode: string;
  synced: boolean;
  failed: boolean;
  failureMessage: string;
  createdOn: string;
};

type LoginLinkResponse = {
  loginLink: string | null;
  kycCompleted: boolean;
  message: string;
  error: string | null;
};

type Props = {
  children: ReactNode;
};

function getAppOrigin(): string {
  const envUrl = (process.env.EXPO_PUBLIC_NEXTAUTH_URL ?? '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? '';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const p = token.split('.')[1];
    if (!p) return null;
    const b = p.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b.padEnd(b.length + ((4 - (b.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch { return null; }
}

export function EwaSyncGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [loginLinkResult, setLoginLinkResult] = useState<LoginLinkResponse | null>(null);
  const sessionId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const loginLinkFired = useRef(false);

  useEffect(() => {
    getAccessToken().then((token) => {
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') || '');
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '');
    });
  }, []);

  const { data, loading, error } = useGetRequest<SyncDetail[]>({
    url: 'emeraldEmployeeSyncDetails/search',
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
  });

  const syncDetail = Array.isArray(data) && data.length > 0 ? data[0] : null;

  const { post: postLoginLink } = usePostRequest({
    url: 'ewa/login-link',
    onSuccess: (res) => {
      const result = res as LoginLinkResponse;
      if (result.kycCompleted) {
        setUnlocked(true);
      } else {
        setLoginLinkResult(result);
      }
    },
    onError: (err) => {
      setLoginLinkResult({ loginLink: null, kycCompleted: false, message: '', error: err?.message ?? 'Something went wrong.' });
    },
  });

  useEffect(() => {
    if (!syncDetail || !employeeId || !tenantCode || loginLinkFired.current) return;
    loginLinkFired.current = true;
    void postLoginLink({
      tenantCode,
      userID: syncDetail.user_id,
      sessionID: sessionId,
      returnUrl: getAppOrigin(),
      employeeID: employeeId,
      organizationCode: tenantCode,
    });
  }, [syncDetail, employeeId, tenantCode]);

  if (unlocked) return <>{children}</>;

  if (!employeeId || !tenantCode) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (loading || (!loginLinkResult && !error)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Verifying account…</Text>
      </View>
    );
  }

  if (error || !syncDetail) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Sync Details Unavailable</Text>
        <Text style={styles.errorSub}>
          {error?.message ?? 'No sync record found for your account.'}
        </Text>
      </View>
    );
  }

  if (loginLinkResult && !loginLinkResult.kycCompleted) {
    if (loginLinkResult.error) {
      return (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>KYC Error</Text>
          <Text style={styles.errorSub}>{loginLinkResult.error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>KYC Required</Text>
          <Text style={styles.headerSub}>Complete your KYC to access EWA services</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.kycIconRow}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#2563eb" />
          </View>
          <Text style={styles.kycTitle}>Identity Verification Pending</Text>
          <Text style={styles.kycSub}>
            {loginLinkResult.message || 'Your KYC is not yet completed. Please complete verification to proceed.'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.proceedBtn, pressed && styles.proceedBtnPressed]}
          onPress={() => {
            if (loginLinkResult.loginLink) {
              void Linking.openURL(loginLinkResult.loginLink);
            }
          }}>
          <Text style={styles.proceedBtnText}>Complete KYC</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.loadingText}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a1c63', paddingHorizontal: 20, paddingTop: 72, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0a1c63', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: '#93c5fd', marginTop: 4 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 8 },
  errorSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  header: { marginBottom: 28 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#93c5fd', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 10 },
  statusBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusSynced: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusSyncedText: { color: '#15803d' },
  statusPendingText: { color: '#b45309' },
  statusFailed: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fee2e2' },
  statusFailedText: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#0f172a', fontWeight: '700', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  failureBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fff1f2', borderRadius: 8, padding: 10, marginTop: 4 },
  failureText: { fontSize: 12, color: '#b91c1c', flex: 1, lineHeight: 18 },
  proceedBtn: { marginTop: 28, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  proceedBtnPressed: { opacity: 0.85 },
  proceedBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  kycIconRow: { alignItems: 'center', marginBottom: 12 },
  kycTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  kycSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
});
