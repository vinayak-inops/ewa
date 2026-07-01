import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

type Props = {
  availableBalance: string;
  limitBalance: string;
  todayDate: string;
};

export function EwaHeroCard({ availableBalance, limitBalance, todayDate }: Props) {
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatA, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatB, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, [floatA, floatB]);

  const bubbleATranslateX = floatA.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] });
  const bubbleATranslateY = floatA.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  const bubbleBTranslateX = floatB.interpolate({ inputRange: [0, 1], outputRange: [10, -8] });
  const bubbleBTranslateY = floatB.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] });

  return (
    <View style={styles.heroCard}>
      <Animated.View
        pointerEvents="none"
        style={[styles.glowLarge, { transform: [{ translateX: bubbleATranslateX }, { translateY: bubbleATranslateY }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.glowSmall, { transform: [{ translateX: bubbleBTranslateX }, { translateY: bubbleBTranslateY }] }]}
      />
      <View style={styles.heroContent}>
        <Text style={styles.brand}>Available Balance</Text>
        <Text style={styles.balance}>{availableBalance}</Text>
        <Text style={styles.balanceMeta}>Limit {limitBalance}</Text>
        <Text style={styles.date}>{todayDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: 18, minHeight: 140, padding: 16, backgroundColor: '#dbeafe', borderWidth: 1.5, borderColor: '#1d4ed8', overflow: 'hidden' },
  heroContent: { flex: 1, justifyContent: 'space-between', zIndex: 2 },
  glowLarge: { position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -26, bottom: -46, backgroundColor: 'rgba(37, 99, 235, 0.28)', borderWidth: 6, borderColor: 'rgba(29, 78, 216, 0.45)' },
  glowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -38, top: -54, backgroundColor: 'rgba(59, 130, 246, 0.18)' },
  brand: { fontSize: 16, fontWeight: '700', color: '#1e40af' },
  balance: { fontSize: 30, fontWeight: '800', color: '#001b4a', alignSelf: 'flex-end' },
  balanceMeta: { fontSize: 12, color: '#475569', alignSelf: 'flex-end' },
  date: { fontSize: 11, color: '#334155', alignSelf: 'flex-end' },
});
