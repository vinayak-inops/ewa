import { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';

// ── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    label: 'Earned Wages',
    desc: 'Access salary anytime',
    bgClass: 'bg-green-100',
    icon: (
      <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#15803D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="6" width="18" height="13" rx="2.5" />
        <Path d="M3 10h18" />
        <Path d="M16 14.5h2" />
      </Svg>
    ),
  },
  {
    label: 'Applications',
    desc: 'Leave, OT, shift & more',
    bgClass: 'bg-amber-100',
    icon: (
      <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#B45309" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="5" y="4" width="14" height="17" rx="2" />
        <Path d="M8.5 10h7" />
        <Path d="M8.5 14h7" />
        <Path d="M8.5 18h4" />
      </Svg>
    ),
  },
  {
    label: 'Attendance',
    desc: 'Track your work records',
    bgClass: 'bg-slate-200',
    icon: (
      <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#1E293B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <Path d="M3.5 10h17" />
        <Path d="M9 15l2 2 4-4" />
      </Svg>
    ),
  },
];

// ── Wallet SVG illustration ───────────────────────────────────────────────────

function WalletIllustration({ width, height }: { width: number; height: number }) {
  return (
    <Svg viewBox="0 0 300 220" width={width} height={height}>
      <Ellipse cx="150" cy="205" rx="125" ry="10" fill="#E2E8F0" />

      <G stroke="#FBBF24" strokeWidth={4} strokeLinecap="round">
        <Path d="M62 44l10 12" /><Path d="M48 70l14 3" /><Path d="M84 30l2 14" />
        <Path d="M236 26l-6 12" /><Path d="M254 44l-12 6" />
      </G>

      <G transform="rotate(-14 150 90)">
        <Rect x="78" y="40" width="150" height="80" rx="10" fill="#15803D" />
        <Rect x="88" y="50" width="130" height="60" rx="6" fill="none" stroke="#86EFAC" strokeWidth={2.5} />
        <Circle cx="153" cy="80" r="15" fill="none" stroke="#86EFAC" strokeWidth={2.5} />
      </G>

      <G transform="rotate(8 150 90)">
        <Rect x="82" y="46" width="150" height="80" rx="10" fill="#22C55E" />
        <Rect x="92" y="56" width="130" height="60" rx="6" fill="none" stroke="#BBF7D0" strokeWidth={2.5} />
        <Circle cx="157" cy="86" r="15" fill="none" stroke="#BBF7D0" strokeWidth={2.5} />
        <G fill="none" stroke="#F0FDF4" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M150 78H164" /><Path d="M150 83.5H164" />
          <Path d="M152 78C161 78 161 89 152 89H151L161 96" />
        </G>
      </G>

      <Rect x="44" y="92" width="200" height="110" rx="22" fill="#1E293B" />
      <Rect x="44" y="92" width="200" height="26" rx="13" fill="#334155" />
      <Rect x="44" y="104" width="200" height="14" fill="#334155" />
      <Rect x="56" y="126" width="170" height="3" rx="1.5" fill="#475569" />
      <Rect x="196" y="130" width="64" height="46" rx="14" fill="#FBBF24" />
      <Rect x="196" y="130" width="64" height="14" rx="7" fill="#FCD34D" />
      <Circle cx="220" cy="153" r="7" fill="#1E293B" />

      <G>
        <Ellipse cx="248" cy="196" rx="26" ry="8" fill="#D97706" />
        <Rect x="222" y="186" width="52" height="10" fill="#D97706" />
        <Ellipse cx="248" cy="186" rx="26" ry="8" fill="#FBBF24" />
        <Ellipse cx="248" cy="182" rx="26" ry="8" fill="#D97706" />
        <Rect x="222" y="172" width="52" height="10" fill="#D97706" />
        <Ellipse cx="248" cy="172" rx="26" ry="8" fill="#FBBF24" />
        <Ellipse cx="248" cy="168" rx="26" ry="8" fill="#D97706" />
        <Rect x="222" y="158" width="52" height="10" fill="#D97706" />
        <Ellipse cx="248" cy="158" rx="26" ry="8" fill="#FCD34D" />
        <Ellipse cx="248" cy="158" rx="16" ry="4.5" fill="none" stroke="#F59E0B" strokeWidth={2} />
      </G>

      <G>
        <Ellipse cx="200" cy="204" rx="24" ry="7.5" fill="#D97706" />
        <Rect x="176" y="195" width="48" height="9" fill="#D97706" />
        <Ellipse cx="200" cy="195" rx="24" ry="7.5" fill="#FBBF24" />
        <Ellipse cx="200" cy="191" rx="24" ry="7.5" fill="#D97706" />
        <Rect x="176" y="182" width="48" height="9" fill="#D97706" />
        <Ellipse cx="200" cy="182" rx="24" ry="7.5" fill="#FCD34D" />
        <Ellipse cx="200" cy="182" rx="14" ry="4" fill="none" stroke="#F59E0B" strokeWidth={2} />
      </G>
    </Svg>
  );
}

// ── Brand logo mark ───────────────────────────────────────────────────────────

function BrandMark() {
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#FBBF24" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 17l5-5 4 4 7-8" />
      <Path d="M15 8h5v5" />
    </Svg>
  );
}

// ── Arrow icon ────────────────────────────────────────────────────────────────

function ArrowRight() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#1E293B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14" />
      <Path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WelcomeScreen({ onSignIn }: { onSignIn: () => void }) {
  const [heroLayout, setHeroLayout] = useState({ width: 0, height: 0 });

  const onHeroLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setHeroLayout({ width, height });
  };

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-[#F4F7FB]">
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Decorative background orbs */}
      <View
        className="absolute w-[280px] h-[280px] rounded-[140px] bg-[#E8EFF7] -top-[60px] -right-[80px]"
        pointerEvents="none"
      />
      <View
        className="absolute w-[220px] h-[220px] rounded-[110px] bg-[#EEF3F9] top-[200px] -left-[110px]"
        pointerEvents="none"
      />

      {/* TOP — brand + hero */}
      <View className="flex-1 min-h-0 px-6 pt-4 gap-2.5">
        <View className="flex-row items-center gap-2.5">
          <View className="w-10 h-10 rounded-xl bg-slate-900 items-center justify-center">
            <BrandMark />
          </View>
          <Text className="text-xl font-extrabold tracking-[0.5px] text-slate-900">EWA</Text>
        </View>

        <View className="flex-1 items-center justify-center" onLayout={onHeroLayout}>
          {heroLayout.width > 0 && (
            <WalletIllustration width={heroLayout.width} height={heroLayout.height} />
          )}
        </View>
      </View>

      {/* BOTTOM — copy + features + CTA */}
      <View className="shrink px-6 pb-6 gap-4">

        {/* Intro text */}
        <View>
          <Text className="text-xs font-semibold tracking-[0.6px] text-slate-500 uppercase mb-1.5">
            Welcome to EWA
          </Text>
          <Text className="text-[28px] font-extrabold leading-[36px] tracking-[-0.5px] text-slate-900 mb-2">
            {'Get paid when\n'}
            <Text className="text-green-700">you need it</Text>
          </Text>
          <Text className="text-sm leading-[22px] text-slate-500">
            Access your earned wages anytime, and take control of your financial goals.
          </Text>
        </View>

        {/* Feature card */}
        <View className="bg-white border border-slate-200 rounded-[18px] overflow-hidden shadow-sm elevation-3">
          {FEATURES.map((f, i) => (
            <View key={f.label}>
              <View className={`flex-row items-center gap-3.5 px-4 py-3${i > 0 ? ' border-t border-slate-100' : ''}`}>
                <View className={`w-10 h-10 rounded-xl items-center justify-center shrink-0 ${f.bgClass}`}>
                  {f.icon}
                </View>
                <View className="flex-1 gap-[3px]">
                  <Text className="text-sm font-bold text-slate-900 leading-[18px]">{f.label}</Text>
                  <Text className="text-xs leading-4 text-slate-500">{f.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View className="gap-2.5">
          <Pressable
            className="flex-row items-center justify-center h-[54px] rounded-2xl bg-amber-400 active:opacity-[0.88]"
            onPress={onSignIn}
          >
            <Text className="text-base font-extrabold text-slate-900 tracking-[0.2px]">Sign in</Text>
            <View className="ml-2.5">
              <ArrowRight />
            </View>
          </Pressable>

          <Text className="text-xs leading-[18px] text-slate-400 text-center">
            New to EWA?{' '}
            <Text className="font-bold text-slate-500">Ask your HR team to invite you.</Text>
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}
