import { useRolePermissions } from '@/hooks/api/useRolePermissions';
import { getAccessToken } from '@/hooks/auth/token-store';
import { useCanAccess } from '@/hooks/auth/useScreenPermissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type ServiceDef = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  applierRoute: string;
  approverRoute: string;
};

const SERVICES: ServiceDef[] = [
  {
    title: 'Leave',
    icon: 'calendar-outline',
    applierRoute: '/(tabs-lite)/applications/leave-application?application=leave',
    approverRoute: '/(tabs-lite)/applications/leave-application?application=leave',
  },
  {
    title: 'Special Leave',
    icon: 'calendar-clear-outline',
    applierRoute: '/(tabs-lite)/applications/leave-application?application=special',
    approverRoute: '/(tabs-lite)/applications/leave-application?application=special',
  },
  {
    title: 'Edit Punch',
    icon: 'create-outline',
    applierRoute: '/(tabs-lite)/applications/edit-punch',
    approverRoute: '/(tabs-lite)/applications/edit-punch',
  },
  {
    title: 'Shift Change',
    icon: 'time-outline',
    applierRoute: '/(tabs-lite)/applications/shift-change',
    approverRoute: '/(tabs-lite)/applications/shift-change',
  },
  {
    title: 'Out Duty',
    icon: 'navigate-outline',
    applierRoute: '/(tabs-lite)/applications/out-duty-application',
    approverRoute: '/(tabs-lite)/applications/out-duty-application',
  },
  {
    title: 'OT Apply',
    icon: 'briefcase-outline',
    applierRoute: '/(tabs-lite)/applications/ot-application',
    approverRoute: '/(tabs-lite)/applications/ot-application',
  },
  {
    title: 'Work From Home',
    icon: 'home-outline',
    applierRoute: '/(tabs-lite)/applications/wfh-application',
    approverRoute: '/(tabs-lite)/applications/wfh-application',
  },
  {
    title: 'Punch Apply',
    icon: 'finger-print-outline',
    applierRoute: '/(tabs-lite)/applications/punch-application',
    approverRoute: '/(tabs-lite)/applications/punch-application',
  },
  {
    title: 'Encashment',
    icon: 'cash-outline',
    applierRoute: '/(tabs-lite)/applications/encashment-application',
    approverRoute: '/(tabs-lite)/applications/encashment-application',
  },
  {
    title: 'Comp Off',
    icon: 'swap-horizontal-outline',
    applierRoute: '/(tabs-lite)/applications/compoff-application',
    approverRoute: '/(tabs-lite)/applications/compoff-application',
  },
  {
    title: 'Attendance',
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
    <View pointerEvents="none" style={s.illustrationWrap}>
      <View style={[s.ringOuter, { backgroundColor: b.ringB }]} />
      <View style={[s.ringInner, { backgroundColor: b.ringA }]} />
      <View style={s.ringCenter}>
        <Ionicons name={b.primaryIcon} size={36} color={b.accent} />
      </View>
      <View style={[s.floatIconA, { backgroundColor: b.ringA }]}>
        <Ionicons name={b.secondaryIcon} size={14} color={b.accent} />
      </View>
      <View style={[s.floatIconB, { backgroundColor: b.ringA }]}>
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
      contentContainerStyle={s.bannerScroll}
    >
      {BANNERS.map((b) => (
        <View key={b.id} style={[s.bannerCard, { backgroundColor: b.bg }]}>
          <View pointerEvents="none" style={[s.bannerShine, { backgroundColor: b.ringA }]} />
          <BannerIllustration b={b} />
          <View style={s.bannerContent}>
            <Text style={s.bannerTitle}>{b.title}</Text>
            <Text style={s.bannerSub}>{b.sub}</Text>
            <View style={s.bannerLearnRow}>
              <Text style={[s.bannerLearn, { color: b.accent }]}>Learn More</Text>
              <Ionicons name="arrow-forward" size={11} color={b.accent} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function ServiceCard({ svc, onPress }: { svc: ServiceDef; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.94 }], opacity: 0.8 }]}
      onPress={onPress}
    >
      <View style={s.cardIconWrap}>
        <Ionicons name={svc.icon} size={22} color="#1e3a8a" />
      </View>
      <Text style={s.cardTitle} numberOfLines={2}>{svc.title}</Text>
    </Pressable>
  );
}

function CardGrid({ services, getRoute }: { services: ServiceDef[]; getRoute: (svc: ServiceDef) => string }) {
  const router = useRouter();
  return (
    <View style={s.grid}>
      {chunk(services, 4).map((row, rowIndex) => (
        <View key={rowIndex} style={s.gridRow}>
          {row.map((svc) => (
            <ServiceCard key={svc.title} svc={svc} onPress={() => router.push(getRoute(svc) as any)} />
          ))}
          {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
            <View key={`pad-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ApplicationsHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');

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

  const applierFlags = [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];
  const approverFlags = [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10];

  const visibleApplier = loading ? SERVICES : SERVICES.filter((_, i) => applierFlags[i]);
  const visibleApprover = loading ? SERVICES : SERVICES.filter((_, i) => approverFlags[i]);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? '') || '');
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? '') || '');
    };
    void run();
  }, []);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      <View style={[s.top, { paddingTop: insets.top + 14 }]}>
        <View style={s.topRow}>
          <View style={s.topLeft}>
            <Pressable
              style={s.backBtn}
              hitSlop={8}
              onPress={() => router.push('/(tabs-lite)/main-launchpad' as any)}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Text style={s.greeting}>Applications</Text>
          </View>
          <View style={s.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>

      </View>

      <View style={s.bannerSection}>
        <BannerCarousel />
      </View>

      <ScrollView
        style={s.sheet}
        contentContainerStyle={[s.sheetContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
      >
        {(!loading || visibleApplier.length > 0) && (
          <View style={s.panel}>
            <View style={s.panelHead}>
              <Text style={s.panelKicker}>MY APPLICATIONS</Text>
              <Text style={s.panelLink}>All services: {visibleApplier.length}</Text>
            </View>
            <CardGrid
              services={visibleApplier}
              getRoute={(svc) => {
                const sep = svc.applierRoute.includes('?') ? '&' : '?';
                return `${svc.applierRoute}${sep}mode=applier`;
              }}
            />
          </View>
        )}

        {(!loading || visibleApprover.length > 0) && visibleApprover.length > 0 && (
          <View style={s.panel}>
            <View style={s.panelHead}>
              <Text style={s.panelKicker}>APPROVALS</Text>
              <Text style={s.panelLink}>All services: {visibleApprover.length}</Text>
            </View>
            <CardGrid
              services={visibleApprover}
              getRoute={(svc) => {
                const sep = svc.approverRoute.includes('?') ? '&' : '?';
                return `${svc.approverRoute}${sep}mode=approver`;
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a1c63' },

  top: { paddingHorizontal: 16, paddingBottom: 18, backgroundColor: '#0a1c63' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '700' },
  topIcons: { flexDirection: 'row', gap: 14 },

  bannerSection: { backgroundColor: '#0a1c63', paddingTop: 0, paddingBottom: 16 },
  sheet: { flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { paddingHorizontal: 14, paddingTop: 14, gap: 12 },

  bannerScroll: { gap: 12, paddingHorizontal: 16 },
  bannerCard: { width: 260, height: 160, borderRadius: 18, overflow: 'hidden', flexDirection: 'row' },
  bannerShine: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -80, right: -60, opacity: 0.4,
  },
  illustrationWrap: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 110,
    alignItems: 'center', justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
  },
  ringInner: {
    position: 'absolute', width: 68, height: 68, borderRadius: 34,
  },
  ringCenter: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  floatIconA: {
    position: 'absolute', top: 14, right: 10,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  floatIconB: {
    position: 'absolute', bottom: 18, left: 6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerContent: { flex: 1, paddingVertical: 16, paddingLeft: 16, paddingRight: 4, justifyContent: 'flex-end' },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 22, letterSpacing: -0.3, marginBottom: 4 },
  bannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500', lineHeight: 14, marginBottom: 10 },
  bannerLearnRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bannerLearn: { fontSize: 11, fontWeight: '700' },

  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelKicker: { fontSize: 10, letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' },
  panelLink: { fontSize: 12, color: '#64748b' },

  grid: { gap: 4 },
  gridRow: { flexDirection: 'row' },

  card: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cardIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 10.5, fontWeight: '500',
    color: '#334155', textAlign: 'center', lineHeight: 14,
  },
});
