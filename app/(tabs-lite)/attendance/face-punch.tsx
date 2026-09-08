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

import { getAccessToken, getAuthHeader } from '@/hooks/auth/token-store';
import { FaceCamera } from './components/FaceCamera';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE  = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PUNCH_URL = `${API_BASE}/api/command/attendance/punch/validate`;
const DATA_CHECK_URL = process.env.EXPO_PUBLIC_DATA_CHECK_URL ?? 'muster/data_check/search';

const C = {
  navy:    '#0B1424',
  navyMid: '#0a1c63',
  green:   '#1D9E75',
  greenDk: '#0F6E56',
  amber:   '#854F0B',
  amberBg: '#FEF3C7',
  amberFg: '#D97706',
  red:     '#791F1F',
  redBg:   '#FEE2E2',
  redFg:   '#DC2626',
  white:   '#FFFFFF',
  card:    '#FFFFFF',
  surface: '#F8FAFC',
  border:  '#E2E8F0',
  muted:   '#64748B',
  subtle:  '#94A3B8',
};

const RING_R = 26;            // radius of the progress ring (circle centre = 30)
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
  const authHeader = await getAuthHeader();
  if (!authHeader) throw new Error('Not authenticated');

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

  const [meta, b64] = base64Image.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const photoBlob = new Blob([bytes], { type: mime });

  const form = new FormData();
  form.append('event', new Blob([eventJson], { type: 'application/json' }));
  form.append('punchPhoto', photoBlob, 'punch.jpg');

  const res = await fetch(PUNCH_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
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

  // Animated.createAnimatedComponent works with SVG via react-native-svg
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <Svg width={60} height={60} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Track */}
      <Circle
        cx={30} cy={30} r={RING_R}
        stroke={C.border} strokeWidth={3} fill="none"
      />
      {/* Fill */}
      <AnimatedCircle
        cx={30} cy={30} r={RING_R}
        stroke={color} strokeWidth={3} fill="none"
        strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation={-90}
        origin="30,30"
      />
    </Svg>
  );
}

// ─── ScanIcon ─────────────────────────────────────────────────────────────────

function ScanIcon({ state, progress }: { state: PunchCardState; progress: Animated.Value }) {
  const iconName: React.ComponentProps<typeof Ionicons>['name'] =
    state === 'success'                           ? 'checkmark-circle'
    : state === 'failed'                          ? 'close-circle'
    : state === 'low_light'                       ? 'sunny-outline'
    : state === 'ppe'                             ? 'shield-outline'
    : state === 'offline'                         ? 'wifi-outline'
    : state === 'verifying' || state === 'liveness' ? 'scan-circle-outline'
    : 'scan-circle-outline';

  const iconColor =
    state === 'success'  ? C.green
    : state === 'failed' ? C.redFg
    : state === 'liveness' ? C.amberFg
    : '#0B1424';

  const ringColor =
    state === 'success'   ? C.green
    : state === 'failed'  ? C.redFg
    : state === 'liveness' ? C.amberFg
    : C.green;

  const bgColor =
    state === 'success'   ? '#DCFCE7'
    : state === 'failed'  ? C.redBg
    : state === 'liveness' ? C.amberBg
    : '#E8F5F0';

  return (
    <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
      <ProgressRing progress={progress} color={ringColor} />
      <View style={{
        width: 46, height: 46,
        borderRadius: 23,
        backgroundColor: bgColor,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={iconName} size={26} color={iconColor} />
      </View>
    </View>
  );
}

// ─── WarningBanner (above the scan icon) ─────────────────────────────────────

function WarningBanner({ type }: { type: 'low_light' | 'ppe' | 'offline' | null }) {
  if (!type) return null;

  const configs = {
    low_light: {
      icon: 'sunny-outline' as const,
      title: 'Low light detected',
      sub: 'Move to a brighter area and try again.',
      bg: C.amberBg, fg: C.amber,
    },
    ppe: {
      icon: 'shield-outline' as const,
      title: 'PPE / mask conflict',
      sub: 'Please remove face covering for verification.',
      bg: '#FEF2F2', fg: C.red,
    },
    offline: {
      icon: 'wifi-outline' as const,
      title: 'You are offline',
      sub: 'Punch will be saved and synced when connection returns.',
      bg: '#F0F9FF', fg: '#0369A1',
    },
  };

  const { icon, title, sub, bg, fg } = configs[type];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: bg, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9,
      marginBottom: 14,
    }}>
      <Ionicons name={icon} size={16} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{title}</Text>
        <Text style={{ fontSize: 11, color: fg, opacity: 0.85, marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

// ─── StatusText ───────────────────────────────────────────────────────────────

function StatusText({ state, attempts, punchTime, lastPunch }: {
  state: PunchCardState;
  attempts: number;
  punchTime: string;
  lastPunch: { time: string; type: string } | null;
}) {
  const primary =
    state === 'ready'      ? 'Look at the camera to punch in'
    : state === 'locating' ? 'Getting your location…'
    : state === 'verifying' ? 'Verifying face'
    : state === 'liveness'  ? "Blink to confirm you're present"
    : state === 'failed'    ? "Face didn't match"
    : state === 'success'   ? 'Punched in'
    : state === 'low_light' ? 'Adjust lighting'
    : state === 'ppe'       ? 'PPE conflict'
    : 'Offline — will sync';

  const secondary =
    state === 'failed'  ? `Attempt ${attempts} of ${MAX_ATTEMPTS}`
    : state === 'success' ? `Punched in at ${punchTime}`
    : lastPunch
      ? `Last punch · today, ${lastPunch.time}, ${lastPunch.type}`
      : '';

  const primaryColor =
    state === 'failed'  ? C.redFg
    : state === 'success' ? C.greenDk
    : state === 'liveness' ? C.amberFg
    : '#0B1424';

  const secondaryColor =
    state === 'failed'  ? C.redFg
    : state === 'success' ? C.green
    : C.muted;

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: primaryColor, lineHeight: 20 }}>
        {primary}
      </Text>
      {!!secondary && (
        <Text style={{ fontSize: 11, color: secondaryColor, marginTop: 2, fontWeight: '500' }}>
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
    <View style={{
      flex: 1, backgroundColor: C.card, borderRadius: 12,
      padding: 12,
      shadowColor: '#0B1424', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <Ionicons name={icon} size={13} color={C.muted} />
        <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#0B1424', letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.subtle, marginTop: 2, fontWeight: '500' }}>{sub}</Text>
    </View>
  );
}

// ─── PunchRow ─────────────────────────────────────────────────────────────────

function PunchRow({ punch, isLast }: { punch: TodayPunch; isLast: boolean }) {
  const time = fmt(punch.transactionTime || punch.punchedTime);
  const location = punch.readerSerialNumber || '—';

  const isIn    = punch.inOut?.toUpperCase() === 'I' || punch.typeOfMovement?.toUpperCase() === 'I';
  const isOpen  = punch.inOut?.toUpperCase() === 'O' || punch.typeOfMovement === '—' || !punch.inOut;
  const dotColor = isIn ? C.green : isOpen ? C.amberFg : C.redFg;
  const statusLabel = isIn ? 'In' : isOpen ? 'Open' : 'Out';

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0B1424' }}>{time}</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{location}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dotColor }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: dotColor }}>{statusLabel}</Text>
        </View>
      </View>
      {!isLast && <View style={{ height: 1, backgroundColor: C.border }} />}
    </>
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
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{label}</Text>
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

  // ── Shift / gate defaults ──
  const shiftName  = params.shiftName  ?? 'B Shift';
  const shiftStart = params.shiftStart ?? '14:00';
  const shiftEnd   = params.shiftEnd   ?? '22:00';
  const gateName   = params.gateName   ?? 'Gate 3';
  const plantName  = params.plantName  ?? 'Plant 2';

  // ── Auth ──
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

  // ── Punch card state ──
  const [cardState, setCardState] = useState<PunchCardState>('ready');
  const [attempts,  setAttempts]  = useState(0);
  const [punchTime, setPunchTime] = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');

  // ── Camera modal ──
  const [showCamera, setShowCamera] = useState(false);
  const [geo,        setGeo]        = useState<GeoCoords>({ latitude: 0, longitude: 0, accuracy: 0 });
  const camKey = useRef(0);

  // ── Progress ring animation ──
  const ringProgress = useRef(new Animated.Value(0)).current;
  const ringAnim     = useRef<Animated.CompositeAnimation | null>(null);

  // ── Today's punches ──
  const [todayPunches, setTodayPunches] = useState<TodayPunch[]>([]);

  // Determine last punch from today's list
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

  // Auto-detect punch direction
  const punchDirection = params.punchType
    ?? (lastPunch?.type === 'In' ? 'out' : 'in');

  // ── Fetch today's punches ──
  useEffect(() => {
    if (!employeeID || !tenantCode) return;
    const run = async () => {
      try {
        const authHeader = await getAuthHeader();
        if (!authHeader) return;
        const res = await fetch(
          `${API_BASE}/${DATA_CHECK_URL}?offset=0&limit=20`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
              'X-Tenant': tenantCode,
            },
            body: JSON.stringify([
              { field: 'employeeID', value: employeeID, operator: 'eq' },
              { field: 'tenantCode', value: tenantCode, operator: 'eq' },
              { field: 'date',       value: todayISOKey(), operator: 'eq' },
            ]),
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setTodayPunches(data);
      } catch { /* non-fatal */ }
    };
    void run();
  }, [employeeID, tenantCode]);

  // ── Ring control ──
  const startRingLoop = useCallback(() => {
    ringProgress.setValue(0);
    ringAnim.current = Animated.loop(
      Animated.timing(ringProgress, {
        toValue: 1, duration: 1200,
        useNativeDriver: false,
      })
    );
    ringAnim.current.start();
  }, [ringProgress]);

  const fillRingOnce = useCallback(() => {
    ringAnim.current?.stop();
    ringProgress.setValue(0);
    ringAnim.current = Animated.timing(ringProgress, {
      toValue: 1, duration: 900,
      useNativeDriver: false,
    });
    ringAnim.current.start();
  }, [ringProgress]);

  const resetRing = useCallback(() => {
    ringAnim.current?.stop();
    ringProgress.setValue(0);
  }, [ringProgress]);

  // ── Handle punch button ──
  const handlePunchPress = useCallback(async () => {
    if (cardState === 'locating' || cardState === 'verifying') return;
    if (cardState === 'success') return; // already done

    // Check offline
    if (!navigator?.onLine) {
      setCardState('offline');
      return;
    }

    setCardState('locating');
    setErrorMsg('');

    try {
      const coords = await requestLocation();
      setGeo(coords);
      camKey.current += 1;
      setCardState('ready');
      setShowCamera(true);
      startRingLoop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Location error';
      setErrorMsg(msg);
      setCardState('ready');
    }
  }, [cardState, startRingLoop]);

  // ── Camera message handler ──
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
          const result = await submitPunch({
            base64Image: msg.data,
            employeeID,
            tenantCode,
            geo,
          });

          if (result.status === 'SUCCESS' || result.validated === true) {
            const t = result.dateTime
              ? new Date(result.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            setPunchTime(t);
            // Add to today's punches list
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
            setTimeout(() => {
              resetRing();
              setCardState('success');
            }, 950);
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            resetRing();
            setCardState('failed');
            if (newAttempts >= MAX_ATTEMPTS) {
              // Already in failed state — UI will show fallback
            }
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

  const handleRetry = useCallback(() => {
    resetRing();
    setCardState('ready');
  }, [resetRing]);

  const handleUsePIN = useCallback(() => {
    router.back();
    // Navigate to PIN entry — adjust route as needed
  }, [router]);

  // ── Button label ──
  const buttonLabel =
    cardState === 'success'   ? `Punched ${punchDirection} at ${punchTime}`
    : cardState === 'locating' ? 'Getting location…'
    : cardState === 'verifying' ? 'Verifying…'
    : `Verify and punch ${punchDirection}`;

  // ── Today summary ──
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
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Header ── */}
      <View style={{ backgroundColor: C.navy, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>

          {/* Title + subtitle */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
              Face punch
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500', marginTop: 1 }}>
              चेहरा पंच · {hindiDate()}
            </Text>
          </View>

          {/* Shift pill */}
          <ShiftPill
            label={shiftName}
            onPress={() => {/* shift switcher would open here */}}
          />
        </View>
      </View>

      {/* ── Sheet ── */}
      <View style={{ flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Punch Card ── */}
          <View style={{
            backgroundColor: C.card, borderRadius: 14,
            padding: 16,
            shadowColor: '#0B1424', shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
          }}>

            {/* Context line */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>
                {gateName}, {plantName} · {shiftStart}–{shiftEnd}
              </Text>
            </View>

            {/* Warning banner (low-light / PPE / offline) */}
            <WarningBanner
              type={cardState === 'low_light' ? 'low_light' : cardState === 'ppe' ? 'ppe' : cardState === 'offline' ? 'offline' : null}
            />

            {/* Icon + status row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <ScanIcon state={cardState} progress={ringProgress} />
              <StatusText
                state={cardState}
                attempts={attempts}
                punchTime={punchTime}
                lastPunch={lastPunch}
              />
            </View>

            {/* After 3 failed attempts — supervisor fallback banner */}
            {cardState === 'failed' && attempts >= MAX_ATTEMPTS && (
              <View style={{
                backgroundColor: '#FFF7ED', borderRadius: 10,
                borderWidth: 1, borderColor: '#FED7AA',
                padding: 12, marginBottom: 14,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.amber, marginBottom: 3 }}>
                  3 failed attempts
                </Text>
                <Text style={{ fontSize: 11, color: C.amber, lineHeight: 16 }}>
                  Please use your employee ID & PIN, or contact your supervisor to record attendance.
                </Text>
              </View>
            )}

            {/* Primary button */}
            <Pressable
              onPress={cardState === 'failed' ? handleRetry : handlePunchPress}
              disabled={cardState === 'locating' || cardState === 'verifying' || cardState === 'success'}
              style={({ pressed }) => ({
                backgroundColor:
                  cardState === 'success'    ? C.green
                  : cardState === 'failed'   ? C.redFg
                  : pressed                  ? '#1a1a2e'
                  : '#0B1424',
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row', gap: 8,
                opacity: (cardState === 'locating' || cardState === 'verifying') ? 0.7 : 1,
              })}
            >
              <Ionicons
                name={
                  cardState === 'success' ? 'checkmark-circle-outline'
                  : cardState === 'failed' ? 'refresh-outline'
                  : 'scan-circle-outline'
                }
                size={18}
                color="#fff"
              />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {cardState === 'failed' ? 'Try again' : buttonLabel}
              </Text>
            </Pressable>

            {/* Fallback link */}
            <Pressable
              onPress={handleUsePIN}
              style={{ marginTop: 12, alignItems: 'center', paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: '500' }}>
                Use employee ID and PIN instead
              </Text>
            </Pressable>
          </View>

          {/* Error message (location / auth) */}
          {!!errorMsg && (
            <View style={{
              backgroundColor: C.redBg, borderRadius: 10,
              borderWidth: 1, borderColor: '#FECACA',
              flexDirection: 'row', gap: 8, padding: 12,
            }}>
              <Ionicons name="alert-circle-outline" size={16} color={C.redFg} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: C.redFg, lineHeight: 17 }}>{errorMsg}</Text>
            </View>
          )}

          {/* ── TODAY ── */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>
              TODAY
            </Text>

            {/* Stat cards row */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <StatCard
                label="First punch"
                icon="log-in-outline"
                value={firstPunch?.time ?? '—'}
                sub={firstPunch?.location ?? 'No punch yet'}
              />
              <StatCard
                label="Hours so far"
                icon="time-outline"
                value="—"
                sub={`of ${shiftStart === '14:00' ? '8h' : '8h'} shift`}
              />
            </View>

            {/* Overtime row */}
            <View style={{
              backgroundColor: C.card, borderRadius: 12,
              flexDirection: 'row', alignItems: 'center',
              padding: 12, gap: 10,
              shadowColor: '#0B1424', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
            }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.amberBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="time-outline" size={16} color={C.amberFg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0B1424' }}>Overtime this month</Text>
                <Text style={{ fontSize: 11, color: C.amberFg, fontWeight: '600', marginTop: 1 }}>
                  2 pending approval
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1424', letterSpacing: -0.5 }}>
                11:30
              </Text>
            </View>
          </View>

          {/* ── TODAY'S PUNCHES ── */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8 }}>
              TODAY'S PUNCHES
            </Text>

            {sortedPunches.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
                <Ionicons name="finger-print-outline" size={28} color={C.border} />
                <Text style={{ fontSize: 13, color: C.subtle, fontWeight: '500' }}>No punches recorded today</Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: C.card, borderRadius: 12,
                paddingHorizontal: 14,
                shadowColor: '#0B1424', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
              }}>
                {sortedPunches.map((p, i) => (
                  <PunchRow key={p._id} punch={p} isLast={i === sortedPunches.length - 1} />
                ))}

                {/* Shift-end pending row (when last punch is 'In' and shift not ended) */}
                {lastPunch?.type === 'In' && cardState !== 'success' && (
                  <>
                    <View style={{ height: 1, backgroundColor: C.border }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: C.subtle }}>— Shift end punch pending</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.amberFg }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: C.amberFg }}>Open</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* ── Footer: View monthly attendance ── */}
          <Pressable
            onPress={() => router.push('/(tabs-lite)/attendance' as any)}
            style={({ pressed }) => ({
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: pressed ? '#CBD5E1' : C.border,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              backgroundColor: pressed ? '#F1F5F9' : C.card,
              marginTop: 4,
            })}
          >
            <Ionicons name="calendar-outline" size={16} color={C.muted} />
            <Text style={{ fontSize: 14, color: C.muted, fontWeight: '700' }}>View monthly attendance</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as any} onPress={handleCameraClose} />
          <View style={{
            backgroundColor: '#0B1424',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 20,
            height: '80%',
          }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 10, marginBottom: 8 }} />

            {/* Camera header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Face verification</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                  {cardState === 'liveness' ? 'Blink once to confirm' : 'Centre your face in the oval, then blink once'}
                </Text>
              </View>
              <Pressable
                onPress={handleCameraClose}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* WebView camera */}
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 12 }}>
              <FaceCamera key={camKey.current} onMessage={handleCameraMessage} />
            </View>

            {/* Geo badge */}
            {geo.latitude !== 0 && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(29,158,117,0.15)', borderRadius: 8,
                paddingHorizontal: 14, paddingVertical: 6,
                marginHorizontal: 16,
              }}>
                <Ionicons name="location" size={12} color={C.green} />
                <Text style={{ fontSize: 11, color: C.green, fontWeight: '600' }}>
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
