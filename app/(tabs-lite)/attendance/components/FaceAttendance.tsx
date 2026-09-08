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
  View,
} from 'react-native';

import { getAccessToken, getAuthHeader } from '@/hooks/auth/token-store';

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

// ─── Location — expo-location (works correctly on Android, iOS, Web) ───────────
//
//  Uses expo-location for native (Android/iOS) so permission grants are
//  honoured correctly — navigator.geolocation on Android has its own internal
//  permission check that ignores PermissionsAndroid results, causing "denied"
//  even after the user tapped Allow.
//  Falls back to navigator.geolocation only on Web where expo-location is N/A.

async function requestLocation(): Promise<GeoCoords> {
  /* ── Web: use browser geolocation API ── */
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('[Location] Web permissions state:', status.state);
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

  /* ── Native (Android / iOS): use expo-location ── */
  console.log('[Location] Requesting foreground permission via expo-location…');

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  console.log('[Location] expo-location status:', status, 'canAskAgain:', canAskAgain);

  if (status !== 'granted') {
    if (!canAskAgain) throw new Error('PERMANENTLY_DENIED');
    throw new Error('Location permission denied.\nPlease tap "Allow" when asked for location access.');
  }

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    console.log('[Location] Fix — lat:', loc.coords.latitude, 'lon:', loc.coords.longitude, 'acc:', loc.coords.accuracy, 'm');
    return {
      latitude:  loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy:  loc.coords.accuracy ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.toLowerCase().includes('timeout')) {
      throw new Error('Location timed out.\nMove to an area with better signal and try again.');
    }
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

  const authHeader = await getAuthHeader();
  if (!authHeader) throw new Error('Not authenticated');

  /* IST offset (+05:30) */
  const now      = new Date();
  const ist      = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const dateTime = ist.toISOString().replace('Z', '+05:30');

  const eventJson = JSON.stringify({
    tenant:         tenantCode || 'default',
    action:         'insert',
    collectionName: 'mobile_attendance_punches',
    event:          '',
    id:             '',
    data: {
      employeeID,
      dateTime,
      latitude:  geo.latitude,
      longitude: geo.longitude,
      accuracy:  geo.accuracy,
    },
  });

  console.log('[Punch] Payload event:', eventJson);

  /* base64 data URL → Blob */
  const [meta, b64] = base64Image.split(',');
  const mime        = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bytes       = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const photoBlob   = new Blob([bytes], { type: mime });

  const form = new FormData();
  form.append('event',      new Blob([eventJson], { type: 'application/json' }));
  form.append('punchPhoto', photoBlob, 'punch.jpg');

  const res = await fetch(PUNCH_URL, {
    method:  'POST',
    headers: {
      Authorization: authHeader,
      'X-user':      'default-user',
      'X-Tenant':    tenantCode || 'default',
      /* Do NOT set Content-Type — browser sets multipart boundary automatically */
    },
    body: form,
  });

  /* Non-2xx → hard throw */
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Server ${res.status}: ${body || res.statusText}`);
  }

  /* Parse and return response JSON — server always returns a PunchResponse body */
  const json = (await res.json()) as PunchResponse;
  console.log('[Punch] Response:', JSON.stringify(json));
  return json;
}

// ─── FaceAttendanceModal ──────────────────────────────────────────────────────

function FaceAttendanceModal({
  visible,
  geo,
  onClose,
}: {
  visible: boolean;
  geo:     GeoCoords;        /* real coordinates from pre-check */
  onClose: () => void;
}) {
  const [state,       setState]       = useState<PunchState>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [punchResult, setPunchResult] = useState<PunchResponse | null>(null);
  const employeeID = useRef('');
  const tenantCode = useRef('');
  const camKey     = useRef(0);

  /* Load employee + tenant from JWT on every open */
  useEffect(() => {
    if (!visible) return;
    const run = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const p = decodeJwtPayload(token);
      if (!p) return;
      employeeID.current = String(p.employeeID ?? p.employeeId ?? p.empId ?? '');
      tenantCode.current = String(p.tenantCode  ?? p.tenant    ?? p.org   ?? '');
      console.log('[FaceModal] employeeID:', employeeID.current, 'tenantCode:', tenantCode.current);
    };
    void run();
  }, [visible]);

  /* Reset state each time modal opens */
  useEffect(() => {
    if (visible) { setState('idle'); setErrorMsg(''); setPunchResult(null); }
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

  /* Receives log / photo / error from the face-camera page */
  const handleCameraMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      let msg: { type: string; data?: string; message?: string; level?: string };
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      /* Mirror all in-page logs to Metro / DevTools */
      if (msg.type === 'log') {
        const lvl = msg.level ?? 'info';
        if (lvl === 'error')     console.error('[FaceCam]', msg.message);
        else if (lvl === 'warn') console.warn('[FaceCam]',  msg.message);
        else                     console.log('[FaceCam]',   msg.message);
        return;
      }

      if (msg.type === 'photo' && msg.data) {
        console.log('[FaceCam] Photo received — submitting punch');
        console.log('[FaceCam] Using geo — lat:', geo.latitude, 'lon:', geo.longitude, 'acc:', geo.accuracy);
        try {
          setState('uploading');
          const result = await submitPunch({
            base64Image: msg.data,
            employeeID:  employeeID.current,
            tenantCode:  tenantCode.current,
            geo,                               /* ← real coords, pre-fetched */
          });
          setPunchResult(result);

          /* Branch on API-level status — server returns 200 even for failures */
          if (result.status === 'SUCCESS' || result.validated === true) {
            console.log('[FaceCam] Punch SUCCESS ✓');
            setState('success');
          } else {
            console.warn('[FaceCam] Punch FAILED —', result.errorDescription);
            setState('punch_failed');
          }
        } catch (err) {
          const errText = err instanceof Error ? err.message : 'Failed to submit punch';
          console.error('[FaceCam] Submit error:', errText);
          setErrorMsg(errText);
          setState('error');
        }
      } else if (msg.type === 'error') {
        console.error('[FaceCam] Camera page error:', msg.message);
        setErrorMsg(msg.message ?? 'Camera error');
        setState('error');
      }
    },
    [geo]   /* geo is stable for the lifetime of one modal open */
  );

  const showCamera = state === 'idle';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', inset: 0 } as any} onPress={handleClose} />
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 20, paddingBottom: 36,
            maxHeight: SCREEN_H * 0.93,
          }}
        >
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Face Attendance</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Blink once to verify &amp; record your punch</Text>
            </View>
            <Pressable onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>

          {/* Location badge — always shown so user knows coords were captured */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 }}>
            <Ionicons name="location" size={13} color="#16a34a" />
            <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {`${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}  ±${Math.round(geo.accuracy)}m`}
            </Text>
          </View>

          {/* ── Camera ── */}
          {showCamera && (
            <>
              <View style={{ height: 340, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0f172a', marginBottom: 14 }}>
                <FaceCamera key={camKey.current} onMessage={handleCameraMessage} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                  Centre your face in the oval, then blink once
                </Text>
              </View>
            </>
          )}

          {/* ── Uploading ── */}
          {state === 'uploading' && (
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 220, gap: 14 }}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600' }}>
                Verifying face &amp; recording punch…
              </Text>
            </View>
          )}

          {/* ── Success ── */}
          {state === 'success' && (
            <>
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark-circle" size={52} color="#16a34a" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#15803d' }}>Attendance Marked!</Text>
                <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                  Your punch has been recorded successfully.
                </Text>
              </View>

              {/* Response detail cards */}
              {punchResult && (
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {/* Geofence badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: punchResult.geofenceValidated ? '#f0fdf4' : '#fef9c3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Ionicons name={punchResult.geofenceValidated ? 'shield-checkmark' : 'alert-circle'} size={16} color={punchResult.geofenceValidated ? '#16a34a' : '#ca8a04'} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: punchResult.geofenceValidated ? '#15803d' : '#a16207', flex: 1 }}>
                      {punchResult.geofenceValidated ? 'Within geofenced zone' : 'Outside geofenced zone'}
                    </Text>
                  </View>

                  {/* Employee + time row */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 2 }}>Employee</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{punchResult.employeeID}</Text>
                    </View>
                    <View style={{ flex: 2, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 2 }}>Punch Time</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                        {punchResult.dateTime
                          ? new Date(punchResult.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable onPress={handleClose} style={{ backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Done</Text>
              </Pressable>
            </>
          )}

          {/* ── Punch Failed (API returned FAILED / validated=false) ── */}
          {state === 'punch_failed' && punchResult && (
            <>
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="warning" size={48} color="#d97706" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#92400e' }}>Punch Not Recorded</Text>
                <Text style={{ fontSize: 12, color: '#78716c', textAlign: 'center', paddingHorizontal: 8 }}>
                  {punchResult.errorDescription || 'Verification failed — please contact HR.'}
                </Text>
              </View>

              {/* Status breakdown */}
              <View style={{ gap: 6, marginBottom: 16 }}>
                {/* Geofence row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: punchResult.geofenceValidated ? '#f0fdf4' : '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name={punchResult.geofenceValidated ? 'location' : 'location-outline'} size={15} color={punchResult.geofenceValidated ? '#16a34a' : '#dc2626'} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: punchResult.geofenceValidated ? '#15803d' : '#b91c1c', flex: 1 }}>
                    {punchResult.geofenceValidated ? 'Geofence: Passed' : 'Geofence: Failed — you may be outside the allowed zone'}
                  </Text>
                </View>

                {/* Face validated row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: punchResult.validated ? '#f0fdf4' : '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name={punchResult.validated ? 'person-circle' : 'person-circle-outline'} size={15} color={punchResult.validated ? '#16a34a' : '#dc2626'} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: punchResult.validated ? '#15803d' : '#b91c1c', flex: 1 }}>
                    {punchResult.validated ? 'Face: Verified' : 'Face: Not verified'}
                  </Text>
                </View>

                {/* Employee + time */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 2 }}>Employee</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{punchResult.employeeID}</Text>
                  </View>
                  <View style={{ flex: 2, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 2 }}>Time</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                      {punchResult.dateTime
                        ? new Date(punchResult.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={handleRetry} style={{ flex: 1, backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Retry</Text>
                </Pressable>
                <Pressable onPress={handleClose} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="close-outline" size={18} color="#475569" />
                  <Text style={{ color: '#475569', fontSize: 14, fontWeight: '700' }}>Close</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── Error (network / auth) ── */}
          {state === 'error' && (
            <>
              <View style={{ alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close-circle" size={52} color="#dc2626" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#b91c1c' }}>Something went wrong</Text>
                <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 16 }}>
                  {errorMsg}
                </Text>
              </View>
              <Pressable onPress={handleRetry} style={{ backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Try Again</Text>
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
  const [btnState,   setBtnState]   = useState<ButtonState>('idle');
  const [locErrMsg,  setLocErrMsg]  = useState('');
  const [isPermanent, setIsPermanent] = useState(false); // "never ask again" on Android
  const [showModal,  setShowModal]  = useState(false);
  const [geo,        setGeo]        = useState<GeoCoords>({ latitude: 0, longitude: 0, accuracy: 0 });

  const handlePress = async () => {
    if (btnState === 'locating') return;

    setBtnState('locating');
    setLocErrMsg('');
    setIsPermanent(false);
    console.log('[FaceAttendance] Requesting location…');

    try {
      const coords = await requestLocation();
      setGeo(coords);
      setBtnState('idle');
      setShowModal(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not get location';
      console.error('[FaceAttendance] Location error:', raw);

      const isPerm = raw === 'PERMANENTLY_DENIED';
      /* BROWSER_DENIED = user clicked "Block" in the browser popup this session.
         On the next retry the Permissions API state will be 'denied' → PERMANENTLY_DENIED.
         For now treat it as retriable (browser may ask again on some browsers). */
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

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      console.warn('[FaceAttendance] Could not open settings');
    });
  }, []);

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
          {
            shadowColor: '#1e3a8a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 3,
          },
        ]}
        className="flex-row items-center justify-between bg-blue-600 rounded-[14px] mx-[14px] mt-[14px] px-[14px] py-3"
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
        <View style={{ marginHorizontal: 14, marginTop: 8, backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa', padding: 12 }}>

          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="location-outline" size={18} color="#c2410c" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#9a3412', marginBottom: 3 }}>
                Location Required
              </Text>
              <Text style={{ fontSize: 12, color: '#c2410c', lineHeight: 17 }}>
                {isPermanent
                  ? 'Location is permanently blocked. Open your device Settings to allow it.'
                  : locErrMsg}
              </Text>
            </View>
          </View>

          {/* ── Mobile: Open Settings + optional Retry ── */}
          {Platform.OS !== 'web' && (
            <View style={{ gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={openSettings}
                style={{ backgroundColor: '#9a3412', borderRadius: 8, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Ionicons name="settings-outline" size={15} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Open Settings</Text>
              </Pressable>
              {!isPermanent && (
                <Pressable
                  onPress={handlePress}
                  style={{ backgroundColor: '#ea580c', borderRadius: 8, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Ionicons name="refresh-outline" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Retry</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Web / laptop: re-trigger browser popup directly ── */}
          {Platform.OS === 'web' && (
            <Pressable
              onPress={handlePress}
              style={{ marginTop: 10, backgroundColor: '#ea580c', borderRadius: 8, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Ionicons name="locate-outline" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Grant Location</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Modal (only opens after location is confirmed) ── */}
      <FaceAttendanceModal
        visible={showModal}
        geo={geo}
        onClose={handleModalClose}
      />
    </>
  );
}
