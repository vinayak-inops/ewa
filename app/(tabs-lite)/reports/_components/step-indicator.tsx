import { Pressable, StyleSheet, Text, View } from 'react-native';

const F = 'Inter';

const STEPS = [
  { number: 1, label: 'Select Reports' },
  { number: 2, label: 'Basic Filter' },
  { number: 3, label: 'Basic Information' },
];

interface StepIndicatorProps {
  currentStep: number;
  visibleStepLabel: number | null;
  completedSteps?: number[];
  onStepChange: (step: number) => void;
  onStepLabelToggle: (step: number) => void;
  onStepLabelClose: () => void;
}

export function StepIndicator({
  currentStep,
  completedSteps = [],
  onStepChange,
}: StepIndicatorProps) {
  const isAccessible = (n: number) => n === 1 || completedSteps.includes(n - 1);

  return (
    <View style={s.container}>
      {STEPS.map((step, idx) => {
        const isDone = completedSteps.includes(step.number) || step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const accessible = isAccessible(step.number);

        const circleStyle = isDone
          ? s.circleDone
          : isCurrent
          ? s.circleCurrent
          : accessible
          ? s.circleReady
          : s.circleLocked;

        const textStyle = isDone || isCurrent
          ? s.circleNumLight
          : accessible
          ? s.circleNumDark
          : s.circleNumLocked;

        const labelColor = isDone || isCurrent ? s.labelActive : s.labelLocked;

        return (
          <View key={step.number} style={s.stepCol}>
            {/* Connector line on the left */}
            {idx > 0 && (
              <View style={s.lineLeft}>
                <View style={[s.line, isDone ? s.lineDone : s.linePending]} />
              </View>
            )}

            {/* Circle + label stacked */}
            <Pressable
              disabled={!accessible}
              style={[s.stepInner, !accessible && s.disabledHit]}
              onPress={() => { if (accessible) onStepChange(step.number); }}>
              <View style={[s.circle, circleStyle]}>
                <Text style={[s.circleNum, textStyle]}>{step.number}</Text>
              </View>
              <Text style={[s.label, labelColor]} numberOfLines={2}>
                {step.label}
              </Text>
            </Pressable>

            {/* Connector line on the right */}
            {idx < STEPS.length - 1 && (
              <View style={s.lineRight}>
                <View style={[s.line, isDone ? s.lineDone : s.linePending]} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  /* Each step occupies equal width */
  stepCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  /* Circle + label stacked vertically, centered in the step column */
  stepInner: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    zIndex: 1,
  },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone:    { backgroundColor: '#0a1c63' },
  circleCurrent: { backgroundColor: '#0a1c63' },
  circleReady:   { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#0a1c63' },
  circleLocked:  { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe' },

  circleNum: { fontFamily: F, fontSize: 12, fontWeight: '700' },
  circleNumLight:  { color: '#ffffff' },
  circleNumDark:   { color: '#0a1c63' },
  circleNumLocked: { color: '#c7d2fe' },

  disabledHit: { opacity: 0.5 },

  /* Connector lines sit at circle mid-height (14px from top) */
  lineLeft: {
    position: 'absolute',
    left: 0,
    right: '50%',
    top: 13,
    height: 2,
    zIndex: 0,
  },
  lineRight: {
    position: 'absolute',
    left: '50%',
    right: 0,
    top: 13,
    height: 2,
    zIndex: 0,
  },
  line: {
    flex: 1,
    height: 2,
  },
  lineDone:    { backgroundColor: '#0a1c63' },
  linePending: { backgroundColor: '#c7d2fe' },

  label: {
    fontFamily: F,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelActive: { color: '#0a1c63' },
  labelLocked: { color: '#a5b4fc' },
});
