import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const DOT_COUNT = 3;

function PulsingDots() {
  const anims = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={s.dotsRow}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            {
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
              transform: [
                {
                  scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.2] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function AppLoadingScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={s.screen}>
      <Animated.View
        style={[
          s.logoWrap,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
        <Image
          source={require('@/assets/images/salary.png')}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[s.dotsWrap, { opacity: fadeAnim }]}>
        <PulsingDots />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 260,
    height: 260,
  },
  dotsWrap: {
    position: 'absolute',
    bottom: 80,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
});
