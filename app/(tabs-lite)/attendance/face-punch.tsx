/**
 * FacePunchScreen — dedicated face-punch page for factory attendance.
 *
 * Route: /(tabs-lite)/attendance/face-punch
 * Query params (all optional, pre-filled from Home shortcut):
 *   shiftName   e.g. "B Shift"
 *   shiftStart  "14:00"
 *   shiftEnd    "22:00"
 *   gateName    "Gate 3"
 *   plantName   "Plant 2"
 *   punchType   "in" | "out"   (auto-detected from last punch if absent)
 *
 * States:
 *   ready | locating | verifying | liveness | failed | success | low_light | ppe | offline
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { HEADER_SPACER_HEIGHT, ScreenHeader } from '@/components/ui/ScreenHeader';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { getAccessToken } from '@/hooks/auth/token-store';
import { getSessionCookieHeaders } from '@/hooks/auth/bff-session';
import { FaceCamera } from './components/FaceCamera';
import { DailySummary } from './muster/DailySummary';
import { FacePunch } from './muster/FacePunch';
import { FacePunchHistory, type FacePunchRecord } from './muster/FacePunchHistory';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE       = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PUNCH_URL      = `${API_BASE}/api/command/attendance/punch/validate`;
const DATA_CHECK_URL = process.env.EXPO_PUBLIC_DATA_CHECK_URL ?? 'muster/data_check/search';
const FACE_PUNCH_URL = process.env.EXPO_PUBLIC_FACE_PUNCH_URL ?? 'mobile_attendance_punches/search';

// Hex values kept for Ionicons/SVG color props — cannot use className there
const C = {
  navy:    '#0B1424',
  green:   '#1D9E75',
  greenDk: '#0F6E56',
  amber:   '#854F0B',
  amberBg: '#FEF3C7',
  amberFg: '#D97706',
  red:     '#791F1F',
  redBg:   '#FEE2E2',
  redFg:   '#DC2626',
  border:  '#E2E8F0',
  muted:   '#64748B',
  subtle:  '#94A3B8',
};

const RING_R = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;
const MAX_ATTEMPTS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type PunchCardState =
  | 'ready'
  | 'locating'
  | 'verifying'
  | 'liveness'
  | 'failed'
  | 'success'
  | 'low_light'
  | 'ppe'
  | 'offline';

type GeoCoords = { latitude: number; longitude: number; accuracy: number };

type TodayPunch = {
  _id: string;
  punchedTime: string;
  transactionTime: string;
  inOut: string;
  typeOfMovement: string;
  readerSerialNumber: string;
};

type PunchResponse = {
  employeeID: string;
  dateTime: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  tenantCode: string;
  punchPhotoPath: string;
  status: string;
  geofenceValidated: boolean;
  validated: boolean;
  errorDescription: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
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

async function requestLocation(): Promise<GeoCoords> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission Required',
        message: 'Face punch needs your GPS location to record your attendance.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Location permission denied.');
    }
  }
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        if (err.code === 1) reject(new Error('Location permission denied.'));
        else if (err.code === 2) reject(new Error('GPS signal unavailable.'));
        else reject(new Error('Location timed out.'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

async function submitPunch(opts: {
  base64Image: string;
  employeeID: string;
  tenantCode: string;
  geo: GeoCoords;
}): Promise<PunchResponse> {
  const { base64Image, employeeID, tenantCode, geo } = opts;
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const dateTime = ist.toISOString().replace('Z', '+05:30');

  const eventJson = JSON.stringify({
    tenant: tenantCode || 'default',
    action: 'insert',
    collectionName: 'mobile_attendance_punches',
    event: '',
    id: '',
    data: {
      employeeID,
      dateTime,
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracy: geo.accuracy,
    },
  });

  // React Native's fetch() does not support data: URIs on Android —
  // use the {uri, name, type} object form instead, which the native
  // FormData implementation handles correctly on both iOS and Android.
  const form = new FormData();
  form.append('event', eventJson);
  form.append('punchPhoto', { uri: base64Image, name: 'punch.jpg', type: 'image/jpeg' } as any);

  const res = await fetch(PUNCH_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...getSessionCookieHeaders(),
      'X-user': 'default-user',
      'X-Tenant': tenantCode || 'default',
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Server ${res.status}: ${body || res.statusText}`);
  }

  return (await res.json()) as PunchResponse;
}

function fmt(iso: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

function todayISOKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hindiDate() {
  const d = new Date();
  const MONTH_HI = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
  return `${d.getDate()} ${MONTH_HI[d.getMonth()]}`;
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ progress, color = C.green }: { progress: Animated.Value; color?: string }) {
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    // SVG position style stays inline — SVG doesn't support className
    <Svg
      width={100} height={100}
      style={{ position: 'absolute', top: 0, left: 0 }}
      viewBox="0 0 100 100"
    >
      <Circle cx={50} cy={50} r={RING_R} stroke={C.border} strokeWidth={3} fill="none" />
      <AnimatedCircle
        cx={50} cy={50} r={RING_R}
        stroke={color} strokeWidth={3} fill="none"
        strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
    </Svg>
  );
}

// ─── ScanIcon ─────────────────────────────────────────────────────────────────

function ScanIcon({ state, progress }: { state: PunchCardState; progress: Animated.Value }) {
  const iconName: React.ComponentProps<typeof Ionicons>['name'] =
    state === 'success'                              ? 'checkmark-circle'
    : state === 'failed'                             ? 'close-circle'
    : state === 'low_light'                          ? 'sunny-outline'
    : state === 'ppe'                                ? 'shield-outline'
    : state === 'offline'                            ? 'wifi-outline'
    : state === 'verifying' || state === 'liveness'  ? 'scan-circle-outline'
    : 'scan-circle-outline';

  // Hex kept for Ionicons/ProgressRing color props
  const iconColor =
    state === 'success'   ? C.green
    : state === 'failed'  ? C.redFg
    : state === 'liveness' ? C.amberFg
    : '#0B1424';

  const ringColor =
    state === 'success'   ? C.green
    : state === 'failed'  ? C.redFg
    : state === 'liveness' ? C.amberFg
    : C.green;

  // bgClass for the icon circle — all branches are static strings the scanner picks up
  const bgClass =
    state === 'success'   ? 'bg-[#DCFCE7]'
    : state === 'failed'  ? 'bg-red-100'
    : state === 'liveness' ? 'bg-amber-100'
    : 'bg-[#E8F5F0]';

  return (
    <View className="w-[100px] h-[100px] items-center justify-center">
      <ProgressRing progress={progress} color={ringColor} />
      <View className={`w-[86px] h-[86px] rounded-full items-center justify-center ${bgClass}`}>
        <Ionicons name={iconName} size={40} color={iconColor} />
      </View>
    </View>
  );
}

// ─── WarningBanner ────────────────────────────────────────────────────────────

function WarningBanner({ type }: { type: 'low_light' | 'ppe' | 'offline' | null }) {
  if (!type) return null;

  const configs = {
    low_light: {
      icon: 'sunny-outline' as const,
      title: 'Low light detected',
      sub: 'Move to a brighter area and try again.',
      bgClass: 'bg-amber-100', fg: C.amber,
    },
    ppe: {
      icon: 'shield-outline' as const,
      title: 'PPE / mask conflict',
      sub: 'Please remove face covering for verification.',
      bgClass: 'bg-[#FEF2F2]', fg: C.red,
    },
    offline: {
      icon: 'wifi-outline' as const,
      title: 'You are offline',
      sub: 'Punch will be saved and synced when connection returns.',
      bgClass: 'bg-[#F0F9FF]', fg: '#0369A1',
    },
  };

  const { icon, title, sub, bgClass, fg } = configs[type];
  return (
    <View className={`flex-row items-start gap-2 rounded-[10px] px-3 py-[9px] mb-3.5 ${bgClass}`}>
      {/* Ionicons margin stays inline — Ionicons doesn't accept className */}
      <Ionicons name={icon} size={16} color={fg} style={{ marginTop: 1 }} />
      <View className="flex-1">
        {/* fg is runtime — keep as inline style color */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{title}</Text>
        <Text style={{ fontSize: 11, color: fg, opacity: 0.85, marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

// ─── StatusText ───────────────────────────────────────────────────────────────

function StatusText({ state, attempts, punchTime, punchDirection, lastPunch }: {
  state: PunchCardState;
  attempts: number;
  punchTime: string;
  punchDirection: string;
  lastPunch: { time: string; type: string } | null;
}) {
  const dirLabel = punchDirection === 'out' ? 'Out' : 'In';

  const primary =
    state === 'ready'       ? `Look at the camera to punch ${punchDirection}`
    : state === 'locating'  ? 'Getting your location…'
    : state === 'verifying' ? 'Verifying face…'
    : state === 'liveness'  ? "Blink to confirm you're present"
    : state === 'failed'    ? "Face didn't match"
    : state === 'success'   ? `Punched ${punchDirection}`
    : state === 'low_light' ? 'Adjust lighting'
    : state === 'ppe'       ? 'PPE conflict'
    : 'Offline — will sync';

  const secondary =
    state === 'failed'   ? `Attempt ${attempts} of ${MAX_ATTEMPTS}`
    : state === 'success' ? `Punched ${punchDirection} at ${punchTime}`
    : state === 'ready'  ? `Punch type detected: ${dirLabel}`
    : lastPunch
      ? `Last punch · today, ${lastPunch.time}, ${lastPunch.type}`
      : '';

  const primaryClass =
    state === 'failed'    ? 'text-red-600'
    : state === 'success' ? 'text-[#0F6E56]'
    : state === 'liveness' ? 'text-amber-500'
    : 'text-[#111827]';

  const secondaryClass =
    state === 'failed'    ? 'text-red-600'
    : state === 'success' ? 'text-[#1D9E75]'
    : 'text-gray-400';

  return (
    <View className="items-center">
      <Text className={`text-[15px] font-semibold leading-[22px] text-center ${primaryClass}`}>
        {primary}
      </Text>
      {!!secondary && (
        <Text className={`text-xs mt-1 font-normal text-center ${secondaryClass}`}>
          {secondary}
        </Text>
      )}
    </View>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, icon, value, sub }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  sub: string;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-xl p-3"
      style={{
        shadowColor: '#0B1424', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
      }}
    >
      <View className="flex-row items-center gap-[5px] mb-1.5">
        <Ionicons name={icon} size={13} color={C.muted} />
        <Text className="text-[11px] text-[#64748B] font-semibold">{label}</Text>
      </View>
      <Text className="text-[22px] font-extrabold text-[#0B1424] tracking-[-0.5px]">{value}</Text>
      <Text className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{sub}</Text>
    </View>
  );
}



// ─── ShiftPill ────────────────────────────────────────────────────────────────

function ShiftPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.14)',
        borderRadius: 999,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      })}
    >
      <Text className="text-white text-[13px] font-bold">{label}</Text>
      <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.75)" />
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FacePunchScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{
    shiftName?: string; shiftStart?: string; shiftEnd?: string;
    gateName?: string;  plantName?: string;  punchType?: string;
  }>();

  const shiftName  = params.shiftName  ?? 'B Shift';
  const shiftStart = params.shiftStart ?? '14:00';
  const shiftEnd   = params.shiftEnd   ?? '22:00';
  const gateName   = params.gateName   ?? 'Gate 3';
  const plantName  = params.plantName  ?? 'Plant 2';

  const [employeeID, setEmployeeID] = useState('');
  const [tenantCode, setTenantCode] = useState('');

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const p = decodeJwtPayload(token);
      if (!p) return;
      setEmployeeID(String(p.employeeID ?? p.employeeId ?? p.empId ?? ''));
      setTenantCode(String(p.tenantCode ?? p.tenant ?? p.org ?? ''));
    };
    void run();
  }, []);

  const [cardState, setCardState] = useState<PunchCardState>('ready');
  const [attempts,  setAttempts]  = useState(0);
  const [punchTime, setPunchTime] = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');

  const [showCamera, setShowCamera] = useState(false);
  const [geo,        setGeo]        = useState<GeoCoords>({ latitude: 0, longitude: 0, accuracy: 0 });
  const camKey = useRef(0);

  const ringProgress = useRef(new Animated.Value(0)).current;
  const ringAnim     = useRef<Animated.CompositeAnimation | null>(null);

  const [todayPunches,    setTodayPunches]    = useState<TodayPunch[]>([]);
  const [facePunchHistory, setFacePunchHistory] = useState<FacePunchRecord[]>([]);

  const lastPunch = useMemo(() => {
    if (todayPunches.length === 0) return null;
    const sorted = [...todayPunches].sort((a, b) =>
      new Date(b.transactionTime || b.punchedTime).getTime() -
      new Date(a.transactionTime || a.punchedTime).getTime()
    );
    const p = sorted[0];
    const isIn = p.inOut?.toUpperCase() === 'I' || p.typeOfMovement?.toUpperCase() === 'I';
    return { time: fmt(p.transactionTime || p.punchedTime), type: isIn ? 'In' : 'Out' };
  }, [todayPunches]);

  const punchDirection = params.punchType
    ?? (lastPunch?.type === 'In' ? 'out' : 'in');

  useGetRequest<TodayPunch[]>({
    url: DATA_CHECK_URL,
    method: 'POST',
    params: { offset: 0, limit: 20 },
    data: [
      { field: 'employeeID', value: employeeID, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
      { field: 'date',       value: todayISOKey(), operator: 'eq' },
    ],
    enabled: Boolean(employeeID && tenantCode),
    dependencies: [employeeID, tenantCode],
    onSuccess: (data) => setTodayPunches(data ?? []),
    onError:   () => setTodayPunches([]),
  });

  useGetRequest<FacePunchRecord[]>({
    url: FACE_PUNCH_URL,
    method: 'POST',
    params: { offset: 0, limit: 20 },
    data: [
      { field: 'employeeID', value: employeeID, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeID && tenantCode),
    dependencies: [employeeID, tenantCode],
    onSuccess: (data) => {
      const sorted = [...(data ?? [])].sort(
        (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );
      setFacePunchHistory(sorted);
    },
    onError: () => setFacePunchHistory([]),
  });

  const startRingLoop = useCallback(() => {
    ringProgress.setValue(0);
    ringAnim.current = Animated.loop(
      Animated.timing(ringProgress, { toValue: 1, duration: 1200, useNativeDriver: false })
    );
    ringAnim.current.start();
  }, [ringProgress]);

  const fillRingOnce = useCallback(() => {
    ringAnim.current?.stop();
    ringProgress.setValue(0);
    ringAnim.current = Animated.timing(ringProgress, { toValue: 1, duration: 900, useNativeDriver: false });
    ringAnim.current.start();
  }, [ringProgress]);

  const resetRing = useCallback(() => {
    ringAnim.current?.stop();
    ringProgress.setValue(0);
  }, [ringProgress]);

  const handleCameraMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      let msg: { type: string; data?: string; message?: string; level?: string };
      try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

      if (msg.type === 'log') return;

      if (msg.type === 'liveness') {
        ringAnim.current?.stop();
        setCardState('liveness');
        return;
      }

      if (msg.type === 'low_light') {
        setShowCamera(false);
        resetRing();
        setCardState('low_light');
        return;
      }

      if (msg.type === 'photo' && msg.data) {
        setShowCamera(false);
        setCardState('verifying');
        fillRingOnce();

        try {
          const result = await submitPunch({ base64Image: msg.data, employeeID, tenantCode, geo });

          if (result.status === 'SUCCESS' || result.validated === true) {
            const t = result.dateTime
              ? new Date(result.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            setPunchTime(t);
            setTodayPunches((prev) => [
              ...prev,
              {
                _id: String(Date.now()),
                punchedTime: result.dateTime,
                transactionTime: result.dateTime,
                inOut: punchDirection === 'in' ? 'I' : 'O',
                typeOfMovement: punchDirection === 'in' ? 'I' : 'O',
                readerSerialNumber: gateName,
              },
            ]);
            setTimeout(() => { resetRing(); setCardState('success'); }, 950);
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            resetRing();
            setCardState('failed');
          }
        } catch {
          resetRing();
          setCardState('failed');
          setAttempts((a) => a + 1);
        }
      } else if (msg.type === 'error') {
        setShowCamera(false);
        resetRing();
        setCardState('failed');
        setAttempts((a) => a + 1);
      }
    },
    [employeeID, tenantCode, geo, attempts, punchDirection, gateName, fillRingOnce, resetRing]
  );

  const handleCameraClose = useCallback(() => {
    setShowCamera(false);
    if (cardState === 'verifying' || cardState === 'liveness') {
      resetRing();
      setCardState('ready');
    }
  }, [cardState, resetRing]);

  const firstPunch = useMemo(() => {
    if (todayPunches.length === 0) return null;
    const sorted = [...todayPunches].sort((a, b) =>
      new Date(a.transactionTime || a.punchedTime).getTime() -
      new Date(b.transactionTime || b.punchedTime).getTime()
    );
    return { time: fmt(sorted[0].transactionTime || sorted[0].punchedTime), location: sorted[0].readerSerialNumber || gateName };
  }, [todayPunches, gateName]);

  const sortedPunches = useMemo(
    () => [...todayPunches].sort((a, b) =>
      new Date(a.transactionTime || a.punchedTime).getTime() -
      new Date(b.transactionTime || b.punchedTime).getTime()
    ),
    [todayPunches]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-[#0B1424]">
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Header ── */}
      <ScreenHeader
        title="Face punch"
        backgroundColor={C.navy}
        onBack={() => router.back()}
        onNotification={() => router.push('/(tabs-lite)/settings/notifications' as any)}
        onSettings={() => router.push('/(tabs-lite)/settings' as any)}
      />

      {/* Dark spacer — runtime computed height stays inline */}
      <View style={{ height: HEADER_SPACER_HEIGHT(insets.top) }} />

      {/* ── Sheet ── */}
      <View className="flex-1 bg-[#F8FAFC] overflow-hidden">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 100, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Punch Card ── */}
          <View
            className="bg-white rounded-2xl border border-gray-200 px-5 pt-7 pb-6 items-center"
            style={{
              shadowColor:   '#CBD5E1',
              shadowOffset:  { width: 0, height: 1 },
              shadowOpacity: 0.12,
              shadowRadius:  4,
              elevation:     1,
            }}
          >
            {/* Warning banner (low-light / PPE / offline) */}
            {(cardState === 'low_light' || cardState === 'ppe' || cardState === 'offline') && (
              <View className="w-full mb-4">
                <WarningBanner
                  type={cardState === 'low_light' ? 'low_light' : cardState === 'ppe' ? 'ppe' : 'offline'}
                />
              </View>
            )}

            {/* Centered icon badge */}
            <ScanIcon state={cardState} progress={ringProgress} />

            {/* Status texts */}
            <View className="mt-5 mb-5 items-center w-full">
              <StatusText
                state={cardState}
                attempts={attempts}
                punchTime={punchTime}
                punchDirection={punchDirection}
                lastPunch={lastPunch}
              />
            </View>

            {/* After 3 failed attempts — supervisor fallback banner */}
            {cardState === 'failed' && attempts >= MAX_ATTEMPTS && (
              <View className="w-full bg-[#FFF7ED] rounded-[10px] border border-[#FED7AA] p-3 mb-4">
                <Text className="text-xs font-bold text-[#854F0B] mb-[3px]">
                  3 failed attempts
                </Text>
                <Text className="text-[11px] text-[#854F0B] leading-4">
                  Please use your employee ID & PIN, or contact your supervisor to record attendance.
                </Text>
              </View>
            )}

            {/* ── Face Punch button ── */}
            <View className="w-full">
              <FacePunch />
            </View>
          </View>

          {/* Error message (location / auth) */}
          {!!errorMsg && (
            <View className="bg-red-100 rounded-[10px] border border-[#FECACA] flex-row gap-2 p-3">
              {/* Ionicons margin stays inline */}
              <Ionicons name="alert-circle-outline" size={16} color={C.redFg} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-xs text-red-600 leading-[17px]">{errorMsg}</Text>
            </View>
          )}

          {/* ── Daily Summary ── */}
          <DailySummary selectedDate={new Date()} />

          {/* ── Face Punch History ── */}
          <FacePunchHistory records={facePunchHistory} />

          {/* ── Footer: View monthly attendance ── */}
          <Pressable
            onPress={() => router.push('/(tabs-lite)/attendance' as any)}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-full border-[1.5px] border-[#E2E8F0] bg-white py-[14px] active:border-[#CBD5E1] active:bg-[#F1F5F9]"
          >
            <Ionicons name="calendar-outline" size={16} color={C.muted} />
            <Text className="text-sm text-[#64748B] font-bold">View monthly attendance</Text>
          </Pressable>

        </ScrollView>
      </View>

      {/* ── Camera Modal ── */}
      <Modal
        visible={showCamera}
        transparent
        animationType="slide"
        onRequestClose={handleCameraClose}
      >
        <View className="flex-1 bg-black/60 justify-end">
          {/* Full-screen dismiss tap target */}
          <Pressable className="absolute inset-0" onPress={handleCameraClose} />

          {/* Modal sheet — insets.bottom is runtime, stays inline */}
          <View
            className="bg-[#0B1424] rounded-t-3xl h-4/5"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Handle */}
            <View className="w-9 h-1 rounded-full bg-white/20 self-center mt-2.5 mb-2" />

            {/* Camera header */}
            <View className="flex-row items-center justify-between px-[18px] pb-3">
              <View>
                <Text className="text-white text-base font-bold">Face verification</Text>
                <Text className="text-white/50 text-[11px] mt-0.5">
                  {cardState === 'liveness' ? 'Blink once to confirm' : 'Centre your face in the oval, then blink once'}
                </Text>
              </View>
              <Pressable
                onPress={handleCameraClose}
                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* WebView camera */}
            <View className="flex-1 rounded-2xl overflow-hidden mx-4 mb-3">
              <FaceCamera key={camKey.current} onMessage={handleCameraMessage} />
            </View>

            {/* Geo badge */}
            {geo.latitude !== 0 && (
              <View className="flex-row items-center gap-1.5 bg-[rgba(29,158,117,0.15)] rounded-lg px-3.5 py-1.5 mx-4">
                <Ionicons name="location" size={12} color={C.green} />
                <Text className="text-[11px] text-[#1D9E75] font-semibold">
                  {`${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}  ±${Math.round(geo.accuracy)}m`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
