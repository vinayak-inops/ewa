/**
 * LaunchpadHeader
 *
 * Self-contained header for the main launchpad screen.
 * Decodes the JWT → fetches the employee profile → displays:
 *   Left  : full name (bold) + employeeID · department (muted)
 *   Right : notification bell + settings icon
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

// ─── JWT helper ───────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part   = token.split('.')[1];
    if (!part) return null;
    const b64    = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    return JSON.parse(
      decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      )
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchpadHeader() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [profile,    setProfile]    = useState<Record<string, any> | null>(null);

  // Decode JWT on mount
  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const p = decodeJwtPayload(token);
      if (!p) return;
      setEmployeeId(String(p.employeeID ?? p.employeeId ?? p.empId ?? ''));
      setTenantCode(String(p.tenantCode  ?? p.tenant    ?? p.org   ?? ''));
    };
    void run();
  }, []);

  // Fetch employee profile
  useGetRequest<any[]>({
    url: 'contract_employee/search',
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (rows) => setProfile(Array.isArray(rows) && rows.length > 0 ? rows[0] : null),
    onError:   ()     => setProfile(null),
  });

  // Derived display values
  const fullName = useMemo(() => {
    if (!profile) return '';
    const joined = [profile.firstName, profile.middleName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return joined;
  }, [profile]);

  const department = profile?.deployment?.department?.departmentName as string | undefined;
  const displayId  = (profile?.employeeID as string) || employeeId;

  const subtitle = [displayId, department].filter(Boolean).join('  ·  ');

  // Photo URL from profile (field name may vary by API)
  const photoUrl = useMemo(() => {
    const url = profile?.photoUrl ?? profile?.profilePhoto ?? profile?.photo ?? profile?.imageUrl;
    return typeof url === 'string' && url.startsWith('http') ? url : null;
  }, [profile]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      <SafeAreaView edges={['top']} className="bg-[#1e293b] border-b border-[#334155]">
        <View className="flex-row items-center justify-between px-[18px] pt-3 pb-3">

          {/* ── Left: avatar + name + subtitle ── */}
          <View className="flex-row items-center flex-1 mr-3 gap-3">

            {/* Avatar: photo if available, else styled placeholder */}
            <View style={{ width: 44, height: 44, borderRadius: 22, padding: 2, backgroundColor: '#6366f1' }}>
              <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1e293b' }}
                    className="items-center justify-center">
                {photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={{ width: 40, height: 40 }}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    {/* Body silhouette */}
                    <View style={{
                      position: 'absolute', bottom: -4,
                      width: 28, height: 20,
                      borderTopLeftRadius: 14, borderTopRightRadius: 14,
                      backgroundColor: '#6366f1',
                    }} />
                    {/* Head circle */}
                    <View style={{
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: '#6366f1',
                      marginBottom: 2,
                    }} />
                  </>
                )}
              </View>
            </View>

            {/* Name + ID · Department */}
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="text-white text-[16px] font-bold tracking-[0.1px]"
              >
                {fullName || 'Welcome'}
              </Text>
              {!!subtitle && (
                <Text
                  numberOfLines={1}
                  className="text-slate-400 text-[11px] font-normal mt-[2px]"
                >
                  {subtitle}
                </Text>
              )}
            </View>

          </View>

          {/* ── Right: notification + settings ── */}
          <View className="flex-row items-center gap-4">
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/(tabs-lite)/settings/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color="#94a3b8" />
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/(tabs-lite)/settings' as any)}
            >
              <Ionicons name="settings-outline" size={20} color="#94a3b8" />
            </Pressable>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
}
