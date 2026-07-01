import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportsEditor from './_components/reports-editor';

const F = 'Inter';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1c63" />

      {/* Header */}
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
            <Text style={s.greeting}>Reports</Text>
          </View>
          <View style={s.topIcons}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </View>
        </View>
      </View>

      {/* Single banner */}
      <View style={s.bannerSection}>
        <View style={s.banner}>
          {/* Glow blobs */}
          <View style={s.bannerGlowA} />
          <View style={s.bannerGlowB} />

          {/* Text */}
          <View style={s.bannerContent}>
            <Text style={s.bannerTitle}>Generate Reports, Fast.</Text>
            <Text style={s.bannerSub}>Export attendance & HR data as Excel or PDF</Text>
          </View>

          {/* Icon */}
          <View style={s.bannerIconWrap}>
            <Ionicons name="document-text-outline" size={32} color="rgba(255,255,255,0.85)" />
          </View>
        </View>
      </View>

      {/* White rounded sheet */}
      <View style={s.sheetOuter}>
        <View style={s.sheet}>
          {/* Generate button — navigates to full-page create screen */}
          <Pressable onPress={() => router.push('/(tabs-lite)/reports/create' as any)}>
            {({ pressed }) => (
              <View style={[s.genBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
                <View style={s.genBtnIconWrap}>
                  <Ionicons name="add" size={20} color="#1d4ed8" />
                </View>
                <View style={s.genBtnBody}>
                  <Text style={s.genBtnTitle}>Generate Report</Text>
                  <Text style={s.genBtnSub}>Create a new Excel or PDF report</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
              </View>
            )}
          </Pressable>
          <ReportsEditor open={false} setOpen={() => {}} hideHeader />
        </View>
      </View>
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
  greeting: { fontFamily: F, color: '#fff', fontSize: 20, fontWeight: '700' },
  topIcons: { flexDirection: 'row', gap: 14 },

  bannerSection: { backgroundColor: '#0a1c63', paddingHorizontal: 16, paddingBottom: 16 },
  banner: {
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#1a3a8f',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 18,
  },
  bannerGlowA: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(59,130,246,0.25)', right: 30, top: -40,
  },
  bannerGlowB: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(96,165,250,0.15)', right: -10, bottom: -20,
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontFamily: F, fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  bannerSub: { fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, lineHeight: 16 },
  bannerIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },

  sheetOuter: { flex: 1 },
  sheet: { flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1d4ed8',
    marginHorizontal: 14, marginTop: 14, marginBottom: 4,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  genBtnIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  genBtnBody: { flex: 1, gap: 2 },
  genBtnTitle: { fontFamily: F, fontSize: 14, fontWeight: '800', color: '#fff' },
  genBtnSub: { fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },


});
