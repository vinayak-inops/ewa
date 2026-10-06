import { useRolePermissions } from '@/hooks/api/useRolePermissions';
import { useCanAccess } from '@/hooks/auth/useScreenPermissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


type ServiceDef = {
  title: string;
  approverTitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  applierRoute: string;
  approverRoute: string;
};

const LEAVE_POPUP_ROUTE = '__leave_popup__';

const SERVICES: ServiceDef[] = [
  {
    title: 'Leave Application',
    approverTitle: 'Leave Approval',
    icon: 'calendar-outline',
    applierRoute: LEAVE_POPUP_ROUTE,
    approverRoute: LEAVE_POPUP_ROUTE,
  },
  {
    title: 'Edit Punch',
    approverTitle: 'Punch Edit Approval',
    icon: 'create-outline',
    applierRoute: '/(tabs-lite)/applications/edit-punch',
    approverRoute: '/(tabs-lite)/applications/edit-punch',
  },
  {
    title: 'Shift Change',
    approverTitle: 'Shift Change Approval',
    icon: 'time-outline',
    applierRoute: '/(tabs-lite)/applications/shift-change',
    approverRoute: '/(tabs-lite)/applications/shift-change',
  },
  {
    title: 'Out Duty',
    approverTitle: 'Out Duty Approval',
    icon: 'navigate-outline',
    applierRoute: '/(tabs-lite)/applications/out-duty-application',
    approverRoute: '/(tabs-lite)/applications/out-duty-application',
  },
  {
    title: 'OT Apply',
    approverTitle: 'OT Approval',
    icon: 'briefcase-outline',
    applierRoute: '/(tabs-lite)/applications/ot-application',
    approverRoute: '/(tabs-lite)/applications/ot-application',
  },
  {
    title: 'Work From Home',
    approverTitle: 'WFH Approval',
    icon: 'home-outline',
    applierRoute: '/(tabs-lite)/applications/wfh-application',
    approverRoute: '/(tabs-lite)/applications/wfh-application',
  },
  {
    title: 'Punch Apply',
    approverTitle: 'Punch Approval',
    icon: 'finger-print-outline',
    applierRoute: '/(tabs-lite)/applications/punch-application',
    approverRoute: '/(tabs-lite)/applications/punch-application',
  },
  {
    title: 'Encashment',
    approverTitle: 'Encashment Approval',
    icon: 'cash-outline',
    applierRoute: '/(tabs-lite)/applications/encashment-application',
    approverRoute: '/(tabs-lite)/applications/encashment-application',
  },
  {
    title: 'Comp Off',
    approverTitle: 'Comp Off Approval',
    icon: 'swap-horizontal-outline',
    applierRoute: '/(tabs-lite)/applications/compoff-application',
    approverRoute: '/(tabs-lite)/applications/compoff-application',
  },
  {
    title: 'Attendance',
    approverTitle: 'Attendance Approval',
    icon: 'today-outline',
    applierRoute: '/(tabs-lite)/attendance',
    approverRoute: '/(tabs-lite)/attendance',
  },
];

type BannerDef = {
  id: string;
  title: string;
  sub: string;
  bg: string;
  ringA: string;
  ringB: string;
  accent: string;
  primaryIcon: React.ComponentProps<typeof Ionicons>['name'];
  secondaryIcon: React.ComponentProps<typeof Ionicons>['name'];
  tertiaryIcon: React.ComponentProps<typeof Ionicons>['name'];
};

const BANNERS: BannerDef[] = [
  {
    id: 'b1',
    title: 'Apply Leave\nHassle-Free.',
    sub: 'Submit & track leave requests instantly',
    bg: '#1d4ed8',
    ringA: 'rgba(59,130,246,0.35)',
    ringB: 'rgba(96,165,250,0.2)',
    accent: '#bfdbfe',
    primaryIcon: 'calendar-outline',
    secondaryIcon: 'checkmark-done-outline',
    tertiaryIcon: 'time-outline',
  },
  {
    id: 'b2',
    title: 'Empower Your\nWork Schedule.',
    sub: 'WFH, shift changes & more at your fingertips',
    bg: '#0369a1',
    ringA: 'rgba(14,165,233,0.35)',
    ringB: 'rgba(56,189,248,0.2)',
    accent: '#bae6fd',
    primaryIcon: 'home-outline',
    secondaryIcon: 'laptop-outline',
    tertiaryIcon: 'wifi-outline',
  },
  {
    id: 'b3',
    title: 'Track Overtime\n& Comp Off.',
    sub: 'Log OT hours and claim compensatory time off',
    bg: '#1e3a8a',
    ringA: 'rgba(37,99,235,0.4)',
    ringB: 'rgba(59,130,246,0.2)',
    accent: '#93c5fd',
    primaryIcon: 'briefcase-outline',
    secondaryIcon: 'swap-horizontal-outline',
    tertiaryIcon: 'cash-outline',
  },
  {
    id: 'b4',
    title: 'Fix Your\nAttendance\nRecords.',
    sub: 'Edit punch records and missing entries easily',
    bg: '#4338ca',
    ringA: 'rgba(99,102,241,0.4)',
    ringB: 'rgba(129,140,248,0.2)',
    accent: '#c7d2fe',
    primaryIcon: 'finger-print-outline',
    secondaryIcon: 'create-outline',
    tertiaryIcon: 'shield-checkmark-outline',
  },
];

function BannerIllustration({ b }: { b: BannerDef }) {
  return (
    <View pointerEvents="none" className="absolute right-0 top-0 bottom-0 w-[110px] items-center justify-center">
      <View className="absolute w-24 h-24 rounded-full" style={{ backgroundColor: b.ringB }} />
      <View className="absolute w-[68px] h-[68px] rounded-full" style={{ backgroundColor: b.ringA }} />
      <View className="w-[52px] h-[52px] rounded-full bg-white/[0.12] items-center justify-center">
        <Ionicons name={b.primaryIcon} size={36} color={b.accent} />
      </View>
      <View
        className="absolute top-3.5 right-2.5 w-[26px] h-[26px] rounded-full items-center justify-center"
        style={{ backgroundColor: b.ringA }}
      >
        <Ionicons name={b.secondaryIcon} size={14} color={b.accent} />
      </View>
      <View
        className="absolute bottom-[18px] left-1.5 w-[22px] h-[22px] rounded-full items-center justify-center"
        style={{ backgroundColor: b.ringA }}
      >
        <Ionicons name={b.tertiaryIcon} size={12} color={b.accent} />
      </View>
    </View>
  );
}

function BannerCarousel() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={272}
      snapToAlignment="start"
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
    >
      {BANNERS.map((b) => (
        <View
          key={b.id}
          className="w-[260px] h-[160px] rounded-[18px] overflow-hidden flex-row"
          style={{ backgroundColor: b.bg }}
        >
          <View
            pointerEvents="none"
            className="absolute w-[200px] h-[200px] rounded-full -top-[80px] -right-[60px] opacity-40"
            style={{ backgroundColor: b.ringA }}
          />
          <BannerIllustration b={b} />
          <View className="flex-1 py-4 pl-4 pr-1 justify-end">
            <Text className="text-base text-white font-extrabold leading-[22px] tracking-[-0.3px] mb-1">
              {b.title}
            </Text>
            <Text className="text-[10px] text-white/60 font-medium leading-[14px] mb-2.5">
              {b.sub}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function LeaveTypePopup({
  visible,
  onClose,
  onShortDay,
  onLongDay,
}: {
  visible: boolean;
  onClose: () => void;
  onShortDay: () => void;
  onLongDay: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/[0.45] justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-tl-3xl rounded-tr-3xl px-5 pt-3 pb-8 gap-1">
          <View className="w-10 h-1 rounded-sm bg-slate-200 self-center mb-3.5" />
          <Text className="text-[18px] font-extrabold text-[#0f172a] mb-0.5">Select Leave Type</Text>
          <Text className="text-[13px] text-slate-500 mb-3.5">Choose the type of leave you want to apply for</Text>

          <Pressable className="mb-2" onPress={onShortDay}>
            {({ pressed }) => (
              <View
                className="flex-row items-center gap-3.5 bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-200"
                style={pressed ? { opacity: 0.75 } : undefined}
              >
                <View className="w-[46px] h-[46px] rounded-[14px] items-center justify-center bg-[#eff6ff]">
                  <Ionicons name="partly-sunny-outline" size={22} color="#1d4ed8" />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[15px] font-bold text-[#0f172a]">Short Day Leave</Text>
                  <Text className="text-xs text-slate-500">Half day or short absence</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            )}
          </Pressable>

          <Pressable className="mb-2" onPress={onLongDay}>
            {({ pressed }) => (
              <View
                className="flex-row items-center gap-3.5 bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-200"
                style={pressed ? { opacity: 0.75 } : undefined}
              >
                <View className="w-[46px] h-[46px] rounded-[14px] items-center justify-center bg-[#f0fdf4]">
                  <Ionicons name="calendar-clear-outline" size={22} color="#15803d" />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[15px] font-bold text-[#0f172a]">Long Day Leave</Text>
                  <Text className="text-xs text-slate-500">Full day or multi-day absence</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            )}
          </Pressable>

          <Pressable
            className="mt-1.5 py-3.5 items-center rounded-[14px] border border-slate-200"
            onPress={onClose}
          >
            <Text className="text-[15px] font-semibold text-slate-500">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function ServiceCard({ svc, displayTitle, onPress }: { svc: ServiceDef; displayTitle: string; onPress: () => void }) {
  return (
    <Pressable className="flex-1" onPress={onPress}>
      {({ pressed }) => (
        <View
          className="py-2.5 px-1 bg-transparent"
          style={pressed ? { transform: [{ scale: 0.94 }], opacity: 0.8 } : undefined}
        >
          <View className="w-[52px] h-[52px] rounded-full bg-[#eff6ff] items-center justify-center mb-1.5 self-center">
            <Ionicons name={svc.icon} size={22} color="#1e3a8a" />
          </View>
          <Text className="text-[10.5px] font-medium text-slate-700 text-center leading-[14px]" numberOfLines={2}>
            {displayTitle}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function CardGrid({
  services,
  getRoute,
  onLeavePress,
  mode,
}: {
  services: ServiceDef[];
  getRoute: (svc: ServiceDef) => string;
  onLeavePress: () => void;
  mode: 'applier' | 'approver';
}) {
  const router = useRouter();
  return (
    <View className="gap-1">
      {chunk(services, 4).map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row">
          {row.map((svc) => (
            <ServiceCard
              key={svc.title}
              svc={svc}
              displayTitle={mode === 'approver' ? svc.approverTitle : svc.title}
              onPress={() => {
                const route = getRoute(svc);
                if (route === LEAVE_POPUP_ROUTE) { onLeavePress(); }
                else { router.push(route as any); }
              }}
            />
          ))}
          {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ApplicationsHubScreen() {
  const insets = useSafeAreaInsets();
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

  const b0  = useCanAccess('applicationApprover', 'leave');
  const b1  = useCanAccess('applicationApprover', 'specialLeave');
  const b2  = useCanAccess('applicationApprover', 'editPunchApplication');
  const b3  = useCanAccess('applicationApprover', 'shiftChange');
  const b4  = useCanAccess('applicationApprover', 'outDuty');
  const b5  = useCanAccess('applicationApprover', 'overtime');
  const b6  = useCanAccess('applicationApprover', 'wfh');
  const b7  = useCanAccess('applicationApprover', 'punch');
  const b8  = useCanAccess('applicationApprover', 'encashment');
  const b9  = useCanAccess('applicationApprover', 'compOff');
  const b10 = useCanAccess('applicationApprover', 'attendance');

  const applierFlags  = [a0 || a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];
  const approverFlags = [b0 || b1, b2, b3, b4, b5, b6, b7, b8, b9, b10];

  const visibleApplier  = loading ? [] : SERVICES.filter((_, i) => applierFlags[i]);
  const visibleApprover = loading ? [] : SERVICES.filter((_, i) => approverFlags[i]);

  const [leavePopupVisible, setLeavePopupVisible] = useState(false);
  const [leaveMode, setLeaveMode] = useState<'applier' | 'approver'>('applier');

  return (
    <View className="flex-1 bg-[#0a1c63]">
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* ── HEADER ── */}
      <SafeAreaView edges={['top']} className="bg-[#0a1c63]">
        <View className="flex-row justify-between items-center px-4 pt-3 pb-[18px]">
          <View className="flex-row items-center gap-2.5">
            <Pressable
              className="w-8 h-8 rounded-full bg-white/15 items-center justify-center"
              hitSlop={8}
              onPress={() => router.navigate('/(tabs-lite)/main-launchpad' as any)}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Text className="text-white text-xl font-bold">Applications</Text>
          </View>
          <View className="flex-row gap-3.5">
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>
      </SafeAreaView>

      {/* ── BANNER CAROUSEL ── */}
      <View className="bg-[#0a1c63] pb-4">
        <BannerCarousel />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center bg-[#f8fafc] rounded-t-3xl">
          <ActivityIndicator size="large" color="#bfdbfe" />
          <Text className="text-slate-500 text-[13px] font-medium mt-3.5">Loading your services...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-[#f8fafc] rounded-t-3xl"
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, gap: 12, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
        >
          {visibleApplier.length > 0 && (
            <View className="bg-white rounded-2xl p-3.5 gap-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-[10px] tracking-[0.8px] text-slate-400 font-bold">MY APPLICATIONS</Text>
                <Text className="text-xs text-slate-500">All services: {visibleApplier.length}</Text>
              </View>
              <CardGrid
                services={visibleApplier}
                mode="applier"
                getRoute={(svc) => {
                  if (svc.applierRoute === LEAVE_POPUP_ROUTE) return LEAVE_POPUP_ROUTE;
                  const sep = svc.applierRoute.includes('?') ? '&' : '?';
                  return `${svc.applierRoute}${sep}mode=applier`;
                }}
                onLeavePress={() => { setLeaveMode('applier'); setLeavePopupVisible(true); }}
              />
            </View>
          )}

          {visibleApprover.length > 0 && (
            <View className="bg-white rounded-2xl p-3.5 gap-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-[10px] tracking-[0.8px] text-slate-400 font-bold">APPROVALS</Text>
                <Text className="text-xs text-slate-500">All services: {visibleApprover.length}</Text>
              </View>
              <CardGrid
                services={visibleApprover}
                mode="approver"
                getRoute={(svc) => {
                  if (svc.approverRoute === LEAVE_POPUP_ROUTE) return LEAVE_POPUP_ROUTE;
                  const sep = svc.approverRoute.includes('?') ? '&' : '?';
                  return `${svc.approverRoute}${sep}mode=approver`;
                }}
                onLeavePress={() => { setLeaveMode('approver'); setLeavePopupVisible(true); }}
              />
            </View>
          )}
        </ScrollView>
      )}

      <LeaveTypePopup
        visible={leavePopupVisible}
        onClose={() => setLeavePopupVisible(false)}
        onShortDay={() => {
          setLeavePopupVisible(false);
          router.push(`/(tabs-lite)/applications/leave-application?application=leave&mode=${leaveMode}` as any);
        }}
        onLongDay={() => {
          setLeavePopupVisible(false);
          router.push(`/(tabs-lite)/applications/leave-application?application=special&mode=${leaveMode}` as any);
        }}
      />
    </View>
  );
}
