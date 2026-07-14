import { Pressable, Text, View } from 'react-native';

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
    <View className="flex-row items-start px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
      {STEPS.map((step, idx) => {
        const isDone = completedSteps.includes(step.number) || step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const accessible = isAccessible(step.number);

        const circleClass = isDone || isCurrent
          ? 'bg-[#0a1c63]'
          : accessible
          ? 'bg-white border-2 border-[#0a1c63]'
          : 'bg-white border-2 border-[#c7d2fe]';

        const circleNumClass = isDone || isCurrent
          ? 'text-white'
          : accessible
          ? 'text-[#0a1c63]'
          : 'text-[#c7d2fe]';

        const labelClass = isDone || isCurrent ? 'text-[#0a1c63]' : 'text-[#a5b4fc]';

        return (
          <View key={step.number} className="flex-1 flex-row items-start">
            {/* Connector line on the left */}
            {idx > 0 && (
              <View className="absolute left-0 right-1/2 h-[2px] z-0" style={{ top: 13 }}>
                <View className={`flex-1 h-[2px] ${isDone ? 'bg-[#0a1c63]' : 'bg-[#c7d2fe]'}`} />
              </View>
            )}

            {/* Circle + label stacked */}
            <Pressable
              disabled={!accessible}
              className={`flex-1 items-center gap-[5px] z-[1] ${!accessible ? 'opacity-50' : ''}`}
              onPress={() => { if (accessible) onStepChange(step.number); }}
            >
              <View className={`w-7 h-7 rounded-[14px] items-center justify-center ${circleClass}`}>
                <Text className={`text-[12px] font-bold ${circleNumClass}`}>{step.number}</Text>
              </View>
              <Text className={`text-[10px] font-semibold text-center ${labelClass}`} numberOfLines={2}>
                {step.label}
              </Text>
            </Pressable>

            {/* Connector line on the right */}
            {idx < STEPS.length - 1 && (
              <View className="absolute left-1/2 right-0 h-[2px] z-0" style={{ top: 13 }}>
                <View className={`flex-1 h-[2px] ${isDone ? 'bg-[#0a1c63]' : 'bg-[#c7d2fe]'}`} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
