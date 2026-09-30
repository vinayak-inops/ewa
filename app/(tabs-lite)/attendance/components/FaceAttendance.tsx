/**
 * FaceAttendance — face-blink liveness punch with location gate
 *
 * Button press flow:
 *  1. Request GPS location immediately (permission check + real coords)
 *     • PERMISSION_DENIED  → show inline error, do NOT open modal
 *     • POSITION_UNAVAILABLE / TIMEOUT → show inline error, do NOT open modal
 *     • Success → store real { latitude, longitude, accuracy }
 *  2. Open modal only after location is confirmed
 *  3. Camera blink → capture photo
 *  4. POST multipart with real coordinates (never 0, 0, 0)
 *
 * Platform split:
 *   FaceCamera.tsx      → react-native-webview (iOS / Android)
 *   FaceCamera.web.tsx  → <iframe srcDoc>       (Expo Web / laptop)
 */
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View
} from 'react-native';

import { getAccessToken } from '@/hooks/auth/token-store';
import { getSessionCookieHeaders } from '@/hooks/auth/bff-session';

import { FaceCamera } from './FaceCamera';

const { height: SCREEN_H } = Dimensions.get('window');
const API_BASE  = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PUNCH_URL = `${API_BASE}/api/command/attendance/punch/validate`;

// ─── Types ────────────────────────────────────────────────────────────────────

type PunchState  = 'idle' | 'uploading' | 'success' | 'punch_failed' | 'error';
type ButtonState = 'idle' | 'locating' | 'loc_error';

type GeoCoords = { latitude: number; longitude: number; accuracy: number };

/** Shape of the JSON the punch-validate endpoint always returns */
type PunchResponse = {
  employeeID:        string;
  dateTime:          string;
  latitude:          number;
  longitude:         number;
  accuracy:          number;
  tenantCode:        string;
  punchPhotoPath:    string;
  status:            string;          /* 'SUCCESS' | 'FAILED' | … */
  geofenceValidated: boolean;
  validated:         boolean;
  errorDescription:  string;
};

// ─── JWT decode ───────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
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

// ─── Location ─────────────────────────────────────────────────────────────────

async function requestLocation(): Promise<GeoCoords> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'denied') throw new Error('PERMANENTLY_DENIED');
      } catch (e) {
        if ((e as Error).message === 'PERMANENTLY_DENIED') throw e;
      }
    }
    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => {
          if (err.code === 1) reject(new Error('BROWSER_DENIED'));
          else if (err.code === 2) reject(new Error('GPS signal unavailable.\nMake sure Location Services are turned on and try again.'));
          else reject(new Error('Location timed out.\nMove to an area with better signal and try again.'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    if (!canAskAgain) throw new Error('PERMANENTLY_DENIED');
    throw new Error('Location permission denied.\nPlease tap "Allow" when asked for location access.');
  }

  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy ?? 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.toLowerCase().includes('timeout'))
      throw new Error('Location timed out.\nMove to an area with better signal and try again.');
    throw new Error('GPS signal unavailable.\nMake sure Location Services are turned on and try again.');
  }
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function submitPunch(opts: {
  base64Image: string;
  employeeID:  string;
  tenantCode:  string;
  geo:         GeoCoords;
}): Promise<PunchResponse> {
  const { base64Image, employeeID, tenantCode, geo } = opts;

  const now      = new Date();
  const ist      = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const dateTime = ist.toISOString().replace('Z', '+05:30');

  const eventJson = JSON.stringify({
    tenant:         tenantCode || 'default',
    action:         'insert',
    collectionName: 'mobile_attendance_punches',
    event:          '',
    id:             '',
    data: { employeeID, dateTime, latitude: geo.latitude, longitude: geo.longitude, accuracy: geo.accuracy },
  });

  // React Native's fetch() does not support data: URIs on Android —
  // use the {uri, name, type} object form instead, which the native
  // FormData implementation handles correctly on both iOS and Android.
  const form = new FormData();
  form.append('event', eventJson);
  form.append('punchPhoto', { uri: base64Image, name: 'punch.jpg', type: 'image/jpeg' } as any);

  const res = await fetch(PUNCH_URL, {
    method:      'POST',
    credentials: 'include',
    headers:     { ...getSessionCookieHeaders(), 'X-user': 'default-user', 'X-Tenant': tenantCode || 'default' },
    body:        form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Server ${res.status}: ${body || res.statusText}`);
  }

  return (await res.json()) as PunchResponse;
}

// ─── FaceAttendanceModal ──────────────────────────────────────────────────────

export function FaceAttendanceModal({
  visible,
  geo,
  onClose,
}: {
  visible: boolean;
  geo:     GeoCoords;
  onClose: () => void;
}) {
  const [state,       setState]       = useState<PunchState>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [punchResult, setPunchResult] = useState<PunchResponse | null>(null);
  const employeeID = useRef('');
  const tenantCode = useRef('');
  const camKey     = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const p = decodeJwtPayload(token);
      if (!p) return;
      employeeID.current = String(p.employeeID ?? p.employeeId ?? p.empId ?? '');
      tenantCode.current = String(p.tenantCode  ?? p.tenant    ?? p.org   ?? '');
    };
    void run();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setState('idle');
      setErrorMsg('');
      setPunchResult(null);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    setState('idle');
    setErrorMsg('');
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setErrorMsg('');
    camKey.current += 1;
  }, []);

  const handleCameraMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      let msg: { type: string; data?: string; message?: string; level?: string };
      try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

      if (msg.type === 'log') return;

      if (msg.type === 'photo' && msg.data) {
        try {
          setState('uploading');
          const result = await submitPunch({
            base64Image: msg.data,
            employeeID:  employeeID.current,
            tenantCode:  tenantCode.current,
            geo,
          });
          setPunchResult(result);
          if (result.status === 'SUCCESS' || result.validated === true) {
            setState('success');
          } else {
            setState('punch_failed');
          }
        } catch (err) {
          const errText = err instanceof Error ? err.message : 'Failed to submit punch';
          setErrorMsg(errText);
          setState('error');
        }
      } else if (msg.type === 'error') {
        setErrorMsg(msg.message ?? 'Camera error');
        setState('error');
      }
    },
    [geo]
  );

  const showCamera = state === 'idle';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/55 justify-end">
        <Pressable style={{ position: 'absolute', inset: 0 } as any} onPress={handleClose} />
        <View
          className="bg-white rounded-tl-[28px] rounded-tr-[28px] px-5 pb-9"
          style={{ maxHeight: SCREEN_H * 0.93 }}
        >
          {/* Handle */}
          <View className="w-9 h-1 rounded-sm bg-slate-300 self-center mt-2.5 mb-1" />

          {/* Header */}
          <View className="flex-row justify-between items-center py-3.5 border-b border-slate-100 mb-3">
            <View>
              <Text className="text-[18px] font-extrabold text-slate-900">Face Attendance</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Blink once to verify &amp; record your punch</Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>

          {/* Location badge */}
          <View className="flex-row items-center gap-1.5 bg-green-50 rounded-[10px] px-2.5 py-1.5 mb-3">
            <Ionicons name="location" size={13} color="#16a34a" />
            <Text className="text-[11px] text-green-700 font-semibold flex-1" numberOfLines={1}>
              {`${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}  ±${Math.round(geo.accuracy)}m`}
            </Text>
          </View>

          {/* ── Camera ── */}
          {showCamera && (
            <>
              <View className="h-[340px] rounded-2xl overflow-hidden bg-slate-900 mb-3.5">
                <FaceCamera key={camKey.current} onMessage={handleCameraMessage} />
              </View>
              <View className="flex-row items-center justify-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-green-400" />
                <Text className="text-xs text-slate-500 font-semibold">
                  Centre your face in the oval, then blink once
                </Text>
              </View>
            </>
          )}

          {/* ── Uploading ── */}
          {state === 'uploading' && (
            <View className="items-center justify-center h-[220px] gap-3.5">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-slate-500 text-sm font-semibold">
                Verifying face &amp; recording punch…
              </Text>
            </View>
          )}

          {/* ── Success ── */}
          {state === 'success' && (
            <>
              <View className="items-center gap-2.5 py-5">
                <View className="w-[68px] h-[68px] rounded-full bg-green-100 items-center justify-center">
                  <Ionicons name="checkmark-circle" size={52} color="#16a34a" />
                </View>
                <Text className="text-[17px] font-extrabold text-green-700">Attendance Marked!</Text>
                <Text className="text-xs text-slate-500 text-center">
                  Your punch has been recorded successfully.
                </Text>
              </View>

              {punchResult && (
                <View className="gap-1.5 mb-4">
                  {/* Geofence badge */}
                  <View
                    className="flex-row items-center gap-2 rounded-[10px] px-3 py-2"
                    style={{ backgroundColor: punchResult.geofenceValidated ? '#f0fdf4' : '#fef9c3' }}
                  >
                    <Ionicons
                      name={punchResult.geofenceValidated ? 'shield-checkmark' : 'alert-circle'}
                      size={16}
                      color={punchResult.geofenceValidated ? '#16a34a' : '#ca8a04'}
                    />
                    <Text
                      className="text-xs font-semibold flex-1"
                      style={{ color: punchResult.geofenceValidated ? '#15803d' : '#a16207' }}
                    >
                      {punchResult.geofenceValidated ? 'Within geofenced zone' : 'Outside geofenced zone'}
                    </Text>
                  </View>

                  {/* Employee + time */}
                  <View className="flex-row gap-1.5">
                    <View className="flex-1 bg-slate-50 rounded-[10px] px-2.5 py-2">
                      <Text className="text-[10px] text-slate-400 font-semibold mb-0.5">Employee</Text>
                      <Text className="text-[13px] font-bold text-slate-900">{punchResult.employeeID}</Text>
                    </View>
                    <View className="flex-[2] bg-slate-50 rounded-[10px] px-2.5 py-2">
                      <Text className="text-[10px] text-slate-400 font-semibold mb-0.5">Punch Time</Text>
                      <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                        {punchResult.dateTime
                          ? new Date(punchResult.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleClose}
                className="bg-green-600 rounded-2xl py-[15px] items-center flex-row justify-center gap-2"
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text className="text-white text-[15px] font-bold">Done</Text>
              </Pressable>
            </>
          )}

          {/* ── Punch Failed ── */}
          {state === 'punch_failed' && punchResult && (
            <>
              <View className="items-center gap-2.5 py-5">
                <View className="w-[68px] h-[68px] rounded-full bg-amber-100 items-center justify-center">
                  <Ionicons name="warning" size={48} color="#d97706" />
                </View>
                <Text className="text-[17px] font-extrabold text-amber-900">Punch Not Recorded</Text>
                <Text className="text-xs text-stone-500 text-center px-2">
                  {punchResult.errorDescription || 'Verification failed — please contact HR.'}
                </Text>
              </View>

              <View className="gap-1.5 mb-4">
                {/* Geofence row */}
                <View
                  className="flex-row items-center gap-2 rounded-[10px] px-3 py-2"
                  style={{ backgroundColor: punchResult.geofenceValidated ? '#f0fdf4' : '#fef2f2' }}
                >
                  <Ionicons
                    name={punchResult.geofenceValidated ? 'location' : 'location-outline'}
                    size={15}
                    color={punchResult.geofenceValidated ? '#16a34a' : '#dc2626'}
                  />
                  <Text
                    className="text-xs font-semibold flex-1"
                    style={{ color: punchResult.geofenceValidated ? '#15803d' : '#b91c1c' }}
                  >
                    {punchResult.geofenceValidated ? 'Geofence: Passed' : 'Geofence: Failed — you may be outside the allowed zone'}
                  </Text>
                </View>

                {/* Face validated row */}
                <View
                  className="flex-row items-center gap-2 rounded-[10px] px-3 py-2"
                  style={{ backgroundColor: punchResult.validated ? '#f0fdf4' : '#fef2f2' }}
                >
                  <Ionicons
                    name={punchResult.validated ? 'person-circle' : 'person-circle-outline'}
                    size={15}
                    color={punchResult.validated ? '#16a34a' : '#dc2626'}
                  />
                  <Text
                    className="text-xs font-semibold flex-1"
                    style={{ color: punchResult.validated ? '#15803d' : '#b91c1c' }}
                  >
                    {punchResult.validated ? 'Face: Verified' : 'Face: Not verified'}
                  </Text>
                </View>

                {/* Employee + time */}
                <View className="flex-row gap-1.5">
                  <View className="flex-1 bg-slate-50 rounded-[10px] px-2.5 py-2">
                    <Text className="text-[10px] text-slate-400 font-semibold mb-0.5">Employee</Text>
                    <Text className="text-[13px] font-bold text-slate-900">{punchResult.employeeID}</Text>
                  </View>
                  <View className="flex-[2] bg-slate-50 rounded-[10px] px-2.5 py-2">
                    <Text className="text-[10px] text-slate-400 font-semibold mb-0.5">Time</Text>
                    <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                      {punchResult.dateTime
                        ? new Date(punchResult.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={handleRetry}
                  className="flex-1 bg-blue-600 rounded-2xl py-[15px] items-center flex-row justify-center gap-2"
                >
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text className="text-white text-sm font-bold">Retry</Text>
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  className="flex-1 bg-slate-100 rounded-2xl py-[15px] items-center flex-row justify-center gap-2"
                >
                  <Ionicons name="close-outline" size={18} color="#475569" />
                  <Text className="text-slate-500 text-sm font-bold">Close</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── Error (network / auth) ── */}
          {state === 'error' && (
            <>
              <View className="items-center justify-center h-[200px] gap-2.5">
                <View className="w-[68px] h-[68px] rounded-full bg-red-100 items-center justify-center">
                  <Ionicons name="close-circle" size={52} color="#dc2626" />
                </View>
                <Text className="text-[15px] font-bold text-red-700">Something went wrong</Text>
                <Text className="text-xs text-slate-500 text-center px-4">{errorMsg}</Text>
              </View>
              <Pressable
                onPress={handleRetry}
                className="bg-blue-600 rounded-2xl py-[15px] items-center flex-row justify-center gap-2"
              >
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text className="text-white text-[15px] font-bold">Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── FaceAttendanceButton ─────────────────────────────────────────────────────

export function FaceAttendanceButton() {
  const [btnState,    setBtnState]    = useState<ButtonState>('idle');
  const [locErrMsg,   setLocErrMsg]   = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [geo,         setGeo]         = useState<GeoCoords>({ latitude: 0, longitude: 0, accuracy: 0 });

  const handlePress = async () => {
    if (btnState === 'locating') return;
    setBtnState('locating');
    setLocErrMsg('');
    setIsPermanent(false);

    try {
      const coords = await requestLocation();
      setGeo(coords);
      setBtnState('idle');
      setShowModal(true);
    } catch (err) {
      const raw             = err instanceof Error ? err.message : 'Could not get location';
      const isPerm          = raw === 'PERMANENTLY_DENIED';
      const isBrowserDenied = raw === 'BROWSER_DENIED';
      setIsPermanent(isPerm);
      setLocErrMsg(
        isPerm
          ? Platform.OS === 'web'
            ? 'Location is blocked by your browser.\nClick the 🔒 lock icon in the address bar → Location → Allow, then retry.'
            : 'Location is permanently blocked.\nOpen Settings → App Permissions → Location → Allow.'
          : isBrowserDenied
          ? 'You blocked location access. Click "Grant Location" to ask again.'
          : raw
      );
      setBtnState('loc_error');
    }
  };

  const openSettings     = useCallback(() => { Linking.openSettings().catch(() => {}); }, []);
  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setBtnState('idle');
    setLocErrMsg('');
    setIsPermanent(false);
  }, []);

  const isLocating = btnState === 'locating';
  const hasLocErr  = btnState === 'loc_error';

  return (
    <>
      {/* ── Trigger button ── */}
      <Pressable
        onPress={handlePress}
        disabled={isLocating}
        style={({ pressed }) => [
          { opacity: pressed || isLocating ? 0.82 : 1 },
          { shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3 },
        ]}
        className="flex-row items-center justify-between bg-blue-600 rounded-[14px] mx-3.5 mt-3.5 px-3.5 py-3"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-[38px] h-[38px] rounded-[10px] bg-white/20 items-center justify-center">
            {isLocating
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="scan-circle-outline" size={22} color="#fff" />
            }
          </View>
          <View>
            <Text className="text-[14px] font-bold text-white">Face Attendance</Text>
            <Text className="text-[11px] text-white/70 font-medium mt-[1px]">
              {isLocating ? 'Getting your location…' : 'Blink to verify & mark your punch'}
            </Text>
          </View>
        </View>
        {!isLocating && (
          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
        )}
      </Pressable>

      {/* ── Inline location error card ── */}
      {hasLocErr && (
        <View className="mx-3.5 mt-2 bg-orange-50 rounded-xl border border-orange-200 p-3">
          <View className="flex-row items-start gap-2">
            <Ionicons name="location-outline" size={18} color="#c2410c" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-orange-900 mb-[3px]">
                Location Required
              </Text>
              <Text className="text-xs text-orange-600 leading-[17px]">
                {isPermanent
                  ? 'Location is permanently blocked. Open your device Settings to allow it.'
                  : locErrMsg}
              </Text>
            </View>
          </View>

          {/* Mobile: Settings + Retry */}
          {Platform.OS !== 'web' && (
            <View className="gap-2 mt-2.5">
              <Pressable
                onPress={openSettings}
                className="bg-orange-900 rounded-lg py-[9px] flex-row items-center justify-center gap-1.5"
              >
                <Ionicons name="settings-outline" size={15} color="#fff" />
                <Text className="text-white text-[13px] font-bold">Open Settings</Text>
              </Pressable>
              {!isPermanent && (
                <Pressable
                  onPress={handlePress}
                  className="bg-orange-500 rounded-lg py-[9px] flex-row items-center justify-center gap-1.5"
                >
                  <Ionicons name="refresh-outline" size={15} color="#fff" />
                  <Text className="text-white text-[13px] font-bold">Retry</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Web: Grant Location */}
          {Platform.OS === 'web' && (
            <Pressable
              onPress={handlePress}
              className="mt-2.5 bg-orange-500 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
            >
              <Ionicons name="locate-outline" size={15} color="#fff" />
              <Text className="text-white text-[13px] font-bold">Grant Location</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Modal ── */}
      <FaceAttendanceModal
        visible={showModal}
        geo={geo}
        onClose={handleModalClose}
      />
    </>
  );
}
