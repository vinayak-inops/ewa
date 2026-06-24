import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const CARDS = [
  {
    title: 'EWA',
    subtitle: 'Earned wage access, withdrawals & balance',
    icon: 'wallet-outline' as const,
    centerIcon: 'cash-outline' as const,
    cta: 'Open EWA',
    route: '/(tabs-lite)/ewa',
    bg: '#0d1f6e',
    circleBg: '#1a3490',
    iconBg: '#2563eb',
    rippleColor: 'rgba(147,197,253,',
    subtitleColor: '#bfdbfe',
    animDelay: 0,
  },
  {
    title: 'Applications',
    subtitle: 'Leave, shift, OT, punch & more services',
    icon: 'apps-outline' as const,
    centerIcon: 'document-text-outline' as const,
    cta: 'View All',
    route: '/(tabs-lite)/applications',
    bg: '#1e3a8a',
    circleBg: '#2d52b8',
    iconBg: '#3b82f6',
    rippleColor: 'rgba(191,219,254,',
    subtitleColor: '#bfdbfe',
    animDelay: 600,
  },
  {
    title: 'Attendance',
    subtitle: 'Check-in, check-out & work hours',
    icon: 'people-outline' as const,
    centerIcon: 'calendar-outline' as const,
    cta: 'View All',
    route: '/(tabs-lite)/attendance',
    bg: '#1d4ed8',
    circleBg: '#2563eb',
    iconBg: '#60a5fa',
    rippleColor: 'rgba(224,242,254,',
    subtitleColor: '#dbeafe',
    animDelay: 1200,
  },
  {
    title: 'Reports',
    subtitle: 'Statements, history & salary reports',
    icon: 'bar-chart-outline' as const,
    centerIcon: 'stats-chart-outline' as const,
    cta: 'View All',
    route: '/(tabs-lite)/reports',
    bg: '#172554',
    circleBg: '#1e3a8a',
    iconBg: '#3b82f6',
    rippleColor: 'rgba(147,197,253,',
    subtitleColor: '#bfdbfe',
    animDelay: 1800,
  },
];

type Card = (typeof CARDS)[0];

function useRipple(delay: number) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const run = (firstDelay: number) => {
      scale.setValue(0.3);
      opacity.setValue(0.8);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.8,
          duration: 2600,
          delay: firstDelay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2600,
          delay: firstDelay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => run(0));
    };
    run(delay);
  }, []);

  return { scale, opacity };
}

function AppCard({ card, onPress }: { card: Card; onPress: () => void }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const iconBreath = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const orbit1 = useRef(new Animated.Value(0)).current;
  const orbit2 = useRef(new Animated.Value(0)).current;

  const r1 = useRipple(card.animDelay);
  const r2 = useRipple(card.animDelay + 867);
  const r3 = useRipple(card.animDelay + 1734);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -9, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBreath, { toValue: 1.1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconBreath, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.22, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(orbit1, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(orbit2, { toValue: 1, duration: 5500, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin1 = orbit1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin1b = orbit1.interpolate({ inputRange: [0, 1], outputRange: ['120deg', '480deg'] });
  const spin2 = orbit2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  const RIPPLE_BASE = 52;
  const ORBIT1_D = 94;
  const ORBIT2_D = 118;
  const DOT1 = 6;
  const DOT2 = 5;

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={{
            flex: 1,
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: card.bg,
            opacity: pressed ? 0.9 : 1,
            transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
          }}
        >
        {/* Background decorative blob */}
        <View
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            top: -50,
            right: -50,
            backgroundColor: card.circleBg,
            opacity: 0.5,
          }}
        />

        {/* Card content */}
        <View style={{ flex: 1, padding: 15 }}>

          {/* Top icon badge */}
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: card.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
              // FIX: shadow props only work on iOS; elevation handles Android
              shadowColor: card.iconBg,
              shadowOpacity: 0.6,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <Ionicons name={card.icon} size={22} color="#ffffff" />
          </View>

          {/* Center animation stage */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

            {[r1, r2, r3].map((r, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: RIPPLE_BASE,
                  height: RIPPLE_BASE,
                  borderRadius: RIPPLE_BASE / 2,
                  borderWidth: 1.5,
                  borderColor: `${card.rippleColor}0.9)`,
                  transform: [{ scale: r.scale }],
                  opacity: r.opacity,
                }}
              />
            ))}

            <Animated.View
              style={{
                position: 'absolute',
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: `${card.rippleColor}0.12)`,
                transform: [{ scale: glowScale }],
              }}
            />

            <Animated.View
              style={{ position: 'absolute', width: ORBIT1_D, height: ORBIT1_D, transform: [{ rotate: spin1 }] }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: (ORBIT1_D - DOT1) / 2,
                  width: DOT1,
                  height: DOT1,
                  borderRadius: DOT1 / 2,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  elevation: 3,
                }}
              />
            </Animated.View>

            <Animated.View
              style={{ position: 'absolute', width: ORBIT1_D, height: ORBIT1_D, transform: [{ rotate: spin1b }] }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: (ORBIT1_D - DOT1) / 2,
                  width: DOT1,
                  height: DOT1,
                  borderRadius: DOT1 / 2,
                  backgroundColor: 'rgba(255,255,255,0.6)',
                }}
              />
            </Animated.View>

            <Animated.View
              style={{ position: 'absolute', width: ORBIT2_D, height: ORBIT2_D, transform: [{ rotate: spin2 }] }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: (ORBIT2_D - DOT2) / 2,
                  width: DOT2,
                  height: DOT2,
                  borderRadius: DOT2 / 2,
                  backgroundColor: 'rgba(255,255,255,0.45)',
                }}
              />
            </Animated.View>

            <Animated.View
              style={{ position: 'absolute', transform: [{ translateY: floatY }, { scale: iconBreath }] }}
            >
              <Ionicons name={card.centerIcon} size={50} color="rgba(255,255,255,0.32)" />
            </Animated.View>

          </View>

          {/* Bottom text */}
          <View>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 }}>
              {card.title}
            </Text>

            <Text
              numberOfLines={2}
              style={{ color: card.subtitleColor, fontSize: 10.5, fontWeight: '500', marginTop: 3, lineHeight: 15 }}
            >
              {card.subtitle}
            </Text>

            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 10, marginBottom: 8 }} />

            {/* FIX: replaced gap:4 with marginLeft on icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '700' }}>
                {card.cta}
              </Text>
              <Ionicons name="arrow-forward-outline" size={12} color="rgba(255,255,255,0.85)" style={{ marginLeft: 4 }} />
            </View>
          </View>

        </View>
        </View>
      )}
    </Pressable>
  );
}

export default function MainLaunchpadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 82,
          paddingHorizontal: 14,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: '#0f172a', letterSpacing: 0 }}>
              Launchpad
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '400', color: '#64748b', marginTop: 2, letterSpacing: 0 }}>
              Select an app to get started
            </Text>
          </View>

          {/* FIX: replaced gap:6 with marginLeft on Text */}
          <Animated.View
            style={{
              opacity: shimmerOpacity,
              backgroundColor: '#1e3a8a',
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#1e40af',
              shadowOpacity: 0.35,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: '#4ade80',
              }}
            />
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, marginLeft: 6 }}>
              4 Apps
            </Text>
          </Animated.View>
        </View>

        {/* FIX: replaced gap:10 between rows with marginBottom; replaced gap:10 inside rows with marginRight on first card */}
        <View style={{ flex: 1, flexDirection: 'row', marginBottom: 10 }}>
          <AppCard card={CARDS[0]} onPress={() => router.push(CARDS[0].route as any)} />
          <View style={{ width: 10 }} />
          <AppCard card={CARDS[1]} onPress={() => router.push(CARDS[1].route as any)} />
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          <AppCard card={CARDS[2]} onPress={() => router.push(CARDS[2].route as any)} />
          <View style={{ width: 10 }} />
          <AppCard card={CARDS[3]} onPress={() => router.push(CARDS[3].route as any)} />
        </View>

      </View>
    </View>
  );
}
