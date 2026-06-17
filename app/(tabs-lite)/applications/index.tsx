import { useRolePermissions } from '@/hooks/api/useRolePermissions';
import { useCanAccess } from '@/hooks/auth/useScreenPermissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ServiceDef = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  cardBg: string;
  blobLight: string;
  blobDark: string;
  iconBg: string;
  actionLabel: string;
  applierRoute: string;
  approverRoute: string;
};

const SERVICES: ServiceDef[] = [
  {
    title: 'Leave',
    subtitle: 'Apply & track leave requests',
    icon: 'calendar-outline',
    cardBg: '#0a1c63', blobLight: '#1e3a8a', blobDark: '#172554', iconBg: '#16a34a',
    actionLabel: 'Apply',
    applierRoute: '/(tabs-lite)/applications/leave-application?application=leave',
    approverRoute: '/(tabs-lite)/applications/leave-application?application=leave',
  },
  {
    title: 'Special Leave',
    subtitle: 'Compassionate & special leave',
    icon: 'calendar-clear-outline',
    cardBg: '#1e1b4b', blobLight: '#312e81', blobDark: '#0f0e2b', iconBg: '#7c3aed',
    actionLabel: 'Apply',
    applierRoute: '/(tabs-lite)/applications/leave-application?application=special',
    approverRoute: '/(tabs-lite)/applications/leave-application?application=special',
  },
  {
    title: 'Edit Punch',
    subtitle: 'Correct attendance punch records',
    icon: 'create-outline',
    cardBg: '#1f2937', blobLight: '#374151', blobDark: '#111827', iconBg: '#dc2626',
    actionLabel: 'Edit',
    applierRoute: '/(tabs-lite)/applications/edit-punch',
    approverRoute: '/(tabs-lite)/applications/edit-punch',
  },
  {
    title: 'Shift Change',
    subtitle: 'Request shift reassignment',
    icon: 'time-outline',
    cardBg: '#0c4a6e', blobLight: '#0369a1', blobDark: '#082f49', iconBg: '#6366f1',
    actionLabel: 'Request',
    applierRoute: '/(tabs-lite)/applications/shift-change',
    approverRoute: '/(tabs-lite)/applications/shift-change',
  },
  {
    title: 'Out Duty',
    subtitle: 'Log out-of-office duty time',
    icon: 'navigate-outline',
    cardBg: '#0f172a', blobLight: '#1e293b', blobDark: '#020617', iconBg: '#f59e0b',
    actionLabel: 'Apply',
    applierRoute: '/(tabs-lite)/applications/out-duty-application',
    approverRoute: '/(tabs-lite)/applications/out-duty-application',
  },
  {
    title: 'OT Apply',
    subtitle: 'Submit overtime work claims',
    icon: 'briefcase-outline',
    cardBg: '#14532d', blobLight: '#166534', blobDark: '#052e16', iconBg: '#d97706',
    actionLabel: 'Apply',
    applierRoute: '/(tabs-lite)/applications/ot-application',
    approverRoute: '/(tabs-lite)/applications/ot-application',
  },
  {
    title: 'Work From Home',
    subtitle: 'Request remote work approval',
    icon: 'home-outline',
    cardBg: '#134e4a', blobLight: '#0f766e', blobDark: '#0d3d3a', iconBg: '#0891b2',
    actionLabel: 'Request',
    applierRoute: '/(tabs-lite)/applications/wfh-application',
    approverRoute: '/(tabs-lite)/applications/wfh-application',
  },
  {
    title: 'Punch Apply',
    subtitle: 'Add missing punch entries',
    icon: 'finger-print-outline',
    cardBg: '#1a1a2e', blobLight: '#16213e', blobDark: '#0f0f1e', iconBg: '#16a34a',
    actionLabel: 'Apply',
    applierRoute: '/(tabs-lite)/applications/punch-application',
    approverRoute: '/(tabs-lite)/applications/punch-application',
  },
  {
    title: 'Encashment',
    subtitle: 'Encash accumulated leave balance',
    icon: 'cash-outline',
    cardBg: '#450a0a', blobLight: '#7f1d1d', blobDark: '#2a0404', iconBg: '#f59e0b',
    actionLabel: 'Apply',
    applierRoute: '/(tabs-lite)/applications/encashment-application',
    approverRoute: '/(tabs-lite)/applications/encashment-application',
  },
  {
    title: 'Comp Off',
    subtitle: 'Claim compensatory time off',
    icon: 'swap-horizontal-outline',
    cardBg: '#3b0764', blobLight: '#581c87', blobDark: '#1a0330', iconBg: '#9333ea',
    actionLabel: 'Claim',
    applierRoute: '/(tabs-lite)/applications/compoff-application',
    approverRoute: '/(tabs-lite)/applications/compoff-application',
  },
  {
    title: 'Attendance',
    subtitle: 'View & manage attendance records',
    icon: 'today-outline',
    cardBg: '#052e16', blobLight: '#14532d', blobDark: '#021d0e', iconBg: '#16a34a',
    actionLabel: 'View',
    applierRoute: '/(tabs-lite)/attendance',
    approverRoute: '/(tabs-lite)/attendance',
  },
];

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function ServiceCard({ svc, onPress }: { svc: ServiceDef; onPress: () => void }) {
  return (
    <Pressable
      className="flex-1"
      style={({ pressed }) => pressed ? { transform: [{ scale: 0.98 }] } : undefined}
      onPress={onPress}
    >
      <View
        className="rounded-2xl overflow-hidden p-3"
        style={{ backgroundColor: svc.cardBg, minHeight: 104 }}
      >
        {/* Decorative blobs — sized for half-width cards */}
        <View className="absolute" style={{ width: 70, height: 70, borderRadius: 35, right: -14, top: -34, backgroundColor: svc.blobLight }} />
        <View className="absolute" style={{ width: 80, height: 60, borderRadius: 30, right: -10, bottom: -30, backgroundColor: svc.blobDark }} />

        {/* Top row */}
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-bold leading-[18px] text-white" numberOfLines={1}>
              {svc.title}
            </Text>
            <Text className="text-[10px] font-semibold leading-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }} numberOfLines={2}>
              {svc.subtitle}
            </Text>
          </View>
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: svc.iconBg }}>
            <Ionicons name={svc.icon} size={18} color="#ffffff" />
          </View>
        </View>

        {/* Action row */}
        <View className="mt-auto pt-2.5 flex-row items-center justify-center" style={{ gap: 2 }}>
          <Text className="text-[10px] font-bold text-white">{svc.actionLabel}</Text>
          <Ionicons name="chevron-forward" size={12} color="#ffffff" />
        </View>
      </View>
    </Pressable>
  );
}

function ApplierSection() {
  const router = useRouter();
  const { loading } = useRolePermissions();

  const a0  = useCanAccess('applicationApplier', 'leave');
  const a1  = useCanAccess('applicationApplier', 'specialLeave');
  const a2  = useCanAccess('applicationApplier', 'editPunchApplication');
  const a3  = useCanAccess('applicationApplier', 'shiftChange');
  const a4  = useCanAccess('applicationApplier', 'outDuty');
  const a5  = useCanAccess('applicationApplier', 'overtime');
  const a6  = useCanAccess('applicationApplier', 'wfh');
  const a7  = useCanAccess('applicationApplier', 'punch');
  const a8  = useCanAccess('applicationApplier', 'encashment');
  const a9  = useCanAccess('applicationApplier', 'compOff');
  const a10 = useCanAccess('attendance', 'attendance');

  const flags = [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];
  const visible = loading ? SERVICES : SERVICES.filter((_, i) => flags[i]);
  if (!loading && visible.length === 0) return null;

  return (
    <View className="mx-2 mt-2.5">
      <View className="flex-row items-center px-1 pb-2 gap-2">
        <View className="w-1.5 h-1.5 rounded-full bg-[#0a1c63]" />
        <Text className="text-[11px] font-bold text-[#6b7280] tracking-[0.4px] uppercase">My Applications</Text>
      </View>
      <View style={{ gap: 10 }}>
        {chunk(visible, 2).map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row" style={{ gap: 10 }}>
            {row.map((svc) => {
              const sep = svc.applierRoute.includes('?') ? '&' : '?';
              return (
                <ServiceCard key={svc.title} svc={svc} onPress={() => router.push(`${svc.applierRoute}${sep}mode=applier` as any)} />
              );
            })}
            {row.length < 2 && <View className="flex-1" />}
          </View>
        ))}
      </View>
    </View>
  );
}

function ApproverSection() {
  const router = useRouter();
  const { loading } = useRolePermissions();

  const a0  = useCanAccess('applicationApprover', 'leave');
  const a1  = useCanAccess('applicationApprover', 'specialLeave');
  const a2  = useCanAccess('applicationApprover', 'editPunchApplication');
  const a3  = useCanAccess('applicationApprover', 'shiftChange');
  const a4  = useCanAccess('applicationApprover', 'outDuty');
  const a5  = useCanAccess('applicationApprover', 'overtime');
  const a6  = useCanAccess('applicationApprover', 'wfh');
  const a7  = useCanAccess('applicationApprover', 'punch');
  const a8  = useCanAccess('applicationApprover', 'encashment');
  const a9  = useCanAccess('applicationApprover', 'compOff');
  const a10 = useCanAccess('applicationApprover', 'attendance');

  const flags = [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];
  const visible = loading ? SERVICES : SERVICES.filter((_, i) => flags[i]);
  if (!loading && visible.length === 0) return null;

  return (
    <View className="mx-2 mt-4">
      <View className="flex-row items-center px-1 pb-2 gap-2">
        <View className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
        <Text className="text-[11px] font-bold text-[#6b7280] tracking-[0.4px] uppercase">Approvals</Text>
      </View>
      <View style={{ gap: 10 }}>
        {chunk(visible, 2).map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row" style={{ gap: 10 }}>
            {row.map((svc) => {
              const sep = svc.approverRoute.includes('?') ? '&' : '?';
              return (
                <ServiceCard key={svc.title} svc={svc} onPress={() => router.push(`${svc.approverRoute}${sep}mode=approver` as any)} />
              );
            })}
            {row.length < 2 && <View className="flex-1" />}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ApplicationsHubScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#f4f5f7]">
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* Header */}
      <View
        className="bg-[#0a1c63] px-5 pb-5 overflow-hidden"
        style={{ paddingTop: insets.top + 14 }}
      >
        <View className="absolute" style={{ width: 180, height: 180, borderRadius: 90, right: -40, top: -60, backgroundColor: '#1e3a8a', opacity: 0.5 }} />
        <View className="absolute" style={{ width: 120, height: 120, borderRadius: 60, right: 60, top: 10, backgroundColor: '#3b5bdb', opacity: 0.25 }} />

        <Text className="text-xl font-bold text-white">Applications</Text>

        {/* Summary card */}
        <View
          className="mt-4 rounded-2xl p-3.5 flex-row items-center gap-3.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Ionicons name="document-text-outline" size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-bold text-[#c7d2fe] tracking-[0.4px] uppercase">HR Self Service</Text>
            <Text className="text-sm font-extrabold text-white mt-0.5">Submit & track requests</Text>
            <Text className="text-[11px] text-[#a5b4fc] mt-0.5">Leave · Shift · Attendance · More</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#a5b4fc" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ApplierSection />
        <ApproverSection />
      </ScrollView>
    </View>
  );
}
