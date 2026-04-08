import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { useEffect, useMemo, useState } from 'react';

const APP_FONT_FAMILY = 'Inter';

function formatDate(dateString?: string) {
  if (!dateString) return 'Not provided';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{formatValue(value)}</Text>
    </View>
  );
}

export default function LiteProfileScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string>('');
  const [tenantCode, setTenantCode] = useState<string>('');
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      if (__DEV__) {
        console.log('[profile] token payload user info', payload);
      }

      const resolvedEmployeeId =
        String(
          payload.employeeID ??
          payload.employeeId ??
          payload.empId ??
          process.env.EXPO_PUBLIC_EMPLOYEE_ID ??
          ''
        ) || '';
      const resolvedTenantCode =
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '';

      setEmployeeId(resolvedEmployeeId);
      setTenantCode(resolvedTenantCode);
    };

    void run();
  }, []);

  const { data: profileRows, loading: profileLoading, error: profileError } = useGetRequest<any[]>({
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
      if (__DEV__) {
        console.log('[profile] fetched employee profile data', data);
      }
    },
    onError: (err) => {
      if (__DEV__) {
        console.error('[profile] failed to fetch profile details', {
          message: err.message,
          employeeId,
          tenantCode,
        });
      }
      setEmployeeProfile(null);
    },
  });

  useEffect(() => {
    if (__DEV__) {
      console.log('[profile] employee profile API response', profileRows);
    }
    if (Array.isArray(profileRows) && profileRows.length > 0) {
      setEmployeeProfile(profileRows[0]);
      if (__DEV__) {
        console.log('[profile] selected employee profile', profileRows[0]);
      }
    } else {
      setEmployeeProfile(null);
    }
  }, [profileRows]);

  const fullName = useMemo(() => {
    const first = employeeProfile?.firstName ?? '';
    const middle = employeeProfile?.middleName ?? '';
    const last = employeeProfile?.lastName ?? '';
    const joined = `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim();
    return joined || 'Not provided';
  }, [employeeProfile]);
  const displayedEmployeeId = employeeProfile?.employeeID ?? employeeId;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text style={styles.greeting}>Profile</Text>
          </View>
          <View style={styles.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
            <Ionicons name="settings-outline" size={18} color="#0f172a" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.sheet}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroOrbA} />
            <View style={styles.heroOrbB} />
            <View style={styles.heroOrbC} />
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AD</Text>
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.code}>Employee ID: {formatValue(displayedEmployeeId)}</Text>
            <Text style={styles.location}>Department: {formatValue(employeeProfile?.deployment?.department?.departmentName)}</Text>

            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>EMAIL</Text>
                <View style={styles.contactLine}>
                  <Ionicons name="mail-outline" size={13} color="#64748b" />
                  <Text style={styles.contactText}>{formatValue(employeeProfile?.emailID?.primaryEmailID ?? employeeProfile?.emailID)}</Text>
                </View>
              </View>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>PHONE</Text>
                <View style={styles.contactLine}>
                  <Ionicons name="call-outline" size={13} color="#64748b" />
                  <Text style={styles.contactText}>{formatValue(employeeProfile?.contactNumber?.primaryContactNo ?? employeeProfile?.contactNumber ?? employeeProfile?.mobileNumber)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>Personal Information</Text>
            <Text style={styles.panelLink}>See All</Text>
          </View>
          {profileLoading ? <Text style={styles.metaInfo}>Loading profile...</Text> : null}
          {profileError ? <Text style={styles.metaError}>Failed to load profile details: {profileError.message}</Text> : null}
          <View style={styles.fieldGrid}>
            <Field label="Employee ID" value={displayedEmployeeId} />
            <Field label="First Name" value={employeeProfile?.firstName} />
            <Field label="Middle Name" value={employeeProfile?.middleName} />
            <Field label="Last Name" value={employeeProfile?.lastName} />
            <Field label="Father / Husband Name" value={employeeProfile?.fatherHusbandName} />
            <Field label="Gender" value={employeeProfile?.gender} />
            <Field label="Birth Date" value={formatDate(employeeProfile?.birthDate)} />
            <Field label="Blood Group" value={employeeProfile?.bloodGroup} />
            <Field label="Nationality" value={employeeProfile?.nationality} />
            <Field label="Marital Status" value={employeeProfile?.maritalStatus} />
            <Field label="Caste" value={employeeProfile?.caste} />
            <Field label="Identification Mark" value={employeeProfile?.identificationMark} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.panelHead}>
            <Text style={styles.panelKicker}>Employment Details</Text>
            <Text style={styles.panelLink}>See All</Text>
          </View>
          <View style={styles.fieldGrid}>
            <Field label="Date Of Joining" value={formatDate(employeeProfile?.dateOfJoining)} />
            <Field label="Contract From" value={formatDate(employeeProfile?.contractFrom)} />
            <Field label="Contract To" value={formatDate(employeeProfile?.contractTo)} />
            <Field label="Contract Period" value={employeeProfile?.contractPeriod} />
            <Field label="Work Skill Title" value={employeeProfile?.workSkill?.workSkillTitle} />
            <Field label="Payment Mode" value={employeeProfile?.paymentMode} />
            <Field label="Department Name" value={employeeProfile?.deployment?.department?.departmentName} />
            <Field label="Designation" value={employeeProfile?.deployment?.designation?.designationName} />
            <Field label="Location" value={employeeProfile?.deployment?.location?.locationName} />
            <Field label="Contractor Name" value={employeeProfile?.deployment?.contractor?.contractorName} />
            <Field label="Service Since" value={formatDate(employeeProfile?.serviceSince)} />
          </View>
        </View>

        <View style={styles.logoutCard}>
          <View style={styles.logoutCopy}>
            <Text style={styles.logoutTitle}>Ready to sign out?</Text>
            <Text style={styles.logoutDescription}>
              Log out from Earned Wage Access and return to the secure sign-in screen.
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={() => router.push('/(tabs-lite)/profile/logout')}>
            <Ionicons name="log-out-outline" size={18} color="#ffffff" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
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
    paddingBottom: 86,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroTop: {
    height: 120,
    backgroundColor: '#0a1c63',
    overflow: 'hidden',
  },
  heroOrbA: {
    position: 'absolute',
    height: 110,
    width: 84,
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    left: '58%',
    bottom: -10,
  },
  heroOrbB: {
    position: 'absolute',
    height: 78,
    width: 78,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    left: '49%',
    top: 10,
  },
  heroOrbC: {
    position: 'absolute',
    height: 62,
    width: 62,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    left: '74%',
    top: 24,
  },
  avatar: {
    alignSelf: 'center',
    marginTop: -44,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#d4d4d8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 28,
    fontWeight: '700',
    color: '#e9d5ff',
  },
  heroBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
  },
  name: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  code: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
  },
  location: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 2,
    fontSize: 11,
    color: '#94a3b8',
  },
  contactRow: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  contactItem: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  contactLine: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  contactText: {
    fontFamily: APP_FONT_FAMILY,
    flex: 1,
    fontSize: 10,
    color: '#334155',
    lineHeight: 13,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  logoutCard: {
    borderRadius: 16,
    backgroundColor: '#0a1c63',
    padding: 16,
    gap: 14,
    shadowColor: '#0a1c63',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoutCopy: {
    gap: 6,
  },
  logoutTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutDescription: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 20,
    color: '#cbd5e1',
  },
  logoutButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
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
