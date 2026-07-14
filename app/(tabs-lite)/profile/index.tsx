import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { useEffect, useMemo, useState } from 'react';

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
    <View className="w-full py-2 border-b border-[#eef2f7] flex-row items-center justify-between gap-[10px]">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="text-[13px] text-slate-900 font-semibold shrink text-right">{formatValue(value)}</Text>
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
      if (__DEV__) {}

      setEmployeeId(
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') || ''
      );
      setTenantCode(
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || ''
      );
    };
    void run();
  }, []);

  const { data: profileRows, loading: profileLoading, error: profileError } = useGetRequest<any[]>({
    url: 'contract_employee/search',
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: () => {},
    onError: () => { setEmployeeProfile(null); },
  });

  useEffect(() => {
    if (Array.isArray(profileRows) && profileRows.length > 0) {
      setEmployeeProfile(profileRows[0]);
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
    <View className="flex-1 bg-[#f8fafc]">

      {/* ── Header ── */}
      <View className="pt-[58px] px-4 pb-2 bg-[#f8fafc]">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="w-[30px] h-[30px] rounded-full items-center justify-center bg-slate-200"
            >
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text className="text-slate-900 text-xl font-bold">Profile</Text>
          </View>
          <View className="flex-row gap-[14px]">
            <Ionicons name="notifications-outline" size={18} color="#0f172a" />
            <Ionicons name="settings-outline" size={18} color="#0f172a" />
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#f8fafc]"
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 86, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero Card ── */}
        <View className="rounded-2xl bg-white overflow-hidden border border-slate-200">

          {/* Banner with orbs */}
          <View className="h-[120px] bg-[#0a1c63] overflow-hidden">
            {/* Orbs use inline style: rgba bg + individual corner radii + % positioning */}
            <View style={{
              position: 'absolute', height: 110, width: 84,
              backgroundColor: 'rgba(255,255,255,0.26)',
              borderTopLeftRadius: 56, borderTopRightRadius: 56,
              left: '58%', bottom: -10,
            }} />
            <View style={{
              position: 'absolute', height: 78, width: 78,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderTopLeftRadius: 50, borderTopRightRadius: 50,
              left: '49%', top: 10,
            }} />
            <View style={{
              position: 'absolute', height: 62, width: 62,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderTopLeftRadius: 42, borderTopRightRadius: 42,
              left: '74%', top: 24,
            }} />
          </View>

          {/* Avatar — negative marginTop must stay inline */}
          <View
            className="self-center w-[88px] h-[88px] rounded-full border-4 border-white bg-[#d4d4d8] items-center justify-center"
            style={{ marginTop: -44 }}
          >
            <Text className="text-[28px] font-bold text-purple-200">{fullName.slice(0, 2).toUpperCase()}</Text>
          </View>

          {/* Info */}
          <View className="px-[14px] pt-[10px] pb-[14px] items-center">
            <Text className="text-[18px] font-bold text-slate-900 text-center">{fullName}</Text>
            <Text className="mt-[2px] text-xs text-[#475569]">Employee ID: {formatValue(displayedEmployeeId)}</Text>
            <Text className="mt-[2px] text-[11px] text-slate-400">
              Department: {formatValue(employeeProfile?.deployment?.department?.departmentName)}
            </Text>

            {/* Contact rows */}
            <View className="mt-[10px] w-full gap-2">
              <View className="flex-1 rounded-[10px] px-2 py-[7px] bg-slate-100 border border-slate-200">
                <Text className="text-[9px] text-slate-500 font-bold" style={{ letterSpacing: 0.4 }}>EMAIL</Text>
                <View className="mt-1 flex-row items-start gap-1">
                  <Ionicons name="mail-outline" size={13} color="#64748b" />
                  <Text className="flex-1 text-[10px] text-[#334155] leading-[13px]">
                    {formatValue(employeeProfile?.emailID?.primaryEmailID ?? employeeProfile?.emailID)}
                  </Text>
                </View>
              </View>
              <View className="flex-1 rounded-[10px] px-2 py-[7px] bg-slate-100 border border-slate-200">
                <Text className="text-[9px] text-slate-500 font-bold" style={{ letterSpacing: 0.4 }}>PHONE</Text>
                <View className="mt-1 flex-row items-start gap-1">
                  <Ionicons name="call-outline" size={13} color="#64748b" />
                  <Text className="flex-1 text-[10px] text-[#334155] leading-[13px]">
                    {formatValue(
                      employeeProfile?.contactNumber?.primaryContactNo ??
                      employeeProfile?.contactNumber ??
                      employeeProfile?.mobileNumber
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Personal Information ── */}
        <View className="rounded-2xl border border-slate-200 bg-white p-3">
          <View className="flex-row justify-between items-center mb-[10px]">
            <Text className="text-[10px] text-slate-400 font-bold" style={{ letterSpacing: 0.8 }}>
              Personal Information
            </Text>
            <Text className="text-xs text-slate-500">See All</Text>
          </View>
          {profileLoading ? <Text className="text-xs text-slate-500 mb-2">Loading profile...</Text> : null}
          {profileError ? <Text className="text-xs text-red-700 mb-2">Failed to load profile details: {profileError.message}</Text> : null}
          <View className="gap-[2px]">
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

        {/* ── Employment Details ── */}
        <View className="rounded-2xl border border-slate-200 bg-white p-3">
          <View className="flex-row justify-between items-center mb-[10px]">
            <Text className="text-[10px] text-slate-400 font-bold" style={{ letterSpacing: 0.8 }}>
              Employment Details
            </Text>
            <Text className="text-xs text-slate-500">See All</Text>
          </View>
          <View className="gap-[2px]">
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

        {/* ── Logout Card ── */}
        <View
          className="rounded-2xl bg-[#0a1c63] p-4 gap-[14px]"
          style={{ shadowColor: '#0a1c63', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          <View className="gap-[6px]">
            <Text className="text-[17px] font-bold text-white">Ready to sign out?</Text>
            <Text className="text-[13px] leading-5 text-slate-300">
              Log out from Earned Wage Access and return to the secure sign-in screen.
            </Text>
          </View>

          <Pressable
            className="min-h-[46px] w-full rounded-xl bg-blue-600 flex-row items-center justify-center gap-2"
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
            onPress={() => router.push('/(tabs-lite)/profile/logout')}
          >
            <Ionicons name="log-out-outline" size={18} color="#ffffff" />
            <Text className="text-[15px] font-bold text-white">Log Out</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
