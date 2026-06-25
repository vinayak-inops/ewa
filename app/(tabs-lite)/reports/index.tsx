import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportsEditor from './_components/reports-editor';

const F = 'Inter';

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
    title: 'Generate\nReports Fast.',
    sub: 'Export attendance & HR data as Excel or PDF',
    bg: '#1d4ed8',
    ringA: 'rgba(59,130,246,0.35)',
    ringB: 'rgba(96,165,250,0.2)',
    accent: '#bfdbfe',
    primaryIcon: 'document-text-outline',
    secondaryIcon: 'checkmark-done-outline',
    tertiaryIcon: 'cloud-download-outline',
  },
  {
    id: 'b2',
    title: 'Track Report\nStatus.',
    sub: 'Monitor pending and completed report jobs',
    bg: '#0369a1',
    ringA: 'rgba(14,165,233,0.35)',
    ringB: 'rgba(56,189,248,0.2)',
    accent: '#bae6fd',
    primaryIcon: 'stats-chart-outline',
    secondaryIcon: 'time-outline',
    tertiaryIcon: 'refresh-outline',
  },
  {
    id: 'b3',
    title: 'Export\nAny Format.',
    sub: 'Download as Excel spreadsheets or PDF documents',
    bg: '#1e3a8a',
    ringA: 'rgba(37,99,235,0.4)',
    ringB: 'rgba(59,130,246,0.2)',
    accent: '#93c5fd',
    primaryIcon: 'grid-outline',
    secondaryIcon: 'download-outline',
    tertiaryIcon: 'folder-outline',
  },
  {
    id: 'b4',
    title: 'Filter &\nSearch Reports.',
    sub: 'Find reports quickly by name, type or status',
    bg: '#4338ca',
    ringA: 'rgba(99,102,241,0.4)',
    ringB: 'rgba(129,140,248,0.2)',
    accent: '#c7d2fe',
    primaryIcon: 'search-outline',
    secondaryIcon: 'filter-outline',
    tertiaryIcon: 'list-outline',
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
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

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

      {/* Banner carousel */}
      <View style={s.bannerSection}>
        <BannerCarousel />
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

  bannerSection: { backgroundColor: '#0a1c63', paddingTop: 0, paddingBottom: 16 },

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


  /* Banner */
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
  ringOuter: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
  ringInner: { position: 'absolute', width: 68, height: 68, borderRadius: 34 },
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
});
