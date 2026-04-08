import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

const APP_FONT_FAMILY = 'Inter';

type AnimatedSuccessStateProps = {
  title: string;
  message: string;
  referenceLabel: string;
  referenceValue: string;
  amountLabel: string;
  amountValue: string;
  balanceLabel: string;
  balanceValue: string;
  employeeLabel: string;
  employeeValue: string;
  reasonLabel: string;
  reasonValue: string;
  buttonLabel: string;
  onPressButton: () => void;
};

export function AnimatedSuccessState({
  title,
  message,
  referenceLabel,
  referenceValue,
  amountLabel,
  amountValue,
  balanceLabel,
  balanceValue,
  employeeLabel,
  employeeValue,
  reasonLabel,
  reasonValue,
  buttonLabel,
  onPressButton,
}: AnimatedSuccessStateProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulse]);
  const rippleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.28],
  });
  const rippleOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.04],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundOrbCenter,
          {
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />

      <View style={styles.successWrap}>
        <View style={styles.successHero}>
          <View style={styles.successIconShell}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.successIconRipple,
                {
                  opacity: rippleOpacity,
                  transform: [{ scale: rippleScale }],
                },
              ]}
            />
            <Ionicons name="checkmark" size={42} color="#fff" />
          </View>
        </View>

        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.successText}>{message}</Text>

        <View style={styles.successCard}>
          <View style={styles.successRefRow}>
            <View style={styles.successRefIcon}>
              <Ionicons name="document-text-outline" size={16} color="#2563eb" />
            </View>
            <View style={styles.successRefTextWrap}>
              <Text style={styles.successRefLabel}>{referenceLabel}</Text>
              <Text style={styles.successRefValue}>{referenceValue}</Text>
            </View>
          </View>

          <View style={styles.successGrid}>
            <View style={styles.successGridItem}>
              <Text style={styles.successGridLabel}>{amountLabel}</Text>
              <Text style={styles.successGridValue}>{amountValue}</Text>
            </View>
            <View style={styles.successGridItem}>
              <Text style={styles.successGridLabel}>{balanceLabel}</Text>
              <Text style={styles.successGridValue}>{balanceValue}</Text>
            </View>
            <View style={styles.successGridItem}>
              <Text style={styles.successGridLabel}>{employeeLabel}</Text>
              <Text style={styles.successGridValue}>{employeeValue}</Text>
            </View>
            <View style={styles.successGridItem}>
              <Text style={styles.successGridLabel}>{reasonLabel}</Text>
              <Text style={styles.successGridValue}>{reasonValue}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.button} onPress={onPressButton}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundOrbCenter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#bfdbfe',
    top: '30%',
    alignSelf: 'center',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  successHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 18,
  },
  successIconShell: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    overflow: 'visible',
  },
  successIconRipple: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: '#93c5fd',
  },
  successTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  successText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 22,
  },
  successCard: {
    width: '100%',
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  successRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  successRefIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  successRefTextWrap: {
    flex: 1,
  },
  successRefLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  successRefValue: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  successGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    rowGap: 14,
  },
  successGridItem: {
    width: '50%',
    paddingRight: 12,
  },
  successGridLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  successGridValue: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  button: {
    marginTop: 12,
    height: 44,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#13206b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: APP_FONT_FAMILY,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
