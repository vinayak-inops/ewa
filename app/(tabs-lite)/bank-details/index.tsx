import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { useEffect, useMemo, useState } from 'react';

const APP_FONT_FAMILY = 'Inter';

type FieldRow = {
  label: string;
  value: unknown;
};

function formatValue(value?: unknown): string {
  if (value === undefined || value === null || value === '') return 'Not provided';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const list = value.map((v) => formatValue(v)).filter((v) => v !== 'Not provided');
    return list.length ? list.join(', ') : 'Not provided';
  }
  return 'Not provided';
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function Field({ label, value }: FieldRow) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{formatValue(value)}</Text>
    </View>
  );
}

export default function BankDetailsScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;

      const payload = decodeJwtPayload(token);
      if (!payload) return;

      const resolvedEmployeeId =
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') ||
        '';
      const resolvedTenantCode =
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '';

      setEmployeeId(resolvedEmployeeId);
      setTenantCode(resolvedTenantCode);
    };

    void run();
  }, []);

  const { loading, error } = useGetRequest<any[]>({
    url: 'contract_employee/search',
    method: 'POST',
    data: [
      {
        field: 'employeeID',
        value: employeeId,
        operator: 'eq',
      },
      {
        field: 'tenantCode',
        value: tenantCode,
        operator: 'eq',
      },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (data) => {
      console.log('Fetched employee profile:', data);
      if (Array.isArray(data) && data.length > 0) {
        setEmployeeProfile(data[0]);
      } else {
        setEmployeeProfile(null);
      }
    },
    onError: () => {
      setEmployeeProfile(null);
    },
  });

  const identityFields: FieldRow[] = useMemo(
    () => [
      { label: 'Aadhar Number', value: employeeProfile?.aadharNumber ?? employeeProfile?.aadharNo ?? employeeProfile?.aadhaarNumber },
      { label: 'ESI Number', value: employeeProfile?.esiNo ?? employeeProfile?.esiNumber },
      { label: 'UAN Number', value: employeeProfile?.uanNo ?? employeeProfile?.uanNumber },
      { label: 'PF Number', value: employeeProfile?.pfNo ?? employeeProfile?.pfNumber },
    ],
    [employeeProfile]
  );

  const bankFields: FieldRow[] = useMemo(
    () => [
      {
        label: 'Bank Name',
        value: employeeProfile?.bank?.bankName ?? employeeProfile?.bankDetails?.bankName ?? employeeProfile?.bankName,
      },
      {
        label: 'IFSC Code',
        value: employeeProfile?.bank?.ifscCode ?? employeeProfile?.bankDetails?.ifscCode ?? employeeProfile?.ifscCode,
      },
      {
        label: 'Branch Name',
        value: employeeProfile?.bank?.branchName ?? employeeProfile?.bankDetails?.branchName ?? employeeProfile?.branchName,
      },
      {
        label: 'Account Number',
        value:
          employeeProfile?.bank?.accountNumber ??
          employeeProfile?.bankDetails?.accountNumber ??
          employeeProfile?.accountNumber,
      },
    ],
    [employeeProfile]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text style={styles.greeting}>Bank Details</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
            <Ionicons name="settings-outline" size={18} color="#0f172a" />
          </View>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>Identity Information</Text>
            <Text style={styles.panelLink}>Read Only</Text>
          </View>
          {loading ? <Text style={styles.metaInfo}>Loading details...</Text> : null}
          {error ? <Text style={styles.metaError}>Failed to load details: {error.message}</Text> : null}
          <View style={styles.fieldGrid}>
            {identityFields.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>Bank Account Information</Text>
            <Text style={styles.panelLink}>Read Only</Text>
          </View>
          <View style={styles.fieldGrid}>
            {bankFields.map((field) => (
              <Field key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  top: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#f8fafc',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  greeting: {
    fontFamily: APP_FONT_FAMILY,
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  topIcons: {
    flexDirection: 'row',
    gap: 14,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelKicker: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  panelLink: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
  },
  metaInfo: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  metaError: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#b91c1c',
    marginBottom: 8,
  },
  fieldGrid: {
    gap: 2,
  },
  fieldWrap: {
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fieldLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    color: '#64748b',
  },
  fieldValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
