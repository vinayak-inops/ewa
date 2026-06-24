import { Pressable, StyleSheet, Text, View } from 'react-native';

const F = 'Inter';

const STEPS = [
  { number: 1, label: 'Select Reports' },
  { number: 2, label: 'Basic Filter' },
  { number: 3, label: 'Basic Information' },
];

// Vertical centre of each circle (paddingTop 16 + circle 32 / 2 = 32, gap 24 between circles)
const STEP_TOP: Record<number, number> = {
  1: 32,       // 16 + 16
  2: 32 + 24 + 32, // + line(24) + circle(32)
  3: 32 + 24 + 32 + 24 + 32, // + line + circle
};

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
  visibleStepLabel,
  completedSteps = [],
  onStepChange,
  onStepLabelToggle,
  onStepLabelClose,
}: StepIndicatorProps) {

  const isAccessible = (n: number) => n === 1 || completedSteps.includes(n - 1);

  const selectedStep = STEPS.find((s) => s.number === visibleStepLabel) ?? null;

  return (
    // overflow: visible so the floating label can escape the 48-wide column
    <View style={s.sidebar}>

      <View style={s.track}>
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

          const textStyle = isDone || isCurrent ? s.circleNumLight : s.circleNumDark;

          const lineStyle = isDone || isCurrent ? s.lineDone : s.linePending;

          return (
            <View key={step.number} style={s.stepWrap}>
              <Pressable
                disabled={!accessible}
                style={[s.circleHit, !accessible && s.disabledHit]}
                onPress={() => {
                  if (!accessible) return;
                  onStepChange(step.number);
                  onStepLabelToggle(step.number);
                }}>
                <View style={[s.circle, circleStyle]}>
                  <Text style={[s.circleNum, textStyle]}>{step.number}</Text>
                </View>
              </Pressable>

              {idx < STEPS.length - 1 && (
                <View style={[s.line, lineStyle]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Floating label — absolutely positioned to the right of the sidebar */}
      {visibleStepLabel !== null && selectedStep && (() => {
        const isDone = completedSteps.includes(selectedStep.number) || selectedStep.number < currentStep;
        const isCurrent = selectedStep.number === currentStep;
        const accessible = isAccessible(selectedStep.number);

        const labelStyle = isDone
          ? s.labelDone
          : isCurrent
          ? s.labelCurrent
          : accessible
          ? s.labelReady
          : s.labelLocked;

        const labelTextStyle = isDone
          ? s.labelTxtDone
          : isCurrent
          ? s.labelTxtCurrent
          : s.labelTxtLocked;

        const topOffset = STEP_TOP[selectedStep.number] ?? 32;

        return (
          <Pressable
            style={[s.floatingLabel, labelStyle, { top: topOffset - 14 }]}
            disabled={!accessible}
            onPress={() => {
              if (!accessible) return;
              onStepChange(selectedStep.number);
              onStepLabelClose();
            }}>
            <Text style={[s.labelTxt, labelTextStyle]}>
              {selectedStep.label}
            </Text>
          </Pressable>
        );
      })()}
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 48,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    overflow: 'visible',     // lets floating label escape the 48px width
    zIndex: 10,
  },
  track: {
    paddingTop: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  stepWrap: {
    alignItems: 'center',
  },

  // Circle hit area (larger touch target)
  circleHit: {
    padding: 2,
  },
  disabledHit: {
    opacity: 0.5,
  },

  // Circle base
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: '#22c55e' },
  circleCurrent: { backgroundColor: '#2563eb' },
  circleReady: { backgroundColor: '#d1d5db' },
  circleLocked: { backgroundColor: '#e5e7eb' },

  circleNum: { fontFamily: F, fontSize: 13, fontWeight: '700' },
  circleNumLight: { color: '#ffffff' },
  circleNumDark: { color: '#6b7280' },

  // Connector line
  line: {
    width: 2,
    height: 24,
  },
  lineDone: { backgroundColor: '#22c55e' },
  linePending: { backgroundColor: '#d1d5db' },

  // Floating label
  floatingLabel: {
    position: 'absolute',
    left: 48,          // flush against right edge of sidebar
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    minWidth: 120,
    zIndex: 50,
  },
  labelDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  labelCurrent: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  labelReady: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    borderStyle: 'solid',
  },
  labelLocked: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    opacity: 0.5,
  },
  labelTxt: { fontFamily: F, fontSize: 12, fontWeight: '600' },
  labelTxtDone: { color: '#16a34a' },
  labelTxtCurrent: { color: '#2563eb' },
  labelTxtLocked: { color: '#9ca3af' },
});
