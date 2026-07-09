import { useRolePermissions } from '@/hooks/api/useRolePermissions';
import type { RootState } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';


const CARDS = [
  {
    title: 'EWA',
    subtitle: 'Access your earned wages instantly, track withdrawals, monitor balance & manage salary advances with ease',
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
    subtitle: 'Apply for leave, overtime, shift changes, punch corrections, comp-off & out-duty requests effortlessly',
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
    subtitle: 'Mark check-in & check-out, view daily work hours, track monthly muster & monitor attendance trends',
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
    subtitle: 'View salary slips, payroll statements, leave history, attendance summaries & detailed financial reports',
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
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const run = (firstDelay: number) => {
      scale.setValue(0.3);
      opacity.setValue(0.6);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.2,
          duration: 3200,
          delay: firstDelay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 3200,
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
  const r2 = useRipple(card.animDelay + 1100);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -5, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBreath, { toValue: 1.05, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconBreath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.10, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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

            {[r1, r2].map((r, i) => (
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
              numberOfLines={4}
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

function useCardVisibility() {
  const { loading } = useRolePermissions();
  const permissions = useSelector((s: RootState) => s.role.permissions);

  const visibility = useMemo(() => {
    if (loading) return null;
    if (!permissions || permissions.length === 0) return { ewa: false, applications: false, attendance: false, reports: false };

    const roleData = permissions[0] as Record<string, unknown>;

    const hasActiveScreen = (service: unknown): boolean => {
      if (!service || typeof service !== 'object') return false;
      if (Array.isArray(service)) {
        return service.some((s) => s.isActive !== false && s.enabled !== false);
      }
      return Object.values(service as Record<string, unknown>).some((screen) => {
        if (!screen || typeof screen !== 'object') return false;
        const s = screen as Record<string, unknown>;
        return s.isActive !== false && s.enabled !== false;
      });
    };

    return {
      ewa: hasActiveScreen(roleData.ewa),
      applications: hasActiveScreen(roleData.applicationApplier) || hasActiveScreen(roleData.applicationApprover),
      attendance: hasActiveScreen(roleData.attendance) || hasActiveScreen(roleData.muster),
      reports: hasActiveScreen(roleData.reports),
    };
  }, [permissions, loading]);

  return { loading, visibility };
}

export default function MainLaunchpadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, visibility: visible } = useCardVisibility();

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 82,
          paddingHorizontal: 14,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('@/assets/images/salary.png')}
              style={{ width: 32, height: 32, marginRight: 8 }}
              resizeMode="contain"
            />
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: '#0f172a', letterSpacing: 0.3 }}>
              Salary++
            </Text>
          </View>
        </View>

        {loading || !visible ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '500', marginTop: 14 }}>
              Loading your apps...
            </Text>
          </View>
        ) : (() => {
          const visibleCards = [
            visible.ewa         && { card: CARDS[0], route: CARDS[0].route },
            visible.applications && { card: CARDS[1], route: CARDS[1].route },
            visible.attendance   && { card: CARDS[2], route: CARDS[2].route },
            visible.reports      && { card: CARDS[3], route: CARDS[3].route },
          ].filter(Boolean) as { card: Card; route: string }[];

          if (visibleCards.length === 0) return null;

          // Split into rows of 2
          const rows: (typeof visibleCards)[] = [];
          for (let i = 0; i < visibleCards.length; i += 2) {
            rows.push(visibleCards.slice(i, i + 2));
          }

          return (
            <>
              {rows.map((row, ri) => (
                <View
                  key={ri}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    marginBottom: ri < rows.length - 1 ? 10 : 0,
                  }}
                >
                  {row.map((item, ci) => (
                    <View key={item.route} style={{ flex: 1, flexDirection: 'row' }}>
                      {ci > 0 && <View style={{ width: 10 }} />}
                      <AppCard card={item.card} onPress={() => router.push(item.route as any)} />
                    </View>
                  ))}
                </View>
              ))}
            </>
          );
        })()}

      </View>
    </View>
  );
}
