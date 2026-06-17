import AutoStatusUpdate from '@/components/ui/auto-status-update';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const APP_FONT_FAMILY = 'Inter';

type AnimatedSuccessStateProps = {
  title: string;
  message: string;
  referenceLabel: string;
  referenceValue: string;
  amountLabel: string;
  amountValue: number | string;
  balanceLabel: string;
  balanceValue: string;
  employeeLabel: string;
  employeeValue: string;
  reasonLabel: string;
  reasonValue: string;
  buttonLabel: string;
  onPressButton: () => void;
  onPressAutoStatus?: () => void;
  workflowState?: unknown;
  id: string;
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
  onPressAutoStatus,
  workflowState,
  id,
}: AnimatedSuccessStateProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const resolveWorkflowState = () => {
    if (typeof workflowState === 'string') return workflowState.toUpperCase();
    if (workflowState && typeof workflowState === 'object' && 'value' in (workflowState as Record<string, unknown>)) {
      const v = (workflowState as Record<string, unknown>).value;
      return typeof v === 'string' ? v.toUpperCase() : '';
    }
    return '';
  };
  const stateValue = resolveWorkflowState();
  const isFinalState = ['APPROVED', 'REJECTED', 'CANCELLED', 'FAILED'].includes(stateValue);
  const [showAutoStatus, setShowAutoStatus] = useState(!isFinalState);
  const stateVisual = (() => {
    switch (stateValue) {
      case 'APPROVED':
        return {
          icon: 'checkmark' as const,
          shellColor: '#16a34a',
          rippleColor: '#86efac',
          outlineColor: '#bbf7d0',
        };
      case 'REJECTED':
        return {
          icon: 'close' as const,
          shellColor: '#dc2626',
          rippleColor: '#fca5a5',
          outlineColor: '#fecaca',
        };
      case 'CANCELLED':
        return {
          icon: 'remove' as const,
          shellColor: '#6b7280',
          rippleColor: '#d1d5db',
          outlineColor: '#e5e7eb',
        };
      case 'FAILED':
        return {
          icon: 'alert' as const,
          shellColor: '#ea580c',
          rippleColor: '#fdba74',
          outlineColor: '#fed7aa',
        };
      default:
        return {
          icon: 'checkmark' as const,
          shellColor: '#2563eb',
          rippleColor: '#93c5fd',
          outlineColor: '#bfdbfe',
        };
    }
  })();

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

  useEffect(() => {
    setShowAutoStatus(!isFinalState);
  }, [isFinalState]);
  const rippleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.28],
  });
  const rippleOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.04],
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

      {/* Success hero */}
      <View style={styles.successHero}>
        <View
          style={[
            styles.successIconShell,
            {
              backgroundColor: stateVisual.shellColor,
              shadowColor: stateVisual.shellColor,
            },
          ]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.successIconRipple,
              {
                backgroundColor: stateVisual.rippleColor,
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />
          <Ionicons name={stateVisual.icon} size={42} color="#fff" />
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.successTitle}>{title}</Text>
        {!showAutoStatus && (
          <Pressable
            style={[styles.autoStatusIconBtn, { borderColor: stateVisual.outlineColor }]}
            onPress={() => {
              if (onPressAutoStatus) { onPressAutoStatus(); return; }
              setShowAutoStatus(true);
            }}>
            <Ionicons name="pulse-outline" size={18} color={stateVisual.shellColor} />
          </Pressable>
        )}
      </View>
      <Text style={styles.successText}>{message}</Text>

      {/* Summary card */}
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

      {/* AutoStatusUpdate below the card, or the done button when final */}
      {showAutoStatus ? (
        <View style={styles.autoStatusWrap}>
          <AutoStatusUpdate
            fileId={id}
            onContinue={onPressButton}
            onClose={onPressButton}
          />
        </View>
      ) : (
        <Pressable style={styles.button} onPress={onPressButton}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingBottom: 96,
  },
  autoStatusWrap: {
    width: '100%',
    marginTop: 16,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoStatusIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
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
