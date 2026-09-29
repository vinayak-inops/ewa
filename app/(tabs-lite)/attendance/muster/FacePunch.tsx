/**
 * FacePunch — Face attendance trigger button
 *
 * Handles:
 *  1. GPS location check before opening the camera modal
 *  2. Inline location-error card (retriable / settings-deep-link)
 *  3. Opens FaceAttendanceModal once location is confirmed
 *
 * All camera / API / liveness logic lives in:
 *   ../components/FaceAttendance.tsx  (FaceAttendanceModal + helpers)
 *
 * Usage:
 *   import { FacePunch } from './muster/FacePunch';
 *   <FacePunch />
 */

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import { FaceAttendanceModal } from '../components/FaceAttendance';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonState = 'idle' | 'locating' | 'loc_error';
type GeoCoords   = { latitude: number; longitude: number; accuracy: number };

// ─── Location helper ─────────────────────────────────────────────────────────

async function requestLocation(): Promise<GeoCoords> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (s.state === 'denied') throw new Error('PERMANENTLY_DENIED');
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

// ─── Component ────────────────────────────────────────────────────────────────

export function FacePunch() {
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
            ? 'Location is blocked by your browser.\nClick the 🔒 lock icon → Location → Allow, then retry.'
            : 'Location is permanently blocked.\nOpen Settings → App Permissions → Location → Allow.'
          : isBrowserDenied
          ? 'You blocked location access. Tap "Grant Location" to ask again.'
          : raw
      );
      setBtnState('loc_error');
    }
  };

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
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
        className="w-full bg-[#111827] rounded-full py-4 items-center justify-center flex-row gap-2"
        style={({ pressed }) => ({ opacity: pressed || isLocating ? 0.65 : 1 })}
      >
        {isLocating
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="scan-circle-outline" size={18} color="#fff" />
        }
        <Text className="text-white text-[14px] font-bold tracking-[0.1px]">
          {isLocating ? 'Getting location…' : 'Verify and punch in'}
        </Text>
      </Pressable>

      {/* ── Inline location error card ── */}
      {hasLocErr && (
        <View className="mx-3.5 mt-2 bg-[#fff7ed] rounded-xl border border-[#fed7aa] p-3">
          {/* Header */}
          <View className="flex-row items-start gap-2">
            <View className="mt-px">
              <Ionicons name="location-outline" size={18} color="#c2410c" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-[#9a3412] mb-[3px]">
                Location Required
              </Text>
              <Text className="text-xs text-[#c2410c] leading-[17px]">
                {isPermanent
                  ? 'Location is permanently blocked. Open your device Settings to allow it.'
                  : locErrMsg}
              </Text>
            </View>
          </View>

          {/* Native: Settings + optional Retry */}
          {Platform.OS !== 'web' && (
            <View className="gap-2 mt-2.5">
              <Pressable
                onPress={openSettings}
                className="bg-[#9a3412] rounded-lg py-[9px] flex-row items-center justify-center gap-1.5"
              >
                <Ionicons name="settings-outline" size={15} color="#fff" />
                <Text className="text-white text-[13px] font-bold">Open Settings</Text>
              </Pressable>
              {!isPermanent && (
                <Pressable
                  onPress={handlePress}
                  className="bg-[#ea580c] rounded-lg py-[9px] flex-row items-center justify-center gap-1.5"
                >
                  <Ionicons name="refresh-outline" size={15} color="#fff" />
                  <Text className="text-white text-[13px] font-bold">Retry</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Web: re-trigger browser popup */}
          {Platform.OS === 'web' && (
            <Pressable
              onPress={handlePress}
              className="mt-2.5 bg-[#ea580c] rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
            >
              <Ionicons name="locate-outline" size={15} color="#fff" />
              <Text className="text-white text-[13px] font-bold">Grant Location</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Camera modal (opens only after location confirmed) ── */}
      <FaceAttendanceModal
        visible={showModal}
        geo={geo}
        onClose={handleModalClose}
      />
    </>
  );
}
